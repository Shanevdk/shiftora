import { Head, router, usePage } from '@inertiajs/react';
import {
    ArrowDown,
    ArrowUp,
    ArrowUpDown,
    BarChart3,
    CalendarClock,
    Clock,
    Download,
    Hourglass,
    Wallet,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import EmptyState from '@/components/empty-state';
import InputError from '@/components/input-error';
import PageContainer from '@/components/page-container';
import PageHeader from '@/components/page-header';
import DailyHoursChart from '@/components/reports/daily-hours-chart';
import type { DailyHours } from '@/components/reports/daily-hours-chart';
import StatCard from '@/components/stat-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Table,
    TableBody,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useWorkspace } from '@/hooks/use-workspace';
import {
    addDays,
    formatCurrency,
    formatDate,
    formatHours,
    formatMinutes,
    today,
} from '@/lib/time';
import { cn } from '@/lib/utils';
import { exportMethod, index } from '@/routes/reports';
import type { EmployeeSummary } from '@/types';

type ReportTotals = {
    worked_minutes: number;
    regular_minutes: number;
    overtime_minutes: number;
    scheduled_minutes: number;
    labor_cost_cents: number;
};

type EmployeeReportRow = {
    employee: EmployeeSummary;
    worked_minutes: number;
    regular_minutes: number;
    overtime_minutes: number;
    labor_cost_cents: number;
};

type Props = {
    range: { from: string; to: string };
    totals: ReportTotals;
    employees: EmployeeReportRow[];
    daily: DailyHours[];
    overtimeMultiplier: number;
    canExport: boolean;
};

type SortKey =
    | 'name'
    | 'worked_minutes'
    | 'regular_minutes'
    | 'overtime_minutes'
    | 'labor_cost_cents';

type Sort = { key: SortKey; direction: 'asc' | 'desc' };

type Preset = { label: string; from: string; to: string };

export default function ReportsIndex({
    range,
    totals,
    employees,
    daily,
    overtimeMultiplier,
    canExport,
}: Props) {
    const { timeZone, organization } = useWorkspace();
    const presets = useMemo(
        () => buildPresets(today(timeZone), organization?.week_starts_on ?? 0),
        [timeZone, organization?.week_starts_on],
    );

    const scheduleDifference = totals.worked_minutes - totals.scheduled_minutes;

    return (
        <>
            <Head title="Reports" />

            <PageContainer>
                <PageHeader
                    title="Reports"
                    description={`Labor hours, overtime and cost for ${formatDate(range.from, { month: 'short', day: 'numeric' })} – ${formatDate(range.to, { month: 'short', day: 'numeric', year: 'numeric' })}.`}
                    actions={
                        canExport ? (
                            <>
                                <Button variant="outline" size="sm" asChild>
                                    <a
                                        href={exportMethod.url({
                                            query: {
                                                type: 'summary',
                                                from: range.from,
                                                to: range.to,
                                            },
                                        })}
                                        download
                                    >
                                        <Download />
                                        Payroll summary CSV
                                    </a>
                                </Button>
                                <Button variant="outline" size="sm" asChild>
                                    <a
                                        href={exportMethod.url({
                                            query: {
                                                type: 'entries',
                                                from: range.from,
                                                to: range.to,
                                            },
                                        })}
                                        download
                                    >
                                        <Download />
                                        Time entries CSV
                                    </a>
                                </Button>
                            </>
                        ) : undefined
                    }
                />

                <RangeFilter
                    key={`${range.from}:${range.to}`}
                    range={range}
                    presets={presets}
                />

                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    <StatCard
                        label="Hours worked"
                        value={formatHours(totals.worked_minutes)}
                        hint={formatMinutes(totals.worked_minutes)}
                        icon={Clock}
                    />
                    <StatCard
                        label="Overtime hours"
                        value={formatHours(totals.overtime_minutes)}
                        hint={`Paid at ${overtimeMultiplier}× the hourly rate`}
                        icon={Hourglass}
                    />
                    <StatCard
                        label="Scheduled hours"
                        value={formatHours(totals.scheduled_minutes)}
                        hint={
                            totals.scheduled_minutes === 0
                                ? 'No shifts scheduled'
                                : scheduleDifference === 0
                                  ? 'Exactly on schedule'
                                  : `${formatMinutes(Math.abs(scheduleDifference))} ${scheduleDifference > 0 ? 'over' : 'under'} schedule`
                        }
                        icon={CalendarClock}
                    />
                    <StatCard
                        label="Labor cost"
                        value={formatCurrency(totals.labor_cost_cents)}
                        hint="Gross pay from hourly rates"
                        icon={Wallet}
                    />
                </div>

                <DailySection daily={daily} />

                <EmployeeTable employees={employees} totals={totals} />
            </PageContainer>
        </>
    );
}

/**
 * Quick ranges relative to today in the organization's timezone and its pay-week start.
 */
