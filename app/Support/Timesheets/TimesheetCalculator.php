<?php

namespace App\Support\Timesheets;

use App\Enums\Feature;
use App\Models\Employee;
use App\Models\Organization;
use App\Models\TimeEntry;
use App\Models\Timesheet;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

class TimesheetCalculator
{
    /**
     * The UTC bounds of a local pay week, for querying time entries by clock-in time.
     *
     * @return array{0: CarbonImmutable, 1: CarbonImmutable}
     */
    public static function weekBounds(CarbonImmutable $weekStart): array
    {
        return [$weekStart->utc(), $weekStart->addWeek()->utc()];
    }

    /**
     * The employee's time entries that started within the given pay week, oldest first.
     *
     * @return Collection<int, TimeEntry>
     */
    public static function entriesForWeek(Employee $employee, CarbonImmutable $weekStart): Collection
    {
        [$from, $to] = self::weekBounds($weekStart);

        return $employee->timeEntries()
            ->with(['openBreak', 'location'])
            ->where('clock_in_at', '>=', $from)
            ->where('clock_in_at', '<', $to)
            ->orderBy('clock_in_at')
            ->orderBy('id')
            ->get();
    }

    /**
     * Summarize the timesheet's week from its current time entries.
     *
     * @return array{days: list<array{date: string, worked_minutes: int, regular_minutes: int, overtime_minutes: int}>, worked_minutes: int, regular_minutes: int, overtime_minutes: int, break_minutes: int, has_open_entry: bool}
     */
    public static function summarizeTimesheet(Timesheet $timesheet): array
    {
        $weekStart = CarbonImmutable::parse($timesheet->period_start->toDateString(), $timesheet->employee->organization->timezone);

        return self::summarizeWeek(
            $timesheet->employee->organization,
            self::entriesForWeek($timesheet->employee, $weekStart),
            $weekStart,
        );
    }

    /**
     * Summarize one employee's entries for a single pay week, applying the organization's overtime rules.
     *
     * Open entries are measured up to now so live totals stay accurate.
     *
     * @param  Collection<int, TimeEntry>  $entries
     * @return array{days: list<array{date: string, worked_minutes: int, regular_minutes: int, overtime_minutes: int}>, worked_minutes: int, regular_minutes: int, overtime_minutes: int, break_minutes: int, has_open_entry: bool}
     */
    public static function summarizeWeek(Organization $organization, Collection $entries, CarbonImmutable $weekStart): array
    {
        $workedMinutesByDate = [];

        for ($day = 0; $day < 7; $day++) {
            $workedMinutesByDate[$weekStart->addDays($day)->toDateString()] = 0;
        }

        $breakMinutes = 0;

        foreach ($entries as $entry) {
            $date = $entry->clock_in_at->setTimezone($organization->timezone)->toDateString();

            if (! array_key_exists($date, $workedMinutesByDate)) {
                continue;
            }

            $workedMinutesByDate[$date] += $entry->workedMinutes();
            $breakMinutes += $entry->break_minutes;
        }

        $appliesOvertime = $organization->hasFeature(Feature::OvertimeRules);

        $days = OvertimeCalculator::calculate(
            $workedMinutesByDate,
            $appliesOvertime ? $organization->daily_overtime_minutes : null,
            $appliesOvertime ? $organization->weekly_overtime_minutes : null,
        );

        return [
            'days' => array_map(
                fn (string $date, array $day): array => ['date' => $date, ...$day],
                array_keys($days),
                array_values($days),
            ),
            'worked_minutes' => array_sum(array_column($days, 'worked_minutes')),
            'regular_minutes' => array_sum(array_column($days, 'regular_minutes')),
            'overtime_minutes' => array_sum(array_column($days, 'overtime_minutes')),
            'break_minutes' => $breakMinutes,
            'has_open_entry' => $entries->contains(fn (TimeEntry $entry): bool => $entry->isOpen()),
        ];
    }

    /**
     * Gross labor cost in cents, paying overtime at the configured multiplier.
     */
    public static function laborCostCents(int $regularMinutes, int $overtimeMinutes, ?int $hourlyRateCents): int
    {
        if ($hourlyRateCents === null) {
            return 0;
        }

        $multiplier = (float) config('shiftora.overtime_multiplier');

        return (int) round($hourlyRateCents * ($regularMinutes + $overtimeMinutes * $multiplier) / 60);
    }
}
