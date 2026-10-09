import { Form, Head, Link, router, usePage } from '@inertiajs/react';
import { AlertCircle, CalendarDays, Plus, Send, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { DragEvent } from 'react';
import EmptyState from '@/components/empty-state';
import PageContainer from '@/components/page-container';
import PageHeader from '@/components/page-header';
import ShiftCard from '@/components/schedule/shift-card';
import ShiftDialog from '@/components/schedule/shift-dialog';
import type { ShiftDialogTarget } from '@/components/schedule/shift-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import UpgradeCallout from '@/components/upgrade-callout';
import WeekNavigator from '@/components/week-navigator';
import { useWorkspace } from '@/hooks/use-workspace';
import { formatDate, formatMinutes, localDate, today } from '@/lib/time';
import { cn } from '@/lib/utils';
import { create as createEmployee } from '@/routes/employees';
import { index, publish } from '@/routes/schedule';
import { move } from '@/routes/shifts';
import type { EmployeeSummary, LocationOption, Shift } from '@/types';

type ScheduleProps = {
    weekStart: string;
    previousWeek: string;
    nextWeek: string;
    days: string[];
    employees: EmployeeSummary[];
    shifts: Shift[];
    locations: LocationOption[];
    unpublishedCount: number;
    can: { manage: boolean; dragAndDrop: boolean };
};

type ScheduleRow = {
    key: string;
    employee: EmployeeSummary | null;
};

const OPEN_ROW = 'open';
const DAY_IN_MS = 86_400_000;

function cellKey(rowKey: string, date: string): string {
    return `${rowKey}|${date}`;
}

function rowKeyFor(employeeId: number | null): string {
    return employeeId === null ? OPEN_ROW : String(employeeId);
}

export default function ScheduleIndex({
    weekStart,
    previousWeek,
    nextWeek,
    days,
    employees,
    shifts,
    locations,
    unpublishedCount,
    can,
}: ScheduleProps) {
    const { timeZone, membership } = useWorkspace();
    const { errors } = usePage().props;
    const ownEmployeeId = membership?.employee_id ?? null;
    const todayDate = today(timeZone);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogTarget, setDialogTarget] = useState<ShiftDialogTarget | null>(
        null,
    );
    const [dialogKey, setDialogKey] = useState(0);
    const [draggingShiftId, setDraggingShiftId] = useState<number | null>(null);
    const [dropTargetKey, setDropTargetKey] = useState<string | null>(null);

    const employeesById = useMemo(
        () => new Map(employees.map((employee) => [employee.id, employee])),
        [employees],
    );

    const shiftDates = useMemo(
        () =>
            new Map(
                shifts.map((shift) => [
                    shift.id,
                    localDate(shift.starts_at, timeZone),
                ]),
            ),
        [shifts, timeZone],
    );

    const shiftsByCell = useMemo(() => {
        const cells = new Map<string, Shift[]>();

        for (const shift of shifts) {
            const key = cellKey(
                rowKeyFor(shift.employee_id),
                shiftDates.get(shift.id) ?? '',
            );
            cells.set(key, [...(cells.get(key) ?? []), shift]);
        }

        return cells;
    }, [shifts, shiftDates]);

    const shiftsByDay = useMemo(
        () =>
            days.map((day) =>
                shifts.filter((shift) => shiftDates.get(shift.id) === day),
            ),
        [days, shifts, shiftDates],
    );

    const rows = useMemo<ScheduleRow[]>(() => {
        const employeeRows = employees.map((employee) => ({
            key: String(employee.id),
            employee,
        }));

        if (!can.manage && ownEmployeeId !== null) {
            employeeRows.sort(
                (a, b) =>
                    Number(b.employee.id === ownEmployeeId) -
                    Number(a.employee.id === ownEmployeeId),
            );
        }

        const hasOpenShifts = shifts.some(
            (shift) => shift.employee_id === null,
        );

        return can.manage || hasOpenShifts
            ? [{ key: OPEN_ROW, employee: null }, ...employeeRows]
            : employeeRows;
    }, [employees, shifts, can.manage, ownEmployeeId]);

    const weeklyMinutesByRow = useMemo(() => {
        const totals = new Map<string, number>();

        for (const shift of shifts) {
            const key = rowKeyFor(shift.employee_id);
            totals.set(key, (totals.get(key) ?? 0) + shift.scheduled_minutes);
        }

        return totals;
    }, [shifts]);

    const weekTotalMinutes = shifts.reduce(
        (total, shift) => total + shift.scheduled_minutes,
        0,
    );

    function openDialog(target: ShiftDialogTarget): void {
        setDialogTarget(target);
        setDialogKey((key) => key + 1);
        setDialogOpen(true);
    }

    function openCreate(employeeId: number | null, date: string): void {
        openDialog({ mode: 'create', employeeId, date });
    }

    function openEdit(shift: Shift): void {
        openDialog({ mode: 'edit', shift });
    }

    function handleDragStart(
        event: DragEvent<HTMLElement>,
        shift: Shift,
    ): void {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', String(shift.id));
        setDraggingShiftId(shift.id);
    }

    function handleDragEnd(): void {
        setDraggingShiftId(null);
        setDropTargetKey(null);
    }

    function handleDragOver(event: DragEvent<HTMLElement>, key: string): void {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';

        if (dropTargetKey !== key) {
            setDropTargetKey(key);
        }
    }

    function handleDragLeave(event: DragEvent<HTMLElement>): void {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setDropTargetKey(null);
        }
    }

    function handleDrop(
        event: DragEvent<HTMLElement>,
        employeeId: number | null,
        date: string,
    ): void {
        event.preventDefault();

        const shiftId =
            Number(event.dataTransfer.getData('text/plain')) || draggingShiftId;
        const shift = shifts.find((candidate) => candidate.id === shiftId);

        handleDragEnd();

        if (!shift) {
            return;
        }

        const currentDate = shiftDates.get(shift.id) ?? date;

        if (shift.employee_id === employeeId && currentDate === date) {
            return;
        }

        const offset =
            Date.parse(`${date}T12:00:00Z`) -
            Date.parse(`${currentDate}T12:00:00Z`);
        const shiftBy = (iso: string): string =>
            new Date(
                Date.parse(iso) + Math.round(offset / DAY_IN_MS) * DAY_IN_MS,
            ).toISOString();

        router
            .optimistic<ScheduleProps>((props) => ({
                shifts: props.shifts.map((candidate) =>
                    candidate.id === shift.id
                        ? {
                              ...candidate,
                              employee_id: employeeId,
                              starts_at: shiftBy(candidate.starts_at),
                              ends_at: shiftBy(candidate.ends_at),
                          }
                        : candidate,
                ),
            }))
            .patch(
                move.url(shift),
                { employee_id: employeeId, date },
                { preserveScroll: true },
            );
    }

    function dropHandlers(employeeId: number | null, date: string) {
        if (!can.dragAndDrop) {
            return {};
        }

        const key = cellKey(rowKeyFor(employeeId), date);

        return {
            onDragOver: (event: DragEvent<HTMLElement>) =>
                handleDragOver(event, key),
            onDragLeave: handleDragLeave,
            onDrop: (event: DragEvent<HTMLElement>) =>
                handleDrop(event, employeeId, date),
        };
    }

    const defaultCreateDate = days.includes(todayDate) ? todayDate : days[0];
    const hasNothingToShow = employees.length === 0 && shifts.length === 0;

    return (
        <>
            <Head title="Schedule" />
            <PageContainer>
                <PageHeader
                    title="Schedule"
                    description={
                        can.manage
                            ? 'Plan the week, then publish to notify your team.'
                            : 'Published shifts for your team this week.'
                    }
                    actions={
                        <>
                            <WeekNavigator
                                weekStart={weekStart}
                                previousWeek={previousWeek}
                                nextWeek={nextWeek}
                                hrefForWeek={(week) =>
                                    index.url({ query: { week } })
                                }
                                currentWeekHref={index.url()}
                            />
                            {can.manage && unpublishedCount > 0 && (
                                <Form
                                    {...publish.form()}
                                    options={{ preserveScroll: true }}
                                >
                                    {({ processing }) => (
                                        <>
                                            <input
                                                type="hidden"
                                                name="week"
                                                value={weekStart}
                                            />
                                            <Button
                                                type="submit"
                                                disabled={processing}
                                            >
                                                {processing ? (
                                                    <Spinner />
                                                ) : (
                                                    <Send />
                                                )}
                                                Publish {unpublishedCount}{' '}
                                                {unpublishedCount === 1
                                                    ? 'change'
                                                    : 'changes'}
                                            </Button>
                                        </>
                                    )}
                                </Form>
                            )}
                            {can.manage && (
                                <Button
                                    variant={
                                        unpublishedCount > 0
                                            ? 'outline'
                                            : 'default'
                                    }
                                    onClick={() =>
                                        openCreate(null, defaultCreateDate)
                                    }
                                >
                                    <Plus />
                                    Add shift
                                </Button>
                            )}
                        </>
                    }
                />

                {errors.shift && (
                    <Alert variant="destructive">
                        <AlertCircle />
                        <AlertTitle>That shift could not be moved</AlertTitle>
                        <AlertDescription>{errors.shift}</AlertDescription>
                    </Alert>
                )}

                {can.manage && !can.dragAndDrop && (
                    <UpgradeCallout
                        feature="Drag-and-drop scheduling"
                        plan="Professional"
                        description="Move shifts between people and days by dragging them."
                    />
                )}

                {hasNothingToShow ? (
                    <EmptyState
                        icon={Users}
                        title="No one to schedule yet"
                        description={
                            can.manage
                                ? 'Add your team members to start building the schedule.'
                                : 'There are no shifts on the schedule this week.'
                        }
                        action={
                            can.manage && (
                                <Button asChild>
                                    <Link href={createEmployee()}>
                                        Add employee
                                    </Link>
                                </Button>
                            )
                        }
                    />
                ) : (
                    <>
                        {/* Desktop and tablet: employee x day grid */}
                        <div className="hidden overflow-x-auto rounded-xl border bg-card md:block">
                            <div
                                role="table"
                                aria-label={`Schedule for the week of ${formatDate(weekStart, { month: 'long', day: 'numeric' })}`}
                                className="grid min-w-[60rem] grid-cols-[11rem_repeat(7,minmax(7.5rem,1fr))]"
                            >
                                <div role="row" className="contents">
                                    <div
                                        role="columnheader"
                                        className="sticky left-0 z-20 border-r border-b bg-card px-3 py-2.5 text-xs font-medium text-muted-foreground"
                                    >
                                        Team
                                    </div>
                                    {days.map((day) => (
                                        <div
                                            key={day}
                                            role="columnheader"
                                            className={cn(
                                                'border-b px-2 py-2.5 text-xs',
                                                day === todayDate &&
                                                    'bg-accent/60 text-accent-foreground',
                                            )}
                                        >
                                            <span className="block font-medium">
                                                {formatDate(day, {
                                                    weekday: 'short',
                                                })}
                                            </span>
                                            <span className="text-muted-foreground tabular">
                                                {formatDate(day, {
                                                    month: 'short',
                                                    day: 'numeric',
                                                })}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                {rows.map((row) => {
                                    const employeeId = row.employee?.id ?? null;
                                    const isOwnRow =
                                        employeeId !== null &&
                                        employeeId === ownEmployeeId;

                                    return (
                                        <div
                                            key={row.key}
                                            role="row"
                                            className="contents"
                                        >
                                            <div
                                                role="rowheader"
                                                className={cn(
                                                    'sticky left-0 z-10 flex min-w-0 items-start gap-2 border-r border-b bg-card px-3 py-2.5',
                                                    isOwnRow &&
                                                        'bg-accent text-accent-foreground',
                                                )}
                                            >
                                                <RowLabel
                                                    employee={row.employee}
                                                    isOwn={isOwnRow}
                                                    minutes={
                                                        weeklyMinutesByRow.get(
                                                            row.key,
                                                        ) ?? 0
                                                    }
                                                />
                                            </div>
                                            {days.map((day) => {
                                                const key = cellKey(
                                                    row.key,
                                                    day,
                                                );
                                                const cellShifts =
                                                    shiftsByCell.get(key) ?? [];

                                                return (
                                                    <div
                                                        key={key}
                                                        role="cell"
                                                        className={cn(
                                                            'group flex min-h-20 min-w-0 flex-col gap-1 border-b p-1.5 transition-colors',
                                                            day === todayDate &&
                                                                'bg-accent/20',
                                                            isOwnRow &&
                                                                'bg-accent/40',
                                                            dropTargetKey ===
                                                                key &&
                                                                'bg-primary/10 ring-2 ring-primary/50 ring-inset',
                                                        )}
                                                        {...dropHandlers(
                                                            employeeId,
                                                            day,
                                                        )}
                                                    >
                                                        {cellShifts.map(
                                                            (shift) => (
                                                                <ShiftCard
                                                                    key={
                                                                        shift.id
                                                                    }
                                                                    shift={
                                                                        shift
                                                                    }
                                                                    employee={
                                                                        row.employee ??
                                                                        undefined
                                                                    }
                                                                    timeZone={
                                                                        timeZone
                                                                    }
                                                                    showDraftMarker={
                                                                        can.manage
                                                                    }
                                                                    isDragging={
                                                                        draggingShiftId ===
                                                                        shift.id
                                                                    }
                                                                    onOpen={
                                                                        can.manage
                                                                            ? openEdit
                                                                            : undefined
                                                                    }
                                                                    onDragStart={
                                                                        can.dragAndDrop
                                                                            ? handleDragStart
                                                                            : undefined
                                                                    }
                                                                    onDragEnd={
                                                                        handleDragEnd
                                                                    }
                                                                />
                                                            ),
                                                        )}
                                                        {can.manage && (
                                                            <button
                                                                type="button"
                                                                className="flex min-h-7 flex-1 items-center justify-center rounded-md text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:bg-accent/60 hover:text-accent-foreground focus-visible:opacity-100 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                                                                aria-label={`Add shift for ${row.employee?.name ?? 'open shifts'} on ${formatDate(day, { weekday: 'long', month: 'short', day: 'numeric' })}`}
                                                                onClick={() =>
                                                                    openCreate(
                                                                        employeeId,
                                                                        day,
                                                                    )
                                                                }
                                                            >
                                                                <Plus
                                                                    className="size-4"
                                                                    aria-hidden="true"
                                                                />
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })}

                                <div role="row" className="contents">
                                    <div
                                        role="rowheader"
                                        className="sticky left-0 z-10 border-r bg-muted/60 px-3 py-2 text-xs font-medium"
                                    >
                                        Scheduled
                                        <span className="block text-muted-foreground tabular">
                                            {formatMinutes(weekTotalMinutes)}{' '}
                                            this week
                                        </span>
                                    </div>
                                    {days.map((day, dayIndex) => (
                                        <div
                                            key={day}
                                            role="cell"
                                            className="bg-muted/60 px-2 py-2 text-xs font-medium tabular"
                                        >
                                            {formatMinutes(
                                                shiftsByDay[dayIndex].reduce(
                                                    (total, shift) =>
                                                        total +
                                                        shift.scheduled_minutes,
                                                    0,
                                                ),
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Phones: day-by-day list */}
                        <div className="flex flex-col gap-4 md:hidden">
                            {days.map((day, dayIndex) => {
                                const dayShifts = shiftsByDay[dayIndex];
                                const dayMinutes = dayShifts.reduce(
                                    (total, shift) =>
                                        total + shift.scheduled_minutes,
                                    0,
                                );

                                return (
                                    <section
                                        key={day}
                                        aria-label={formatDate(day, {
                                            weekday: 'long',
                                            month: 'long',
                                            day: 'numeric',
                                        })}
                                        className={cn(
                                            'rounded-xl border bg-card',
                                            day === todayDate &&
                                                'border-primary/40',
                                        )}
                                    >
                                        <div className="flex items-center justify-between gap-2 border-b px-4 py-2.5">
                                            <div>
                                                <h2 className="text-sm font-medium">
                                                    {formatDate(day, {
                                                        weekday: 'long',
                                                        month: 'short',
                                                        day: 'numeric',
                                                    })}
                                                    {day === todayDate && (
                                                        <span className="ml-2 rounded-sm bg-accent px-1.5 py-0.5 text-xs text-accent-foreground">
                                                            Today
                                                        </span>
                                                    )}
                                                </h2>
                                                <p className="text-xs text-muted-foreground tabular">
                                                    {dayShifts.length}{' '}
                                                    {dayShifts.length === 1
                                                        ? 'shift'
                                                        : 'shifts'}{' '}
                                                    ·{' '}
                                                    {formatMinutes(dayMinutes)}
                                                </p>
                                            </div>
                                            {can.manage && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    aria-label={`Add shift on ${formatDate(day, { weekday: 'long', month: 'short', day: 'numeric' })}`}
                                                    onClick={() =>
                                                        openCreate(null, day)
                                                    }
                                                >
                                                    <Plus />
                                                </Button>
                                            )}
                                        </div>
                                        <div className="flex flex-col gap-2 p-3">
                                            {dayShifts.length === 0 ? (
                                                <p className="flex items-center gap-2 px-1 py-1 text-sm text-muted-foreground">
                                                    <CalendarDays
                                                        className="size-4"
                                                        aria-hidden="true"
                                                    />
                                                    No shifts
                                                </p>
                                            ) : (
                                                dayShifts.map((shift) => (
                                                    <ShiftCard
                                                        key={shift.id}
                                                        shift={shift}
                                                        employee={
                                                            shift.employee_id ===
                                                            null
                                                                ? undefined
                                                                : employeesById.get(
                                                                      shift.employee_id,
                                                                  )
                                                        }
                                                        timeZone={timeZone}
                                                        showEmployeeName
                                                        showDraftMarker={
                                                            can.manage
                                                        }
                                                        isOwn={
                                                            shift.employee_id !==
                                                                null &&
                                                            shift.employee_id ===
                                                                ownEmployeeId
                                                        }
                                                        onOpen={
                                                            can.manage
                                                                ? openEdit
                                                                : undefined
                                                        }
                                                    />
                                                ))
                                            )}
                                        </div>
                                    </section>
                                );
                            })}
                        </div>
                    </>
                )}
            </PageContainer>

            {can.manage && (
                <ShiftDialog
                    key={dialogKey}
                    open={dialogOpen}
                    target={dialogTarget}
                    employees={employees}
                    locations={locations}
                    timeZone={timeZone}
                    onOpenChange={setDialogOpen}
                />
            )}
        </>
    );
}

function RowLabel({
    employee,
    isOwn,
    minutes,
}: {
    employee: EmployeeSummary | null;
    isOwn: boolean;
    minutes: number;
}) {
    if (employee === null) {
        return (
            <div className="min-w-0 text-sm">
                <p className="font-medium">Open shifts</p>
                <p className="text-xs text-muted-foreground tabular">
                    Unassigned · {formatMinutes(minutes)}
                </p>
            </div>
        );
    }

    return (
        <>
            <span
                className="mt-1.5 size-2.5 shrink-0 rounded-full bg-muted-foreground/40"
                style={
                    employee.color
                        ? { backgroundColor: employee.color }
                        : undefined
                }
                aria-hidden="true"
            />
            <div className="min-w-0 text-sm">
                <p className="truncate font-medium">
                    {employee.name}
                    {isOwn && (
                        <span className="font-normal text-muted-foreground">
                            {' '}
                            (you)
                        </span>
                    )}
                </p>
                <p className="truncate text-xs text-muted-foreground tabular">
                    {[employee.job_title, formatMinutes(minutes)]
                        .filter(Boolean)
                        .join(' · ')}
                </p>
            </div>
        </>
    );
}

ScheduleIndex.layout = {
    breadcrumbs: [{ title: 'Schedule', href: index() }],
};
