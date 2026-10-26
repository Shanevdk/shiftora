<?php

namespace App\Http\Controllers;

use App\Actions\Billing\StartCheckout;
use App\Enums\Feature;
use App\Enums\Plan;
use App\Http\Controllers\Concerns\TalksToStripe;
use App\Models\Organization;
use App\Support\Billing\PlanAdvisor;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

/**
 * Where a trial (or a lapsed workspace) becomes a subscription. Paying is framed as keeping what the
 * owner has already built, with the plan that fits how they have used Shiftora picked for them.
 */
class ContinueController extends Controller
{
    use TalksToStripe;

    /**
     * Show what carries over and the plan that fits, with the other plans alongside.
     */
    public function show(): Response|RedirectResponse
    {
        $organization = $this->organization();

        Gate::authorize('manageBilling', $organization);

        if ($organization->isSubscribed()) {
            return to_route('billing.edit');
        }

        $usedFeatures = PlanAdvisor::usedFeatures($organization);
        $activeEmployees = $organization->activeEmployeeCount();

        return Inertia::render('continue', [
            'plans' => array_map(fn (Plan $plan): array => [
                ...$plan->toArray(),
                'available' => $plan->stripePrice() !== null,
                'fits_team' => PlanAdvisor::seatsFit($plan, $activeEmployees),
                'missing_features' => array_map(
                    fn (Feature $feature): string => $feature->label(),
                    PlanAdvisor::missingFeatures($plan, $usedFeatures),
                ),
            ], Plan::cases()),
            'recommendedPlan' => PlanAdvisor::recommend($organization)->value,
            'usage' => [
                'active_employees' => $activeEmployees,
                'locations' => $organization->locations()->count(),
                'shifts' => $organization->shifts()->count(),
                'time_entries' => $organization->timeEntries()->count(),
            ],
            'isReadOnly' => $organization->isReadOnly(),
            'trialEndsAt' => $organization->trial_ends_at?->toIso8601String(),
            'freeUntil' => Organization::onFreePromotion() ? Organization::freeUntil()->toIso8601String() : null,
            'billingConfigured' => filled(config('cashier.secret')),
        ]);
    }

    /**
     * Go straight to checkout: for the plan the owner picked, or else the one that fits.
     */
    public function store(Request $request, StartCheckout $startCheckout): SymfonyResponse
    {
        $organization = $this->organization();

        Gate::authorize('manageBilling', $organization);

        if ($organization->isSubscribed()) {
            return to_route('billing.edit');
        }

        $validated = $request->validate(['plan' => ['nullable', Rule::enum(Plan::class)]]);
        $plan = isset($validated['plan']) ? Plan::from($validated['plan']) : PlanAdvisor::recommend($organization);

        if (blank(config('cashier.secret')) || $plan->stripePrice() === null) {
            $this->toast(__('Payments aren\'t switched on yet, so plans can\'t be bought right now.'), 'info');

            return to_route('continue.show');
        }

        return $this->stripe(fn (): SymfonyResponse => Inertia::location(
            $startCheckout->handle($organization, $plan, route('continue.show')),
        ), 'continue.show');
    }
}
