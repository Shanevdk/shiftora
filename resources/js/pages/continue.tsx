import { Form, Head } from '@inertiajs/react';
import {
    AlertTriangle,
    CalendarDays,
    Check,
    Clock,
    MapPin,
    Users,
} from 'lucide-react';
import InputError from '@/components/input-error';
import PageContainer from '@/components/page-container';
import PageHeader from '@/components/page-header';
import StatCard from '@/components/stat-card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useWorkspace } from '@/hooks/use-workspace';
import { formatDateTimeDay, formatPrice } from '@/lib/time';
import { cn } from '@/lib/utils';
import { show, store } from '@/routes/continue';
import type { Plan, PlanKey } from '@/types';

type ContinuePlan = Plan & {
    available: boolean;
    fits_team: boolean;
    /** Features the organization has used that this plan doesn't include. */
    missing_features: string[];
};

type Props = {
    plans: ContinuePlan[];
    recommendedPlan: PlanKey;
    usage: {
        active_employees: number;
        locations: number;
        shifts: number;
        time_entries: number;
    };
    isReadOnly: boolean;
    trialEndsAt: string | null;
    freeUntil: string | null;
    billingConfigured: boolean;
};

const longDate: Intl.DateTimeFormatOptions = {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
};

/**
 * Turning the trial into a subscription. Paying is framed as keeping what's already been built,
 * with the plan that fits how the team has used Shiftora picked out.
 */
export default function Continue({
    plans,
    recommendedPlan,
    usage,
    isReadOnly,
    trialEndsAt,
    freeUntil,
    billingConfigured,
}: Props) {
    const { organization, timeZone } = useWorkspace();
    const recommended = plans.find((plan) => plan.value === recommendedPlan);
    const otherPlans = plans.filter((plan) => plan.value !== recommendedPlan);
    const seats = Math.max(1, usage.active_employees);

    return (
        <>
            <Head title="Continue with Shiftora" />
            <PageContainer className="max-w-4xl">
                <PageHeader
                    title={
                        isReadOnly
                            ? 'Keep your workspace going'
                            : 'Continue with Shiftora'
                    }
                    description={
                        isReadOnly
                            ? `Your free trial has ended, so ${organization?.name ?? 'your workspace'} is read-only. Pick a plan and everything carries on where you left off.`
                            : trialEndsAt
                              ? `Your free trial ends ${formatDateTimeDay(trialEndsAt, timeZone, longDate)}. Pick a plan now and nothing changes for your team.`
                              : 'Pick a plan and nothing changes for your team.'
                    }
                />

                <section aria-labelledby="usage-heading" className="space-y-3">
                    <h2
                        id="usage-heading"
                        className="text-sm font-medium text-muted-foreground"
                    >
                        Everything you've set up stays exactly as it is
                    </h2>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <StatCard
                            label="People"
                            icon={Users}
                            value={usage.active_employees}
                        />
                        <StatCard
                            label="Locations"
                            icon={MapPin}
                            value={usage.locations}
                        />
                        <StatCard
                            label="Shifts"
                            icon={CalendarDays}
                            value={usage.shifts}
                        />
                        <StatCard
                            label="Time entries"
                            icon={Clock}
                            value={usage.time_entries}
                        />
                    </div>
                </section>

                {!billingConfigured && (
                    <p className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
                        Payments aren't switched on yet, so plans can't be
                        bought here.
                    </p>
                )}

                {recommended && (
                    <section
                        aria-label="Recommended plan"
                        className="space-y-5 rounded-xl border border-primary bg-card p-5 shadow-sm ring-1 ring-primary sm:p-6"
                    >
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="space-y-1">
                                <p className="text-xs font-medium tracking-wide text-primary uppercase">
                                    Fits how you use Shiftora
                                </p>
                                <h2 className="text-2xl font-semibold tracking-tight">
                                    {recommended.name}
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    {recommended.description}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-2xl font-semibold tracking-tight tabular">
                                    {formatPrice(
                                        recommended.price_per_employee_cents *
                                            seats,
                                        recommended.currency,
                                    )}
                                    <span className="text-sm font-normal text-muted-foreground">
                                        {' '}
                                        / month
                                    </span>
                                </p>
                                <p className="text-sm text-muted-foreground tabular">
                                    {formatPrice(
                                        recommended.price_per_employee_cents,
                                        recommended.currency,
                                    )}{' '}
                                    × {seats}{' '}
                                    {seats === 1 ? 'employee' : 'employees'}
                                </p>
                            </div>
                        </div>

                        <ul className="grid gap-2 text-sm sm:grid-cols-2">
                            {recommended.features.map((feature) => (
                                <li
                                    key={feature.value}
                                    className="flex items-start gap-2"
                                >
                                    <Check
                                        className="mt-0.5 size-4 shrink-0 text-primary"
                                        aria-hidden="true"
                                    />
                                    {feature.label}
                                </li>
                            ))}
                        </ul>

                        <PlanButton
                            plan={recommended}
                            size="lg"
                            disabled={
                                !billingConfigured || !recommended.available
                            }
                        />

                        {freeUntil && (
                            <p className="text-sm text-muted-foreground">
                                You won't be charged until{' '}
                                {formatDateTimeDay(freeUntil, 'UTC', longDate)}.
                            </p>
                        )}
                    </section>
                )}

                <section
                    aria-labelledby="other-plans-heading"
                    className="space-y-3"
                >
                    <h2
                        id="other-plans-heading"
                        className="text-sm font-medium text-muted-foreground"
                    >
                        Other plans
                    </h2>
                    <ul className="divide-y rounded-xl border bg-card">
                        {otherPlans.map((plan) => (
                            <li
                                key={plan.value}
                                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                            >
                                <div className="space-y-1">
                                    <p className="font-medium">
                                        {plan.name}{' '}
                                        <span className="font-normal text-muted-foreground">
                                            ·{' '}
                                            {formatPrice(
                                                plan.price_per_employee_cents,
                                                plan.currency,
                                            )}{' '}
                                            per employee / month
                                        </span>
                                    </p>
                                    <PlanCaveat
                                        plan={plan}
                                        activeEmployees={usage.active_employees}
                                    />
                                </div>
                                <PlanButton
                                    plan={plan}
                                    variant="outline"
                                    disabled={
                                        !billingConfigured ||
                                        !plan.available ||
                                        !plan.fits_team
                                    }
                                />
                            </li>
                        ))}
                    </ul>
                </section>
            </PageContainer>
        </>
    );
}

