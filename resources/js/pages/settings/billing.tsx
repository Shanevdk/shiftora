import { Form, Head } from '@inertiajs/react';
import {
    AlertTriangle,
    Check,
    CreditCard,
    ExternalLink,
    Lock,
} from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { formatCurrency, formatDateTimeDay } from '@/lib/time';
import { cn } from '@/lib/utils';
import { checkout, edit, portal, swap } from '@/routes/billing';
import type { Plan, PlanKey } from '@/types';

type BillingStatus = 'active' | 'trial' | 'canceled' | 'past_due' | 'inactive';

type BillingPlan = Plan & { available: boolean };

type Billing = {
    plan: PlanKey | null;
    trial_plan: PlanKey;
    status: BillingStatus;
    trial_ends_at: string | null;
    trial_days_remaining: number | null;
    ends_at: string | null;
    quantity: number | null;
    card_last_four: string | null;
    active_employee_count: number;
    has_payment_issue: boolean;
};

type Props = {
    plans: BillingPlan[];
    billing: Billing;
    canManage: boolean;
    billingConfigured: boolean;
};

const longDate: Intl.DateTimeFormatOptions = {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
};

export default function BillingSettings({
    plans,
    billing,
    canManage,
    billingConfigured,
}: Props) {
    const { timeZone } = useWorkspace();
    const isSubscribed = ['active', 'canceled', 'past_due'].includes(
        billing.status,
    );
    const currentPlanKey = billing.plan ?? billing.trial_plan;
    const currentPlan = plans.find((plan) => plan.value === currentPlanKey);

    return (
        <>
            <Head title="Billing" />

            <h1 className="sr-only">Billing</h1>

            {billing.status === 'inactive' && (
                <Alert className="border-destructive/30 bg-destructive/10 text-destructive">
                    <Lock aria-hidden="true" />
                    <AlertTitle>Your workspace is locked</AlertTitle>
                    <AlertDescription className="text-destructive/90">
                        {billing.ends_at
                            ? 'Your subscription has ended.'
                            : 'Your free trial has ended.'}{' '}
                        {canManage
                            ? 'Choose a plan below to unlock the time clock, schedules and timesheets for your team. Nothing has been deleted.'
                            : 'Ask your account owner to choose a plan to unlock the workspace. Nothing has been deleted.'}
                    </AlertDescription>
                </Alert>
            )}

            {billing.has_payment_issue && (
                <Alert className="border-warning/40 bg-warning/10">
                    <AlertTriangle
                        aria-hidden="true"
                        className="text-warning"
                    />
                    <AlertTitle>There's a problem with your payment</AlertTitle>
                    <AlertDescription>
                        {canManage
                            ? 'Your last payment needs attention. Open Manage billing to confirm it or update your card.'
                            : 'Your last payment needs attention. Ask your account owner to update the card.'}
                    </AlertDescription>
                </Alert>
            )}

            <div className="space-y-6">
                <Heading
                    variant="small"
                    title="Subscription"
                    description="Your plan, status and what you'll pay each month"
                />

                <div className="rounded-xl border bg-card">
                    <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">
                                Current plan
                            </p>
                            <div className="flex flex-wrap items-center gap-2">
                                <p className="text-xl font-semibold tracking-tight">
                                    {billing.status === 'inactive'
                                        ? 'No active plan'
                                        : (currentPlan?.name ?? 'Unknown plan')}
                                </p>
                                <StatusBadge billing={billing} />
                            </div>
                            <StatusDetail
                                billing={billing}
                                timeZone={timeZone}
                            />
                        </div>

                        {canManage && isSubscribed && (
                            <Button
                                variant="outline"
                                asChild={billingConfigured}
                                disabled={!billingConfigured}
                            >
                                {billingConfigured ? (
                                    <a href={portal.url()}>
                                        Manage billing
                                        <ExternalLink aria-hidden="true" />
                                    </a>
                                ) : (
                                    'Manage billing'
                                )}
                            </Button>
                        )}
                    </div>

                    <dl className="grid grid-cols-1 divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                        <div className="space-y-1 p-4 sm:p-6">
                            <dt className="text-sm text-muted-foreground">
                                Seats
                            </dt>
                            <dd className="text-lg font-semibold tabular">
                                {billing.active_employee_count}
                                {currentPlan?.employee_limit != null && (
                                    <span className="text-sm font-normal text-muted-foreground">
                                        {' '}
                                        of {currentPlan.employee_limit}
                                    </span>
                                )}
                            </dd>
                            <dd className="text-xs text-muted-foreground">
                                Active employees
                            </dd>
                        </div>
                        <div className="space-y-1 p-4 sm:p-6">
                            <dt className="text-sm text-muted-foreground">
                                Monthly estimate
                            </dt>
                            <dd className="text-lg font-semibold tabular">
                                {currentPlan && billing.status !== 'inactive'
                                    ? formatCurrency(
                                          currentPlan.price_per_employee_cents *
                                              billing.active_employee_count,
                                      )
                                    : '—'}
                            </dd>
                            <dd className="text-xs text-muted-foreground">
                                {currentPlan
                                    ? `${formatCurrency(currentPlan.price_per_employee_cents)} × ${billing.active_employee_count} active ${billing.active_employee_count === 1 ? 'employee' : 'employees'}`
                                    : 'Choose a plan to see an estimate'}
                            </dd>
                        </div>
                        <div className="space-y-1 p-4 sm:p-6">
                            <dt className="text-sm text-muted-foreground">
                                Payment method
                            </dt>
                            <dd className="flex items-center gap-2 text-lg font-semibold">
                                <CreditCard
                                    className="size-4 text-muted-foreground"
                                    aria-hidden="true"
                                />
                                {billing.card_last_four ? (
                                    <span className="tabular">
                                        <span className="sr-only">
                                            Card ending in
                                        </span>
                                        <span aria-hidden="true">•••• </span>
                                        {billing.card_last_four}
                                    </span>
                                ) : (
                                    <span className="text-sm font-normal text-muted-foreground">
                                        No card on file
                                    </span>
                                )}
                            </dd>
                            <dd className="text-xs text-muted-foreground">
                                Billed monthly per active employee
                            </dd>
                        </div>
                    </dl>
                </div>
            </div>

            <div className="space-y-6">
                <Heading
                    variant="small"
                    title="Plans"
                    description="Pay only for active employees. Deactivated people don't count."
                />

                {!canManage && (
                    <p className="text-sm text-muted-foreground">
                        Only the account owner can change billing.
                    </p>
                )}

                {canManage && !billingConfigured && (
                    <p className="text-sm text-muted-foreground">
                        Stripe isn't configured in this environment yet, so
                        plans can't be purchased here.
                    </p>
                )}

                <div className="grid gap-6 pt-3 lg:grid-cols-3">
                    {plans.map((plan) => (
                        <PlanCard
                            key={plan.value}
                            plan={plan}
                            isCurrent={
                                billing.status !== 'inactive' &&
                                plan.value === currentPlanKey
                            }
                            currentLabel={
                                billing.status === 'trial'
                                    ? 'Your trial'
                                    : 'Current plan'
                            }
                            action={
                                canManage ? (
                                    <PlanAction
                                        plan={plan}
                                        billing={billing}
                                        isSubscribed={isSubscribed}
                                        billingConfigured={billingConfigured}
                                    />
                                ) : null
                            }
                        />
                    ))}
                </div>
            </div>
        </>
    );
}

