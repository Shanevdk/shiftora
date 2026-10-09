<?php

namespace App\Http\Presenters;

use App\Models\Employee;

class EmployeePresenter
{
    /**
     * The compact shape used wherever an employee is referenced (schedule rows, timesheets, reports).
     *
     * @return array{id: int, name: string, first_name: string, last_name: string, job_title: string|null, color: string|null, location_id: int|null, role: string, is_active: bool}
     */
    public static function summary(Employee $employee): array
    {
        return [
            'id' => $employee->id,
            'name' => $employee->full_name,
            'first_name' => $employee->first_name,
            'last_name' => $employee->last_name,
            'job_title' => $employee->job_title,
            'color' => $employee->color,
            'location_id' => $employee->location_id,
            'role' => $employee->role->value,
            'is_active' => $employee->is_active,
        ];
    }

    /**
     * The full shape used on the employee management screens.
     *
     * @return array<string, mixed>
     */
    public static function detail(Employee $employee): array
    {
        return [
            ...self::summary($employee),
            'email' => $employee->email,
            'phone' => $employee->phone,
            'hourly_rate_cents' => $employee->hourly_rate_cents,
            'location' => $employee->location?->only(['id', 'name']),
            'has_account' => $employee->user_id !== null,
            'invited_at' => $employee->invited_at?->toIso8601String(),
            'created_at' => $employee->created_at?->toIso8601String(),
        ];
    }
}
