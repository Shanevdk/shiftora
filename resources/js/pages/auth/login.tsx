import { Form, Head } from '@inertiajs/react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { store } from '@/routes/login';
import { request } from '@/routes/password';
import { create as startFree } from '@/routes/start';
import PasskeyVerify from '@/components/passkey-verify';

/** Everyone uses the same login; this only changes the guidance around it. */
type Audience = 'employee' | 'manager';

type Props = {
    status?: string;
    canResetPassword: boolean;
};

export default function Login({ status, canResetPassword }: Props) {
    const [audience, setAudience] = useState<Audience>('employee');

    return (
        <>
            <Head title="Log in" />

            <div className="space-y-3">
                <ToggleGroup
                    type="single"
                    variant="outline"
                    value={audience}
                    onValueChange={(value) =>
                        setAudience(
                            value === 'manager' ? 'manager' : 'employee',
                        )
                    }
                    aria-label="Who is logging in"
                    className="w-full"
                >
                    <ToggleGroupItem value="employee" className="flex-1">
                        Employee
                    </ToggleGroupItem>
                    <ToggleGroupItem value="manager" className="flex-1">
                        Owner or manager
                    </ToggleGroupItem>
                </ToggleGroup>
                <p className="text-center text-sm text-muted-foreground">
                    {audience === 'employee'
                        ? 'Use the email your manager invited you with to see your shifts and clock in.'
                        : 'Run your schedule, timesheets and team from here.'}
                </p>
            </div>

            <PasskeyVerify />

            <Form
                {...store.form()}
                resetOnSuccess={['password']}
                className="flex flex-col gap-6"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-6">
                            <div className="grid gap-2">
                                <Label htmlFor="email">Email address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    name="email"
                                    required
                                    autoFocus
                                    tabIndex={1}
                                    autoComplete="email"
                                    placeholder="email@example.com"
                                />
                                <InputError message={errors.email} />
                            </div>

                            <div className="grid gap-2">
                                <div className="flex items-center">
                                    <Label htmlFor="password">Password</Label>
                                    {canResetPassword && (
                                        <TextLink
                                            href={request()}
                                            className="ml-auto text-sm"
                                            tabIndex={5}
                                        >
                                            Forgot your password?
                                        </TextLink>
                                    )}
                                </div>
                                <PasswordInput
                                    id="password"
                                    name="password"
                                    required
                                    tabIndex={2}
                                    autoComplete="current-password"
                                    placeholder="Password"
                                />
                                <InputError message={errors.password} />
                            </div>

                            <div className="flex items-center space-x-3">
                                <Checkbox
                                    id="remember"
                                    name="remember"
                                    tabIndex={3}
                                />
                                <Label htmlFor="remember">Remember me</Label>
                            </div>

                            <Button
                                type="submit"
                                className="mt-4 w-full"
                                tabIndex={4}
                                disabled={processing}
                                data-test="login-button"
                            >
                                {processing && <Spinner />}
                                Log in
                            </Button>
                        </div>

                        {audience === 'employee' ? (
                            <p className="text-center text-sm text-muted-foreground">
                                No login yet? Ask your manager to send you an
                                invite. Clocking in on a shared tablet? Just
                                enter your PIN there.
                            </p>
                        ) : (
                            <div className="text-center text-sm text-muted-foreground">
                                New to Shiftora?{' '}
                                <TextLink href={startFree()} tabIndex={5}>
                                    Start free
                                </TextLink>
                            </div>
                        )}
                    </>
                )}
            </Form>

            {status && (
                <div className="mb-4 text-center text-sm font-medium text-green-600">
                    {status}
                </div>
            )}
        </>
    );
}

Login.layout = {
    title: 'Log in to your account',
    description: 'Enter your email and password below to log in',
};