BillingSettings.layout = {
    breadcrumbs: [
        {
            title: 'Billing',
            href: edit(),
        },
    ],
};

function StatusBadge({ billing }: { billing: Billing }) {
    switch (billing.status) {
        case 'trial':
            return (
                <Badge className="bg-accent text-accent-foreground">
                    Free trial
                </Badge>
            );
        case 'active':
            return (
                <Badge className="bg-accent text-accent-foreground">
                    <Check aria-hidden="true" />
                    Active
                </Badge>
            );
        case 'canceled':
            return <Badge variant="outline">Canceled</Badge>;
        case 'past_due':
            return (
                <Badge className="border-transparent bg-warning/15 text-warning">
                    <AlertTriangle aria-hidden="true" />
                    Past due
                </Badge>
            );
        default:
            return (
                <Badge className="border-transparent bg-destructive/10 text-destructive">
                    <Lock aria-hidden="true" />
                    Inactive
                </Badge>
            );
    }
}

function StatusDetail({
    billing,
    timeZone,
}: {
    billing: Billing;
    timeZone: string;
}) {
    let detail: string | null = null;

    if (billing.status === 'trial') {
        const days = billing.trial_days_remaining ?? 0;
        const remaining =
            days === 0
                ? 'Your trial ends today'
                : `${days} ${days === 1 ? 'day' : 'days'} left in your trial`;

        detail = billing.trial_ends_at
            ? `${remaining} (ends ${formatDateTimeDay(billing.trial_ends_at, timeZone, longDate)}). Choose a plan to keep going without interruption.`
            : remaining;
    } else if (billing.status === 'canceled') {
        detail = billing.ends_at
            ? `Your subscription is canceled and ends on ${formatDateTimeDay(billing.ends_at, timeZone, longDate)}. Resume it from Manage billing.`
            : 'Your subscription is canceled.';
    } else if (billing.status === 'past_due') {
        detail =
            "We couldn't collect your last payment. Update your card in Manage billing to avoid interruption.";
    } else if (billing.status === 'active') {
        detail = 'Your subscription renews automatically each month.';
    } else {
        detail = 'Choose a plan to unlock your workspace.';
    }

    return <p className="text-sm text-muted-foreground">{detail}</p>;
}

