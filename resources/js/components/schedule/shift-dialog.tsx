import { Form, router } from '@inertiajs/react';
import { Moon, Trash2 } from 'lucide-react';
import { useState } from 'react';
import {
    destroy,
    store,
    update,
} from '@/actions/App/Http/Controllers/ShiftController';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { formatDate, localDate, localTime } from '@/lib/time';
import type { EmployeeSummary, LocationOption, Shift } from '@/types';

const OPEN_SHIFT = 'open';
const NO_LOCATION = 'none';

export type ShiftDialogTarget =
    | { mode: 'create'; employeeId: number | null; date: string }
    | { mode: 'edit'; shift: Shift };

/**
 * Create / edit / delete a shift. Remount it with a new `key` per target so the defaults reset.
 */
export default function ShiftDialog({
    open,
    target,
    employees,
    locations,
    timeZone,
    onOpenChange,
}: {
    open: boolean;
    target: ShiftDialogTarget | null;
    employees: EmployeeSummary[];
    locations: LocationOption[];
    timeZone: string;
    onOpenChange: (open: boolean) => void;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
                {target && (
                    <ShiftForm
                        target={target}
                        employees={employees}
                        locations={locations}
                        timeZone={timeZone}
                        onClose={() => onOpenChange(false)}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
}

function ShiftForm({
    target,
    employees,
    locations,
    timeZone,
    onClose,
}: {
    target: ShiftDialogTarget;
    employees: EmployeeSummary[];
    locations: LocationOption[];
    timeZone: string;
    onClose: () => void;
}) {
    const shift = target.mode === 'edit' ? target.shift : null;
    const initialEmployeeId =
        target.mode === 'edit' ? target.shift.employee_id : target.employeeId;
    const initialLocationId = shift
        ? shift.location_id
        : (employees.find((employee) => employee.id === initialEmployeeId)
              ?.location_id ?? null);

    const [employeeId, setEmployeeId] = useState<string>(
        initialEmployeeId === null ? OPEN_SHIFT : String(initialEmployeeId),
    );
    const [locationId, setLocationId] = useState<string>(
        initialLocationId === null ? NO_LOCATION : String(initialLocationId),
    );
    const [date, setDate] = useState(
        target.mode === 'edit'
            ? localDate(target.shift.starts_at, timeZone)
            : target.date,
    );
    const [startTime, setStartTime] = useState(
        shift ? localTime(shift.starts_at, timeZone) : '09:00',
    );
    const [endTime, setEndTime] = useState(
        shift ? localTime(shift.ends_at, timeZone) : '17:00',
    );
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const endsNextDay =
        startTime !== '' && endTime !== '' && endTime <= startTime;

    function deleteShift(): void {
        if (shift === null) {
            return;
        }

        router.delete(destroy.url(shift), {
            preserveScroll: true,
            onStart: () => setDeleting(true),
            onFinish: () => setDeleting(false),
            onSuccess: () => onClose(),
        });
    }

    return (
        <>
            <DialogHeader>
                <DialogTitle>{shift ? 'Edit shift' : 'Add shift'}</DialogTitle>
                <DialogDescription>
                    {shift
                        ? 'Changes stay in draft until you publish the schedule.'
                        : 'New shifts are drafts until you publish the schedule.'}
                </DialogDescription>
            </DialogHeader>

            <Form
                {...(shift ? update.form(shift) : store.form())}
                options={{ preserveScroll: true }}
                onSuccess={() => onClose()}
                className="grid gap-4"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-2">
                            <Label htmlFor="shift-employee">Employee</Label>
                            <Select
                                value={employeeId}
                                onValueChange={setEmployeeId}
                            >
                                <SelectTrigger
                                    id="shift-employee"
                                    className="w-full"
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={OPEN_SHIFT}>
                                        Open shift (unassigned)
                                    </SelectItem>
                                    {employees.map((employee) => (
                                        <SelectItem
                                            key={employee.id}
                                            value={String(employee.id)}
                                        >
                                            {employee.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <input
                                type="hidden"
                                name="employee_id"
                                value={
                                    employeeId === OPEN_SHIFT ? '' : employeeId
                                }
                            />
                            <InputError message={errors.employee_id} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="shift-date">Date</Label>
                            <Input
                                id="shift-date"
                                type="date"
                                name="date"
                                value={date}
                                onChange={(event) =>
                                    setDate(event.target.value)
                                }
                                required
                            />
                            {date && (
                                <p className="text-xs text-muted-foreground">
                                    {formatDate(date, {
                                        weekday: 'long',
                                        month: 'long',
                                        day: 'numeric',
                                    })}
                                </p>
                            )}
                            <InputError message={errors.date} />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="shift-start">Start</Label>
                                <Input
                                    id="shift-start"
                                    type="time"
                                    name="start_time"
                                    value={startTime}
                                    onChange={(event) =>
                                        setStartTime(event.target.value)
                                    }
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="shift-end">End</Label>
                                <Input
                                    id="shift-end"
                                    type="time"
                                    name="end_time"
                                    value={endTime}
                                    onChange={(event) =>
                                        setEndTime(event.target.value)
                                    }
                                    required
                                />
                            </div>
                            <p className="col-span-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                                {endsNextDay && (
                                    <Moon
                                        className="size-3.5 text-primary"
                                        aria-hidden="true"
                                    />
                                )}
                                {endsNextDay
                                    ? 'Overnight shift: it ends the next day.'
                                    : 'An end time before the start time makes an overnight shift.'}
                            </p>
                            <InputError
                                className="col-span-2"
                                message={errors.start_time ?? errors.end_time}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="shift-break">
                                    Break (minutes)
                                </Label>
                                <Input
                                    id="shift-break"
                                    type="number"
                                    name="break_minutes"
                                    min={0}
                                    max={240}
                                    step={5}
                                    inputMode="numeric"
                                    defaultValue={shift?.break_minutes ?? 30}
                                />
                                <InputError message={errors.break_minutes} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="shift-position">Position</Label>
                                <Input
                                    id="shift-position"
                                    name="position"
                                    maxLength={100}
                                    defaultValue={shift?.position ?? ''}
                                    placeholder="e.g. Barista"
                                />
                                <InputError message={errors.position} />
                            </div>
                        </div>

                        {locations.length > 0 && (
                            <div className="grid gap-2">
                                <Label htmlFor="shift-location">Location</Label>
                                <Select
                                    value={locationId}
                                    onValueChange={setLocationId}
                                >
                                    <SelectTrigger
                                        id="shift-location"
                                        className="w-full"
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={NO_LOCATION}>
                                            No location
                                        </SelectItem>
                                        {locations.map((location) => (
                                            <SelectItem
                                                key={location.id}
                                                value={String(location.id)}
                                            >
                                                {location.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.location_id} />
                            </div>
                        )}
                        <input
                            type="hidden"
                            name="location_id"
                            value={locationId === NO_LOCATION ? '' : locationId}
                        />

                        <div className="grid gap-2">
                            <Label htmlFor="shift-notes">Notes</Label>
                            <Textarea
                                id="shift-notes"
                                name="notes"
                                maxLength={1000}
                                rows={2}
                                defaultValue={shift?.notes ?? ''}
                                placeholder="Optional instructions for this shift"
                            />
                            <InputError message={errors.notes} />
                        </div>

                        <DialogFooter className="gap-2 sm:justify-between">
                            {shift ? (
                                confirmingDelete ? (
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Button
                                            type="button"
                                            variant="destructive"
                                            disabled={deleting}
                                            onClick={deleteShift}
                                        >
                                            {deleting && <Spinner />}
                                            Confirm delete
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={() =>
                                                setConfirmingDelete(false)
                                            }
                                        >
                                            Keep
                                        </Button>
                                    </div>
                                ) : (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        className="text-destructive hover:text-destructive"
                                        onClick={() =>
                                            setConfirmingDelete(true)
                                        }
                                    >
                                        <Trash2 />
                                        Delete
                                    </Button>
                                )
                            ) : (
                                <span aria-hidden="true" />
                            )}
                            <div className="flex flex-col-reverse gap-2 sm:flex-row">
                                <DialogClose asChild>
                                    <Button type="button" variant="secondary">
                                        Cancel
                                    </Button>
                                </DialogClose>
                                <Button type="submit" disabled={processing}>
                                    {processing && <Spinner />}
                                    {shift ? 'Save changes' : 'Add shift'}
                                </Button>
                            </div>
                        </DialogFooter>
                    </>
                )}
            </Form>
        </>
    );
}
