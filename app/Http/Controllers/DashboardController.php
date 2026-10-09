<?php

namespace App\Http\Controllers;

use App\Enums\Feature;
use App\Enums\TimesheetStatus;
use App\Http\Presenters\EmployeePresenter;
use App\Http\Presenters\ShiftPresenter;
use App\Http\Presenters\TimeEntryPresenter;
use App\Models\Employee;
use App\Models\Organization;
use App\Models\Shift;
use App\Models\TimeEntry;
use App\Models\Timesheet;
use App\Support\Timesheets\TimesheetCalculator;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Show the personal dashboard, plus a live team overview for managers.
     */
    public function __invoke(): Response
    {
        $organization = $this->organization();
        $employee = $this->currentEmployee();
        $weekStart = $organization->weekStartFor(now());
        $schedulingEnabled = $organization->hasFeature(Feature::Scheduling);

        return Inertia::render('dashboard', [
            'weekStart' => $weekStart->toDateString(),
            'clock' => TimeEntryPresenter::clockState($employee),
            'myWeek' => TimesheetCalculator::summarizeWeek(
                $organization,
                TimesheetCalculator::entriesForWeek($employee, $weekStart),
                $weekStart,
            ),
            'upcomingShifts' => ! $schedulingEnabled ? [] : $employee->shifts()
                ->published()
                ->with('location')
                ->where('ends_at', '>', now())
                ->orderBy('starts_at')
                ->limit(5)
                ->get()
                ->map(fn (Shift $shift): array => ShiftPresenter::present($shift)),
            'team' => $employee->role->canManageSchedule()
                ? Inertia::defer(fn (): array => $this->teamOverview($organization))
                : null,
        ]);
    }

    /**
     * Who is working right now, today's coverage and what needs attention.
     *
     * @return array<string, mixed>
     */
    private function teamOverview(Organization $organization): array
    {
        $localToday = $organization->localNow()->startOfDay();
        $weekStart = $organization->weekStartFor(now());
        [$weekFrom, $weekTo] = TimesheetCalculator::weekBounds($weekStart);

        $openEntries = TimeEntry::query()
            ->whereNull('clock_out_at')
            ->with(['employee', 'openBreak', 'location'])
            ->orderBy('clock_in_at')
            ->get();

        $schedulingEnabled = $organization->hasFeature(Feature::Scheduling);

        $todaysShifts = ! $schedulingEnabled ? collect() : Shift::query()
            ->with(['employee', 'location'])
            ->overlapping($localToday->utc(), $localToday->addDay()->utc())
            ->orderBy('starts_at')
            ->get();

        $weekEntries = TimeEntry::query()
            ->with('openBreak')
            ->where('clock_in_at', '>=', $weekFrom)
            ->where('clock_in_at', '<', $weekTo)
            ->get();

        return [
            'clockedIn' => $openEntries->map(fn (TimeEntry $entry): array => [
                'employee' => EmployeePresenter::summary($entry->employee),
                'entry' => TimeEntryPresenter::present($entry),
            ]),
            'todaysShifts' => $todaysShifts->map(fn (Shift $shift): array => [
                ...ShiftPresenter::present($shift),
                'employee' => $shift->employee ? EmployeePresenter::summary($shift->employee) : null,
            ]),
            'activeEmployeeCount' => Employee::query()->active()->count(),
            'pendingApprovalCount' => Timesheet::query()->where('status', TimesheetStatus::Submitted)->count(),
            'weekWorkedMinutes' => $weekEntries->sum(fn (TimeEntry $entry): int => $entry->workedMinutes()),
            'weekScheduledMinutes' => ! $schedulingEnabled ? 0 : Shift::query()
                ->where('starts_at', '>=', $weekFrom)
                ->where('starts_at', '<', $weekTo)
                ->get()
                ->sum(fn (Shift $shift): int => $shift->scheduledMinutes()),
        ];
    }
}
