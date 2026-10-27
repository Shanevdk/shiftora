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
                        <span className="font-display text-2xl">Shiftora</span>
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

                <main className="mx-auto grid w-full max-w-5xl flex-1 gap-10 px-4 pt-6 pb-16 sm:px-6 lg:grid-cols-12 lg:items-center lg:gap-16">
                    <div className="space-y-6 lg:col-span-5">
                        <h1 className="font-display text-4xl leading-[1.05] tracking-tight sm:text-5xl">
                            {isGuest
                                ? 'Set up your workspace'
                                : 'Set up your organization'}
                        </h1>
                        <p className="max-w-sm text-muted-foreground">
                            {isGuest &&
                                'No sign-up needed: add your team and try it for real. '}
                            Everything is unlocked while you try it, and a free
                            plan keeps going after.{' '}
                            {freeUntil
                                ? `Free until ${formatDate(freeUntil, { month: 'long', day: 'numeric', year: 'numeric' })}, no card needed.`
                                : `Free for ${trialDays} days, no card needed.`}
                        </p>
                        <ol className="space-y-3 border-l pl-5 text-sm">
                            {[
                                'Add your team. They get an email invite.',
                                'Build the week and publish it.',
                                "Watch who's on the clock, then approve timesheets.",
                            ].map((step, index) => (
                                <li key={step} className="flex gap-3">
                                    <span className="font-display text-lg leading-5 text-primary">
                                        {index + 1}
                                    </span>
                                    <span className="text-muted-foreground">
                                        {step}
                                    </span>
                                </li>
                            ))}
                        </ol>
                    </div>

                    <div className="lg:col-span-7">
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
