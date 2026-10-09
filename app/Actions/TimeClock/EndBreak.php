<?php

namespace App\Actions\TimeClock;

use App\Models\Employee;
use App\Models\TimeEntryBreak;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class EndBreak
{
    /**
     * End the running break and add its length to the time entry's break total.
     *
     * @throws ValidationException
     */
    public function handle(Employee $employee): TimeEntryBreak
    {
        return DB::transaction(function () use ($employee): TimeEntryBreak {
            $entry = OpenTimeEntry::lockFor($employee);

            $break = $entry->breaks()->whereNull('ended_at')->first();

            if ($break === null) {
                throw ValidationException::withMessages(['clock' => __('You are not on a break.')]);
            }

            $now = now();
            $break->update(['ended_at' => $now]);

            $entry->break_minutes += (int) $break->started_at->diffInMinutes($now);
            $entry->save();

            return $break;
        });
    }
}
