import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    BarChart3,
    CalendarDays,
    Check,
    ClipboardCheck,
    Clock,
    MapPin,
    ShieldCheck,
} from 'lucide-react';
import AppLogoIcon from '@/components/app-logo-icon';
import LiveDemo from '@/components/live-demo';
import SiteFooter from '@/components/site-footer';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate } from '@/lib/time';
import { cn } from '@/lib/utils';
import { dashboard, login, register } from '@/routes';
import { destroy as leaveDemo } from '@/routes/demo';
import type { Plan } from '@/types';

const features = [
    {
        icon: Clock,
        title: 'One-tap time clock',
        description:
            'Clock in, take breaks and clock out from any phone. Totals update live, with no spreadsheets to chase.',
    },
    {
        icon: CalendarDays,
        title: 'Drag-and-drop scheduling',
        description:
            'Build the week, move shifts between people in a second, and publish so everyone gets notified.',
    },
    {
        icon: ClipboardCheck,
        title: 'Timesheet approvals',
        description:
            'Employees submit their week, managers approve it, and approved weeks lock for payroll.',
    },
    {
        icon: BarChart3,
        title: 'Labor reports',
        description:
            'Hours, overtime and labor cost by person and by day, exportable to CSV for payroll.',
    },
    {
        icon: MapPin,
        title: 'Geofenced clock-in',
        description:
            'Make sure people are on site when they clock in, with a radius you set for each location.',
    },
    {
        icon: ShieldCheck,
        title: 'Audit trail',
        description:
            'Every edit to time and schedules is recorded, so you know who changed what, and when.',
    },
];

