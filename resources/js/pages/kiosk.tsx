import { Form, Head, useHttp, usePoll } from '@inertiajs/react';
import {
    CheckCircle2,
    Coffee,
    Delete,
    LogIn,
    LogOut,
    Lock,
    Play,
    Share,
    Smartphone,
    X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import AppLogoIcon from '@/components/app-logo-icon';
import EmployeeAvatar from '@/components/employees/employee-avatar';
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
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useKioskInstallTip } from '@/hooks/use-kiosk-install-tip';
import { useWorkspace } from '@/hooks/use-workspace';
import { formatTime, serverNow } from '@/lib/time';
import { cn } from '@/lib/utils';
import { destroy, lookup, punch } from '@/routes/kiosk';
import { store as storeExitPin } from '@/routes/kiosk/exit-pin';
import type { ClockState } from '@/types';

type KioskAction = 'clock_in' | 'clock_out' | 'start_break' | 'end_break';

type KioskEmployee = {
    id: number;
    name: string;
    first_name: string;
    last_name: string;
    color: string | null;
    clock: ClockState;
};

type KioskResponse = { employee: KioskEmployee; message?: string };

type Props = {
    hasExitPin: boolean;
    /** Only set in the public demo, so visitors can try leaving the kiosk. */
    sampleExitPin: string | null;
    samplePins: { name: string; pin: string }[];
};

const PIN_MAX_LENGTH = 6;
const PIN_MIN_LENGTH = 4;

/** Seconds before an unfinished punch or a confirmation clears for the next person. */
const IDLE_RESET_SECONDS = 20;
const CONFIRMATION_SECONDS = 4;

/** Reloading this often keeps the manager's session (and its CSRF token) alive on an idle tablet. */
const KEEP_ALIVE_MS = 10 * 60 * 1000;

const keypadKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

/**
 * The shared time clock: a full-screen keypad where employees punch in and out with their PIN.
 */
