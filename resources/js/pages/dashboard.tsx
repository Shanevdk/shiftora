import { Head, Link, usePage } from '@inertiajs/react';
import {
    AlarmClock,
    CalendarClock,
    CalendarDays,
    ClipboardCheck,
    Clock,
    Coffee,
    Timer,
    Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import EmptyState from '@/components/empty-state';
import PageContainer from '@/components/page-container';
import PageHeader from '@/components/page-header';
import StatCard from '@/components/stat-card';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useWorkspace } from '@/hooks/use-workspace';
import {
    formatDateTimeDay,
    formatMinutes,
    formatTime,
    formatTimeRange,
    minutesSince,
} from '@/lib/time';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import { index as schedule } from '@/routes/schedule';
import { show as timeClock } from '@/routes/time-clock';
import { index as timesheets } from '@/routes/timesheets';
import type {
    ClockState,
    EmployeeSummary,
    Shift,
    TimeEntry,
    WeekSummary,
} from '@/types';

type TeamOverview = {
    clockedIn: { employee: EmployeeSummary; entry: TimeEntry }[];
    todaysShifts: (Shift & { employee: EmployeeSummary | null })[];
    activeEmployeeCount: number;
    pendingApprovalCount: number;
    weekWorkedMinutes: number;
    weekScheduledMinutes: number;
};

type Props = {
    weekStart: string;
    clock: ClockState;
    myWeek: WeekSummary;
    upcomingShifts: Shift[];
    team?: TeamOverview | null;
};

function greeting(timeZone: string): string {
    const hour = Number(
        new Intl.DateTimeFormat('en-US', {
            hour: 'numeric',
            hourCycle: 'h23',
            timeZone,
        }).format(new Date()),
    );

    if (hour < 12) {
        return 'Good morning';
    }

    return hour < 18 ? 'Good afternoon' : 'Good evening';
}

/** Re-render every 30 seconds so live durations stay current. */
function useNow(): Date {
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        const interval = window.setInterval(() => setNow(new Date()), 30000);

        return () => window.clearInterval(interval);
    }, []);

    return now;
}