export default function Welcome({
    pageTitle,
    plans,
    trialDays,
    freeUntil,
}: {
    pageTitle: string;
    plans: Plan[];
    trialDays: number;
    freeUntil: string | null;
}) {
    const { auth } = usePage().props;
    const isDemo = auth.user?.is_demo === true;
    const customer = isDemo ? null : auth.user;
    const signUp = isDemo ? leaveDemo() : register();

    return (
        <>
            <Head title={pageTitle} />
            <div className="min-h-screen bg-background text-foreground">
                <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 md:px-6">
                    <Link href="/" className="flex items-center gap-2.5">
                        <span className="flex size-9 items-center justify-center rounded-lg bg-warm-white ring-1 ring-border">
                            <AppLogoIcon className="size-6" />
                        </span>
                        <span className="text-lg font-semibold tracking-tight">
                            Shiftora
                        </span>
                    </Link>
                    <nav className="flex items-center gap-2">
                        <a
                            href="#demo"
                            className="hidden px-3 py-2 text-sm text-muted-foreground hover:text-foreground sm:inline"
                        >
                            Try it
                        </a>
                        <a
                            href="#pricing"
                            className="hidden px-3 py-2 text-sm text-muted-foreground hover:text-foreground sm:inline"
                        >
                            Pricing
                        </a>
                        {customer ? (
                            <Button asChild>
                                <Link href={dashboard()}>Open dashboard</Link>
                            </Button>
                        ) : (
                            <>
                                {!isDemo && (
                                    <Button variant="ghost" asChild>
                                        <Link href={login()}>Log in</Link>
                                    </Button>
                                )}
                                <Button asChild>
                                    <Link href={signUp}>Start free trial</Link>
                                </Button>
                            </>
                        )}
                    </nav>
                </header>

                <main>
                    <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 pt-10 pb-20 md:px-6 lg:grid-cols-[1.1fr_1fr] lg:pt-16">
                        <div className="space-y-6">
                            <p className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
                                Work smarter. Shift better.
                            </p>
                            <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
                                Time tracking and scheduling your whole team
                                will actually use.
                            </h1>
                            <p className="max-w-xl text-lg text-muted-foreground">
                                Shiftora replaces paper timecards, group-chat
                                schedules and payroll spreadsheets with one
                                calm, reliable workspace for managers and hourly
                                teams.
                            </p>
                            <div className="flex flex-wrap items-center gap-3">
                                <Button size="lg" asChild>
                                    <Link
                                        href={customer ? dashboard() : signUp}
                                    >
                                        {customer
                                            ? 'Go to your workspace'
                                            : `Start your ${trialDays}-day free trial`}
                                        <ArrowRight />
                                    </Link>
                                </Button>
                                <p className="text-sm text-muted-foreground">
                                    No credit card required.
                                </p>
                            </div>
                        </div>

                        <ProductPreview />
                    </section>

                    <section className="border-y bg-card">
                        <div className="mx-auto w-full max-w-6xl px-4 py-20 md:px-6">
                            <div className="max-w-2xl space-y-3">
                                <h2 className="text-3xl font-semibold tracking-tight">
                                    Everything between the first clock-in and
                                    payroll
                                </h2>
                                <p className="text-muted-foreground">
                                    Built for restaurants, retail, warehouses,
                                    field crews and anyone who runs on shifts.
                                </p>
                            </div>
                            <div className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
                                {features.map((feature) => (
                                    <div
                                        key={feature.title}
                                        className="space-y-3"
                                    >
                                        <span className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                                            <feature.icon
                                                className="size-5"
                                                aria-hidden="true"
                                            />
                                        </span>
                                        <h3 className="font-semibold">
                                            {feature.title}
                                        </h3>
                                        <p className="text-sm leading-relaxed text-muted-foreground">
                                            {feature.description}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    <section
                        id="pricing"
                        className="mx-auto w-full max-w-6xl scroll-mt-8 px-4 py-20 md:px-6"
                    >
                        <div className="mx-auto max-w-2xl space-y-3 text-center">
                            <h2 className="text-3xl font-semibold tracking-tight">
                                Simple per-employee pricing
                            </h2>
                            <p className="text-muted-foreground">
                                Pay only for active employees. Every plan starts
                                with a {trialDays}-day free trial.
                            </p>
                        </div>
                        {freeUntil && <FreePromotionBanner until={freeUntil} />}
                        <div className="mt-12 grid gap-6 lg:grid-cols-3">
                            {plans.map((plan) => (
                                <PlanCard
                                    key={plan.value}
                                    plan={plan}
                                    featured={plan.value === 'professional'}
                                    ctaHref={
                                        customer ? dashboard().url : signUp.url
                                    }
                                />
                            ))}
                        </div>
                    </section>

                    <section id="demo" className="scroll-mt-8 border-t bg-card">
                        <div className="mx-auto w-full max-w-6xl space-y-10 px-4 py-20 md:px-6">
                            <div className="mx-auto max-w-2xl space-y-3 text-center">
                                <h2 className="text-3xl font-semibold tracking-tight">
                                    Take it for a spin
                                </h2>
                                <p className="text-muted-foreground">
                                    This is the real Shiftora, not a video.
                                    Clock in, build next week's schedule and
                                    approve timesheets with no account or login.
                                    Hit full screen for the full experience.
                                </p>
                            </div>
                            <LiveDemo />
                        </div>
                    </section>

                    <section className="bg-sidebar text-sidebar-foreground">
                        <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-6 px-4 py-16 md:flex-row md:items-center md:px-6">
                            <div className="space-y-2">
                                <h2 className="text-2xl font-semibold tracking-tight text-warm-white">
                                    Ready for a calmer week?
                                </h2>
                                <p className="text-sidebar-foreground/70">
                                    Set up your team in minutes. Your first
                                    schedule is on us.
                                </p>
                            </div>
                            <Button
                                size="lg"
                                className="bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
                                asChild
                            >
                                <Link href={customer ? dashboard() : signUp}>
                                    {customer
                                        ? 'Open dashboard'
                                        : 'Start free trial'}
                                </Link>
                            </Button>
                        </div>
                    </section>
                </main>

                <SiteFooter />
            </div>
        </>
    );
}

/**
 * The launch promotion, shown across the top of the pricing plans.
 */
function FreePromotionBanner({ until }: { until: string }) {
    return (
        <div className="mt-10 flex flex-col items-center gap-1 rounded-2xl bg-red-600 px-6 py-5 text-center text-white shadow-lg sm:flex-row sm:justify-center sm:gap-4">
            <p className="text-2xl font-bold tracking-tight uppercase sm:text-3xl">
                Free till {until.slice(0, 4)}
            </p>
            <p className="text-sm text-white/90 sm:text-base">
                Every plan costs nothing until{' '}
                {formatDate(until, {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                })}
                .
            </p>
        </div>
    );
}

function PlanCard({
    plan,
    featured,
    ctaHref,
}: {
    plan: Plan;
    featured: boolean;
    ctaHref: string;
}) {
    return (
        <div
            className={cn(
                'relative flex flex-col gap-6 rounded-2xl border bg-card p-6',
                featured && 'border-primary shadow-lg ring-1 ring-primary',
            )}
        >
            {featured && (
                <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                    Most popular
                </span>
            )}
            <div className="space-y-2">
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <p className="min-h-10 text-sm text-muted-foreground">
                    {plan.description}
                </p>
            </div>
            <div className="flex items-baseline gap-1.5">
                <span className="text-4xl font-semibold tracking-tight tabular">
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
                {plan.location_limit === 1
                    ? '1 location'
                    : 'Unlimited locations'}
            </p>
            <ul className="flex-1 space-y-2.5 text-sm">
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
            <Button variant={featured ? 'default' : 'outline'} asChild>
                <Link href={ctaHref}>Start free trial</Link>
            </Button>
        </div>
    );
}

/**
 * A static illustration of the product: a live time clock beside a mini schedule.
 */
function ProductPreview() {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    const rows = [
        { name: 'Maya R.', color: '#2D6A4F', shifts: [0, 1, 3, 4] },
        { name: 'Jordan P.', color: '#3B6E8F', shifts: [1, 2, 3] },
        { name: 'Sam K.', color: '#8A5A44', shifts: [0, 2, 4] },
    ];

    return (
        <div className="relative" aria-hidden="true">
            <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-accent/70 blur-2xl" />
            <div className="space-y-4 rounded-2xl border bg-card p-5 shadow-xl">
                <div className="flex items-center justify-between rounded-xl bg-sidebar p-4 text-sidebar-foreground">
                    <div>
                        <p className="text-xs text-sidebar-foreground/60">
                            Clocked in since 8:58 AM
                        </p>
                        <p className="text-3xl font-semibold tabular">
                            4:12:36
                        </p>
                    </div>
                    <span className="rounded-lg bg-sidebar-primary px-4 py-2 text-sm font-medium text-sidebar-primary-foreground">
                        Clock out
                    </span>
                </div>
                <div className="rounded-xl border">
                    <div className="grid grid-cols-[5.5rem_repeat(5,1fr)] border-b text-xs text-muted-foreground">
                        <span className="p-2" />
                        {days.map((day) => (
                            <span key={day} className="p-2 text-center">
                                {day}
                            </span>
                        ))}
                    </div>
                    {rows.map((row) => (
                        <div
                            key={row.name}
                            className="grid grid-cols-[5.5rem_repeat(5,1fr)] items-center border-b last:border-b-0"
                        >
                            <span className="truncate p-2 text-xs font-medium">
                                {row.name}
                            </span>
                            {days.map((day, index) => (
                                <span key={day} className="p-1">
                                    {row.shifts.includes(index) && (
                                        <span
                                            className="block rounded-md border-l-[3px] bg-muted px-1.5 py-1 text-[10px] leading-tight tabular"
                                            style={{
                                                borderLeftColor: row.color,
                                            }}
                                        >
                                            9–5
                                        </span>
                                    )}
                                </span>
                            ))}
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                    {[
                        ['38h 20m', 'This week'],
                        ['2h 10m', 'Overtime'],
                        ['3', 'To approve'],
                    ].map(([value, label]) => (
                        <div key={label} className="rounded-lg bg-muted p-2">
                            <p className="text-sm font-semibold tabular">
                                {value}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                                {label}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
