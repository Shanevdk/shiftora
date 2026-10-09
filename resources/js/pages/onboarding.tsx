import { Form, Head, Link } from '@inertiajs/react';
import { Check } from 'lucide-react';
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
import { formatCurrency } from '@/lib/time';
import { logout } from '@/routes';
import type { Plan, PlanKey } from '@/types';

type Props = {
    plans: Plan[];
    trialDays: number;
};

function browserTimeZone(): string {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

function timeZoneOptions(current: string): string[] {
    const zones = Intl.supportedValuesOf('timeZone');

    return zones.includes(current) ? zones : [current, ...zones];
}

export default function Onboarding({ plans, trialDays }: Props) {
    const [timezone, setTimezone] = useState('UTC');
    const [selectedPlan, setSelectedPlan] = useState<PlanKey>(
        plans.some((plan) => plan.value === 'professional')
            ? 'professional'
            : (plans[0]?.value ?? 'professional'),
    );
    const timeZones = timeZoneOptions(timezone);

    /** Default to the browser's timezone once mounted, so server and client renders match. */
    useEffect(() => {
        setTimezone(browserTimeZone());
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
                    <Link
                        href={logout()}
                        as="button"
                        className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                    >
                        Log out
                    </Link>
                </header>

                <main className="flex flex-1 items-start justify-center px-4 pt-6 pb-16 sm:items-center sm:px-6">
                    <div className="w-full max-w-3xl space-y-8">
                        <div className="space-y-3 text-center">
                            <AppLogoIcon className="mx-auto size-12" />
                            <p className="text-sm font-medium text-primary">
                                Work smarter. Shift better.
                            </p>
                            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                                Set up your organization
                            </h1>
                            <p className="mx-auto max-w-md text-sm text-muted-foreground">
                                Your {trialDays}-day free trial, no card
                                required. You can change plans or cancel at any
                                time.
                            </p>
                        </div>

                        <Form
                            {...OnboardingController.store.form()}
                            className="space-y-8 rounded-xl border bg-card p-4 shadow-xs sm:p-6"
                        >
                            {({ processing, errors }) => (
                                <>
                                    <div className="grid gap-6 sm:grid-cols-2">
                                        <div className="grid content-start gap-2">
                                            <Label htmlFor="name">
                                                Organization name
                                            </Label>
                                            <Input
                                                id="name"
                                                name="name"
                                                required
                                                autoFocus
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
                                                onValueChange={setTimezone}
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
                                                            key={zone}
                                                            value={zone}
                                                        >
                                                            {zone.replaceAll(
                                                                '_',
                                                                ' ',
                                                            )}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <p className="text-xs text-muted-foreground">
                                                Shifts and timesheets use this
                                                timezone.
                                            </p>
                                            <InputError
                                                message={errors.timezone}
                                            />
                                        </div>
                                    </div>

                                    <fieldset className="space-y-3">
                                        <legend className="text-sm font-medium">
                                            Choose a plan for your trial
                                        </legend>
                                        <p className="text-xs text-muted-foreground">
                                            Pay only for active employees once
                                            your trial ends.
                                        </p>
                                        <div className="grid gap-3 md:grid-cols-3">
                                            {plans.map((plan) => (
                                                <PlanOption
                                                    key={plan.value}
                                                    plan={plan}
                                                    checked={
                                                        selectedPlan ===
                                                        plan.value
                                                    }
                                                    onSelect={() =>
                                                        setSelectedPlan(
                                                            plan.value,
                                                        )
                                                    }
                                                />
                                            ))}
                                        </div>
                                        <InputError message={errors.plan} />
                                    </fieldset>

                                    <Button
                                        type="submit"
                                        size="lg"
                                        className="w-full"
                                        disabled={processing}
                                    >
                                        {processing && <Spinner />}
                                        Start my free trial
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

function PlanOption({
    plan,
    checked,
    onSelect,
}: {
    plan: Plan;
    checked: boolean;
    onSelect: () => void;
}) {
    const highlights = plan.features.slice(0, 4);

    return (
        <label className="relative flex cursor-pointer flex-col gap-3 rounded-xl border bg-background p-4 transition-colors hover:border-primary/50 has-checked:border-primary has-checked:bg-accent/40 has-checked:ring-1 has-checked:ring-primary has-focus-visible:ring-[3px] has-focus-visible:ring-ring/50">
            <input
                type="radio"
                name="plan"
                value={plan.value}
                checked={checked}
                onChange={onSelect}
                className="sr-only"
            />
            <div className="flex items-start justify-between gap-2">
                <div>
                    <p className="font-semibold">{plan.name}</p>
                    {plan.value === 'professional' && (
                        <p className="text-xs font-medium text-primary">
                            Most popular
                        </p>
                    )}
                </div>
                <span
                    aria-hidden="true"
                    className={
                        checked
                            ? 'flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground'
                            : 'size-5 rounded-full border'
                    }
                >
                    {checked && <Check className="size-3.5" />}
                </span>
            </div>
            <p className="text-sm">
                <span className="text-xl font-semibold tabular">
                    {formatCurrency(plan.price_per_employee_cents)}
                </span>{' '}
                <span className="text-muted-foreground">/ employee / mo</span>
            </p>
            <p className="text-xs text-muted-foreground">
                {plan.employee_limit
                    ? `Up to ${plan.employee_limit} employees`
                    : 'Unlimited employees'}
                {' · '}
                {plan.location_limit === null
                    ? 'unlimited locations'
                    : `${plan.location_limit} ${plan.location_limit === 1 ? 'location' : 'locations'}`}
            </p>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
                {highlights.map((feature) => (
                    <li
                        key={feature.value}
                        className="flex items-start gap-1.5"
                    >
                        <Check
                            className="mt-px size-3.5 shrink-0 text-primary"
                            aria-hidden="true"
                        />
                        {feature.label}
                    </li>
                ))}
                {plan.features.length > highlights.length && (
                    <li className="pl-5">
                        +{plan.features.length - highlights.length} more
                    </li>
                )}
            </ul>
        </label>
    );
}
