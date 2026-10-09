<?php

namespace App\Enums;

enum Plan: string
{
    case Starter = 'starter';
    case Professional = 'professional';
    case Business = 'business';

    /**
     * Find the plan that is billed with the given Stripe price.
     */
    public static function fromStripePrice(?string $stripePrice): ?self
    {
        if ($stripePrice === null) {
            return null;
        }

        foreach (self::cases() as $plan) {
            if ($plan->stripePrice() === $stripePrice) {
                return $plan;
            }
        }

        return null;
    }

    public function label(): string
    {
        return $this->config('name');
    }

    public function description(): string
    {
        return $this->config('description');
    }

    public function pricePerEmployeeCents(): int
    {
        return $this->config('price_per_employee_cents');
    }

    public function stripePrice(): ?string
    {
        return $this->config('stripe_price');
    }

    /**
     * The maximum number of active employees, or null when unlimited.
     */
    public function employeeLimit(): ?int
    {
        return $this->config('employee_limit');
    }

    /**
     * The maximum number of locations, or null when unlimited.
     */
    public function locationLimit(): ?int
    {
        return $this->config('location_limit');
    }

    /**
     * @return list<Feature>
     */
    public function features(): array
    {
        return array_values(array_map(
            fn (string $feature): Feature => Feature::from($feature),
            $this->config('features'),
        ));
    }

    public function includes(Feature $feature): bool
    {
        return in_array($feature, $this->features(), true);
    }

    /**
     * @return array{value: string, name: string, description: string, price_per_employee_cents: int, employee_limit: int|null, location_limit: int|null, features: list<array{value: string, label: string}>}
     */
    public function toArray(): array
    {
        return [
            'value' => $this->value,
            'name' => $this->label(),
            'description' => $this->description(),
            'price_per_employee_cents' => $this->pricePerEmployeeCents(),
            'employee_limit' => $this->employeeLimit(),
            'location_limit' => $this->locationLimit(),
            'features' => array_map(
                fn (Feature $feature): array => ['value' => $feature->value, 'label' => $feature->label()],
                $this->features(),
            ),
        ];
    }

    private function config(string $key): mixed
    {
        return config("shiftora.plans.{$this->value}.{$key}");
    }
}
