<?php

namespace App\Actions\Timesheets;

use App\Enums\Role;
use App\Enums\TimesheetStatus;
use App\Models\Employee;
use App\Models\Timesheet;
use App\Notifications\TimesheetSubmitted;
use App\Support\Timesheets\TimesheetCalculator;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\ValidationException;

class SubmitTimesheet
{
    /**
     * Submit a timesheet for approval, snapshotting its totals and notifying the organization's approvers.
     *
     * @throws ValidationException
     */
    public function handle(Timesheet $timesheet): Timesheet
    {
        if (! $timesheet->status->isSubmittable()) {
            throw ValidationException::withMessages(['timesheet' => __('This timesheet has already been submitted.')]);
        }

        $summary = TimesheetCalculator::summarizeTimesheet($timesheet);

        if ($summary['has_open_entry']) {
            throw ValidationException::withMessages(['timesheet' => __('Clock out before submitting this timesheet.')]);
        }

        $timesheet->update([
            'status' => TimesheetStatus::Submitted,
            'submitted_at' => now(),
            'reviewed_at' => null,
            'reviewed_by' => null,
            'review_note' => null,
            'regular_minutes' => $summary['regular_minutes'],
            'overtime_minutes' => $summary['overtime_minutes'],
            'break_minutes' => $summary['break_minutes'],
        ]);

        $approvers = Employee::query()
            ->where('organization_id', $timesheet->organization_id)
            ->active()
            ->whereIn('role', [Role::Owner, Role::Admin, Role::Manager])
            ->where('id', '!=', $timesheet->employee_id)
            ->whereNotNull('user_id')
            ->with('user')
            ->get()
            ->pluck('user');

        Notification::send($approvers, new TimesheetSubmitted($timesheet));

        return $timesheet;
    }
}
