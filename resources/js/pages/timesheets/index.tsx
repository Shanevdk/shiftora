import { Head, Link } from '@inertiajs/react';
import { ChevronRight, Clock, Hourglass, Inbox, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import EmptyState from '@/components/empty-state';
import PageContainer from '@/components/page-container';
import PageHeader from '@/components/page-header';
import StatCard from '@/components/stat-card';
import TimesheetStatusBadge from '@/components/timesheet-status-badge';
import InProgressHint from '@/components/timesheets/in-progress-hint';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import UpgradeCallout from '@/components/upgrade-callout';
import WeekNavigator from '@/components/week-navigator';
import { useWorkspace } from '@/hooks/use-workspace';
import { formatHours, formatMinutes } from '@/lib/time';
import { cn } from '@/lib/utils';
import { index, show } from '@/routes/timesheets';
import type { EmployeeSummary, TimesheetStatus } from '@/types';

type TimesheetRow = {
    employee: EmployeeSummary;
    status: TimesheetStatus;
    submitted_at: string | null;
    worked_minutes: number;
    regular_minutes: number;
    overtime_minutes: number;
    has_open_entry: boolean;
};

type StatusFilter = 'all' | 'submitted';

type Props = {
    weekStart: string;
    previousWeek: string;
    nextWeek: string;
    rows: TimesheetRow[];
    approvalsEnabled: boolean;
};

export default function TimesheetsIndex({
    weekStart,
    previousWeek,
    nextWeek,
    rows,
    approvalsEnabled,
}: Props) {
    const { can } = useWorkspace();
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

    const totals = useMemo(
        () => ({
            worked: rows.reduce((sum, row) => sum + row.worked_minutes, 0),
            overtime: rows.reduce((sum, row) => sum + row.overtime_minutes, 0),
            awaitingApproval: rows.filter((row) => row.status === 'submitted')
                .length,
            clockedIn: rows.filter((row) => row.has_open_entry).length,
        }),
        [rows],
    );

    const visibleRows =
        approvalsEnabled && statusFilter === 'submitted'
            ? rows.filter((row) => row.status === 'submitted')
            : rows;

    return (
        <>
            <Head title="Timesheets" />

            <PageContainer>
                <PageHeader
                    title="Timesheets"
                    description="Hours worked by your team, week by week."
                    actions={
                        <WeekNavigator
                            weekStart={weekStart}
                            previousWeek={previousWeek}
                            nextWeek={nextWeek}
                            hrefForWeek={(week) =>
                                index.url({ query: { week } })
                            }
                            currentWeekHref={index.url()}
                        />
                    }
                />

                <div className="grid gap-4 sm:grid-cols-3">
                    <StatCard
                        label="Team hours worked"
                        value={formatMinutes(totals.worked)}
                        hint={`${formatHours(totals.worked)} hours`}
                        icon={Clock}
                    />
                    <StatCard
                        label="Overtime"
                        value={formatMinutes(totals.overtime)}
                        hint={`${formatHours(totals.overtime)} hours`}
                        icon={Hourglass}
                    />
                    {approvalsEnabled ? (
                        <StatCard
                            label="Awaiting approval"
                            value={totals.awaitingApproval}
                            hint={
                                totals.awaitingApproval === 1
                                    ? '1 timesheet to review'
                                    : `${totals.awaitingApproval} timesheets to review`
                            }
                            icon={Inbox}
                        />
                    ) : (
                        <StatCard
                            label="Clocked in now"
                            value={totals.clockedIn}
                            hint="Employees with an open entry this week"
                            icon={Users}
                        />
                    )}
                </div>

                {!approvalsEnabled && can('approveTimesheets') && (
                    <UpgradeCallout
                        feature="Timesheet approvals"
                        plan="Professional"
                        description="Have employees submit their week and approve it before payroll."
                    />
                )}

                {rows.length === 0 ? (
                    <EmptyState
                        icon={Users}
                        title="No employees yet"
                        description="Once your team clocks in, their weekly hours show up here."
                    />
                ) : (
                    <div className="flex flex-col gap-3">
                        {approvalsEnabled && (
                            <ToggleGroup
                                type="single"
                                variant="outline"
                                size="sm"
                                value={statusFilter}
                                onValueChange={(value) =>
                                    setStatusFilter(
                                        (value || 'all') as StatusFilter,
                                    )
                                }
                                aria-label="Filter timesheets"
                                className="self-start"
                            >
                                <ToggleGroupItem value="all" className="px-3">
                                    All
                                </ToggleGroupItem>
                                <ToggleGroupItem
                                    value="submitted"
                                    className="px-3"
                                >
                                    Awaiting approval
                                    <span className="text-muted-foreground tabular">
                                        {totals.awaitingApproval}
                                    </span>
                                </ToggleGroupItem>
                            </ToggleGroup>
                        )}

                        {visibleRows.length === 0 ? (
                            <EmptyState
                                icon={Inbox}
                                title="Nothing awaiting approval"
                                description="Submitted timesheets for this week will appear here."
                            />
                        ) : (
                            <div className="rounded-xl border bg-card shadow-xs">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="pl-4">
                                                Employee
                                            </TableHead>
                                            <TableHead className="text-right">
                                                Regular
                                            </TableHead>
                                            <TableHead className="text-right">
                                                Overtime
                                            </TableHead>
                                            <TableHead className="text-right">
                                                Total
                                            </TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="w-12 pr-4">
                                                <span className="sr-only">
                                                    Open timesheet
                                                </span>
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {visibleRows.map((row) => (
                                            <TimesheetTableRow
                                                key={row.employee.id}
                                                row={row}
                                                weekStart={weekStart}
                                                approvalsEnabled={
                                                    approvalsEnabled
                                                }
                                            />
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </div>
                )}
            </PageContainer>
        </>
    );
}

function TimesheetTableRow({
    row,
    weekStart,
    approvalsEnabled,
}: {
    row: TimesheetRow;
    weekStart: string;
    approvalsEnabled: boolean;
}) {
    const href = show.url(
        { employee: row.employee.id },
        { query: { week: weekStart } },
    );

    return (
        <TableRow>
            <TableCell className="pl-4">
                <div className="flex items-center gap-3">
                    <span
                        className="size-2.5 shrink-0 rounded-full bg-muted-foreground/40"
                        style={
                            row.employee.color
                                ? { backgroundColor: row.employee.color }
                                : undefined
                        }
                        aria-hidden="true"
                    />
                    <div className="min-w-0">
                        <Link
                            href={href}
                            className="font-medium hover:underline focus-visible:underline"
                        >
                            {row.employee.name}
                        </Link>
                        {row.employee.job_title && (
                            <p className="truncate text-xs text-muted-foreground">
                                {row.employee.job_title}
                            </p>
                        )}
                    </div>
                </div>
            </TableCell>
            <TableCell className="text-right tabular">
                {formatMinutes(row.regular_minutes)}
            </TableCell>
            <TableCell
                className={cn(
                    'text-right tabular',
                    row.overtime_minutes > 0
                        ? 'font-medium text-warning'
                        : 'text-muted-foreground',
                )}
            >
                {formatMinutes(row.overtime_minutes)}
            </TableCell>
            <TableCell className="text-right">
                <div className="font-medium tabular">
                    {formatMinutes(row.worked_minutes)}
                </div>
                <div className="text-xs text-muted-foreground tabular">
                    {formatHours(row.worked_minutes)} h
                </div>
            </TableCell>
            <TableCell>
                <div className="flex flex-wrap items-center gap-2">
                    {approvalsEnabled && (
                        <TimesheetStatusBadge status={row.status} />
                    )}
                    {row.has_open_entry && <InProgressHint />}
                    {!approvalsEnabled && !row.has_open_entry && (
                        <span className="text-muted-foreground">—</span>
                    )}
                </div>
            </TableCell>
            <TableCell className="pr-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link
                        href={href}
                        aria-label={`Open ${row.employee.name}'s timesheet`}
                    >
                        <ChevronRight />
                    </Link>
                </Button>
            </TableCell>
        </TableRow>
    );
}

TimesheetsIndex.layout = {
    breadcrumbs: [{ title: 'Timesheets', href: index() }],
};