export default function Kiosk({
    hasExitPin,
    sampleExitPin,
    samplePins,
}: Props) {
    const { organization, timeZone } = useWorkspace();
    usePoll(KEEP_ALIVE_MS, { only: ['hasExitPin'] });
    const [now, setNow] = useState(() => new Date(serverNow()));
    const [employee, setEmployee] = useState<KioskEmployee | null>(null);
    const [confirmation, setConfirmation] = useState<string | null>(null);
    const [failure, setFailure] = useState<string | null>(null);
    const http = useHttp<{ pin: string }, KioskResponse>({ pin: '' });
    const pin = http.data.pin;

    function reset(): void {
        http.setData('pin', '');
        http.clearErrors();
        setEmployee(null);
        setConfirmation(null);
        setFailure(null);
    }

    useEffect(() => {
        const interval = window.setInterval(
            () => setNow(new Date(serverNow())),
            1000,
        );

        return () => window.clearInterval(interval);
    }, []);

    useEffect(() => {
        if (employee === null && confirmation === null) {
            return;
        }

        const timeout = window.setTimeout(
            reset,
            (confirmation !== null
                ? CONFIRMATION_SECONDS
                : IDLE_RESET_SECONDS) * 1000,
        );

        return () => window.clearTimeout(timeout);
    }, [employee, confirmation]);

    async function send(
        url: string,
        action?: KioskAction,
    ): Promise<KioskResponse | undefined> {
        setFailure(null);
        http.transform((data) => (action ? { ...data, action } : data));

        try {
            return await http.post(url);
        } catch {
            setFailure(
                'Something went wrong. Check the connection and try again, or ask a manager.',
            );

            return undefined;
        }
    }

    async function submitPin(): Promise<void> {
        if (pin.length < PIN_MIN_LENGTH || http.processing) {
            return;
        }

        const response = await send(lookup().url);

        if (response) {
            setEmployee(response.employee);
        } else {
            http.setData('pin', '');
        }
    }

    async function runAction(action: KioskAction): Promise<void> {
        const response = await send(punch().url, action);

        if (response?.message) {
            setEmployee(null);
            setConfirmation(response.message);
        }
    }

    function pressKey(key: string): void {
        if (employee !== null || confirmation !== null) {
            return;
        }

        http.clearErrors();
        setFailure(null);

        if (key === 'clear') {
            http.setData('pin', '');
        } else if (key === 'back') {
            http.setData('pin', pin.slice(0, -1));
        } else if (pin.length < PIN_MAX_LENGTH) {
            http.setData('pin', pin + key);
        }
    }

    useEffect(() => {
        function handleKeyDown(event: KeyboardEvent): void {
            if (!hasExitPin || event.target instanceof HTMLInputElement) {
                return;
            }

            if (/^\d$/.test(event.key)) {
                pressKey(event.key);
            } else if (event.key === 'Backspace') {
                pressKey('back');
            } else if (event.key === 'Escape') {
                reset();
            } else if (event.key === 'Enter') {
                void submitPin();
            }
        }

        window.addEventListener('keydown', handleKeyDown);

        return () => window.removeEventListener('keydown', handleKeyDown);
    });

    // Punch errors come back under the time clock's own keys ("clock"), not just the form's fields.
    const errors: Record<string, string | undefined> = http.errors;
    const errorMessage =
        failure ?? errors.pin ?? errors.clock ?? errors.action ?? null;

    return (
        <>
            <Head title="Kiosk">
                {/* Lets "Add to Home Screen" open the kiosk full screen with its own icon. */}
                <link rel="manifest" href="/kiosk-manifest.json" />
                <meta name="mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta
                    name="apple-mobile-web-app-status-bar-style"
                    content="black-translucent"
                />
                <meta name="apple-mobile-web-app-title" content="Kiosk" />
            </Head>
            <div className="flex min-h-svh flex-col bg-panel text-panel-foreground">
                <header className="flex items-center justify-between gap-4 px-4 py-4 sm:px-8">
                    <div className="flex min-w-0 items-center gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-warm-white">
                            {organization?.logo_url ? (
                                <img
                                    src={organization.logo_url}
                                    alt=""
                                    className="size-full object-cover"
                                />
                            ) : (
                                <AppLogoIcon className="size-6" />
                            )}
                        </span>
                        <div className="min-w-0">
                            <p className="truncate font-semibold text-warm-white">
                                {organization?.name}
                            </p>
                            <p className="text-sm text-panel-foreground/60">
                                Time clock
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-2xl font-semibold text-warm-white tabular">
                                {formatTime(now.toISOString(), timeZone)}
                            </p>
                            <p className="text-xs text-panel-foreground/60">
                                {new Intl.DateTimeFormat(undefined, {
                                    weekday: 'long',
                                    month: 'long',
                                    day: 'numeric',
                                    timeZone,
                                }).format(now)}
                            </p>
                        </div>
                        <ExitKioskButton />
                    </div>
                </header>

                <main className="flex flex-1 flex-col items-center justify-center px-4 pb-10">
                    {!hasExitPin ? (
                        <ExitPinSetup />
                    ) : confirmation !== null ? (
                        <Confirmation message={confirmation} onDone={reset} />
                    ) : employee !== null ? (
                        <EmployeeActions
                            employee={employee}
                            timeZone={timeZone}
                            processing={http.processing}
                            error={errorMessage}
                            onAction={(action) => void runAction(action)}
                            onCancel={reset}
                        />
                    ) : (
                        <Keypad
                            pin={pin}
                            processing={http.processing}
                            error={errorMessage}
                            onKey={pressKey}
                            onSubmit={() => void submitPin()}
                        />
                    )}
                </main>

                <InstallTip />

                {sampleExitPin !== null && (
                    <footer className="px-4 pb-6 text-center text-sm text-panel-foreground/60">
                        Demo PINs:{' '}
                        {samplePins
                            .map((sample) => `${sample.name} ${sample.pin}`)
                            .join(' · ')}
                        {' · '}Organization PIN to exit {sampleExitPin}
                    </footer>
                )}
            </div>
        </>
    );
}

