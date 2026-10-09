import { Head, setLayoutProps } from '@inertiajs/react';
import {
    AlertTriangle,
    Clock,
    Coffee,
    Hourglass,
    Lock,
    MapPin,
    Pencil,
    Plus,
    Timer,
    Trash2,
} from 'lucide-react';
import { useState } from 'react';
import PageContainer from '@/components/page-container';
import PageHeader from '@/components/page-header';
import StatCard from '@/components/stat-card';
import TimesheetStatusBadge from '@/components/timesheet-status-badge';
import DeleteTimeEntryDialog from '@/components/timesheets/delete-time-entry-dialog';
import InProgressHint from '@/components/timesheets/in-progress-hint';
import TimesheetActions from '@/components/timesheets/timesheet-actions';
import type { TimesheetAbilities } from '@/components/timesheets/timesheet-actions';
import TimeEntryDialog from '@/components/timesheets/time-entry-dialog';
import type { TimeEntryDialogTarget } from '@/components/timesheets/time-entry-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import WeekNavigator from '@/components/week-navigator';
import { useWorkspace } from '@/hooks/use-workspace';
import {
    formatDate,
    formatDateTime,
    formatMinutes,
    formatTime,
    localDate,
    today,
} from '@/lib/time';
import { cn } from '@/lib/utils';
import { index, show } from '@/routes/timesheets';
import type {
    DaySummary,
    EmployeeSummary,
    LocationOption,
    TimeEntry,
    TimesheetStatus,
    WeekSummary,
} from '@/types';

type TimesheetDetails = {
    id: number;
    status: TimesheetStatus;
    submitted_at: string | null;
    reviewed_at: string | null;
    reviewer: string | null;
    review_note: string | null;
};

type Props = {
    employee: EmployeeSummary;
    weekStart: string;
    previousWeek: string;
    nextWeek: string;
    timesheet: TimesheetDetails;
    entries: TimeEntry[];
    summary: WeekSummary;
    locations: LocationOption[];
    approvalsEnabled: boolean;
    can: TimesheetAbilities;
};

export default function TimesheetShow({
    employee,
    weekStart,
    previousWeek,
    nextWeek,
    timesheet,
    entries,
    summary,
    locations,
    approvalsEnabled,
    can,
}: Props) {
    const { timeZone } = useWorkspace();
    const [entryDialog, setEntryDialog] =
        useState<TimeEntryDialogTarget | null>(null);
    const [entryToDelete, setEntryToDelete] = useState<TimeEntry | null>(null);

    setLayoutProps({
        breadcrumbs: [
            { title: 'Timesheets', href: index() },
            {
                title: employee.name,
                href: show(
                    { employee: employee.id },
                    { query: { week: weekStart } },
                ),
            },
        ],
    });

    const isLocked = approvalsEnabled && timesheet.status === 'approved';
    const showEditing = can.editEntries && !isLocked;
    const currentDate = today(timeZone);
    const hasActions = can.submit || can.review || can.reopen;

    const entriesByDate = entries.reduce<Record<string, TimeEntry[]>>(
        (groups, entry) => {
            const date = localDate(entry.clock_in_at, timeZone);
            (groups[date] ??= []).push(entry);

            return groups;
        },
        {},
    );

    const defaultNewEntryDate =
        summary.days.find((day) => day.date === currentDate)?.date ?? weekStart;

    return (
        <>
            <Head title={`${employee.name} · Timesheet`} />

            <PageContainer>
                <PageHeader
                    title={employee.name}
                    description={
                        employee.job_title
                            ? `${employee.job_title} · Weekly timesheet`
                            : 'Weekly timesheet'
                    }
                    actions={
                        <WeekNavigator
                            weekStart={weekStart}
                            previousWeek={previousWeek}
                            nextWeek={nextWeek}
                            hrefForWeek={(week) =>
                                show.url(
                                    { employee: employee.id },
                                    { query: { week } },
                                )
                            }
                            currentWeekHref={show.url({
                                employee: employee.id,
                            })}
                        />
                    }
                />

                {(approvalsEnabled || hasActions) && (
                    <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0 space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                                <TimesheetStatusBadge
                                    status={timesheet.status}
                                />
                                {summary.has_open_entry && <InProgressHint />}
                            </div>
                            <ReviewSummary
                                timesheet={timesheet}
                                timeZone={timeZone}
                            />
                        </div>

                        {hasActions && (
                            <TimesheetActions
                                timesheetId={timesheet.id}
                                employeeName={employee.first_name}
                                can={can}
                                hasOpenEntry={summary.has_open_entry}
                            />
                        )}
                    </div>
                )}

                {can.submit && summary.has_open_entry && (
                    <Alert>
                        <AlertTriangle className="text-warning" />
                        <AlertTitle>Still clocked in</AlertTitle>
                        <AlertDescription>
                            Clock out of the open entry before submitting this
                            week for approval.
                        </AlertDescription>
                    </Alert>
                )}

                {isLocked && (
                    <Alert>
                        <Lock />
                        <AlertTitle>
                            This week is approved and locked
                        </AlertTitle>
                        <AlertDescription>
                            {can.reopen
                                ? 'Reopen the timesheet to correct any entries.'
                                : 'Ask a manager to reopen it if something needs correcting.'}
                        </AlertDescription>
                    </Alert>
                )}

                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    <StatCard
                        label="Worked"
                        value={formatMinutes(summary.worked_minutes)}
                        icon={Clock}
                    />
                    <StatCard
                        label="Regular"
                        value={formatMinutes(summary.regular_minutes)}
                        icon={Timer}
                    />
                    <StatCard
                        label="Overtime"
                        value={formatMinutes(summary.overtime_minutes)}
                        icon={Hourglass}
                        className={
                            summary.overtime_minutes > 0
                                ? 'border-warning/40 bg-warning/5'
                                : undefined
                        }
                    />
                    <StatCard
                        label="Breaks"
                        value={formatMinutes(summary.break_minutes)}
                        icon={Coffee}
                    />
                </div>

                <section
                    aria-labelledby="daily-breakdown"
                    className="rounded-xl border bg-card shadow-xs"
                >
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
                        <div>
                            <h2 id="daily-breakdown" className="font-medium">
                                Daily breakdown
                            </h2>
                            <p className="text-xs text-muted-foreground">
                                Times shown in {timeZone}
                            </p>
                        </div>
                        {showEditing && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                    setEntryDialog({
                                        mode: 'create',
                                        date: defaultNewEntryDate,
                                    })
                                }
                            >
                                <Plus />
                                Add entry
                            </Button>
                        )}
                    </div>

                    <ol className="divide-y">
                        {summary.days.map((day) => (
                            <DayRow
                                key={day.date}
                                day={day}
                                entries={entriesByDate[day.date] ?? []}
                                isToday={day.date === currentDate}
                                timeZone={timeZone}
                                canEdit={showEditing}
                                onAdd={() =>
                                    setEntryDialog({
                                        mode: 'create',
                                        date: day.date,
                                    })
                                }
                                onEdit={(entry) =>
                                    setEntryDialog({ mode: 'edit', entry })
                                }
                                onDelete={setEntryToDelete}
                            />
                        ))}
                    </ol>
                </section>
            </PageContainer>

            {showEditing && (
                <>
                    <TimeEntryDialog
                        target={entryDialog}
                        onClose={() => setEntryDialog(null)}
                        employeeId={employee.id}
                        employeeName={employee.name}
                        locations={locations}
                        timeZone={timeZone}
                    />
                    <DeleteTimeEntryDialog
                        entry={entryToDelete}
                        onClose={() => setEntryToDelete(null)}
                        timeZone={timeZone}
                    />
                </>
            )}
        </>
    );
}

