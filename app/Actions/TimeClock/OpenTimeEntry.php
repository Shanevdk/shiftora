<?php

namespace App\Actions\TimeClock;

use App\Models\Employee;
use App\Models\TimeEntry;
use Illuminate\Validation\ValidationException;

class OpenTimeEntry
{
    /**
     * Lock and return the employee's open time entry. Must be called inside a transaction.
     *
     * @throws ValidationException
     */
    public static function lockFor(Employee $employee): TimeEntry
    {
        $entry = $employee->timeEntries()
            ->whereNull('clock_out_at')
            ->lockForUpdate()
            ->first();

        if ($entry === null) {
            throw ValidationException::withMessages(['clock' => __('You are not clocked in.')]);
        }

        return $entry;
    }
}
