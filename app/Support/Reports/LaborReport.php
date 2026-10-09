<?php

namespace App\Support\Reports;

use App\Http\Presenters\EmployeePresenter;
use App\Models\Employee;
use App\Models\Organization;
use App\Models\Shift;
use App\Models\TimeEntry;
use App\Support\Timesheets\TimesheetCalculator;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

/**
 * Hours, overtime and labor cost for a date range.
 *
 * Overtime is always calculated over whole pay weeks, then only the days inside the range are counted,
 * so a report never under-counts overtime that was earned earlier in a week.
 */
class LaborReport
{
    /**
     * @var array<int, array{worked_minutes: int, regular_minutes: int, overtime_minutes: int}>
     */
    private array $employeeTotals = [];

    /**
     * @var array<string, array{date: string, worked_minutes: int, overtime_minutes: int, scheduled_minutes: int}>
     */
    private array $daily = [];

    /**
     * @var Collection<int, Employee>
     */
    private Collection $employees;

    public function __construct(
        public readonly Organization $organization,
        public readonly CarbonImmutable $from,
        public readonly CarbonImmutable $to,
    ) {
        $this->build();
    }

    /**
     * @return array{worked_minutes: int, regular_minutes: int, overtime_minutes: int, scheduled_minutes: int, labor_cost_cents: int}
     */
    public function totals(): array
    {
        $rows = $this->employeeRows();

        return [
            'worked_minutes' => array_sum(array_column($rows, 'worked_minutes')),
            'regular_minutes' => array_sum(array_column($rows, 'regular_minutes')),
            'overtime_minutes' => array_sum(array_column($rows, 'overtime_minutes')),
            'scheduled_minutes' => array_sum(array_column($this->daily, 'scheduled_minutes')),
            'labor_cost_cents' => array_sum(array_column($rows, 'labor_cost_cents')),
        ];
    }

    /**
     * @return list<array{employee: array<string, mixed>, worked_minutes: int, regular_minutes: int, overtime_minutes: int, labor_cost_cents: int}>
     */
    public function employeeRows(): array
    {
        return array_values($this->employees
            ->filter(fn (Employee $employee): bool => isset($this->employeeTotals[$employee->id]))
            ->map(function (Employee $employee): array {
                $totals = $this->employeeTotals[$employee->id];

                return [
                    'employee' => EmployeePresenter::summary($employee),
                    ...$totals,
                    'labor_cost_cents' => TimesheetCalculator::laborCostCents($totals['regular_minutes'], $totals['overtime_minutes'], $employee->hourly_rate_cents),
                ];
            })
            ->sortByDesc('worked_minutes')
            ->all());
    }

    /**
     * @return list<array{date: string, worked_minutes: int, overtime_minutes: int, scheduled_minutes: int}>
     */
    public function daily(): array
    {
        return array_values($this->daily);
    }

    private function build(): void
    {
        for ($day = $this->from; $day->lessThanOrEqualTo($this->to); $day = $day->addDay()) {
            $this->daily[$day->toDateString()] = ['date' => $day->toDateString(), 'worked_minutes' => 0, 'overtime_minutes' => 0, 'scheduled_minutes' => 0];
        }

        $employeeIds = [];

        for ($weekStart = $this->organization->weekStartFor($this->from); $weekStart->lessThanOrEqualTo($this->to); $weekStart = $weekStart->addWeek()) {
            [$weekFrom, $weekTo] = TimesheetCalculator::weekBounds($weekStart);

            $entriesByEmployee = TimeEntry::query()
                ->where('organization_id', $this->organization->id)
                ->with('openBreak')
                ->where('clock_in_at', '>=', $weekFrom)
                ->where('clock_in_at', '<', $weekTo)
                ->get()
                ->groupBy('employee_id');

            foreach ($entriesByEmployee as $employeeId => $entries) {
                $employeeIds[] = $employeeId;
                $summary = TimesheetCalculator::summarizeWeek($this->organization, $entries, $weekStart);

                foreach ($summary['days'] as $day) {
                    if (! isset($this->daily[$day['date']])) {
                        continue;
                    }

                    $this->daily[$day['date']]['worked_minutes'] += $day['worked_minutes'];
                    $this->daily[$day['date']]['overtime_minutes'] += $day['overtime_minutes'];

                    $this->employeeTotals[$employeeId] ??= ['worked_minutes' => 0, 'regular_minutes' => 0, 'overtime_minutes' => 0];
                    $this->employeeTotals[$employeeId]['worked_minutes'] += $day['worked_minutes'];
                    $this->employeeTotals[$employeeId]['regular_minutes'] += $day['regular_minutes'];
                    $this->employeeTotals[$employeeId]['overtime_minutes'] += $day['overtime_minutes'];
                }
            }
        }

        Shift::query()
            ->where('organization_id', $this->organization->id)
            ->where('starts_at', '>=', $this->from->utc())
            ->where('starts_at', '<', $this->to->addDay()->utc())
            ->get()
            ->each(function (Shift $shift): void {
                $date = $shift->starts_at->setTimezone($this->organization->timezone)->toDateString();

                if (isset($this->daily[$date])) {
                    $this->daily[$date]['scheduled_minutes'] += $shift->scheduledMinutes();
                }
            });

        $this->employees = Employee::query()
            ->where('organization_id', $this->organization->id)
            ->whereKey(array_unique($employeeIds))
            ->get();
    }
}
