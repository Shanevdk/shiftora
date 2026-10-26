<?php

namespace App\Actions\Billing;

use App\Enums\Plan;
use App\Models\Organization;
use App\Support\Billing\PlanAdvisor;
use Illuminate\Validation\ValidationException;
use Stripe\Exception\ApiErrorException;

class StartCheckout
{
    /**
     * Open a Stripe Checkout session for a new subscription to the plan and return its URL.
     *
     * Any no-card trial time left carries over, and during the launch promotion the card isn't
     * charged until the promotion ends.
     *
     * @throws ValidationException
     * @throws ApiErrorException
     */
    public function handle(Organization $organization, Plan $plan, string $cancelUrl): string
    {
        if ($plan->stripePrice() === null) {
            throw ValidationException::withMessages(['plan' => __('Billing for this plan is not configured yet.')]);
        }

        if ($organization->isSubscribed()) {
            throw ValidationException::withMessages(['plan' => __('You already have a subscription. Change plans instead.')]);
        }

        PlanAdvisor::ensureSeatsFit($organization, $plan);

        $builder = $organization
            ->newSubscription(config('shiftora.subscription_type'), $plan->stripePrice())
            ->quantity(max(1, $organization->activeEmployeeCount()));

        $trialEndsAt = match (true) {
            Organization::onFreePromotion() => Organization::freeUntil(),
            $organization->onGenericTrial() => $organization->trial_ends_at,
            default => null,
        };

        // Stripe Checkout only accepts a trial end at least 48 hours away.
        if ($trialEndsAt?->isAfter(now()->addDays(2))) {
            $builder->trialUntil($trialEndsAt);
        }

        $checkout = $builder->checkout([
            'success_url' => route('billing.edit', ['checkout' => 'success']),
            'cancel_url' => $cancelUrl,
        ]);

        return $checkout->asStripeCheckoutSession()->url;
    }
}
