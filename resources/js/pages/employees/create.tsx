import { Form, Head, Link } from '@inertiajs/react';
import { useState } from 'react';
import { store } from '@/actions/App/Http/Controllers/EmployeeController';
import EmployeeFormFields from '@/components/employees/employee-form-fields';
import type { EmployeeFormOptions } from '@/components/employees/employee-form-fields';
import PageContainer from '@/components/page-container';
import PageHeader from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { create, index } from '@/routes/employees';

export default function EmployeesCreate({
    roles,
    locations,
    colors,
}: EmployeeFormOptions) {
    const [sendInvitation, setSendInvitation] = useState(true);

    return (
        <>
            <Head title="Add employee" />

            <PageContainer className="max-w-3xl">
                <PageHeader
                    title="Add employee"
                    description="Add someone to your team. Active employees count toward your plan's seats."
                />

                <Form
                    {...store.form()}
                    options={{ preserveScroll: true }}
                    className="space-y-6 rounded-xl border bg-card p-4 sm:p-6"
                >
                    {({ processing, errors }) => (
                        <>
                            <EmployeeFormFields
                                roles={roles}
                                locations={locations}
                                colors={colors}
                                errors={errors}
                            />

                            <div className="flex items-start gap-3 rounded-lg bg-muted/50 p-4">
                                <input
                                    type="hidden"
                                    name="send_invitation"
                                    value={sendInvitation ? '1' : '0'}
                                />
                                <Checkbox
                                    id="send_invitation"
                                    checked={sendInvitation}
                                    onCheckedChange={(checked) =>
                                        setSendInvitation(checked === true)
                                    }
                                    className="mt-0.5"
                                />
                                <div className="grid gap-1">
                                    <Label htmlFor="send_invitation">
                                        Send an invitation email
                                    </Label>
                                    <p className="text-xs text-muted-foreground">
                                        Only sent when you add an email address.
                                        They'll create a login to clock in and
                                        see their shifts. You can also invite
                                        them later.
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                                <Button variant="outline" asChild>
                                    <Link href={index()}>Cancel</Link>
                                </Button>
                                <Button type="submit" disabled={processing}>
                                    {processing && <Spinner />}
                                    Add employee
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </PageContainer>
        </>
    );
}

EmployeesCreate.layout = {
    breadcrumbs: [
        { title: 'Employees', href: index() },
        { title: 'Add employee', href: create() },
    ],
};
