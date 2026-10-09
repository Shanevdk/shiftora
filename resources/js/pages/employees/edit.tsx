import { Form, Head, Link, setLayoutProps } from '@inertiajs/react';
import { CalendarClock, Mail, UserCheck, UserX } from 'lucide-react';
import { useState } from 'react';
import { update } from '@/actions/App/Http/Controllers/EmployeeController';
import EmployeeAvatar from '@/components/employees/employee-avatar';
import EmployeeFormFields from '@/components/employees/employee-form-fields';
import type { EmployeeFormOptions } from '@/components/employees/employee-form-fields';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import PageContainer from '@/components/page-container';
import PageHeader from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
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
import { Spinner } from '@/components/ui/spinner';
import { useWorkspace } from '@/hooks/use-workspace';
import { formatDateTime } from '@/lib/time';
import { edit, index } from '@/routes/employees';
import { store as sendInvitation } from '@/routes/employees/invitation';
import { update as updateStatus } from '@/routes/employees/status';
import { show as showTimesheet } from '@/routes/timesheets';
import type { EmployeeDetail } from '@/types';

type Props = EmployeeFormOptions & {
    employee: EmployeeDetail;
    canChangeStatus: boolean;
};

export default function EmployeesEdit({
    employee,
    canChangeStatus,
    roles,
    locations,
    colors,
}: Props) {
    const { timeZone } = useWorkspace();

    setLayoutProps({
        breadcrumbs: [
            { title: 'Employees', href: index() },
            { title: employee.name, href: edit(employee.id) },
        ],
    });

    return (
        <>
            <Head title={`Edit ${employee.name}`} />

            <PageContainer className="max-w-3xl">
                <PageHeader
                    title={employee.name}
                    description={
                        <span className="flex flex-wrap items-center gap-2">
                            {employee.job_title ?? 'No job title'}
                            {!employee.is_active && (
                                <Badge variant="outline">Inactive</Badge>
                            )}
                        </span>
                    }
                    actions={
                        <Button variant="outline" asChild>
                            <Link href={showTimesheet(employee.id)}>
                                <CalendarClock aria-hidden="true" />
                                View timesheet
                            </Link>
                        </Button>
                    }
                />

                <Form
                    {...update.form(employee.id)}
                    options={{ preserveScroll: true }}
                    className="space-y-6 rounded-xl border bg-card p-4 sm:p-6"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="flex items-center gap-3">
                                <EmployeeAvatar
                                    firstName={employee.first_name}
                                    lastName={employee.last_name}
                                    color={employee.color}
                                    className="size-11 text-sm"
                                />
                                <div className="text-sm">
                                    <p className="font-medium">
                                        Employee details
                                    </p>
                                    <p className="text-muted-foreground">
                                        Changes apply to future shifts and
                                        timesheets.
                                    </p>
                                </div>
                            </div>

                            <EmployeeFormFields
                                employee={employee}
                                roles={roles}
                                locations={locations}
                                colors={colors}
                                errors={errors}
                            />

                            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                                <Button variant="outline" asChild>
                                    <Link href={index()}>Back to team</Link>
                                </Button>
                                <Button type="submit" disabled={processing}>
                                    {processing && <Spinner />}
                                    Save changes
                                </Button>
                            </div>
                        </>
                    )}
                </Form>

                <AccountSection employee={employee} timeZone={timeZone} />

                {canChangeStatus && <StatusSection employee={employee} />}
            </PageContainer>
        </>
    );
}

function AccountSection({
    employee,
    timeZone,
}: {
    employee: EmployeeDetail;
    timeZone: string;
}) {
    if (employee.has_account) {
        return (
            <section className="space-y-4 rounded-xl border bg-card p-4 sm:p-6">
                <Heading
                    variant="small"
                    title="Account"
                    description="This person has a Shiftora login and can clock in and see their schedule."
                />
                <Badge className="bg-accent text-accent-foreground">
                    <UserCheck aria-hidden="true" />
                    Active account
                </Badge>
            </section>
        );
    }

    return (
        <section className="space-y-4 rounded-xl border bg-card p-4 sm:p-6">
            <Heading
                variant="small"
                title="Invitation"
                description={
                    employee.email
                        ? 'They need to accept an invitation to create a login before they can clock in.'
                        : 'Add an email address above to invite them to Shiftora.'
                }
            />

            {employee.email && (
                <Form
                    {...sendInvitation.form(employee.id)}
                    options={{ preserveScroll: true }}
                    className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="space-y-1 text-sm">
                                <p className="text-muted-foreground">
                                    {employee.invited_at
                                        ? `Last invited ${formatDateTime(employee.invited_at, timeZone)} at ${employee.email}.`
                                        : `Not invited yet. We'll send it to ${employee.email}.`}
                                </p>
                                <InputError message={errors.email} />
                            </div>
                            <Button
                                type="submit"
                                variant="outline"
                                disabled={processing || !employee.is_active}
                            >
                                {processing ? (
                                    <Spinner />
                                ) : (
                                    <Mail aria-hidden="true" />
                                )}
                                {employee.invited_at
                                    ? 'Resend invitation'
                                    : 'Send invitation'}
                            </Button>
                        </>
                    )}
                </Form>
            )}
        </section>
    );
}

function StatusSection({ employee }: { employee: EmployeeDetail }) {
    const [open, setOpen] = useState(false);
    const deactivating = employee.is_active;

    return (
        <section className="space-y-4 rounded-xl border bg-card p-4 sm:p-6">
            <Heading
                variant="small"
                title={
                    deactivating ? 'Deactivate employee' : 'Reactivate employee'
                }
                description={
                    deactivating
                        ? 'Deactivated people can no longer clock in or sign in to this workspace, and they stop counting toward billing. Their past time stays on record.'
                        : `${employee.first_name} is inactive and does not count toward billing. Reactivating uses one of your plan's seats.`
                }
            />

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    <Button variant={deactivating ? 'destructive' : 'default'}>
                        {deactivating ? (
                            <UserX aria-hidden="true" />
                        ) : (
                            <UserCheck aria-hidden="true" />
                        )}
                        {deactivating ? 'Deactivate' : 'Reactivate'}
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogTitle>
                        {deactivating
                            ? `Deactivate ${employee.name}?`
                            : `Reactivate ${employee.name}?`}
                    </DialogTitle>
                    <DialogDescription>
                        {deactivating
                            ? "They won't be able to clock in or sign in, and they'll stop counting toward billing. Their timesheets and history are kept, and you can reactivate them at any time."
                            : "They'll be able to clock in and sign in again, and they'll count toward billing as an active employee."}
                    </DialogDescription>

                    <Form
                        {...updateStatus.form(employee.id)}
                        options={{ preserveScroll: true }}
                        onSuccess={() => setOpen(false)}
                        className="space-y-4"
                    >
                        {({ processing, errors }) => (
                            <>
                                <input
                                    type="hidden"
                                    name="is_active"
                                    value={deactivating ? '0' : '1'}
                                />
                                <InputError message={errors.is_active} />
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
                                        variant={
                                            deactivating
                                                ? 'destructive'
                                                : 'default'
                                        }
                                        disabled={processing}
                                    >
                                        {processing && <Spinner />}
                                        {deactivating
                                            ? 'Deactivate'
                                            : 'Reactivate'}
                                    </Button>
                                </DialogFooter>
                            </>
                        )}
                    </Form>
                </DialogContent>
            </Dialog>
        </section>
    );
}
