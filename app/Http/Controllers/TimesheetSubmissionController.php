<?php

namespace App\Http\Controllers;

use App\Actions\Timesheets\SubmitTimesheet;
use App\Models\Timesheet;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;

class TimesheetSubmissionController extends Controller
{
    /**
     * Submit the employee's own timesheet for approval.
     */
    public function store(Timesheet $timesheet, SubmitTimesheet $submitTimesheet): RedirectResponse
    {
        Gate::authorize('submit', $timesheet);

        $submitTimesheet->handle($timesheet);

        $this->toast(__('Timesheet submitted for approval.'));

        return back();
    }
}
