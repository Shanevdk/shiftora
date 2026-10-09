<?php

namespace App\Http\Presenters;

use App\Models\Employee;
use App\Models\TimeEntry;

class TimeEntryPresenter
{
    /**
     * @return array{id: int, employee_id: int, location: array{id: int, name: string}|null, clock_in_at: string, clock_out_at: string|null, break_minutes: int, worked_minutes: int, source: string, notes: string|null, is_open: bool, on_break_since: string|null}
     */
    public static function present(TimeEntry $entry): array
    {
        return [
            'id' => $entry->id,
            'employee_id' => $entry->employee_id,
            'location' => $entry->location?->only(['id', 'name']),
            'clock_in_at' => $entry->clock_in_at->toIso8601String(),
            'clock_out_at' => $entry->clock_out_at?->toIso8601String(),
            'break_minutes' => $entry->break_minutes,
            'worked_minutes' => $entry->workedMinutes(),
            'source' => $entry->source,
            'notes' => $entry->notes,
            'is_open' => $entry->isOpen(),
            'on_break_since' => $entry->isOpen() ? $entry->openBreak?->started_at->toIso8601String() : null,
        ];
    }

    /**
     * The live clock status shown on the time clock and dashboard.
     *
     * @return array{is_clocked_in: bool, is_on_break: bool, clock_in_at: string|null, break_started_at: string|null, break_minutes: int, worked_minutes: int, location: array{id: int, name: string}|null}
     */
    public static function clockState(Employee $employee): array
    {
        $entry = $employee->openTimeEntry()->with(['openBreak', 'location'])->first();

        return [
            'is_clocked_in' => $entry !== null,
            'is_on_break' => $entry?->openBreak !== null,
            'clock_in_at' => $entry?->clock_in_at->toIso8601String(),
            'break_started_at' => $entry?->openBreak?->started_at->toIso8601String(),
            'break_minutes' => $entry->break_minutes ?? 0,
            'worked_minutes' => $entry?->workedMinutes() ?? 0,
            'location' => $entry?->location?->only(['id', 'name']),
        ];
    }
}
