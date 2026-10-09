<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\Shift;
use App\Notifications\SchedulePublished;
use App\Support\Timesheets\TimesheetCalculator;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class PublishScheduleController extends Controller
{
    /**
     * Publish every draft shift in the week and notify the employees who were scheduled.
     */
    public function store(Request $request): RedirectResponse
    {
        Gate::authorize('create', Shift::class);

        $organization = $this->organization();
        $validated = $request->validate(['week' => ['required', 'date_format:Y-m-d']]);
        $weekStart = $organization->weekStartFromDate($validated['week']);
        [$from, $to] = TimesheetCalculator::weekBounds($weekStart);

        $drafts = Shift::query()
            ->whereNull('published_at')
            ->where('starts_at', '>=', $from)
            ->where('starts_at', '<', $to)
            ->get();

        if ($drafts->isEmpty()) {
            $this->toast(__('Everything this week is already published.'), 'info');

            return back();
        }

        Shift::query()->whereKey($drafts->modelKeys())->update(['published_at' => now()]);

        $shiftCounts = $drafts->whereNotNull('employee_id')->countBy('employee_id');

        Employee::query()
            ->whereKey($shiftCounts->keys())
            ->whereNotNull('user_id')
            ->with('user')
            ->get()
            ->each(fn (Employee $employee) => $employee->user->notify(
                new SchedulePublished($organization, $weekStart, $shiftCounts[$employee->id]),
            ));

        $this->toast(__('Published :count shift(s). Your team has been notified.', ['count' => $drafts->count()]));

        return back();
    }
}