/**
 * What the owner would give up on a plan that doesn't cover what they've been using.
 */
function PlanCaveat({
    plan,
    activeEmployees,
}: {
    plan: ContinuePlan;
    activeEmployees: number;
}) {
    if (!plan.fits_team) {
        return (
            <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
                <AlertTriangle
                    className="mt-0.5 size-4 shrink-0 text-warning"
                    aria-hidden="true"
                />
                Up to {plan.employee_limit} employees. You have{' '}
                {activeEmployees}.
            </p>
        );
    }

    if (plan.missing_features.length > 0) {
        return (
            <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
                <AlertTriangle
                    className="mt-0.5 size-4 shrink-0 text-warning"
                    aria-hidden="true"
                />
                You'd lose {plan.missing_features.join(', ').toLowerCase()}.
            </p>
        );
    }

    return <p className="text-sm text-muted-foreground">{plan.description}</p>;
}

function PlanButton({
    plan,
    size,
    variant = 'default',
    disabled,
}: {
    plan: ContinuePlan;
    size?: 'lg';
    variant?: 'default' | 'outline';
    disabled: boolean;
}) {
    return (
        <Form
            {...store.form()}
            options={{ preserveScroll: true }}
            className={cn(size === 'lg' && 'w-full sm:w-auto')}
        >
            {({ processing, errors }) => (
                <div className="space-y-2">
                    <input type="hidden" name="plan" value={plan.value} />
                    <Button
                        type="submit"
                        size={size}
                        variant={variant}
                        className={cn(size === 'lg' && 'w-full sm:w-auto')}
                        disabled={processing || disabled}
                    >
                        {processing && <Spinner />}
                        Continue with {plan.name}
                    </Button>
                    <InputError message={errors.plan} />
                </div>
            )}
        </Form>
    );
}

Continue.layout = {
    breadcrumbs: [{ title: 'Continue with Shiftora', href: show() }],
};
