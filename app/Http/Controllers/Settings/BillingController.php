<?php

namespace App\Http\Controllers\Settings;

use App\Actions\Billing\StartCheckout;
use App\Enums\Plan;
use App\Http\Controllers\Concerns\TalksToStripe;
use App\Http\Controllers\Controller;
use App\Models\Organization;
use App\Support\Billing\PlanAdvisor;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

class BillingController extends Controller
{
    use TalksToStripe;

    /**
     * Show plans and subscription status. Every member can see it; only the owner can change it.
     */
    public function edit(Request $request): Response
    {
        $organization = $this->organization();
        $subscription = $organization->subscription(config('shiftora.subscription_type'));
        $isSubscribed = $organization->isSubscribed();

        if ($request->query('checkout') === 'success') {
            $this->toast(__('Thanks! Your subscription is being activated.'));
        }

        return Inertia::render('settings/billing', [
            'plans' => array_map(fn (Plan $plan): array => [
                ...$plan->toArray(),
                'available' => $plan->stripePrice() !== null,
            ], Plan::cases()),
            'billing' => [
                'plan' => $isSubscribed ? $organization->activePlan()?->value : null,
                'recommended_plan' => $isSubscribed ? null : PlanAdvisor::recommend($organization)->value,
                'status' => match (true) {
                    $subscription?->onGracePeriod() => 'canceled',
                    $subscription?->pastDue() => 'past_due',
                    $subscription?->onTrial() && Organization::onFreePromotion() => 'free',
                    $isSubscribed => 'active',
                    $organization->hasActiveAccess() => 'trial',
                    default => 'inactive',
                },
                'trial_ends_at' => $organization->trial_ends_at?->toIso8601String(),
                'free_until' => Organization::onFreePromotion() ? Organization::freeUntil()->toIso8601String() : null,
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
    public function checkout(Request $request, StartCheckout $startCheckout): SymfonyResponse
    {
        $organization = $this->organization();

        Gate::authorize('manageBilling', $organization);

        $plan = Plan::from($request->validate(['plan' => ['required', Rule::enum(Plan::class)]])['plan']);

        return $this->stripe(fn (): SymfonyResponse => Inertia::location(
            $startCheckout->handle($organization, $plan, route('billing.edit')),
        ));
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

        PlanAdvisor::ensureSeatsFit($organization, $plan);

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
}