function buildPresets(currentDate: string, weekStartsOn: number): Preset[] {
    const dayOfWeek = new Date(`${currentDate}T12:00:00Z`).getUTCDay();
    const thisWeekStart = addDays(
        currentDate,
        -((dayOfWeek - weekStartsOn + 7) % 7),
    );
    const lastWeekStart = addDays(thisWeekStart, -7);

    return [
        {
            label: 'This week',
            from: thisWeekStart,
            to: addDays(thisWeekStart, 6),
        },
        {
            label: 'Last week',
            from: lastWeekStart,
            to: addDays(lastWeekStart, 6),
        },
        {
            label: 'Last 30 days',
            from: addDays(currentDate, -29),
            to: currentDate,
        },
    ];
}

function RangeFilter({
    range,
    presets,
}: {
    range: { from: string; to: string };
    presets: Preset[];
}) {
    const { errors } = usePage().props;
    const [from, setFrom] = useState(range.from);
    const [to, setTo] = useState(range.to);

    const visit = (nextFrom: string, nextTo: string): void => {
        router.get(
            index.url({ query: { from: nextFrom, to: nextTo } }),
            {},
            { preserveScroll: true },
        );
    };

    const submit = (event: FormEvent<HTMLFormElement>): void => {
        event.preventDefault();
        visit(from, to);
    };

    return (
        <form onSubmit={submit} className="flex flex-col gap-2">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div className="flex flex-wrap items-end gap-3">
                    <div className="grid gap-1.5">
                        <Label htmlFor="report-from">From</Label>
                        <Input
                            id="report-from"
                            type="date"
                            value={from}
                            max={to}
                            onChange={(event) => setFrom(event.target.value)}
                            className="w-40"
                            required
                        />
                    </div>
                    <div className="grid gap-1.5">
                        <Label htmlFor="report-to">To</Label>
                        <Input
                            id="report-to"
                            type="date"
                            value={to}
                            min={from}
                            onChange={(event) => setTo(event.target.value)}
                            className="w-40"
                            required
                        />
                    </div>
                    <Button type="submit">Apply</Button>
                </div>

                <div
                    className="flex flex-wrap gap-2"
                    role="group"
                    aria-label="Quick ranges"
                >
                    {presets.map((preset) => {
                        const isActive =
                            preset.from === range.from &&
                            preset.to === range.to;

                        return (
                            <Button
                                key={preset.label}
                                type="button"
                                size="sm"
                                variant={isActive ? 'secondary' : 'ghost'}
                                aria-pressed={isActive}
                                onClick={() => visit(preset.from, preset.to)}
                            >
                                {preset.label}
                            </Button>
                        );
                    })}
                </div>
            </div>

            <InputError message={errors.from ?? errors.to} />
        </form>
    );
}

