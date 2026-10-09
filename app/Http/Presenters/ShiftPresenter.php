<?php

namespace App\Http\Presenters;

use App\Models\Shift;

class ShiftPresenter
{
    /**
     * @return array{id: int, employee_id: int|null, location_id: int|null, location: array{id: int, name: string}|null, starts_at: string, ends_at: string, break_minutes: int, scheduled_minutes: int, position: string|null, notes: string|null, is_published: bool}
     */
    public static function present(Shift $shift): array
    {
        return [
            'id' => $shift->id,
            'employee_id' => $shift->employee_id,
            'location_id' => $shift->location_id,
            'location' => $shift->location?->only(['id', 'name']),
            'starts_at' => $shift->starts_at->toIso8601String(),
            'ends_at' => $shift->ends_at->toIso8601String(),
            'break_minutes' => $shift->break_minutes,
            'scheduled_minutes' => $shift->scheduledMinutes(),
            'position' => $shift->position,
            'notes' => $shift->notes,
            'is_published' => $shift->isPublished(),
        ];
    }
}
