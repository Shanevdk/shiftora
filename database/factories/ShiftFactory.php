<?php

namespace Database\Factories;

use App\Models\Employee;
use App\Models\Shift;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Shift>
 */
class ShiftFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $startsAt = now()->addDay()->setTime(9, 0);

        return [
            'employee_id' => Employee::factory(),
            'organization_id' => fn (array $attributes) => Employee::withoutGlobalScopes()->whereKey($attributes['employee_id'])->value('organization_id'),
            'starts_at' => $startsAt,
            'ends_at' => $startsAt->addHours(8),
            'break_minutes' => 30,
            'position' => fake()->optional()->randomElement(['Front of house', 'Kitchen', 'Register', 'Dock']),
        ];
    }

    /**
     * Indicate that the shift has been published to the team.
     */
    public function published(): static
    {
        return $this->state(fn (array $attributes) => [
            'published_at' => now(),
        ]);
    }
}
