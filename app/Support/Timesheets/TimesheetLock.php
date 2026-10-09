<?php

namespace App\Support\Timesheets;

use App\Enums\TimesheetStatus;
use App\Models\Employee;
use App\Models\Timesheet;
use Carbon\CarbonInterface;

class TimesheetLock
{
    /**
     * Whether the employee's timesheet for the week containing the moment has been approved.
     *
     * Approved timesheets are a payroll record, so their entries can no longer change.
     */
    public static function coversMoment(Employee $employee, CarbonInterface $moment): bool
    {
        $weekStart = $employee->organization->weekStartFor($moment);

        return Timesheet::query()
            ->where('employee_id', $employee->id)
            ->whereDate('period_start', $weekStart->toDateString())
            ->where('status', TimesheetStatus::Approved)
            ->exists();
    }
}
