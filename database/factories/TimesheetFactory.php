<?php

namespace Database\Factories;

use App\Enums\TimesheetStatus;
use App\Models\Employee;
use App\Models\Timesheet;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Timesheet>
 */
class TimesheetFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $periodStart = now()->startOfWeek();

        return [
            'employee_id' => Employee::factory(),
            'organization_id' => fn (array $attributes) => Employee::withoutGlobalScopes()->whereKey($attributes['employee_id'])->value('organization_id'),
            'period_start' => $periodStart->toDateString(),
            'period_end' => $periodStart->addDays(6)->toDateString(),
            'status' => TimesheetStatus::Open,
        ];
    }

    /**
     * Indicate that the timesheet is waiting for approval.
     */
    public function submitted(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => TimesheetStatus::Submitted,
            'submitted_at' => now(),
        ]);
    }

    /**
     * Indicate that the timesheet has been approved.
     */
    public function approved(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => TimesheetStatus::Approved,
            'submitted_at' => now(),
            'reviewed_at' => now(),
        ]);
    }
}
