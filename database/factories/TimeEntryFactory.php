<?php

namespace Database\Factories;

use App\Models\Employee;
use App\Models\TimeEntry;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TimeEntry>
 */
class TimeEntryFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $clockIn = now()->subDay()->setTime(9, 0);

        return [
            'employee_id' => Employee::factory(),
            'organization_id' => fn (array $attributes) => Employee::withoutGlobalScopes()->whereKey($attributes['employee_id'])->value('organization_id'),
            'clock_in_at' => $clockIn,
            'clock_out_at' => $clockIn->addHours(8),
            'break_minutes' => 30,
            'source' => TimeEntry::SOURCE_CLOCK,
        ];
    }

    /**
     * Indicate that the employee is still clocked in.
     */
    public function open(): static
    {
        return $this->state(fn (array $attributes) => [
            'clock_in_at' => now()->subHours(2),
            'clock_out_at' => null,
            'break_minutes' => 0,
        ]);
    }
}
