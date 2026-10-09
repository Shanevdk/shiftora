<?php

namespace Database\Factories;

use App\Enums\Plan;
use App\Models\Organization;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Organization>
 */
class OrganizationFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = fake()->unique()->company();

        return [
            'name' => $name,
            'slug' => Str::slug($name).'-'.Str::lower(Str::random(5)),
            'timezone' => 'UTC',
            'week_starts_on' => 1,
            'plan' => Plan::Professional,
            'daily_overtime_minutes' => null,
            'weekly_overtime_minutes' => 2400,
            'geofencing_enabled' => false,
            'trial_ends_at' => now()->addDays(14),
        ];
    }

    /**
     * Indicate that the organization is trialling the given plan.
     */
    public function onPlan(Plan $plan): static
    {
        return $this->state(fn (array $attributes) => [
            'plan' => $plan,
        ]);
    }

    /**
     * Indicate that the organization's free trial has ended without a subscription.
     */
    public function trialExpired(): static
    {
        return $this->state(fn (array $attributes) => [
            'trial_ends_at' => now()->subDay(),
        ]);
    }

    /**
     * Indicate that the organization has an active Stripe subscription to the given plan.
     */
    public function subscribed(Plan $plan = Plan::Professional): static
    {
        return $this->state(fn (array $attributes) => [
            'plan' => $plan,
            'stripe_id' => 'cus_'.Str::random(14),
            'trial_ends_at' => null,
        ])->afterCreating(function (Organization $organization) use ($plan): void {
            $organization->subscriptions()->create([
                'type' => config('shiftora.subscription_type'),
                'stripe_id' => 'sub_'.Str::random(14),
                'stripe_status' => 'active',
                'stripe_price' => $plan->stripePrice() ?? 'price_'.$plan->value,
                'quantity' => 1,
            ]);
        });
    }
}
