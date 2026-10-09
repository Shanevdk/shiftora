<?php

namespace App\Http\Controllers;

use App\Models\Shift;
use App\Support\Scheduling\ShiftConflicts;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class MoveShiftController extends Controller
{
    /**
     * Move a shift to another day and/or employee, keeping its local start time and length (drag and drop).
     */
    public function __invoke(Request $request, Shift $shift): RedirectResponse
    {
        Gate::authorize('update', $shift);

        $organization = $this->organization();

        $validated = $request->validate([
            'employee_id' => ['nullable', 'integer', Rule::exists('employees', 'id')->where('organization_id', $organization->id)->where('is_active', true)],
            'date' => ['required', 'date_format:Y-m-d'],
        ]);

        $localStart = $shift->starts_at->setTimezone($organization->timezone);
        $startsAt = CarbonImmutable::createFromFormat('Y-m-d H:i:s', $validated['date'].' '.$localStart->format('H:i:s'), $organization->timezone)->utc();
        $endsAt = $startsAt->addMinutes((int) $shift->starts_at->diffInMinutes($shift->ends_at));
        $employeeId = $validated['employee_id'] ?? null;

        if (ShiftConflicts::exists($employeeId, $startsAt, $endsAt, $shift->id)) {
            throw ValidationException::withMessages(['shift' => __('That employee already has a shift at this time.')]);
        }

        $shift->update([
            'employee_id' => $employeeId,
            'starts_at' => $startsAt,
            'ends_at' => $endsAt,
        ]);

        return back();
    }
}
