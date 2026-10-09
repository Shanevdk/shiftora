<?php

namespace App\Support\Timesheets;

/**
 * Splits worked minutes into regular and overtime for a single pay week.
 *
 * Daily overtime is applied first; the remaining regular minutes then count
 * toward the weekly threshold in chronological order, so a minute is never
 * counted as overtime twice.
 */
class OvertimeCalculator
{
    /**
     * @param  array<string, int>  $workedMinutesByDate  Worked minutes keyed by local Y-m-d date.
     * @return array<string, array{worked_minutes: int, regular_minutes: int, overtime_minutes: int}>
     */
    public static function calculate(array $workedMinutesByDate, ?int $dailyThreshold, ?int $weeklyThreshold): array
    {
        ksort($workedMinutesByDate);

        $regularMinutesSoFar = 0;
        $days = [];

        foreach ($workedMinutesByDate as $date => $workedMinutes) {
            $dailyOvertime = $dailyThreshold !== null ? max(0, $workedMinutes - $dailyThreshold) : 0;
            $regularMinutes = $workedMinutes - $dailyOvertime;

            $weeklyOvertime = 0;

            if ($weeklyThreshold !== null) {
                $remainingRegularAllowance = max(0, $weeklyThreshold - $regularMinutesSoFar);
                $weeklyOvertime = max(0, $regularMinutes - $remainingRegularAllowance);
                $regularMinutes -= $weeklyOvertime;
            }

            $regularMinutesSoFar += $regularMinutes;

            $days[$date] = [
                'worked_minutes' => $workedMinutes,
                'regular_minutes' => $regularMinutes,
                'overtime_minutes' => $dailyOvertime + $weeklyOvertime,
            ];
        }

        return $days;
    }
}