function ReviewSummary({
    timesheet,
    timeZone,
}: {
    timesheet: TimesheetDetails;
    timeZone: string;
}) {
    const reviewer = timesheet.reviewer ?? 'a manager';

    if (timesheet.status === 'approved' && timesheet.reviewed_at) {
        return (
            <div className="space-y-1 text-sm text-muted-foreground">
                <p>
                    Approved by {reviewer} on{' '}
                    {formatDateTime(timesheet.reviewed_at, timeZone)}
                </p>
                {timesheet.review_note && (
                    <p className="text-foreground">“{timesheet.review_note}”</p>
                )}
            </div>
        );
    }

    if (timesheet.status === 'rejected') {
        return (
            <div className="space-y-1 text-sm text-muted-foreground">
                <p>
                    Changes requested by {reviewer}
                    {timesheet.reviewed_at &&
                        ` on ${formatDateTime(timesheet.reviewed_at, timeZone)}`}
                </p>
                {timesheet.review_note && (
                    <p className="rounded-md border-l-2 border-destructive/60 bg-destructive/5 px-3 py-1.5 text-foreground">
                        {timesheet.review_note}
                    </p>
                )}
            </div>
        );
    }

    if (timesheet.status === 'submitted' && timesheet.submitted_at) {
        return (
            <p className="text-sm text-muted-foreground">
                Submitted {formatDateTime(timesheet.submitted_at, timeZone)} ·
                waiting for a manager to review
            </p>
        );
    }

    return <p className="text-sm text-muted-foreground">Not submitted yet.</p>;
}