function Keypad({
    pin,
    processing,
    error,
    onKey,
    onSubmit,
}: {
    pin: string;
    processing: boolean;
    error: string | null;
    onKey: (key: string) => void;
    onSubmit: () => void;
}) {
    const keyClassName =
        'flex h-16 items-center justify-center rounded-2xl bg-panel-accent text-2xl font-semibold text-warm-white transition active:scale-95 hover:bg-panel-accent/80 focus-visible:ring-[3px] focus-visible:ring-panel-ring focus-visible:outline-none sm:h-20 sm:text-3xl';

    return (
        <div className="flex w-full max-w-sm flex-col items-center gap-6">
            <div className="space-y-2 text-center">
                <h1 className="text-2xl font-semibold text-warm-white sm:text-3xl">
                    Enter your PIN
                </h1>
                <p className="text-panel-foreground/60">
                    to clock in, take a break or clock out
                </p>
            </div>

            <div
                className="flex h-6 items-center gap-3"
                aria-label={`${pin.length} digits entered`}
            >
                {Array.from({
                    length: Math.max(PIN_MIN_LENGTH, pin.length),
                }).map((_, index) => (
                    <span
                        key={index}
                        className={cn(
                            'size-4 rounded-full border-2 border-panel-foreground/40 transition',
                            index < pin.length &&
                                'border-panel-primary bg-panel-primary',
                        )}
                    />
                ))}
            </div>

            <p
                className="min-h-5 text-center text-sm text-red-300"
                role="alert"
            >
                {error}
            </p>

            <div className="grid w-full grid-cols-3 gap-3">
                {keypadKeys.map((key) => (
                    <button
                        key={key}
                        type="button"
                        className={keyClassName}
                        onClick={() => onKey(key)}
                    >
                        {key}
                    </button>
                ))}
                <button
                    type="button"
                    className={cn(keyClassName, 'text-base sm:text-lg')}
                    onClick={() => onKey('clear')}
                >
                    Clear
                </button>
                <button
                    type="button"
                    className={keyClassName}
                    onClick={() => onKey('0')}
                >
                    0
                </button>
                <button
                    type="button"
                    className={keyClassName}
                    onClick={() => onKey('back')}
                    aria-label="Delete last digit"
                >
                    <Delete className="size-7" aria-hidden="true" />
                </button>
            </div>

            <Button
                size="lg"
                className="h-14 w-full rounded-2xl bg-panel-primary text-lg text-panel-primary-foreground hover:bg-panel-primary/90"
                disabled={pin.length < PIN_MIN_LENGTH || processing}
                onClick={onSubmit}
            >
                {processing && <Spinner />}
                Continue
            </Button>
        </div>
    );
}

function EmployeeActions({
    employee,
    timeZone,
    processing,
    error,
    onAction,
    onCancel,
}: {
    employee: KioskEmployee;
    timeZone: string;
    processing: boolean;
    error: string | null;
    onAction: (action: KioskAction) => void;
    onCancel: () => void;
}) {
    const { clock } = employee;

    const status =
        clock.is_on_break && clock.break_started_at
            ? `On break since ${formatTime(clock.break_started_at, timeZone)}`
            : clock.is_clocked_in && clock.clock_in_at
              ? `Clocked in since ${formatTime(clock.clock_in_at, timeZone)}`
              : 'Not clocked in';

    const actionClassName =
        'h-20 flex-1 rounded-2xl text-xl [&_svg:not([class*=size-])]:size-6';

    return (
        <div className="flex w-full max-w-lg flex-col items-center gap-8 text-center">
            <EmployeeAvatar
                firstName={employee.first_name}
                lastName={employee.last_name}
                color={employee.color}
                className="size-20 text-2xl"
            />
            <div className="space-y-2">
                <h1 className="text-3xl font-semibold text-warm-white sm:text-4xl">
                    Hi, {employee.first_name}
                </h1>
                <p className="text-lg text-panel-foreground/70">{status}</p>
            </div>

            <div className="flex w-full flex-col gap-3 sm:flex-row">
                {!clock.is_clocked_in ? (
                    <Button
                        className={cn(
                            actionClassName,
                            'bg-panel-primary text-panel-primary-foreground hover:bg-panel-primary/90',
                        )}
                        disabled={processing}
                        onClick={() => onAction('clock_in')}
                    >
                        {processing ? <Spinner /> : <LogIn />}
                        Clock in
                    </Button>
                ) : (
                    <>
                        <Button
                            variant="secondary"
                            className={actionClassName}
                            disabled={processing}
                            onClick={() =>
                                onAction(
                                    clock.is_on_break
                                        ? 'end_break'
                                        : 'start_break',
                                )
                            }
                        >
                            {clock.is_on_break ? <Play /> : <Coffee />}
                            {clock.is_on_break ? 'End break' : 'Start break'}
                        </Button>
                        <Button
                            className={cn(
                                actionClassName,
                                'bg-warm-white text-panel hover:bg-warm-white/90',
                            )}
                            disabled={processing}
                            onClick={() => onAction('clock_out')}
                        >
                            {processing ? <Spinner /> : <LogOut />}
                            Clock out
                        </Button>
                    </>
                )}
            </div>

            <p className="min-h-5 text-sm text-red-300" role="alert">
                {error}
            </p>

            <button
                type="button"
                className="text-panel-foreground/70 underline-offset-4 hover:text-warm-white hover:underline"
                onClick={onCancel}
            >
                Not you? Cancel
            </button>
        </div>
    );
}

function Confirmation({
    message,
    onDone,
}: {
    message: string;
    onDone: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onDone}
            className="flex max-w-lg flex-col items-center gap-6 text-center"
        >
            <CheckCircle2
                className="size-24 text-panel-primary"
                aria-hidden="true"
            />
            <p className="text-2xl font-semibold text-warm-white sm:text-3xl">
                {message}
            </p>
            <p className="text-panel-foreground/60">Tap for the next person</p>
        </button>
    );
}