function DailySection({ daily }: { daily: DailyHours[] }) {
    const [view, setView] = useState<'chart' | 'table'>('chart');
    const hasData = daily.some(
        (day) => day.worked_minutes > 0 || day.scheduled_minutes > 0,
    );

    return (
        <section
            aria-labelledby="daily-hours-heading"
            className="rounded-xl border bg-card p-4 shadow-xs"
        >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 id="daily-hours-heading" className="font-medium">
                        Worked vs scheduled hours
                    </h2>
                    <p className="text-xs text-muted-foreground">
                        Daily totals across the whole team
                    </p>
                </div>
                {hasData && (
                    <ToggleGroup
                        type="single"
                        variant="outline"
                        size="sm"
                        value={view}
                        onValueChange={(value) =>
                            setView(value === 'table' ? 'table' : 'chart')
                        }
                        aria-label="Daily hours view"
                    >
                        <ToggleGroupItem value="chart" className="px-3">
                            Chart
                        </ToggleGroupItem>
                        <ToggleGroupItem value="table" className="px-3">
                            Table
                        </ToggleGroupItem>
                    </ToggleGroup>
                )}
            </div>

            {!hasData ? (
                <EmptyState
                    icon={BarChart3}
                    title="No hours in this range"
                    description="Pick another date range, or check back once your team has clocked in."
                />
            ) : view === 'chart' ? (
                <DailyHoursChart days={daily} />
            ) : (
                <div className="max-h-96 overflow-y-auto rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead className="text-right">
                                    Worked
                                </TableHead>
                                <TableHead className="text-right">
                                    Scheduled
                                </TableHead>
                                <TableHead className="text-right">
                                    Overtime
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {daily.map((day) => (
                                <TableRow key={day.date}>
                                    <TableCell>
                                        {formatDate(day.date)}
                                    </TableCell>
                                    <TableCell className="text-right tabular">
                                        {formatMinutes(day.worked_minutes)}
                                    </TableCell>
                                    <TableCell className="text-right tabular">
                                        {formatMinutes(day.scheduled_minutes)}
                                    </TableCell>
                                    <TableCell
                                        className={cn(
                                            'text-right tabular',
                                            day.overtime_minutes > 0
                                                ? 'text-warning'
                                                : 'text-muted-foreground',
                                        )}
                                    >
                                        {formatMinutes(day.overtime_minutes)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </section>
    );
}

const columns: { key: SortKey; label: string; numeric: boolean }[] = [
    { key: 'name', label: 'Employee', numeric: false },
    { key: 'worked_minutes', label: 'Worked', numeric: true },
    { key: 'regular_minutes', label: 'Regular', numeric: true },
    { key: 'overtime_minutes', label: 'Overtime', numeric: true },
    { key: 'labor_cost_cents', label: 'Labor cost', numeric: true },
];

function EmployeeTable({
    employees,
    totals,
}: {
    employees: EmployeeReportRow[];
    totals: ReportTotals;
}) {
    const [sort, setSort] = useState<Sort>({
        key: 'worked_minutes',
        direction: 'desc',
    });

    const sortedEmployees = useMemo(() => {
        const sorted = [...employees].sort((first, second) =>
            sort.key === 'name'
                ? first.employee.name.localeCompare(second.employee.name)
                : first[sort.key] - second[sort.key],
        );

        return sort.direction === 'asc' ? sorted : sorted.reverse();
    }, [employees, sort]);

    const toggleSort = (key: SortKey): void => {
        setSort((current) =>
            current.key === key
                ? {
                      key,
                      direction: current.direction === 'asc' ? 'desc' : 'asc',
                  }
                : { key, direction: key === 'name' ? 'asc' : 'desc' },
        );
    };

    return (
        <section
            aria-labelledby="employee-report-heading"
            className="space-y-3"
        >
            <h2 id="employee-report-heading" className="font-medium">
                By employee
            </h2>

            {employees.length === 0 ? (
                <EmptyState
                    icon={Clock}
                    title="No time recorded"
                    description="Nobody clocked any time in this date range."
                />
            ) : (
                <div className="rounded-xl border bg-card shadow-xs">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {columns.map((column) => {
                                    const isSorted = sort.key === column.key;
                                    const SortIcon = !isSorted
                                        ? ArrowUpDown
                                        : sort.direction === 'asc'
                                          ? ArrowUp
                                          : ArrowDown;

                                    return (
                                        <TableHead
                                            key={column.key}
                                            aria-sort={
                                                isSorted
                                                    ? sort.direction === 'asc'
                                                        ? 'ascending'
                                                        : 'descending'
                                                    : undefined
                                            }
                                            className={cn(
                                                column.numeric
                                                    ? 'text-right'
                                                    : 'pl-4',
                                                column.key ===
                                                    'labor_cost_cents' &&
                                                    'pr-4',
                                            )}
                                        >
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    toggleSort(column.key)
                                                }
                                                className={cn(
                                                    'inline-flex items-center gap-1 rounded-sm font-medium hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none',
                                                    column.numeric &&
                                                        'flex-row-reverse',
                                                    !isSorted &&
                                                        'text-muted-foreground',
                                                )}
                                            >
                                                {column.label}
                                                <SortIcon
                                                    className="size-3.5"
                                                    aria-hidden="true"
                                                />
                                            </button>
                                        </TableHead>
                                    );
                                })}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedEmployees.map((row) => (
                                <TableRow key={row.employee.id}>
                                    <TableCell className="pl-4">
                                        <div className="flex items-center gap-3">
                                            <span
                                                className="size-2.5 shrink-0 rounded-full bg-muted-foreground/40"
                                                style={
                                                    row.employee.color
                                                        ? {
                                                              backgroundColor:
                                                                  row.employee
                                                                      .color,
                                                          }
                                                        : undefined
                                                }
                                                aria-hidden="true"
                                            />
                                            <div className="min-w-0">
                                                <p className="font-medium">
                                                    {row.employee.name}
                                                </p>
                                                {row.employee.job_title && (
                                                    <p className="truncate text-xs text-muted-foreground">
                                                        {row.employee.job_title}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right font-medium tabular">
                                        {formatHours(row.worked_minutes)}
                                    </TableCell>
                                    <TableCell className="text-right tabular">
                                        {formatHours(row.regular_minutes)}
                                    </TableCell>
                                    <TableCell
                                        className={cn(
                                            'text-right tabular',
                                            row.overtime_minutes > 0
                                                ? 'font-medium text-warning'
                                                : 'text-muted-foreground',
                                        )}
                                    >
                                        {formatHours(row.overtime_minutes)}
                                    </TableCell>
                                    <TableCell className="pr-4 text-right tabular">
                                        {formatCurrency(row.labor_cost_cents)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                        <TableFooter>
                            <TableRow>
                                <TableCell className="pl-4">Total</TableCell>
                                <TableCell className="text-right tabular">
                                    {formatHours(totals.worked_minutes)}
                                </TableCell>
                                <TableCell className="text-right tabular">
                                    {formatHours(totals.regular_minutes)}
                                </TableCell>
                                <TableCell className="text-right tabular">
                                    {formatHours(totals.overtime_minutes)}
                                </TableCell>
                                <TableCell className="pr-4 text-right tabular">
                                    {formatCurrency(totals.labor_cost_cents)}
                                </TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                </div>
            )}
            <p className="text-xs text-muted-foreground">
                Hours are shown as decimals for payroll.
            </p>
        </section>
    );
}

ReportsIndex.layout = {
    breadcrumbs: [{ title: 'Reports', href: index() }],
};
