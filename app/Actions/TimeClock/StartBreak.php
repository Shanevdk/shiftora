<?php

namespace App\Actions\TimeClock;

use App\Models\Employee;
use App\Models\TimeEntryBreak;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class StartBreak
{
    /**
     * Start a break on the employee's open time entry.
     *
     * @throws ValidationException
     */
    public function handle(Employee $employee): TimeEntryBreak
    {
        return DB::transaction(function () use ($employee): TimeEntryBreak {
            $entry = OpenTimeEntry::lockFor($employee);

            if ($entry->breaks()->whereNull('ended_at')->exists()) {
                throw ValidationException::withMessages(['clock' => __('You are already on a break.')]);
            }

            return $entry->breaks()->create(['started_at' => now()]);
        });
    }
}