function PlanCard({
    plan,
    isCurrent,
    currentLabel,
    action,
}: {
    plan: BillingPlan;
    isCurrent: boolean;
    currentLabel: string;
    action: ReactNode;
}) {
    const isFeatured = plan.value === 'professional';

    return (
        <div
            className={cn(
                'relative flex flex-col gap-5 rounded-xl border bg-card p-5',
                isCurrent && 'border-primary ring-1 ring-primary',
            )}
        >
            <div className="absolute -top-3 left-5 flex gap-2">
                {isCurrent && (
                    <span className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                        {currentLabel}
                    </span>
                )}
                {isFeatured && !isCurrent && (
                    <span className="rounded-full border bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
                        Most popular
                    </span>
                )}
            </div>

            <div className="space-y-1.5">
                <h3 className="text-base font-semibold">{plan.name}</h3>
                <p className="text-sm text-muted-foreground">
                    {plan.description}
                </p>
            </div>

            <div className="flex flex-wrap items-baseline gap-x-1.5">
                <span className="text-3xl font-semibold tracking-tight tabular">
                    {formatCurrency(plan.price_per_employee_cents)}
                </span>
                <span className="text-sm text-muted-foreground">
                    / employee / month
                </span>
            </div>

            <p className="text-sm text-muted-foreground">
                {plan.employee_limit
                    ? `Up to ${plan.employee_limit} employees`
                    : 'Unlimited employees'}
                {' · '}
                {plan.location_limit === null
                    ? 'Unlimited locations'
                    : `${plan.location_limit} ${plan.location_limit === 1 ? 'location' : 'locations'}`}
            </p>

            <ul className="flex-1 space-y-2 text-sm">
                {plan.features.map((feature) => (
                    <li key={feature.value} className="flex items-start gap-2">
                        <Check
                            className="mt-0.5 size-4 shrink-0 text-primary"
                            aria-hidden="true"
                        />
                        {feature.label}
                    </li>
                ))}
            </ul>

            {action}
        </div>
    );
}

function PlanAction({
    plan,
    billing,
    isSubscribed,
    billingConfigured,
}: {
    plan: BillingPlan;
    billing: Billing;
    isSubscribed: boolean;
    billingConfigured: boolean;
}) {
    const isCurrentSubscription = isSubscribed && billing.plan === plan.value;
    const exceedsSeats =
        plan.employee_limit !== null &&
        billing.active_employee_count > plan.employee_limit;
    const unavailable = !billingConfigured || !plan.available;
    const variant = plan.value === 'professional' ? 'default' : 'outline';

    if (isCurrentSubscription) {
        return (
            <Button variant="outline" disabled>
                <Check aria-hidden="true" />
                Current plan
            </Button>
        );
    }

    const note = unavailable
        ? "Stripe isn't configured in this environment yet"
        : exceedsSeats
          ? `You have ${billing.active_employee_count} active employees. Deactivate some to fit this plan's ${plan.employee_limit}.`
          : null;

    return (
        <div className="space-y-2">
            {isSubscribed ? (
                <SwapPlanButton
                    plan={plan}
                    variant={variant}
                    disabled={unavailable || exceedsSeats}
                />
            ) : (
                <Form {...checkout.form()} options={{ preserveScroll: true }}>
                    {({ processing, errors }) => (
                        <div className="space-y-2">
                            <input
                                type="hidden"
                                name="plan"
                                value={plan.value}
                            />
                            <Button
                                type="submit"
                                variant={variant}
                                className="w-full"
                                disabled={
                                    processing || unavailable || exceedsSeats
                                }
                            >
                                {processing && <Spinner />}
                                Choose {plan.name}
                            </Button>
                            <InputError message={errors.plan} />
                        </div>
                    )}
                </Form>
            )}
            {note && <p className="text-xs text-muted-foreground">{note}</p>}
        </div>
    );
}

function SwapPlanButton({
    plan,
    variant,
    disabled,
}: {
    plan: BillingPlan;
    variant: 'default' | 'outline';
    disabled: boolean;
}) {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant={variant}
                    className="w-full"
                    disabled={disabled}
                >
                    Switch to {plan.name}
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogTitle>Switch to {plan.name}?</DialogTitle>
                <DialogDescription>
                    Your subscription moves to {plan.name} at{' '}
                    {formatCurrency(plan.price_per_employee_cents)} per active
                    employee per month. The change is prorated on your next
                    invoice.
                </DialogDescription>

                <Form
                    {...swap.form()}
                    options={{ preserveScroll: true }}
                    onSuccess={() => setOpen(false)}
                    className="space-y-4"
                >
                    {({ processing, errors }) => (
                        <>
                            <input
                                type="hidden"
                                name="plan"
                                value={plan.value}
                            />
                            <InputError message={errors.plan} />
                            <DialogFooter className="gap-2">
                                <DialogClose asChild>
                                    <Button type="button" variant="secondary">
                                        Cancel
                                    </Button>
                                </DialogClose>
                                <Button type="submit" disabled={processing}>
                                    {processing && <Spinner />}
                                    Switch to {plan.name}
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}
