import { Form, Link, usePage } from '@inertiajs/react';
import { ArrowRight, Check, X } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useWorkspace } from '@/hooks/use-workspace';
import { cn } from '@/lib/utils';
import { store as continueWithPlan } from '@/routes/continue';
import { create as addEmployee, index as team } from '@/routes/employees';
import { show as kiosk } from '@/routes/kiosk';
import { create as saveWorkspace } from '@/routes/save-workspace';
import { index as schedule } from '@/routes/schedule';
import { index as timesheets } from '@/routes/timesheets';

export type SetupProgress = {
    team_count: number;
    invited_count: number;
    joined_count: number;
    has_published_shift: boolean;
    has_team_clock_in: boolean;
};

type Step = {
    key: string;
    title: string;
    done: boolean;
    /** What the manager does. */
    task: string;
    /** What happens as a result, so the setup time feels worth it. */
    result: string;
    status?: string;
    action: { label: string; href: ReturnType<typeof team> };
    extra?: ReactNode;
};

function hiddenKey(organizationId: number): string {
    return `shiftora.setup-checklist-hidden.${organizationId}`;
}

function readHidden(organizationId: number | undefined): boolean {
    if (organizationId === undefined) {
        return false;
    }

    try {
        return localStorage.getItem(hiddenKey(organizationId)) === '1';
    } catch {
        return false;
    }
}

/**
 * Walks an owner or admin through setting up their team, saying what each step leads to.
 * Once everything is in place during the trial, it offers to continue with a plan.
 */
