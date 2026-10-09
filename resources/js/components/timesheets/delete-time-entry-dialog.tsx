import { Form } from '@inertiajs/react';
import TimeEntryController from '@/actions/App/Http/Controllers/TimeEntryController';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
} from '@/components/ui/dialog';
import { formatDateTimeDay, formatTime } from '@/lib/time';
import type { TimeEntry } from '@/types';

/**
 * Confirm removing a time entry from an employee's week.
 */
export default function DeleteTimeEntryDialog({
    entry,
    onClose,
    timeZone,
}: {
    entry: TimeEntry | null;
    onClose: () => void;
    timeZone: string;
}) {
    return (
        <Dialog
            open={entry !== null}
            onOpenChange={(open) => {
                if (!open) {
                    onClose();
                }
            }}
        >
            <DialogContent>
                {entry && (
                    <>
                        <DialogTitle>Delete this time entry?</DialogTitle>
                        <DialogDescription>
                            The entry from{' '}
                            {formatDateTimeDay(entry.clock_in_at, timeZone)} at{' '}
                            {formatTime(entry.clock_in_at, timeZone)} will be
                            removed from the timesheet. The deletion is recorded
                            in the audit log.
                        </DialogDescription>

                        <Form
                            {...TimeEntryController.destroy.form(entry.id)}
                            options={{ preserveScroll: true }}
                            onSuccess={onClose}
                        >
                            {({ processing }) => (
                                <DialogFooter className="gap-2">
                                    <DialogClose asChild>
                                        <Button
                                            type="button"
                                            variant="secondary"
                                        >
                                            Cancel
                                        </Button>
                                    </DialogClose>
                                    <Button
                                        type="submit"
                                        variant="destructive"
                                        disabled={processing}
                                    >
                                        Delete entry
                                    </Button>
                                </DialogFooter>
                            )}
                        </Form>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
