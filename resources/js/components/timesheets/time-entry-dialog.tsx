import { Form } from '@inertiajs/react';
import { useState } from 'react';
import TimeEntryController from '@/actions/App/Http/Controllers/TimeEntryController';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
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
import { Textarea } from '@/components/ui/textarea';
import { formatDate, localDate, toDateTimeLocalInput } from '@/lib/time';
import type { LocationOption, TimeEntry } from '@/types';

export type TimeEntryDialogTarget =
    | { mode: 'create'; date: string }
    | { mode: 'edit'; entry: TimeEntry };

const NO_LOCATION = 'none';

/**
 * Add or correct a time entry. Times are entered in the organization's timezone.
 */
export default function TimeEntryDialog({
    target,
    onClose,
    employeeId,
    employeeName,
    locations,
    timeZone,
}: {
    target: TimeEntryDialogTarget | null;
    onClose: () => void;
    employeeId: number;
    employeeName: string;
    locations: LocationOption[];
    timeZone: string;
}) {
    return (
        <Dialog
            open={target !== null}
            onOpenChange={(open) => {
                if (!open) {
                    onClose();
                }
            }}
        >
            <DialogContent className="sm:max-w-lg">
                {target && (
                    <TimeEntryForm
                        target={target}
                        onClose={onClose}
                        employeeId={employeeId}
                        employeeName={employeeName}
                        locations={locations}
                        timeZone={timeZone}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
}

function TimeEntryForm({
    target,
    onClose,
    employeeId,
    employeeName,
    locations,
    timeZone,
}: {
    target: TimeEntryDialogTarget;
    onClose: () => void;
    employeeId: number;
    employeeName: string;
    locations: LocationOption[];
    timeZone: string;
}) {
    const entry = target.mode === 'edit' ? target.entry : null;
    const [locationId, setLocationId] = useState<string>(
        entry?.location ? String(entry.location.id) : NO_LOCATION,
    );

    const defaults =
        target.mode === 'edit'
            ? {
                  clockIn: toDateTimeLocalInput(
                      target.entry.clock_in_at,
                      timeZone,
                  ),
                  clockOut: target.entry.clock_out_at
                      ? toDateTimeLocalInput(
                            target.entry.clock_out_at,
                            timeZone,
                        )
                      : '',
                  breakMinutes: String(target.entry.break_minutes),
                  notes: target.entry.notes ?? '',
              }
            : {
                  clockIn: `${target.date}T09:00`,
                  clockOut: `${target.date}T17:00`,
                  breakMinutes: '0',
                  notes: '',
              };

    const formAttributes = entry
        ? TimeEntryController.update.form(entry.id)
        : TimeEntryController.store.form();

    return (
        <>
            <DialogTitle>
                {entry ? 'Edit time entry' : 'Add time entry'}
            </DialogTitle>
            <DialogDescription>
                {entry
                    ? `Correct ${employeeName}'s entry from ${formatDate(localDate(entry.clock_in_at, timeZone))}. The change is recorded in the audit log.`
                    : `Add a manual entry for ${employeeName}. Times are in ${timeZone}.`}
            </DialogDescription>

            <Form
                {...formAttributes}
                options={{ preserveScroll: true }}
                onSuccess={onClose}
                className="space-y-4"
            >
                {({ processing, errors }) => (
                    <>
                        {!entry && (
                            <input
                                type="hidden"
                                name="employee_id"
                                value={employeeId}
                            />
                        )}

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="clock_in_at">Clock in</Label>
                                <Input
                                    id="clock_in_at"
                                    name="clock_in_at"
                                    type="datetime-local"
                                    defaultValue={defaults.clockIn}
                                    required
                                />
                                <InputError message={errors.clock_in_at} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="clock_out_at">Clock out</Label>
                                <Input
                                    id="clock_out_at"
                                    name="clock_out_at"
                                    type="datetime-local"
                                    defaultValue={defaults.clockOut}
                                    required
                                />
                                <InputError message={errors.clock_out_at} />
                            </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="break_minutes">
                                    Break (minutes)
                                </Label>
                                <Input
                                    id="break_minutes"
                                    name="break_minutes"
                                    type="number"
                                    inputMode="numeric"
                                    min={0}
                                    max={600}
                                    step={1}
                                    defaultValue={defaults.breakMinutes}
                                />
                                <InputError message={errors.break_minutes} />
                            </div>

                            {locations.length > 0 && (
                                <div className="grid gap-2">
                                    <Label htmlFor="location_id">
                                        Location
                                    </Label>
                                    <input
                                        type="hidden"
                                        name="location_id"
                                        value={
                                            locationId === NO_LOCATION
                                                ? ''
                                                : locationId
                                        }
                                    />
                                    <Select
                                        value={locationId}
                                        onValueChange={setLocationId}
                                    >
                                        <SelectTrigger
                                            id="location_id"
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
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="notes">Notes</Label>
                            <Textarea
                                id="notes"
                                name="notes"
                                rows={3}
                                maxLength={1000}
                                defaultValue={defaults.notes}
                                placeholder="Why is this entry being added or changed?"
                            />
                            <InputError message={errors.notes} />
                        </div>

                        <InputError message={errors.employee_id} />

                        <DialogFooter className="gap-2">
                            <DialogClose asChild>
                                <Button type="button" variant="secondary">
                                    Cancel
                                </Button>
                            </DialogClose>
                            <Button type="submit" disabled={processing}>
                                {entry ? 'Save changes' : 'Add entry'}
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </Form>
        </>
    );
}
