<?php

namespace App\Http\Controllers;

use App\Http\Requests\TimeEntryRequest;
use App\Models\TimeEntry;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;

/**
 * Manager corrections to time entries. Every change is captured in the audit log.
 */
class TimeEntryController extends Controller
{
    public function store(TimeEntryRequest $request): RedirectResponse
    {
        $employee = $request->employee();
        $attributes = $request->entryAttributes();

        Gate::authorize('createFor', [TimeEntry::class, $employee, $attributes['clock_in_at']]);

        $employee->timeEntries()->create([
            ...$attributes,
            'organization_id' => $employee->organization_id,
            'source' => TimeEntry::SOURCE_MANUAL,
        ]);

        $this->toast(__('Time entry added.'));

        return back();
    }

    public function update(TimeEntryRequest $request, TimeEntry $timeEntry): RedirectResponse
    {
        Gate::authorize('update', $timeEntry);

        $attributes = $request->entryAttributes();

        Gate::authorize('createFor', [TimeEntry::class, $timeEntry->employee, $attributes['clock_in_at']]);

        $timeEntry->update($attributes);

        $this->toast(__('Time entry updated.'));

        return back();
    }

    public function destroy(TimeEntry $timeEntry): RedirectResponse
    {
        Gate::authorize('delete', $timeEntry);

        $timeEntry->delete();

        $this->toast(__('Time entry deleted.'));

        return back();
    }
}
