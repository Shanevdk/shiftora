<?php

namespace App\Http\Controllers;

use App\Enums\Feature;
use App\Http\Presenters\EmployeePresenter;
use App\Http\Presenters\ShiftPresenter;
use App\Models\Employee;
use App\Models\Shift;
use App\Support\Timesheets\TimesheetCalculator;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ScheduleController extends Controller
{
    /**
     * Show the weekly schedule grid. Employees only see published shifts.
     */
    public function index(Request $request): Response
    {
        $organization = $this->organization();
        $weekStart = $organization->weekStartFromDate($request->string('week')->toString() ?: null);
        [$from, $to] = TimesheetCalculator::weekBounds($weekStart);

        $canManage = $request->user()->can('create', Shift::class);

        $shifts = Shift::query()
            ->with('location')
            ->unless($canManage, fn ($query) => $query->published())
            ->where('starts_at', '>=', $from)
            ->where('starts_at', '<', $to)
            ->orderBy('starts_at')
            ->orderBy('id')
            ->get();

        return Inertia::render('schedule/index', [
            'weekStart' => $weekStart->toDateString(),
            'previousWeek' => $weekStart->subWeek()->toDateString(),
            'nextWeek' => $weekStart->addWeek()->toDateString(),
            'days' => collect(range(0, 6))->map(fn (int $day): string => $weekStart->addDays($day)->toDateString()),
            'employees' => Employee::query()
                ->where(fn ($query) => $query
                    ->where('is_active', true)
                    ->orWhereIn('id', $shifts->pluck('employee_id')->filter()->unique()))
                ->orderBy('first_name')
                ->orderBy('last_name')
                ->get()
                ->map(fn (Employee $employee): array => EmployeePresenter::summary($employee)),
            'shifts' => $shifts->map(fn (Shift $shift): array => ShiftPresenter::present($shift)),
            'locations' => $organization->locations()->orderBy('name')->get(['id', 'name']),
            'unpublishedCount' => $shifts->whereNull('published_at')->count(),
            'can' => [
                'manage' => $canManage,
                'dragAndDrop' => $canManage && $organization->hasFeature(Feature::DragDropScheduling),
            ],
        ]);
    }
}
