<?php

namespace App\Http\Controllers;

use App\Enums\Feature;
use App\Http\Requests\ReportRangeRequest;
use App\Models\TimeEntry;
use App\Support\Reports\LaborReport;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportController extends Controller
{
    /**
     * Labor hours, overtime and cost for a date range.
     */
    public function index(ReportRangeRequest $request): Response
    {
        [$from, $to] = $request->range();
        $organization = $this->organization();
        $report = new LaborReport($organization, $from, $to);

        return Inertia::render('reports/index', [
            'range' => ['from' => $from->toDateString(), 'to' => $to->toDateString()],
            'totals' => $report->totals(),
            'employees' => $report->employeeRows(),
            'daily' => $report->daily(),
            'overtimeMultiplier' => config('shiftora.overtime_multiplier'),
            'canExport' => $organization->hasFeature(Feature::CsvExport),
        ]);
    }

    /**
     * Download the report as CSV: a per-employee payroll summary, or every time entry in the range.
     */
    public function export(ReportRangeRequest $request): StreamedResponse
    {
        $type = $request->validate(['type' => ['nullable', 'in:summary,entries']])['type'] ?? 'summary';

        [$from, $to] = $request->range();
        $organization = $this->organization();
        $filename = sprintf('shiftora-%s-%s-to-%s.csv', $type, $from->toDateString(), $to->toDateString());

        return response()->streamDownload(function () use ($type, $organization, $from, $to): void {
            $output = fopen('php://output', 'w');

            if ($output === false) {
                return;
            }

            if ($type === 'summary') {
                fputcsv($output, ['Employee', 'Job title', 'Regular hours', 'Overtime hours', 'Total hours', 'Gross pay']);

                foreach ((new LaborReport($organization, $from, $to))->employeeRows() as $row) {
                    fputcsv($output, self::safeRow([
                        $row['employee']['name'],
                        $row['employee']['job_title'],
                        self::hours($row['regular_minutes']),
                        self::hours($row['overtime_minutes']),
                        self::hours($row['worked_minutes']),
                        number_format($row['labor_cost_cents'] / 100, 2, '.', ''),
                    ]));
                }
            } else {
                fputcsv($output, ['Employee', 'Date', 'Clock in', 'Clock out', 'Break minutes', 'Worked hours', 'Location', 'Source', 'Notes']);

                TimeEntry::query()
                    ->where('organization_id', $organization->id)
                    ->with(['employee', 'location', 'openBreak'])
                    ->where('clock_in_at', '>=', $from->utc())
                    ->where('clock_in_at', '<', $to->addDay()->utc())
                    ->orderBy('clock_in_at')
                    ->orderBy('id')
                    ->lazy(500)
                    ->each(function (TimeEntry $entry) use ($output, $organization): void {
                        $clockIn = $entry->clock_in_at->setTimezone($organization->timezone);

                        fputcsv($output, self::safeRow([
                            $entry->employee->full_name,
                            $clockIn->toDateString(),
                            $clockIn->format('H:i'),
                            $entry->clock_out_at?->setTimezone($organization->timezone)->format('Y-m-d H:i'),
                            $entry->break_minutes,
                            self::hours($entry->workedMinutes()),
                            $entry->location?->name,
                            $entry->source,
                            $entry->notes,
                        ]));
                    });
            }

            fclose($output);
        }, $filename, ['Content-Type' => 'text/csv']);
    }

    private static function hours(int $minutes): string
    {
        return number_format($minutes / 60, 2, '.', '');
    }

    /**
     * Neutralize user-entered text that a spreadsheet would otherwise evaluate as a formula.
     *
     * @param  list<string|int|null>  $row
     * @return list<string|int|null>
     */
    private static function safeRow(array $row): array
    {
        return array_map(
            fn (string|int|null $value): string|int|null => is_string($value) && preg_match('/^[=+\-@\t\r]/', $value) === 1 ? "'".$value : $value,
            $row,
        );
    }
}
