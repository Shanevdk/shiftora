<?php

namespace Database\Factories;

use App\Enums\Role;
use App\Models\Employee;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Employee>
 */
class EmployeeFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'organization_id' => Organization::factory(),
            'first_name' => fake()->firstName(),
            'last_name' => fake()->lastName(),
            'email' => fake()->unique()->safeEmail(),
            'phone' => fake()->optional()->phoneNumber(),
            'job_title' => fake()->randomElement(['Barista', 'Shift Lead', 'Line Cook', 'Cashier', 'Warehouse Associate', 'Driver']),
            'role' => Role::Employee,
            'hourly_rate_cents' => fake()->numberBetween(1600, 3200),
            'color' => fake()->randomElement(Employee::COLORS),
            'is_active' => true,
        ];
    }

    /**
     * Give the employee the given role.
     */
    public function role(Role $role): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => $role,
        ]);
    }

    /**
     * Link the employee to a login account that is working in the employee's organization.
     */
    public function withUser(?User $user = null): static
    {
        return $this->state(fn (array $attributes) => [
            'user_id' => $user ?? User::factory(),
        ])->afterCreating(function (Employee $employee): void {
            $employee->user?->forceFill(['current_organization_id' => $employee->organization_id])->save();
        });
    }

    /**
     * Indicate that the employee has been deactivated.
     */
    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }
}