export default function Dashboard({
    clock,
    myWeek,
    upcomingShifts,
    team,
}: Props) {
    const { organization, timeZone, can, hasFeature } = useWorkspace();
    const { auth } = usePage().props;
    const now = useNow();
    const firstName = auth.user?.name.split(' ')[0];
    const schedulingEnabled = hasFeature('scheduling');

    return (
        <>
            <Head title="Dashboard" />
            <PageContainer>
                <PageHeader
                    title={`${greeting(timeZone)}${firstName ? `, ${firstName}` : ''}`}
                    description={`Here's what's happening at ${organization?.name ?? 'your organization'} today.`}
                    actions={
                        <Button asChild>
                            <Link href={timeClock()}>
                                <Clock />
                                {clock.is_clocked_in
                                    ? 'Open time clock'
                                    : 'Clock in'}
                            </Link>
                        </Button>
                    }
                />

                <div
                    className={cn(
                        'grid gap-4',
                        schedulingEnabled ? 'md:grid-cols-3' : 'md:grid-cols-2',
                    )}
                >
                    <ClockCard clock={clock} now={now} timeZone={timeZone} />
                    <StatCard
                        label="Worked this week"
                        icon={Timer}
                        value={formatMinutes(myWeek.worked_minutes)}
                        hint={
                            hasFeature('overtime_rules') &&
                            myWeek.overtime_minutes > 0
                                ? `${formatMinutes(myWeek.overtime_minutes)} overtime`
                                : `${formatMinutes(myWeek.break_minutes)} on breaks`
                        }
                    />
                    {schedulingEnabled && (
                        <StatCard
                            label="Next shift"
                            icon={CalendarClock}
                            value={
                                upcomingShifts[0]
                                    ? formatDateTimeDay(
                                          upcomingShifts[0].starts_at,
                                          timeZone,
                                      )
                                    : 'None scheduled'
                            }
                            hint={
                                upcomingShifts[0]
                                    ? formatTimeRange(
                                          upcomingShifts[0].starts_at,
                                          upcomingShifts[0].ends_at,
                                          timeZone,
                                      )
                                    : 'Published shifts will appear here.'
                            }
                        />
                    )}
                </div>

                {can('manageSchedule') && (
                    <TeamSection team={team} now={now} timeZone={timeZone} />
                )}

                {schedulingEnabled && (
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between gap-4">
                            <div className="space-y-1.5">
                                <CardTitle>Your upcoming shifts</CardTitle>
                                <CardDescription>
                                    Published shifts from your schedule
                                </CardDescription>
                            </div>
                            <Button variant="outline" size="sm" asChild>
                                <Link href={schedule()}>View schedule</Link>
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {upcomingShifts.length === 0 ? (
                                <EmptyState
                                    icon={CalendarDays}
                                    title="No upcoming shifts"
                                    description="When your manager publishes the schedule, your shifts will show up here."
                                />
                            ) : (
                                <ul className="divide-y">
                                    {upcomingShifts.map((shift) => (
                                        <li
                                            key={shift.id}
                                            className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"
                                        >
                                            <div>
                                                <p className="font-medium">
                                                    {formatDateTimeDay(
                                                        shift.starts_at,
                                                        timeZone,
                                                        {
                                                            weekday: 'long',
                                                            month: 'short',
                                                            day: 'numeric',
                                                        },
                                                    )}
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    {[
                                                        shift.position,
                                                        shift.location?.name,
                                                    ]
                                                        .filter(Boolean)
                                                        .join(' · ') ||
                                                        'General shift'}
                                                </p>
                                            </div>
                                            <p className="text-sm font-medium tabular">
                                                {formatTimeRange(
                                                    shift.starts_at,
                                                    shift.ends_at,
                                                    timeZone,
                                                )}
                                            </p>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </CardContent>
                    </Card>
                )}
            </PageContainer>
        </>
    );
}

function ClockCard({
    clock,
    now,
    timeZone,
}: {
    clock: ClockState;
    now: Date;
    timeZone: string;
}) {
    if (!clock.is_clocked_in || !clock.clock_in_at) {
        return (
            <StatCard
                label="Status"
                icon={AlarmClock}
                value="Off the clock"
                hint="Clock in from the time clock when your shift starts."
            />
        );
    }

    if (clock.is_on_break && clock.break_started_at) {
        return (
            <StatCard
                label="Status"
                icon={Coffee}
                value={`On break · ${formatMinutes(minutesSince(clock.break_started_at, now))}`}
                hint={`Clocked in at ${formatTime(clock.clock_in_at, timeZone)}`}
                className="border-warning/30 bg-warning/5"
            />
        );
    }

    const worked = Math.max(
        0,
        minutesSince(clock.clock_in_at, now) - clock.break_minutes,
    );

    return (
        <StatCard
            label="Status"
            icon={Clock}
            value={`Working · ${formatMinutes(worked)}`}
            hint={`Clocked in at ${formatTime(clock.clock_in_at, timeZone)}${clock.location ? ` · ${clock.location.name}` : ''}`}
            className="border-primary/25 bg-accent/50"
        />
    );
}

function TeamSection({
    team,
    now,
    timeZone,
}: {
    team?: TeamOverview | null;
    now: Date;
    timeZone: string;
}) {
    const { can, hasFeature } = useWorkspace();
    const schedulingEnabled = hasFeature('scheduling');

    if (!team) {
        return (
            <div className="grid gap-4 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className="h-28 rounded-xl" />
                ))}
                <Skeleton className="h-64 rounded-xl lg:col-span-2" />
                <Skeleton className="h-64 rounded-xl lg:col-span-2" />
            </div>
        );
    }

    return (
        <section className="space-y-4" aria-labelledby="team-heading">
            <h2 id="team-heading" className="text-lg font-semibold">
                Team today
            </h2>
            <div
                className={cn(
                    'grid gap-4 sm:grid-cols-2',
                    schedulingEnabled ? 'lg:grid-cols-4' : 'lg:grid-cols-3',
                )}
            >
                <StatCard
                    label="Clocked in now"
                    icon={Clock}
                    value={team.clockedIn.length}
                    hint={`of ${team.activeEmployeeCount} active employees`}
                />
                {schedulingEnabled && (
                    <StatCard
                        label="Shifts today"
                        icon={CalendarDays}
                        value={team.todaysShifts.length}
                        hint={`${team.todaysShifts.filter((shift) => !shift.employee).length} open`}
                    />
                )}
                <StatCard
                    label="Hours this week"
                    icon={Timer}
                    value={formatMinutes(team.weekWorkedMinutes)}
                    hint={
                        schedulingEnabled
                            ? `${formatMinutes(team.weekScheduledMinutes)} scheduled`
                            : 'Across the whole team'
                    }
                />
                <StatCard
                    label="Awaiting approval"
                    icon={ClipboardCheck}
                    value={
                        hasFeature('timesheet_approvals')
                            ? team.pendingApprovalCount
                            : '—'
                    }
                    hint={
                        hasFeature('timesheet_approvals') ? (
                            can('approveTimesheets') &&
                            team.pendingApprovalCount > 0 ? (
                                <Link
                                    href={timesheets()}
                                    className="font-medium text-primary underline-offset-4 hover:underline"
                                >
                                    Review timesheets
                                </Link>
                            ) : (
                                'Timesheets submitted for review'
                            )
                        ) : (
                            'Approvals are on Professional'
                        )
                    }
                />
            </div>

            <div
                className={cn(
                    'grid gap-4',
                    schedulingEnabled && 'lg:grid-cols-2',
                )}
            >
                <Card>
                    <CardHeader>
                        <CardTitle>Who's working</CardTitle>
                        <CardDescription>
                            Live view of open time entries
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {team.clockedIn.length === 0 ? (
                            <EmptyState
                                icon={Users}
                                title="Nobody is clocked in"
                                description="People appear here as soon as they clock in."
                            />
                        ) : (
                            <ul className="divide-y">
                                {team.clockedIn.map(({ employee, entry }) => (
                                    <li
                                        key={entry.id}
                                        className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                                    >
                                        <EmployeeName employee={employee} />
                                        <div className="text-right text-sm">
                                            <p className="font-medium tabular">
                                                {entry.on_break_since
                                                    ? 'On break'
                                                    : formatMinutes(
                                                          minutesSince(
                                                              entry.clock_in_at,
                                                              now,
                                                          ) -
                                                              entry.break_minutes,
                                                      )}
                                            </p>
                                            <p className="text-muted-foreground">
                                                since{' '}
                                                {formatTime(
                                                    entry.clock_in_at,
                                                    timeZone,
                                                )}
                                            </p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>

                {schedulingEnabled && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Today's shifts</CardTitle>
                            <CardDescription>
                                Everyone scheduled to work today
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {team.todaysShifts.length === 0 ? (
                                <EmptyState
                                    icon={CalendarDays}
                                    title="No shifts today"
                                    description="Build next week's schedule from the Schedule page."
                                    action={
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            asChild
                                        >
                                            <Link href={schedule()}>
                                                Open schedule
                                            </Link>
                                        </Button>
                                    }
                                />
                            ) : (
                                <ul className="divide-y">
                                    {team.todaysShifts.map((shift) => (
                                        <li
                                            key={shift.id}
                                            className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                                        >
                                            {shift.employee ? (
                                                <EmployeeName
                                                    employee={shift.employee}
                                                />
                                            ) : (
                                                <span className="text-sm font-medium text-warning">
                                                    Open shift
                                                </span>
                                            )}
                                            <div className="text-right text-sm">
                                                <p className="font-medium tabular">
                                                    {formatTimeRange(
                                                        shift.starts_at,
                                                        shift.ends_at,
                                                        timeZone,
                                                    )}
                                                </p>
                                                <p className="text-muted-foreground">
                                                    {shift.position ??
                                                        shift.location?.name ??
                                                        (shift.is_published
                                                            ? 'Published'
                                                            : 'Draft')}
                                                </p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>
        </section>
    );
}

function EmployeeName({ employee }: { employee: EmployeeSummary }) {
    const initials = `${employee.first_name[0] ?? ''}${employee.last_name[0] ?? ''}`;

    return (
        <div className="flex min-w-0 items-center gap-3">
            <span
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                style={{ backgroundColor: employee.color ?? 'var(--primary)' }}
                aria-hidden="true"
            >
                {initials}
            </span>
            <div className="min-w-0">
                <p className="truncate text-sm font-medium">{employee.name}</p>
                {employee.job_title && (
                    <p className="truncate text-xs text-muted-foreground">
                        {employee.job_title}
                    </p>
                )}
            </div>
        </div>
    );
}

Dashboard.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
    ],
};
