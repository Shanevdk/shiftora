import { Form, Head, Link, setLayoutProps } from '@inertiajs/react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { login, logout } from '@/routes';

type Invitation = {
    first_name: string;
    last_name: string;
    email: string;
    organization: string;
};

type Mode = 'register' | 'join' | 'login' | 'wrong-account';

type Props = {
    invitation: Invitation;
    acceptUrl: string;
    mode: Mode;
};

const layoutCopy: Record<
    Mode,
    (invitation: Invitation) => { title: string; description: string }
> = {
    register: (invitation) => ({
        title: `Join ${invitation.organization}`,
        description:
            'Create your Shiftora login to clock in, see your schedule and submit timesheets.',
    }),
    join: (invitation) => ({
        title: `Join ${invitation.organization}`,
        description: `You've been invited to ${invitation.organization} on Shiftora.`,
    }),
    login: (invitation) => ({
        title: `Join ${invitation.organization}`,
        description: 'You already have a Shiftora account.',
    }),
    'wrong-account': () => ({
        title: 'Wrong account',
        description: "You're signed in with a different email address.",
    }),
};

export default function AcceptInvitation({
    invitation,
    acceptUrl,
    mode,
}: Props) {
    setLayoutProps(layoutCopy[mode](invitation));

    return (
        <>
            <Head title={`Join ${invitation.organization}`} />

            {mode === 'register' && (
                <RegisterForm invitation={invitation} acceptUrl={acceptUrl} />
            )}

            {mode === 'join' && (
                <Form
                    action={acceptUrl}
                    method="post"
                    className="flex flex-col gap-4"
                >
                    {({ processing }) => (
                        <>
                            <p className="text-center text-sm text-muted-foreground">
                                You're signed in as{' '}
                                <span className="font-medium text-foreground">
                                    {invitation.email}
                                </span>
                                .
                            </p>
                            <Button
                                type="submit"
                                className="w-full"
                                disabled={processing}
                            >
                                {processing && <Spinner />}
                                Join {invitation.organization}
                            </Button>
                        </>
                    )}
                </Form>
            )}

            {mode === 'login' && (
                <div className="flex flex-col gap-4 text-center text-sm text-muted-foreground">
                    <p>
                        There's already a Shiftora account for{' '}
                        <span className="font-medium text-foreground">
                            {invitation.email}
                        </span>
                        . Log in with it, then open the invitation link from
                        your email again to join {invitation.organization}.
                    </p>
                    <Button asChild className="w-full">
                        <Link href={login()}>Log in</Link>
                    </Button>
                </div>
            )}

            {mode === 'wrong-account' && (
                <div className="flex flex-col gap-4 text-center text-sm text-muted-foreground">
                    <p>
                        This invitation to {invitation.organization} was sent to{' '}
                        <span className="font-medium text-foreground">
                            {invitation.email}
                        </span>
                        . Log out, then open the invitation link again to sign
                        in or create an account with that address.
                    </p>
                    <Button asChild variant="outline" className="w-full">
                        <Link href={logout()} as="button">
                            Log out
                        </Link>
                    </Button>
                </div>
            )}
        </>
    );
}

function RegisterForm({
    invitation,
    acceptUrl,
}: {
    invitation: Invitation;
    acceptUrl: string;
}) {
    return (
        <Form
            action={acceptUrl}
            method="post"
            resetOnSuccess={['password', 'password_confirmation']}
            disableWhileProcessing
            className="flex flex-col gap-6"
        >
            {({ processing, errors }) => (
                <div className="grid gap-6">
                    <div className="grid gap-2">
                        <Label htmlFor="email">Email address</Label>
                        <Input
                            id="email"
                            type="email"
                            value={invitation.email}
                            readOnly
                            disabled
                            autoComplete="username"
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="name">Your name</Label>
                        <Input
                            id="name"
                            name="name"
                            required
                            autoFocus
                            maxLength={255}
                            autoComplete="name"
                            defaultValue={`${invitation.first_name} ${invitation.last_name}`.trim()}
                        />
                        <InputError message={errors.name} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="password">Password</Label>
                        <PasswordInput
                            id="password"
                            name="password"
                            required
                            autoComplete="new-password"
                            placeholder="Password"
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
                        />
                        <InputError message={errors.password_confirmation} />
                    </div>

                    <Button
                        type="submit"
                        className="mt-2 w-full"
                        disabled={processing}
                    >
                        {processing && <Spinner />}
                        Create account and join
                    </Button>
                </div>
            )}
        </Form>
    );
}
