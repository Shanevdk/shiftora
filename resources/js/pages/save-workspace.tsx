import { Form, Head } from '@inertiajs/react';
import InputError from '@/components/input-error';
import PageContainer from '@/components/page-container';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useWorkspace } from '@/hooks/use-workspace';
import { cookies, privacy } from '@/routes/legal';
import { create, store } from '@/routes/save-workspace';

type Props = {
    passwordRules: string;
    /** Employees with an email whose invitations are waiting for the workspace to be saved. */
    pendingInvitations: number;
};

/**
 * Where a visitor keeps the workspace they built without an account, by giving it a login.
 */
export default function SaveWorkspace({
    passwordRules,
    pendingInvitations,
}: Props) {
    const { organization } = useWorkspace();

    return (
        <>
            <Head title="Save your workspace" />
            <PageContainer className="max-w-lg">
                <div className="space-y-2">
                    <h1 className="text-2xl font-semibold tracking-tight">
                        Save your workspace
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Add an email and password so you can come back to{' '}
                        {organization?.name ?? 'your workspace'} from any
                        device. Everything you've set up stays as it is.
                        {pendingInvitations > 0 &&
                            ` We'll also send the ${pendingInvitations === 1 ? 'invite' : `${pendingInvitations} invites`} you've set up.`}
                    </p>
                </div>

                <Form
                    {...store.form()}
                    resetOnSuccess={['password', 'password_confirmation']}
                    disableWhileProcessing
                    className="grid gap-6 rounded-xl border bg-card p-4 shadow-xs sm:p-6"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="email">Email address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    name="email"
                                    required
                                    autoFocus
                                    autoComplete="email"
                                    placeholder="email@example.com"
                                />
                                <InputError message={errors.email} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="password">Password</Label>
                                <PasswordInput
                                    id="password"
                                    name="password"
                                    required
                                    autoComplete="new-password"
                                    placeholder="Password"
                                    passwordrules={passwordRules}
                                />
                                <InputError message={errors.password} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="password_confirmation">
                                    Confirm password
                                </Label>
                                <PasswordInput
                                    id="password_confirmation"
                                    name="password_confirmation"
                                    required
                                    autoComplete="new-password"
                                    placeholder="Confirm password"
                                    passwordrules={passwordRules}
                                />
                                <InputError
                                    message={errors.password_confirmation}
                                />
                            </div>

                            <Button
                                type="submit"
                                size="lg"
                                className="w-full"
                                disabled={processing}
                            >
                                {processing && <Spinner />}
                                Save my workspace
                            </Button>

                            <p className="text-center text-xs text-muted-foreground">
                                By saving, you acknowledge our{' '}
                                <TextLink href={privacy()}>
                                    privacy policy
                                </TextLink>{' '}
                                and{' '}
                                <TextLink href={cookies()}>
                                    cookie policy
                                </TextLink>
                                .
                            </p>
                        </>
                    )}
                </Form>
            </PageContainer>
        </>
    );
}

SaveWorkspace.layout = {
    breadcrumbs: [{ title: 'Save your workspace', href: create() }],
};
