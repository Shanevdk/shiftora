import { Head, router, usePage } from '@inertiajs/react';
import {
    AlertCircle,
    CalendarClock,
    Coffee,
    LocateFixed,
    LogIn,
    LogOut,
    MapPin,
    Play,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import PageContainer from '@/components/page-container';
import PageHeader from '@/components/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useWorkspace } from '@/hooks/use-workspace';
import {
    formatDate,
    formatMinutes,
    formatTime,
    formatTimeRange,
    localDate,
    today,
} from '@/lib/time';
import { cn } from '@/lib/utils';
import { clockIn, clockOut, show } from '@/routes/time-clock';
import {
    end as endBreak,
    start as startBreak,
} from '@/routes/time-clock/break';
import type { ClockState, Shift, TimeEntry } from '@/types';

type GeofenceLocation = {
    id: number;
    name: string;
    latitude: number;
    longitude: number;
    geofence_radius_meters: number | null;
};

type TimeClockProps = {
    clock: ClockState;
    todayEntries: TimeEntry[];
    todayShift: Shift | null;
    geofence: {
        required: boolean;
        locations: GeofenceLocation[];
    };
};

type PendingAction = 'locating' | 'clock' | 'break' | null;

type Coordinates = { latitude: number; longitude: number };

/** "1:05:09" from a number of seconds. */
function formatStopwatch(totalSeconds: number): string {
    const seconds = Math.max(0, Math.floor(totalSeconds));
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainder = seconds % 60;

    return `${hours}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

function secondsBetween(fromIso: string, now: number): number {
    return Math.max(0, (now - Date.parse(fromIso)) / 1000);
}

function locationErrorMessage(error: GeolocationPositionError): string {
    switch (error.code) {
        case error.PERMISSION_DENIED:
            return 'Location access is blocked. Allow location for this site in your browser settings, then try again.';
        case error.TIMEOUT:
            return 'Finding your location took too long. Move somewhere with a clearer signal and try again.';
        default:
            return "We couldn't determine your location. Check that location services are on and try again.";
    }
}

function requestPosition(): Promise<Coordinates> {
    return new Promise((resolve, reject) => {
        if (!('geolocation' in navigator)) {
            reject(new Error("This browser can't share your location."));

            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) =>
                resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                }),
            (error) => reject(new Error(locationErrorMessage(error))),
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
        );
    });
}

export default function TimeClock({
    clock,
    todayEntries,
    todayShift,
    geofence,
}: TimeClockProps) {
    const { timeZone, hasFeature } = useWorkspace();
    const schedulingEnabled = hasFeature('scheduling');
    const { errors } = usePage().props;
    const [now, setNow] = useState(() => Date.now());
    const [pendingAction, setPendingAction] = useState<PendingAction>(null);
    const [locationError, setLocationError] = useState<string | null>(null);

    useEffect(() => {
        if (!clock.is_clocked_in) {
            return;
        }

        const interval = window.setInterval(() => setNow(Date.now()), 1000);

        return () => window.clearInterval(interval);
    }, [clock.is_clocked_in]);

    const breakSeconds =
        clock.is_on_break && clock.break_started_at
            ? secondsBetween(clock.break_started_at, now)
            : 0;
    const workedSeconds =
        clock.is_clocked_in && clock.clock_in_at
            ? secondsBetween(clock.clock_in_at, now) -
              clock.break_minutes * 60 -
              breakSeconds
            : 0;

    const closedMinutes = todayEntries
        .filter((entry) => !entry.is_open)
        .reduce((total, entry) => total + entry.worked_minutes, 0);
    const todayTotalMinutes = closedMinutes + Math.floor(workedSeconds / 60);

    const needsLocation = geofence.required && geofence.locations.length > 0;
    const isBusy = pendingAction !== null;

    function submit(
        url: string,
        method: 'post' | 'delete',
        action: Exclude<PendingAction, 'locating' | null>,
        data: Partial<Coordinates> = {},
    ): void {
        router.visit(url, {
            method,
            data,
            preserveScroll: true,
            onStart: () => setPendingAction(action),
            onFinish: () => setPendingAction(null),
        });
    }

    async function toggleClock(): Promise<void> {
        const url = clock.is_clocked_in ? clockOut.url() : clockIn.url();
        setLocationError(null);

        if (!needsLocation) {
            submit(url, 'post', 'clock');

            return;
        }

        setPendingAction('locating');

        try {
            const coordinates = await requestPosition();
            submit(url, 'post', 'clock', coordinates);
        } catch (error) {
            if (clock.is_clocked_in) {
                // Clocking out never requires a location, so don't trap someone on the clock.
                submit(url, 'post', 'clock');
            } else {
                setPendingAction(null);
                setLocationError(
                    error instanceof Error
                        ? error.message
                        : "We couldn't determine your location.",
                );
            }
        }
    }

    function toggleBreak(): void {
        if (clock.is_on_break) {
            submit(endBreak.url(), 'delete', 'break');
        } else {
            submit(startBreak.url(), 'post', 'break');
        }
    }

    const problem = locationError ?? errors.location ?? errors.clock;
    const status = clock.is_on_break
        ? 'On break'
        : clock.is_clocked_in
          ? 'On the clock'
          : 'Clocked out';

    return (
        <>
            <Head title="Time clock" />
            <PageContainer className="max-w-3xl">
                <PageHeader
                    title="Time clock"
                    description={formatDate(today(timeZone), {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                    })}
                />

                {problem && (
                    <Alert
                        variant="destructive"
                        className="border-destructive/40"
                    >
                        <AlertCircle />
                        <AlertTitle>
                            {locationError || errors.location
                                ? 'Location check failed'
                                : "That didn't work"}
                        </AlertTitle>
                        <AlertDescription>{problem}</AlertDescription>
                    </Alert>
                )}

                <section
                    aria-label="Clock status"
                    className="flex flex-col items-center gap-6 rounded-xl border bg-card px-4 py-8 text-center shadow-xs sm:px-8"
                >
                    <span
                        className={cn(
                            'inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium',
                            clock.is_on_break
                                ? 'bg-warning/15 text-warning'
                                : clock.is_clocked_in
                                  ? 'bg-accent text-accent-foreground'
                                  : 'bg-muted text-muted-foreground',
                        )}
                    >
                        <span
                            className={cn(
                                'size-2 rounded-full',
                                clock.is_on_break
                                    ? 'bg-warning'
                                    : clock.is_clocked_in
                                      ? 'animate-pulse bg-primary'
                                      : 'bg-muted-foreground/60',
                            )}
                            aria-hidden="true"
                        />
                        {status}
                    </span>

                    <div className="space-y-1" aria-live="off">
                        <p
                            className={cn(
                                'text-6xl font-semibold tracking-tight tabular sm:text-7xl',
                                clock.is_on_break && 'text-warning',
                                !clock.is_clocked_in &&
                                    'text-muted-foreground/70',
                            )}
                        >
                            {formatStopwatch(
                                clock.is_on_break
                                    ? breakSeconds
                                    : workedSeconds,
                            )}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            {clock.is_on_break && clock.break_started_at
                                ? `Break started at ${formatTime(clock.break_started_at, timeZone)} · ${formatMinutes(workedSeconds / 60)} worked so far`
                                : clock.is_clocked_in && clock.clock_in_at
                                  ? `Clocked in at ${formatTime(clock.clock_in_at, timeZone)}${clock.location ? ` · ${clock.location.name}` : ''}`
                                  : `${formatMinutes(todayTotalMinutes)} worked today`}
                        </p>
                    </div>

                    <div className="flex w-full max-w-sm flex-col gap-3">
                        <Button
                            size="lg"
                            className={cn(
                                'h-16 w-full rounded-xl text-lg',
                                clock.is_clocked_in &&
                                    'bg-foreground text-background hover:bg-foreground/90',
                            )}
                            disabled={isBusy}
                            onClick={() => void toggleClock()}
                        >
                            {pendingAction === 'locating' ? (
                                <>
                                    <LocateFixed className="size-5 animate-pulse" />
                                    Checking your location…
                                </>
                            ) : pendingAction === 'clock' ? (
                                <>
                                    <Spinner className="size-5" />
                                    {clock.is_clocked_in
                                        ? 'Clocking out…'
                                        : 'Clocking in…'}
                                </>
                            ) : clock.is_clocked_in ? (
                                <>
                                    <LogOut className="size-5" />
                                    Clock out
                                </>
                            ) : (
                                <>
                                    <LogIn className="size-5" />
                                    Clock in
                                </>
                            )}
                        </Button>

                        {clock.is_clocked_in && (
                            <Button
                                size="lg"
                                variant="outline"
                                className="h-12 w-full rounded-xl text-base"
                                disabled={isBusy}
                                onClick={toggleBreak}
                            >
                                {pendingAction === 'break' ? (
                                    <Spinner />
                                ) : clock.is_on_break ? (
                                    <Play />
                                ) : (
                                    <Coffee />
                                )}
                                {clock.is_on_break
                                    ? 'End break'
                                    : 'Start break'}
                            </Button>
                        )}

                        {needsLocation && (
                            <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                                <MapPin
                                    className="size-3.5"
                                    aria-hidden="true"
                                />
                                Clocking in requires being at{' '}
                                {geofence.locations
                                    .map((location) => location.name)
                                    .join(', ')}
                            </p>
                        )}
                    </div>
                </section>

                <div
                    className={cn(
                        'grid gap-6',
                        schedulingEnabled && 'md:grid-cols-2',
                    )}
                >
                    {schedulingEnabled && (
                        <TodayShiftCard
                            shift={todayShift}
                            timeZone={timeZone}
                        />
                    )}

                    <section
                        aria-labelledby="today-entries-heading"
                        className="rounded-xl border bg-card shadow-xs"
                    >
                        <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
                            <h2
                                id="today-entries-heading"
                                className="text-sm font-medium"
                            >
                                Today's entries
                            </h2>
                            <span className="text-sm font-semibold tabular">
                                {formatMinutes(todayTotalMinutes)}
                            </span>
                        </div>
                        {todayEntries.length === 0 ? (
                            <p className="px-4 py-6 text-sm text-muted-foreground">
                                No time recorded yet today.
                            </p>
                        ) : (
                            <ul className="divide-y">
                                {todayEntries.map((entry) => (
                                    <li
                                        key={entry.id}
                                        className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                                    >
                                        <div className="min-w-0">
                                            <p className="font-medium tabular">
                                                {formatTime(
                                                    entry.clock_in_at,
                                                    timeZone,
                                                )}{' '}
                                                –{' '}
                                                {entry.clock_out_at
                                                    ? formatTime(
                                                          entry.clock_out_at,
                                                          timeZone,
                                                      )
                                                    : 'now'}
                                            </p>
                                            <p className="truncate text-xs text-muted-foreground">
                                                {[
                                                    entry.location?.name,
                                                    entry.break_minutes > 0
                                                        ? `${formatMinutes(entry.break_minutes)} break`
                                                        : null,
                                                    entry.source === 'manual'
                                                        ? 'Added manually'
                                                        : null,
                                                ]
                                                    .filter(Boolean)
                                                    .join(' · ') ||
                                                    'Time clock'}
                                            </p>
                                        </div>
                                        <div className="shrink-0 text-right">
                                            <p className="font-medium tabular">
                                                {formatMinutes(
                                                    entry.is_open
                                                        ? workedSeconds / 60
                                                        : entry.worked_minutes,
                                                )}
                                            </p>
                                            {entry.is_open && (
                                                <p className="text-xs text-primary">
                                                    In progress
                                                </p>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                </div>
            </PageContainer>
        </>
    );
}

function TodayShiftCard({
    shift,
    timeZone,
}: {
    shift: Shift | null;
    timeZone: string;
}) {
    return (
        <section
            aria-labelledby="today-shift-heading"
            className="rounded-xl border bg-card shadow-xs"
        >
            <div className="flex items-center gap-2 border-b px-4 py-3">
                <CalendarClock
                    className="size-4 text-muted-foreground"
                    aria-hidden="true"
                />
                <h2 id="today-shift-heading" className="text-sm font-medium">
                    Today's shift
                </h2>
            </div>
            {shift === null ? (
                <p className="px-4 py-6 text-sm text-muted-foreground">
                    You're not scheduled today.
                </p>
            ) : (
                <div className="space-y-2 px-4 py-4 text-sm">
                    <p className="text-xl font-semibold tabular">
                        {formatTimeRange(
                            shift.starts_at,
                            shift.ends_at,
                            timeZone,
                        )}
                    </p>
                    {localDate(shift.ends_at, timeZone) !==
                        localDate(shift.starts_at, timeZone) && (
                        <p className="text-xs text-muted-foreground">
                            Ends{' '}
                            {formatDate(localDate(shift.ends_at, timeZone))}
                        </p>
                    )}
                    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-muted-foreground">
                        {shift.position && (
                            <>
                                <dt>Position</dt>
                                <dd className="text-foreground">
                                    {shift.position}
                                </dd>
                            </>
                        )}
                        {shift.location && (
                            <>
                                <dt>Location</dt>
                                <dd className="text-foreground">
                                    {shift.location.name}
                                </dd>
                            </>
                        )}
                        <dt>Break</dt>
                        <dd className="text-foreground tabular">
                            {shift.break_minutes > 0
                                ? formatMinutes(shift.break_minutes)
                                : 'None'}
                        </dd>
                        <dt>Scheduled</dt>
                        <dd className="text-foreground tabular">
                            {formatMinutes(shift.scheduled_minutes)}
                        </dd>
                    </dl>
                    {shift.notes && (
                        <p className="rounded-md bg-muted px-3 py-2 text-muted-foreground">
                            {shift.notes}
                        </p>
                    )}
                </div>
            )}
        </section>
    );
}

TimeClock.layout = {
    breadcrumbs: [{ title: 'Time clock', href: show() }],
};