function DayRow({
    day,
    entries,
    isToday,
    timeZone,
    canEdit,
    onAdd,
    onEdit,
    onDelete,
}: {
    day: DaySummary;
    entries: TimeEntry[];
    isToday: boolean;
    timeZone: string;
    canEdit: boolean;
    onAdd: () => void;
    onEdit: (entry: TimeEntry) => void;
    onDelete: (entry: TimeEntry) => void;
}) {
    const breakMinutes = entries.reduce(
        (sum, entry) => sum + entry.break_minutes,
        0,
    );

    return (
        <li
            className={cn(
                'grid gap-3 px-4 py-4 sm:grid-cols-[9rem_1fr_auto] sm:items-start',
                isToday && 'bg-accent/40',
            )}
        >
            <div className="flex items-center justify-between gap-2 sm:block">
                <div>
                    <p className="font-medium">
                        {formatDate(day.date, { weekday: 'long' })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {formatDate(day.date, {
                            month: 'short',
                            day: 'numeric',
                        })}
                        {isToday && ' · Today'}
                    </p>
                </div>
                <DayTotals
                    day={day}
                    breakMinutes={breakMinutes}
                    className="sm:hidden"
                />
            </div>

            <div className="min-w-0 space-y-2">
                {entries.length === 0 ? (
                    <p className="py-1 text-sm text-muted-foreground">
                        No time recorded
                    </p>
                ) : (
                    <ul className="space-y-2">
                        {entries.map((entry) => (
                            <EntryItem
                                key={entry.id}
                                entry={entry}
                                timeZone={timeZone}
                                canEdit={canEdit}
                                onEdit={() => onEdit(entry)}
                                onDelete={() => onDelete(entry)}
                            />
                        ))}
                    </ul>
                )}
                {canEdit && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-2 h-7 text-muted-foreground"
                        onClick={onAdd}
                    >
                        <Plus />
                        Add entry
                        <span className="sr-only">
                            {' '}
                            for {formatDate(day.date)}
                        </span>
                    </Button>
                )}
            </div>

            <DayTotals
                day={day}
                breakMinutes={breakMinutes}
                className="hidden sm:flex"
            />
        </li>
    );
}

function DayTotals({
    day,
    breakMinutes,
    className,
}: {
    day: DaySummary;
    breakMinutes: number;
    className?: string;
}) {
    return (
        <div
            className={cn(
                'flex flex-col items-end gap-1 text-right',
                className,
            )}
        >
            <span
                className={cn(
                    'font-semibold tabular',
                    day.worked_minutes === 0 && 'text-muted-foreground',
                )}
            >
                {formatMinutes(day.worked_minutes)}
            </span>
            {day.overtime_minutes > 0 && (
                <span className="inline-flex items-center gap-1 rounded-md border border-warning/30 bg-warning/10 px-1.5 py-0.5 text-xs font-medium text-warning tabular">
                    <Hourglass className="size-3" aria-hidden="true" />
                    {formatMinutes(day.overtime_minutes)} overtime
                </span>
            )}
            {breakMinutes > 0 && (
                <span className="text-xs text-muted-foreground tabular">
                    {formatMinutes(breakMinutes)} break
                </span>
            )}
        </div>
    );
}

function EntryItem({
    entry,
    timeZone,
    canEdit,
    onEdit,
    onDelete,
}: {
    entry: TimeEntry;
    timeZone: string;
    canEdit: boolean;
    onEdit: () => void;
    onDelete: () => void;
}) {
    const endsNextDay =
        entry.clock_out_at !== null &&
        localDate(entry.clock_out_at, timeZone) !==
            localDate(entry.clock_in_at, timeZone);

    return (
        <li className="flex items-start gap-3 rounded-lg border bg-background/60 px-3 py-2">
            <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="text-sm font-medium tabular">
                        {formatTime(entry.clock_in_at, timeZone)} –{' '}
                        {entry.clock_out_at ? (
                            <>
                                {formatTime(entry.clock_out_at, timeZone)}
                                {endsNextDay && (
                                    <span className="text-xs text-muted-foreground">
                                        {' '}
                                        (next day)
                                    </span>
                                )}
                            </>
                        ) : (
                            <span className="text-muted-foreground">now</span>
                        )}
                    </span>
                    {entry.is_open && <InProgressHint />}
                    {entry.source === 'manual' && (
                        <span className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs text-muted-foreground">
                            <Pencil className="size-3" aria-hidden="true" />
                            Manual
                        </span>
                    )}
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="tabular">
                        {formatMinutes(entry.worked_minutes)} worked
                    </span>
                    {entry.break_minutes > 0 && (
                        <span className="inline-flex items-center gap-1 tabular">
                            <Coffee className="size-3" aria-hidden="true" />
                            {formatMinutes(entry.break_minutes)} break
                        </span>
                    )}
                    {entry.location && (
                        <span className="inline-flex items-center gap-1">
                            <MapPin className="size-3" aria-hidden="true" />
                            {entry.location.name}
                        </span>
                    )}
                </div>
                {entry.notes && (
                    <p className="text-xs break-words text-muted-foreground italic">
                        {entry.notes}
                    </p>
                )}
            </div>

            {canEdit && (
                <div className="flex shrink-0 items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={onEdit}
                        aria-label={`Edit entry starting ${formatTime(entry.clock_in_at, timeZone)}`}
                    >
                        <Pencil />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-destructive"
                        onClick={onDelete}
                        aria-label={`Delete entry starting ${formatTime(entry.clock_in_at, timeZone)}`}
                    >
                        <Trash2 />
                    </Button>
                </div>
            )}
        </li>
    );
}
