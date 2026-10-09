<?php

namespace App\Http\Controllers;

use App\Enums\Feature;
use App\Enums\TimesheetStatus;
use App\Http\Presenters\EmployeePresenter;
use App\Http\Presenters\TimeEntryPresenter;
use App\Models\Employee;
use App\Models\TimeEntry;
use App\Models\Timesheet;
use App\Support\Timesheets\TimesheetCalculator;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class TimesheetController extends Controller
{
    /**
     * Weekly overview of every employee's hours and approval status. Employees are sent to their own timesheet.
     */
    public function index(Request $request): Response|RedirectResponse
    {
        $organization = $this->organization();
        $weekStart = $organization->weekStartFromDate($request->string('week')->toString() ?: null);

        if ($request->user()->cannot('viewAny', Timesheet::class)) {
            return to_route('timesheets.show', ['employee' => $this->currentEmployee(), 'week' => $weekStart->toDateString()]);
        }

        [$from, $to] = TimesheetCalculator::weekBounds($weekStart);

        $entriesByEmployee = TimeEntry::query()
            ->with('openBreak')
            ->where('clock_in_at', '>=', $from)
            ->where('clock_in_at', '<', $to)
            ->get()
            ->groupBy('employee_id');

        $timesheets = Timesheet::query()
            ->whereDate('period_start', $weekStart->toDateString())
            ->get()
            ->keyBy('employee_id');

        $employees = Employee::query()
            ->where(fn ($query) => $query->where('is_active', true)->orWhereIn('id', $entriesByEmployee->keys()))
            ->orderBy('first_name')
            ->orderBy('last_name')
            ->get();

        $rows = $employees->map(function (Employee $employee) use ($organization, $entriesByEmployee, $timesheets, $weekStart): array {
            $summary = TimesheetCalculator::summarizeWeek($organization, $entriesByEmployee->get($employee->id, collect()), $weekStart);
            $timesheet = $timesheets->get($employee->id);

            return [
                'employee' => EmployeePresenter::summary($employee),
                'status' => ($timesheet->status ?? TimesheetStatus::Open)->value,
                'submitted_at' => $timesheet?->submitted_at?->toIso8601String(),
                'worked_minutes' => $summary['worked_minutes'],
                'regular_minutes' => $summary['regular_minutes'],
                'overtime_minutes' => $summary['overtime_minutes'],
                'has_open_entry' => $summary['has_open_entry'],
            ];
        });

        return Inertia::render('timesheets/index', [
            'weekStart' => $weekStart->toDateString(),
            'previousWeek' => $weekStart->subWeek()->toDateString(),
            'nextWeek' => $weekStart->addWeek()->toDateString(),
            'rows' => $rows,
            'approvalsEnabled' => $organization->hasFeature(Feature::TimesheetApprovals),
        ]);
    }

    /**
     * One employee's timesheet for a pay week.
     */
    public function show(Request $request, Employee $employee): Response
    {
        Gate::authorize('viewForEmployee', [Timesheet::class, $employee]);

        $organization = $this->organization();
        $weekStart = $organization->weekStartFromDate($request->string('week')->toString() ?: null);
        $timesheet = Timesheet::forWeek($employee, $weekStart)->load('reviewer');
        $entries = TimesheetCalculator::entriesForWeek($employee, $weekStart);
        $user = $request->user();
        $approvalsEnabled = $organization->hasFeature(Feature::TimesheetApprovals);

        return Inertia::render('timesheets/show', [
            'employee' => EmployeePresenter::summary($employee),
            'weekStart' => $weekStart->toDateString(),
            'previousWeek' => $weekStart->subWeek()->toDateString(),
            'nextWeek' => $weekStart->addWeek()->toDateString(),
            'timesheet' => [
                'id' => $timesheet->id,
                'status' => $timesheet->status->value,
                'submitted_at' => $timesheet->submitted_at?->toIso8601String(),
                'reviewed_at' => $timesheet->reviewed_at?->toIso8601String(),
                'reviewer' => $timesheet->reviewer?->name,
                'review_note' => $timesheet->review_note,
            ],
            'entries' => $entries->map(fn (TimeEntry $entry): array => TimeEntryPresenter::present($entry)),
            'summary' => TimesheetCalculator::summarizeWeek($organization, $entries, $weekStart),
            'locations' => $organization->locations()->orderBy('name')->get(['id', 'name']),
            'approvalsEnabled' => $approvalsEnabled,
            'can' => [
                'submit' => $approvalsEnabled && $user->can('submit', $timesheet) && $timesheet->status->isSubmittable(),
                'review' => $approvalsEnabled && $user->can('review', $timesheet) && $timesheet->status === TimesheetStatus::Submitted,
                'reopen' => $approvalsEnabled && $user->can('review', $timesheet) && $timesheet->status === TimesheetStatus::Approved,
                'editEntries' => $user->can('createFor', [TimeEntry::class, $employee, $weekStart]),
            ],
        ]);
    }
}