/**
 * First-run setup: the manager who opens the kiosk chooses the organization PIN needed to leave it.
 */
function ExitPinSetup() {
    return (
        <div className="w-full max-w-sm space-y-6 text-center">
            <div className="space-y-2">
                <h1 className="text-2xl font-semibold text-warm-white sm:text-3xl">
                    Set your organization PIN
                </h1>
                <p className="text-panel-foreground/70">
                    Managers will need this PIN to leave the kiosk, so employees
                    can't get into your account. Admins can change it later in
                    organization settings.
                </p>
            </div>

            <Form {...storeExitPin.form()} className="space-y-4 text-left">
                {({ processing, errors }) => (
                    <>
                        <PinInput
                            name="exit_pin"
                            label="PIN (4 to 8 digits)"
                            autoFocus
                        />
                        <InputError message={errors.exit_pin} />
                        <PinInput
                            name="exit_pin_confirmation"
                            label="Confirm PIN"
                        />
                        <Button
                            type="submit"
                            size="lg"
                            className="h-14 w-full rounded-2xl bg-panel-primary text-lg text-panel-primary-foreground hover:bg-panel-primary/90"
                            disabled={processing}
                        >
                            {processing && <Spinner />}
                            Save and start the kiosk
                        </Button>
                    </>
                )}
            </Form>
        </div>
    );
}

function PinInput({
    name,
    label,
    autoFocus = false,
}: {
    name: string;
    label: string;
    autoFocus?: boolean;
}) {
    return (
        <label className="grid gap-2 text-sm font-medium">
            {label}
            <Input
                name={name}
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                maxLength={8}
                autoFocus={autoFocus}
                className="h-12 text-center font-mono text-xl tracking-[0.4em]"
            />
        </label>
    );
}

/**
 * Explains how to pin the kiosk to the tablet's home screen so it opens full screen like an app.
 */
function InstallTip() {
    const { isHidden, dismiss } = useKioskInstallTip();

    if (isHidden) {
        return null;
    }

    // iPads report themselves as Macs, so "Macintosh" catches them too.
    const isApple = /iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent);

    return (
        <div className="mx-4 mb-4 flex items-start gap-3 rounded-2xl bg-panel-accent p-4 text-sm sm:mx-auto sm:w-full sm:max-w-xl">
            <Smartphone
                className="mt-0.5 size-5 shrink-0 text-panel-primary"
                aria-hidden="true"
            />
            <p className="flex-1">
                <span className="font-medium text-warm-white">
                    Use the kiosk like an app.
                </span>{' '}
                {isApple ? (
                    <>
                        Tap the Share button{' '}
                        <Share
                            className="inline size-4 align-text-bottom"
                            aria-label="Share"
                        />{' '}
                        then <strong>Add to Home Screen</strong>.
                    </>
                ) : (
                    <>
                        Open the browser menu and tap{' '}
                        <strong>Add to Home screen</strong> or{' '}
                        <strong>Install app</strong>.
                    </>
                )}{' '}
                It opens full screen with its own icon. Sign in once inside the
                app, then open the kiosk.
            </p>
            <button
                type="button"
                onClick={dismiss}
                className="rounded-md p-1 text-panel-foreground/60 hover:text-warm-white"
                aria-label="Dismiss tip"
            >
                <X className="size-4" />
            </button>
        </div>
    );
}

function ExitKioskButton() {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="text-panel-foreground/70 hover:bg-panel-accent hover:text-warm-white"
                >
                    <Lock />
                    <span className="hidden sm:inline">Exit kiosk</span>
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogTitle>Exit kiosk mode?</DialogTitle>
                <DialogDescription>
                    Managers only. Enter the organization PIN to go back to the
                    regular workspace.
                </DialogDescription>

                <Form {...destroy.form()} className="space-y-4" resetOnError>
                    {({ processing, errors }) => (
                        <>
                            <div className="space-y-2">
                                <PinInput
                                    name="exit_pin"
                                    label="Organization PIN"
                                    autoFocus
                                />
                                <InputError message={errors.exit_pin} />
                            </div>
                            <DialogFooter className="gap-2">
                                <DialogClose asChild>
                                    <Button type="button" variant="secondary">
                                        Cancel
                                    </Button>
                                </DialogClose>
                                <Button type="submit" disabled={processing}>
                                    {processing && <Spinner />}
                                    Exit kiosk
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}
