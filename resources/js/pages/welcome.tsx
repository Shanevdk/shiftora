import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    BarChart3,
    CalendarDays,
    Check,
    ClipboardCheck,
    Clock,
    MapPin,
    Tablet,
} from 'lucide-react';
import AppLogoIcon from '@/components/app-logo-icon';
import LiveDemo from '@/components/live-demo';
import SiteFooter from '@/components/site-footer';
import { Button } from '@/components/ui/button';
import { formatDate, formatPrice } from '@/lib/time';
import { cn } from '@/lib/utils';
import { dashboard, login } from '@/routes';
import { destroy as leaveDemo } from '@/routes/demo';
import { create as startWorkspace } from '@/routes/start';
import type { Plan } from '@/types';

// Draft copy, written plainly; rewrite it in your own voice before launch.
const features = [
    {
        icon: Clock,
        title: 'Clock in from their phone',
        description:
            'Staff tap once to clock in and out. Nothing to install, and you see the hours add up as they work.',
    },
    {
        icon: Tablet,
        title: 'Or a tablet by the door',
        description:
            'No phone, no problem. Put a tablet on the wall and people punch in with their own PIN.',
    },
    {
        icon: CalendarDays,
        title: 'Schedules people actually see',
        description:
            'Drag shifts onto the week and publish. Everyone gets their shifts by email and in the app.',
    },
    {
        icon: ClipboardCheck,
        title: 'Timesheets ready for payroll',
        description:
            'Staff send in their week, you approve it, and it locks so the numbers stop changing.',
    },
    {
        icon: BarChart3,
        title: 'Hours and labor cost',
        description:
            'Hours, overtime and labor cost per person and per day. Export it to CSV for payroll.',
    },
    {
        icon: MapPin,
        title: 'Clock in only on site',
        description:
            'Set a radius around each location so people can only clock in when they are actually there.',
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
    const startFree = isDemo ? leaveDemo() : startWorkspace();

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
                                    <Link href={startFree}>Start free</Link>
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
                            {/* Draft copy: rewrite the promise in your own voice. */}
                            <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
                                Your team clocks in from their phone, and you
                                get timesheets ready for payroll.
                            </h1>
                            <p className="max-w-xl text-lg text-muted-foreground">
                                No app to install. They open a link, see their
                                shifts and tap to clock in.
                            </p>
                            {customer ? (
                                <Button size="lg" asChild>
                                    <Link href={dashboard()}>
                                        Go to your workspace
                                        <ArrowRight />
                                    </Link>
                                </Button>
                            ) : (
                                <div className="flex flex-wrap items-start gap-3">
                                    <LiveDemo />
                                    <Button
                                        size="lg"
                                        variant="outline"
                                        className="h-14 px-6 text-base"
                                        asChild
                                    >
                                        <Link href={startFree}>
                                            {freeUntil
                                                ? `Use it free till ${freeUntil.slice(0, 4)}`
                                                : `Start your ${trialDays}-day free trial`}
                                        </Link>
                                    </Button>
                                </div>
                            )}
                        </div>

                        <ProductPreview />
                    </section>

                    <section className="border-y bg-card">
                        <div className="mx-auto w-full max-w-6xl px-4 py-20 md:px-6">
                            <div className="max-w-2xl space-y-3">
                                <h2 className="text-3xl font-semibold tracking-tight">
                                    What it does
                                </h2>
                                <p className="text-muted-foreground">
                                    For cafés, restaurants, shops, warehouses
                                    and crews who work in shifts.
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
                                Pricing
                            </h2>
                            <p className="text-muted-foreground">
                                You pay for each active employee, every month
                                {plans[0]
                                    ? `, in ${plans[0].currency}`
                                    : ''}.{' '}
                                {freeUntil
                                    ? 'No credit card needed to get started.'
                                    : `Every plan starts with a ${trialDays}-day free trial.`}
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
                                        customer
                                            ? dashboard().url
                                            : startFree.url
                                    }
                                />
                            ))}
                        </div>
                    </section>

                    <section className="bg-sidebar text-sidebar-foreground">
                        <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-6 px-4 py-16 md:flex-row md:items-center md:px-6">
                            <div className="space-y-2">
                                <h2 className="text-2xl font-semibold tracking-tight text-warm-white">
                                    Try it with your own team
                                </h2>
                                <p className="text-sidebar-foreground/70">
                                    Free to start. No credit card and nothing to
                                    install.
                                </p>
                            </div>
                            <Button
                                size="lg"
                                className="bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
                                asChild
                            >
                                <Link href={customer ? dashboard() : startFree}>
                                    {customer ? 'Open dashboard' : 'Start free'}
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
            <div className="space-y-2">
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <p className="min-h-10 text-sm text-muted-foreground">
                    {plan.description}
                </p>
            </div>
            <div className="flex flex-wrap items-baseline gap-x-1.5">
                <span className="text-4xl font-semibold tracking-tight tabular">
                    {formatPrice(plan.price_per_employee_cents, plan.currency)}
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
                <Link href={ctaHref}>Try it free</Link>
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
