import { Form } from '@inertiajs/react';
import { Check, RotateCcw, Send, Undo2 } from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { approve, reject, reopen, submit } from '@/routes/timesheets';

export type TimesheetAbilities = {
    submit: boolean;
    review: boolean;
    reopen: boolean;
    editEntries: boolean;
};

/**
 * Submit, approve, request changes or reopen, depending on what the viewer may do.
 */
export default function TimesheetActions({
    timesheetId,
    employeeName,
    can,
    hasOpenEntry,
}: {
    timesheetId: number;
    employeeName: string;
    can: TimesheetAbilities;
    hasOpenEntry: boolean;
}) {
    return (
        <div className="flex flex-wrap items-center gap-2">
            {can.submit && (
                <Form
                    {...submit.form(timesheetId)}
                    options={{ preserveScroll: true }}
                >
                    {({ processing }) => (
                        <Button
                            type="submit"
                            disabled={processing || hasOpenEntry}
                        >
                            <Send />
                            Submit for approval
                        </Button>
                    )}
                </Form>
            )}

            {can.review && (
                <>
                    <ReviewDialog
                        kind="reject"
                        timesheetId={timesheetId}
                        employeeName={employeeName}
                    />
                    <ReviewDialog
                        kind="approve"
                        timesheetId={timesheetId}
                        employeeName={employeeName}
                    />
                </>
            )}

            {can.reopen && (
                <Form
                    {...reopen.form(timesheetId)}
                    options={{ preserveScroll: true }}
                >
                    {({ processing }) => (
                        <Button
                            type="submit"
                            variant="outline"
                            disabled={processing}
                        >
                            <RotateCcw />
                            Reopen
                        </Button>
                    )}
                </Form>
            )}
        </div>
    );
}

function ReviewDialog({
    kind,
    timesheetId,
    employeeName,
}: {
    kind: 'approve' | 'reject';
    timesheetId: number;
    employeeName: string;
}) {
    const [open, setOpen] = useState(false);
    const isApproval = kind === 'approve';
    const formAttributes = isApproval
        ? approve.form(timesheetId)
        : reject.form(timesheetId);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant={isApproval ? 'default' : 'outline'}>
                    {isApproval ? <Check /> : <Undo2 />}
                    {isApproval ? 'Approve' : 'Request changes'}
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogTitle>
                    {isApproval
                        ? `Approve ${employeeName}'s timesheet?`
                        : 'Request changes'}
                </DialogTitle>
                <DialogDescription>
                    {isApproval
                        ? 'Approving locks the week so its hours are ready for payroll. You can reopen it later if something needs correcting.'
                        : `Send the timesheet back to ${employeeName} with a note explaining what needs to change.`}
                </DialogDescription>

                <Form
                    {...formAttributes}
                    options={{ preserveScroll: true }}
                    onSuccess={() => setOpen(false)}
                    className="space-y-4"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor={`${kind}-note`}>
                                    {isApproval ? 'Note (optional)' : 'Note'}
                                </Label>
                                <Textarea
                                    id={`${kind}-note`}
                                    name="note"
                                    rows={3}
                                    maxLength={1000}
                                    required={!isApproval}
                                    placeholder={
                                        isApproval
                                            ? 'Anything the employee should know'
                                            : 'e.g. Tuesday is missing your clock-out'
                                    }
                                />
                                <InputError message={errors.note} />
                            </div>

                            <InputError message={errors.timesheet} />

                            <DialogFooter className="gap-2">
                                <DialogClose asChild>
                                    <Button type="button" variant="secondary">
                                        Cancel
                                    </Button>
                                </DialogClose>
                                <Button type="submit" disabled={processing}>
                                    {isApproval ? 'Approve' : 'Send back'}
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}
