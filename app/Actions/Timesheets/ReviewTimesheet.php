<?php

namespace App\Actions\Timesheets;

use App\Enums\TimesheetStatus;
use App\Models\Employee;
use App\Models\Timesheet;
use App\Models\User;
use App\Notifications\TimesheetReviewed;
use App\Support\Timesheets\TimesheetCalculator;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ReviewTimesheet
{
    /**
     * Approve a timesheet, locking its entries and recording the final totals.
     *
     * The employee row is locked, as it is when clocking in, so no time can be added to the week mid-approval.
     *
     * @throws ValidationException
     */
    public function approve(Timesheet $timesheet, User $reviewer, ?string $note = null): Timesheet
    {
        $this->ensureStatus($timesheet, TimesheetStatus::Submitted, __('Only submitted timesheets can be approved.'));

        return DB::transaction(function () use ($timesheet, $reviewer, $note): Timesheet {
            Employee::query()->whereKey($timesheet->employee_id)->lockForUpdate()->first();

            $summary = TimesheetCalculator::summarizeTimesheet($timesheet);

            if ($summary['has_open_entry']) {
                throw ValidationException::withMessages(['timesheet' => __('This employee is still clocked in. They need to clock out before the timesheet can be approved.')]);
            }

            return $this->complete($timesheet, $reviewer, TimesheetStatus::Approved, $note, [
                'regular_minutes' => $summary['regular_minutes'],
                'overtime_minutes' => $summary['overtime_minutes'],
                'break_minutes' => $summary['break_minutes'],
            ]);
        });
    }

    /**
     * Send a timesheet back to the employee for corrections.
     *
     * @throws ValidationException
     */
    public function reject(Timesheet $timesheet, User $reviewer, string $note): Timesheet
    {
        $this->ensureStatus($timesheet, TimesheetStatus::Submitted, __('Only submitted timesheets can be rejected.'));

        return $this->complete($timesheet, $reviewer, TimesheetStatus::Rejected, $note);
    }

    /**
     * Unlock an approved timesheet so its entries can be corrected.
     *
     * @throws ValidationException
     */
    public function reopen(Timesheet $timesheet, User $reviewer): Timesheet
    {
        $this->ensureStatus($timesheet, TimesheetStatus::Approved, __('Only approved timesheets can be reopened.'));

        $timesheet->update([
            'status' => TimesheetStatus::Open,
            'reviewed_at' => now(),
            'reviewed_by' => $reviewer->id,
            'review_note' => null,
        ]);

        return $timesheet;
    }

    /**
     * @param  array<string, int>  $totals
     */
    private function complete(Timesheet $timesheet, User $reviewer, TimesheetStatus $status, ?string $note, array $totals = []): Timesheet
    {
        $timesheet->update([
            ...$totals,
            'status' => $status,
            'reviewed_at' => now(),
            'reviewed_by' => $reviewer->id,
            'review_note' => $note,
        ]);

        $timesheet->employee->user?->notify(new TimesheetReviewed($timesheet));

        return $timesheet;
    }

    /**
     * @throws ValidationException
     */
    private function ensureStatus(Timesheet $timesheet, TimesheetStatus $expected, string $message): void
    {
        if ($timesheet->status !== $expected) {
            throw ValidationException::withMessages(['timesheet' => $message]);
        }
    }
}
