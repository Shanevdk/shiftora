<?php

namespace App\Http\Controllers;

use App\Actions\Timesheets\ReviewTimesheet;
use App\Models\Timesheet;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class TimesheetReviewController extends Controller
{
    public function approve(Request $request, Timesheet $timesheet, ReviewTimesheet $reviewTimesheet): RedirectResponse
    {
        Gate::authorize('review', $timesheet);

        $validated = $request->validate(['note' => ['nullable', 'string', 'max:1000']]);

        $reviewTimesheet->approve($timesheet, $request->user(), $validated['note'] ?? null);

        $this->toast(__('Timesheet approved.'));

        return back();
    }

    public function reject(Request $request, Timesheet $timesheet, ReviewTimesheet $reviewTimesheet): RedirectResponse
    {
        Gate::authorize('review', $timesheet);

        $validated = $request->validate(['note' => ['required', 'string', 'max:1000']]);

        $reviewTimesheet->reject($timesheet, $request->user(), $validated['note']);

        $this->toast(__('Timesheet sent back for changes.'), 'info');

        return back();
    }

    public function reopen(Request $request, Timesheet $timesheet, ReviewTimesheet $reviewTimesheet): RedirectResponse
    {
        Gate::authorize('review', $timesheet);

        $reviewTimesheet->reopen($timesheet, $request->user());

        $this->toast(__('Timesheet reopened for corrections.'), 'info');

        return back();
    }
}
