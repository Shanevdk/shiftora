<?php

namespace App\Actions\TimeClock;

use App\Models\Employee;
use App\Models\TimeEntry;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ClockOut
{
    /**
     * Close the employee's open time entry, ending any break that is still running.
     *
     * @throws ValidationException
     */
    public function handle(Employee $employee, ?float $latitude = null, ?float $longitude = null): TimeEntry
    {
        return DB::transaction(function () use ($employee, $latitude, $longitude): TimeEntry {
            $entry = OpenTimeEntry::lockFor($employee);

            $now = now();
            $openBreak = $entry->breaks()->whereNull('ended_at')->first();

            if ($openBreak !== null) {
                $openBreak->update(['ended_at' => $now]);
                $entry->break_minutes += (int) $openBreak->started_at->diffInMinutes($now);
            }

            $entry->fill([
                'clock_out_at' => $now,
                'clock_out_latitude' => $latitude,
                'clock_out_longitude' => $longitude,
            ])->save();

            return $entry;
        });
    }
}
