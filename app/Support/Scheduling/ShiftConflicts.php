<?php

namespace App\Support\Scheduling;

use App\Models\Shift;
use Carbon\CarbonInterface;

class ShiftConflicts
{
    /**
     * Whether the employee already has a shift overlapping the given time range.
     *
     * Open (unassigned) shifts never conflict.
     */
    public static function exists(?int $employeeId, CarbonInterface $startsAt, CarbonInterface $endsAt, ?int $ignoreShiftId = null): bool
    {
        if ($employeeId === null) {
            return false;
        }

        return Shift::query()
            ->where('employee_id', $employeeId)
            ->when($ignoreShiftId !== null, fn ($query) => $query->whereKeyNot($ignoreShiftId))
            ->overlapping($startsAt, $endsAt)
            ->exists();
    }
}