export function SetupChecklist({ progress }: { progress: SetupProgress }) {
    const { organization, can, hasFeature, subscription } = useWorkspace();
    const { auth } = usePage().props;
    const isGuest = auth.user?.is_guest === true;
    const [isHidden, setIsHidden] = useState(() =>
        readHidden(organization?.id),
    );

    const steps: Step[] = [
        {
            key: 'add-team',
            title: 'Add your team',
            done: progress.team_count > 0,
            task: "Add each person's name and email.",
            result: isGuest
                ? 'They get an email invite as soon as you save your workspace.'
                : `They get an email invite to join ${organization?.name ?? 'your workspace'}.`,
            status:
                progress.team_count > 0
                    ? `${progress.team_count} added`
                    : undefined,
            action: { label: 'Add employee', href: addEmployee() },
        },
        {
            key: 'join',
            title: 'Your team joins',
            done: progress.joined_count > 0,
            task: 'They tap the link in their invite and pick a password.',
            result: 'They can clock in from their own phone. No app to install.',
            status:
                progress.invited_count > 0
                    ? `${progress.joined_count} of ${progress.invited_count} invited have joined`
                    : undefined,
            action: isGuest
                ? { label: 'Save my workspace', href: saveWorkspace() }
                : { label: 'See who has joined', href: team() },
            extra: can('runKiosk') ? (
                <>
                    No email for someone?{' '}
                    <Link
                        href={kiosk()}
                        className="font-medium text-primary underline-offset-4 hover:underline"
                    >
                        Set up a shared kiosk tablet
                    </Link>{' '}
                    and they clock in with a PIN.
                </>
            ) : undefined,
        },
        ...(hasFeature('scheduling')
            ? [
                  {
                      key: 'schedule',
                      title: 'Build your first schedule',
                      done: progress.has_published_shift,
                      task: 'Drag shifts onto the week, then publish it.',
                      result: 'Everyone gets their shifts by email and sees them in the app.',
                      action: { label: 'Open schedule', href: schedule() },
                  },
              ]
            : []),
        {
            key: 'clock-in',
            title: "See who's working",
            done: progress.has_team_clock_in,
            task: 'When someone clocks in, they show up on this page right away.',
            result: 'Their hours land on timesheets, ready for payroll.',
            action: { label: 'Open timesheets', href: timesheets() },
        },
    ];

    const doneCount = steps.filter((step) => step.done).length;
    const isComplete = doneCount === steps.length;
    const nextStep = steps.find((step) => !step.done);
    const offersContinue =
        isComplete &&
        can('manageBilling') &&
        subscription?.status === 'trial' &&
        !auth.user?.is_demo;

    if ((isComplete && !offersContinue) || (isHidden && !isComplete)) {
        return null;
    }

    function hide(): void {
        setIsHidden(true);

        try {
            if (organization) {
                localStorage.setItem(hiddenKey(organization.id), '1');
            }
        } catch {
            // Hiding still works for this visit without storage.
        }
    }

    if (offersContinue) {
        return (
            <section
                aria-labelledby="setup-heading"
                className="flex flex-col gap-4 rounded-xl border border-primary/30 bg-accent/40 p-5 sm:flex-row sm:items-center sm:justify-between"
            >
                <div className="space-y-1">
                    <h2 id="setup-heading" className="font-semibold">
                        Your team is set up
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Keep it running after your free trial. Everything you've
                        set up stays exactly as it is.
                    </p>
                </div>
                <Form {...continueWithPlan.form()}>
                    {({ processing }) => (
                        <Button type="submit" disabled={processing}>
                            {processing && <Spinner />}
                            Continue
                            <ArrowRight />
                        </Button>
                    )}
                </Form>
            </section>
        );
    }

    return (
        <section
            aria-labelledby="setup-heading"
            className="rounded-xl border bg-card shadow-xs"
        >
            <div className="flex items-start justify-between gap-4 border-b p-4 sm:p-5">
                <div className="space-y-1">
                    <h2 id="setup-heading" className="font-semibold">
                        Get your team set up
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        {doneCount} of {steps.length} done
                    </p>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={hide}
                    className="text-muted-foreground"
                >
                    <X />
                    Hide
                </Button>
            </div>
            <div
                className="h-1 bg-muted"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={steps.length}
                aria-valuenow={doneCount}
                aria-label="Setup progress"
            >
                <div
                    className="h-full bg-primary transition-[width]"
                    style={{ width: `${(doneCount / steps.length) * 100}%` }}
                />
            </div>
            <ol className="divide-y">
                {steps.map((step, index) => {
                    const isNext = step.key === nextStep?.key;

                    return (
                        <li
                            key={step.key}
                            className={cn(
                                'flex gap-4 p-4 sm:p-5',
                                isNext && 'bg-accent/30',
                            )}
                        >
                            <span
                                className={cn(
                                    'flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                                    step.done
                                        ? 'bg-primary text-primary-foreground'
                                        : isNext
                                          ? 'border-2 border-primary text-primary'
                                          : 'border text-muted-foreground',
                                )}
                                aria-hidden="true"
                            >
                                {step.done ? (
                                    <Check className="size-4" />
                                ) : (
                                    index + 1
                                )}
                            </span>
                            <div className="min-w-0 flex-1 space-y-2">
                                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                                    <h3
                                        className={cn(
                                            'font-medium',
                                            step.done &&
                                                'text-muted-foreground',
                                        )}
                                    >
                                        {step.title}
                                        {step.done && (
                                            <span className="sr-only">
                                                {' '}
                                                (done)
                                            </span>
                                        )}
                                    </h3>
                                    {step.status && (
                                        <span className="text-xs text-muted-foreground tabular">
                                            {step.status}
                                        </span>
                                    )}
                                </div>
                                {!step.done && (
                                    <>
                                        <p className="text-sm text-muted-foreground">
                                            {step.task}{' '}
                                            <span className="text-foreground">
                                                <ArrowRight
                                                    className="inline size-3.5 align-[-2px]"
                                                    aria-label="then"
                                                />{' '}
                                                {step.result}
                                            </span>
                                        </p>
                                        {step.extra && (
                                            <p className="text-sm text-muted-foreground">
                                                {step.extra}
                                            </p>
                                        )}
                                        <Button
                                            size="sm"
                                            variant={
                                                isNext ? 'default' : 'outline'
                                            }
                                            asChild
                                        >
                                            <Link href={step.action.href}>
                                                {step.action.label}
                                            </Link>
                                        </Button>
                                    </>
                                )}
                            </div>
                        </li>
                    );
                })}
            </ol>
        </section>
    );
}
