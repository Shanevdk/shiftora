<?php

namespace App\Http\Controllers\Settings;

use App\Enums\Plan;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Stripe\Exception\ApiErrorException;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

class BillingController extends Controller
{
    /**
     * Show plans and subscription status. Every member can see it; only the owner can change it.
     */
    public function edit(Request $request): Response
    {
        $organization = $this->organization();
        $subscription = $organization->subscription(config('shiftora.subscription_type'));
        $activePlan = $organization->activePlan();

        if ($request->query('checkout') === 'success') {
            $this->toast(__('Thanks! Your subscription is being activated.'));
        }

        return Inertia::render('settings/billing', [
            'plans' => array_map(fn (Plan $plan): array => [
                ...$plan->toArray(),
                'available' => $plan->stripePrice() !== null,
            ], Plan::cases()),
            'billing' => [
                'plan' => $activePlan?->value,
                'trial_plan' => $organization->plan->value,
                'status' => match (true) {
                    $subscription?->onGracePeriod() => 'canceled',
                    $subscription?->pastDue() => 'past_due',
                    $organization->isSubscribed() => 'active',
                    $activePlan !== null => 'trial',
                    default => 'inactive',
                },
                'trial_ends_at' => $organization->trial_ends_at?->toIso8601String(),
                'trial_days_remaining' => $organization->trialDaysRemaining(),
                'ends_at' => $subscription?->ends_at?->toIso8601String(),
                'quantity' => $subscription?->quantity,
                'card_last_four' => $organization->pm_last_four,
                'active_employee_count' => $organization->activeEmployeeCount(),
                'has_payment_issue' => $subscription?->hasIncompletePayment() ?? false,
            ],
            'canManage' => $request->user()->can('manageBilling', $organization),
            'billingConfigured' => filled(config('cashier.secret')),
        ]);
    }

    /**
     * Start Stripe Checkout for a new subscription, carrying over any remaining trial days.
     */
    public function checkout(Request $request): SymfonyResponse
    {
        $organization = $this->organization();

        Gate::authorize('manageBilling', $organization);

        $plan = $this->validatedPlan($request);

        if ($organization->isSubscribed()) {
            throw ValidationException::withMessages(['plan' => __('You already have a subscription. Change plans instead.')]);
        }

        $this->ensureSeatsFit($plan);

        return $this->stripe(function () use ($organization, $plan): SymfonyResponse {
            $builder = $organization
                ->newSubscription(config('shiftora.subscription_type'), $plan->stripePrice())
                ->quantity(max(1, $organization->activeEmployeeCount()));

            // Stripe Checkout only accepts a trial end at least 48 hours away.
            if ($organization->onGenericTrial() && $organization->trial_ends_at->isAfter(now()->addDays(2))) {
                $builder->trialUntil($organization->trial_ends_at);
            }

            $checkout = $builder->checkout([
                'success_url' => route('billing.edit', ['checkout' => 'success']),
                'cancel_url' => route('billing.edit'),
            ]);

            return Inertia::location($checkout->asStripeCheckoutSession()->url);
        });
    }

    /**
     * Move an existing subscription to a different plan.
     */
    public function swap(Request $request): SymfonyResponse
    {
        $organization = $this->organization();

        Gate::authorize('manageBilling', $organization);

        $plan = $this->validatedPlan($request);
        $subscription = $organization->subscription(config('shiftora.subscription_type'));

        if ($subscription === null || ! $subscription->valid()) {
            throw ValidationException::withMessages(['plan' => __('Start a subscription first.')]);
        }

        $this->ensureSeatsFit($plan);

        return $this->stripe(function () use ($organization, $subscription, $plan): SymfonyResponse {
            $subscription->swap($plan->stripePrice());
            $organization->update(['plan' => $plan]);

            $this->toast(__('You are now on the :plan plan.', ['plan' => $plan->label()]));

            return to_route('billing.edit');
        });
    }

    /**
     * Send the owner to the Stripe customer portal to manage cards, invoices and cancellation.
     */
    public function portal(): SymfonyResponse
    {
        $organization = $this->organization();

        Gate::authorize('manageBilling', $organization);

        if (! $organization->hasStripeId()) {
            $this->toast(__('Choose a plan first. The billing portal opens once you have a subscription.'), 'info');

            return to_route('billing.edit');
        }

        return $this->stripe(fn (): SymfonyResponse => Inertia::location(
            $organization->billingPortalUrl(route('billing.edit')),
        ));
    }

    private function validatedPlan(Request $request): Plan
    {
        $plan = Plan::from($request->validate(['plan' => ['required', Rule::enum(Plan::class)]])['plan']);

        if ($plan->stripePrice() === null) {
            throw ValidationException::withMessages(['plan' => __('Billing for this plan is not configured yet.')]);
        }

        return $plan;
    }

    private function ensureSeatsFit(Plan $plan): void
    {
        $limit = $plan->employeeLimit();
        $activeEmployees = $this->organization()->activeEmployeeCount();

        if ($limit !== null && $activeEmployees > $limit) {
            throw ValidationException::withMessages([
                'plan' => __('The :plan plan allows :limit active employees and you have :count. Deactivate employees first.', [
                    'plan' => $plan->label(),
                    'limit' => $limit,
                    'count' => $activeEmployees,
                ]),
            ]);
        }
    }

    /**
     * Run a Stripe call, turning API failures into a friendly message instead of an error page.
     *
     * @param  callable(): SymfonyResponse  $callback
     */
    private function stripe(callable $callback): SymfonyResponse
    {
        try {
            return $callback();
        } catch (ApiErrorException $exception) {
            Log::warning('Stripe billing request failed.', ['organization_id' => $this->organization()->id, 'message' => $exception->getMessage()]);

            $this->toast(__('We could not reach our payment provider. Please try again in a moment.'), 'error');

            return to_route('billing.edit');
        }
    }
}
