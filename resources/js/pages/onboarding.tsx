import { Form, Head, Link } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import OnboardingController from '@/actions/App/Http/Controllers/OnboardingController';
import AppLogoIcon from '@/components/app-logo-icon';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
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
import { formatDate } from '@/lib/time';
import { timeZoneChoices } from '@/lib/timezones';
import { login, logout } from '@/routes';
import { store as startWorkspace } from '@/routes/start';

type Props = {
    trialDays: number;
    freeUntil: string | null;
    /** A visitor starting a workspace without an account, rather than a signed-up user. */
    isGuest?: boolean;
};

function browserTimeZone(): string {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

export default function Onboarding({
    trialDays,
    freeUntil,
    isGuest = false,
}: Props) {
    const [detectedTimezone, setDetectedTimezone] = useState('');
    const [timezone, setTimezone] = useState('UTC');
    const timeZones = timeZoneChoices(detectedTimezone);

    /** Default to the browser's timezone once mounted, so server and client renders match. */
    useEffect(() => {
        const zone = browserTimeZone();

        setDetectedTimezone(zone);
        setTimezone(zone);
    }, []);

    return (
        <>
            <Head title="Set up your organization" />

            <div className="flex min-h-svh flex-col bg-background">
                <header className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6">
                    <div className="flex items-center gap-2">
                        <AppLogoIcon className="size-7" />
                        <span className="text-lg font-semibold tracking-tight">
                            Shiftora
                        </span>
                    </div>
                    {isGuest ? (
                        <Link
                            href={login()}
                            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                        >
                            Log in
                        </Link>
                    ) : (
                        <Link
                            href={logout()}
                            as="button"
                            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                        >
                            Log out
                        </Link>
                    )}
                </header>

                <main className="flex flex-1 items-start justify-center px-4 pt-6 pb-16 sm:items-center sm:px-6">
                    <div className="w-full max-w-xl space-y-8">
                        <div className="space-y-3 text-center">
                            <AppLogoIcon className="mx-auto size-12" />
                            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                                {isGuest
                                    ? 'Set up your workspace'
                                    : 'Set up your organization'}
                            </h1>
                            <p className="mx-auto max-w-md text-sm text-muted-foreground">
                                {isGuest &&
                                    'No sign-up needed: add your team and try it for real. '}
                                Everything is unlocked while you try it, and a
                                free plan keeps going after.{' '}
                                {freeUntil
                                    ? `Free until ${formatDate(freeUntil, { month: 'long', day: 'numeric', year: 'numeric' })}, no card needed.`
                                    : `Free for ${trialDays} days, no card needed.`}
                            </p>
                        </div>

                        <Form
                            {...(isGuest
                                ? startWorkspace.form()
                                : OnboardingController.store.form())}
                            className="space-y-6 rounded-xl border bg-card p-4 shadow-xs sm:p-6"
                        >
                            {({ processing, errors }) => (
                                <>
                                    {isGuest && (
                                        <div className="grid content-start gap-2">
                                            <Label htmlFor="owner_name">
                                                Your name
                                            </Label>
                                            <Input
                                                id="owner_name"
                                                name="owner_name"
                                                required
                                                autoFocus
                                                maxLength={255}
                                                autoComplete="name"
                                                placeholder="e.g. Sam Rivera"
                                            />
                                            <InputError
                                                message={errors.owner_name}
                                            />
                                        </div>
                                    )}

                                    <div className="grid content-start gap-2">
                                        <Label htmlFor="name">
                                            Business name
                                        </Label>
                                        <Input
                                            id="name"
                                            name="name"
                                            required
                                            autoFocus={!isGuest}
                                            maxLength={255}
                                            autoComplete="organization"
                                            placeholder="e.g. Harbor Street Café"
                                        />
                                        <InputError message={errors.name} />
                                    </div>

                                    <div className="grid content-start gap-2">
                                        <Label htmlFor="timezone">
                                            Timezone
                                        </Label>
                                        <input
                                            type="hidden"
                                            name="timezone"
                                            value={timezone}
                                        />
                                        <Select
                                            value={timezone}
                                            onValueChange={(value) => {
                                                // The select reports an empty value for a moment when the browser's
                                                // zone (e.g. "Etc/GMT+4") isn't in the standard list yet; keep ours.
                                                if (value !== '') {
                                                    setTimezone(value);
                                                }
                                            }}
                                        >
                                            <SelectTrigger
                                                id="timezone"
                                                className="w-full"
                                            >
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="max-h-72">
                                                {timeZones.map((zone) => (
                                                    <SelectItem
                                                        key={zone.value}
                                                        value={zone.value}
                                                    >
                                                        {zone.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <p className="text-xs text-muted-foreground">
                                            Shifts and timesheets use this
                                            timezone.
                                        </p>
                                        <InputError message={errors.timezone} />
                                    </div>

                                    <Button
                                        type="submit"
                                        size="lg"
                                        className="w-full"
                                        disabled={processing}
                                    >
                                        {processing && <Spinner />}
                                        {isGuest
                                            ? 'Start using Shiftora'
                                            : 'Set up my workspace'}
                                    </Button>
                                </>
                            )}
                        </Form>
                    </div>
                </main>
            </div>
        </>
    );
}
