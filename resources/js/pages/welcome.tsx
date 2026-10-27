import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    BarChart3,
    Briefcase,
    CalendarDays,
    Check,
    ClipboardCheck,
    Clock,
    MapPin,
    Smartphone,
    Tablet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import AppLogoIcon from '@/components/app-logo-icon';
import LiveDemo from '@/components/live-demo';
import LiveDemoFrame from '@/components/live-demo-frame';
import SiteFooter from '@/components/site-footer';
import { Button } from '@/components/ui/button';
import { formatDate, formatPrice } from '@/lib/time';
import { cn } from '@/lib/utils';
import { dashboard, login } from '@/routes';
import { destroy as leaveDemo } from '@/routes/demo';
import { create as startWorkspace } from '@/routes/start';
import type { Plan } from '@/types';

// Draft copy, written plainly; rewrite it in your own voice before launch.
const features: { icon: LucideIcon; title: string; description: string }[] = [
    {
        icon: Clock,
        title: 'Clock in from their phone',
        description:
            'One tap in, one tap out. Nothing to install, and you watch the hours add up as they work.',
    },
    {
        icon: Tablet,
        title: 'Or a tablet by the door',
        description:
            'No phone on them? Stick a tablet on the wall and people punch in with their own PIN.',
    },
    {
        icon: CalendarDays,
        title: 'Schedules people actually read',
        description:
            'Drag shifts onto the week and publish. Everyone gets their shifts by email and in the app.',
    },
    {
        icon: ClipboardCheck,
        title: 'Timesheets that stop moving',
        description:
            'Staff send in their week, you approve it, and it locks so nobody edits Tuesday after payroll.',
    },
    {
        icon: BarChart3,
        title: 'Hours and labor cost',
        description:
            'Who worked what, overtime included, per person and per day. Export it to CSV for payroll.',
    },
    {
        icon: MapPin,
        title: 'Clock in only on site',
        description:
            'Draw a radius around each location so nobody clocks in from the bus.',
    },
];

const audiences: { icon: LucideIcon; title: string; points: string[] }[] = [
    {
        icon: Briefcase,
        title: 'Owners and managers',
        points: [
            'Add your team and send invites',
            'Build the week and publish it',
            "See who's on the clock right now",
            'Approve timesheets and export for payroll',
        ],
    },
    {
        icon: Smartphone,
        title: 'Your staff',
        points: [
            'Get an email invite, nothing to download',
            'Clock in from a phone or a shared tablet',
            'See their next shifts',
            'Send in their week for approval',
        ],
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
                        <span className="font-display text-2xl">Shiftora</span>
                    </Link>
                    <nav className="flex items-center gap-1 sm:gap-2">
                        <a
                            href="#demo"
                            className="hidden px-3 py-2 text-sm text-muted-foreground hover:text-foreground sm:inline"
                        >
                            Demo
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
                                    <Link href={startFree}>Start free</Link>
                                </Button>
                            </>
                        )}
                    </nav>
                </header>

                <main>
                    <section className="mx-auto grid w-full max-w-6xl gap-14 px-4 pt-12 pb-24 md:px-6 lg:grid-cols-12 lg:items-center lg:pt-20">
                        <div className="space-y-8 lg:col-span-7">
                            <Eyebrow>
                                Time clock and scheduling for shift work
                            </Eyebrow>
                            {/* Draft copy: rewrite the promise in your own voice. */}
                            <h1 className="font-display text-5xl leading-[0.95] tracking-tight text-balance sm:text-6xl lg:text-7xl">
                                Your team clocks in from{' '}
                                <HandUnderline>their phone</HandUnderline>, and
                                you get timesheets ready for payroll.
                            </h1>
                            <p className="max-w-lg text-lg leading-relaxed text-muted-foreground">
                                No app to download and no paper cards to chase
                                on Friday. Staff open a link, check their shifts
                                and tap in.
                            </p>
                            {customer ? (
                                <Button size="lg" asChild>
                                    <Link href={dashboard()}>
                                        Go to your workspace
                                        <ArrowRight />
                                    </Link>
                                </Button>
                            ) : (
                                <div className="space-y-3">
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
                                    <p className="text-sm text-muted-foreground">
                                        The demo sets itself up in a few
                                        seconds. No email, no card.
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="lg:col-span-5">
                            <TimeCard />
                        </div>
                    </section>

                    <section className="border-t">
                        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-20 md:px-6 lg:grid-cols-12 lg:gap-12">
                            <SectionIntro
                                className="lg:col-span-4"
                                eyebrow="Who it's for"
                                title="Two sides of the counter, one app"
                            >
                                Everyone logs in from the same page. Shiftora
                                shows each person only what they need.
                            </SectionIntro>
                            <div className="grid gap-10 sm:grid-cols-2 sm:gap-0 sm:divide-x lg:col-span-8">
                                {audiences.map((audience) => (
                                    <div
                                        key={audience.title}
                                        className="space-y-4 sm:px-8 sm:first:pl-0 sm:last:pr-0"
                                    >
                                        <h3 className="flex items-center gap-2 font-semibold">
                                            <audience.icon
                                                className="size-4 text-primary"
                                                aria-hidden="true"
                                            />
                                            {audience.title}
                                        </h3>
                                        <ul className="divide-y text-sm">
                                            {audience.points.map((point) => (
                                                <li
                                                    key={point}
                                                    className="py-2.5"
                                                >
                                                    {point}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    <section id="demo" className="scroll-mt-8 border-t bg-card">
                        <div className="mx-auto w-full max-w-6xl space-y-10 px-4 py-20 md:px-6">
                            <div className="grid gap-6 lg:grid-cols-12 lg:items-end lg:gap-12">
                                <SectionIntro
                                    className="lg:col-span-5"
                                    eyebrow="Live demo"
                                    title="Poke around a real café"
                                />
                                <p className="max-w-md text-muted-foreground lg:col-span-6 lg:col-start-7">
                                    Northwind Coffee has eleven staff, two
                                    locations and three weeks of shifts. You're
                                    the owner. Break whatever you like; it
                                    resets tomorrow.
                                </p>
                            </div>
                            <LiveDemoFrame />
                        </div>
                    </section>

                    <section className="border-t">
                        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-20 md:px-6 lg:grid-cols-12 lg:gap-12">
                            <SectionIntro
                                className="lg:sticky lg:top-12 lg:col-span-4 lg:self-start"
                                eyebrow="What it does"
                                title="The parts you'll use every week"
                            >
                                Made for cafés, restaurants, shops, warehouses
                                and crews who work in shifts.
                            </SectionIntro>
                            <ol className="divide-y border-y lg:col-span-8">
                                {features.map((feature, index) => (
                                    <li
                                        key={feature.title}
                                        className="grid grid-cols-[3rem_1fr] gap-x-4 py-6 sm:grid-cols-[4rem_1fr_auto]"
                                    >
                                        <span className="font-display text-3xl text-muted-foreground tabular">
                                            {String(index + 1).padStart(2, '0')}
                                        </span>
                                        <div className="space-y-1.5">
                                            <h3 className="text-lg font-semibold">
                                                {feature.title}
                                            </h3>
                                            <p className="max-w-md text-muted-foreground">
                                                {feature.description}
                                            </p>
                                        </div>
                                        <feature.icon
                                            className="mt-1 hidden size-5 text-primary sm:block"
                                            aria-hidden="true"
                                        />
                                    </li>
                                ))}
                            </ol>
                        </div>
                    </section>

                    <section
                        id="pricing"
                        className="scroll-mt-8 border-t bg-card"
                    >
                        <div className="mx-auto w-full max-w-6xl space-y-12 px-4 py-20 md:px-6">
                            <div className="grid gap-6 lg:grid-cols-12 lg:items-end lg:gap-12">
                                <SectionIntro
                                    className="lg:col-span-6"
                                    eyebrow="Pricing"
                                    title="Free for small crews. Fair when you grow."
                                />
                                <p className="max-w-md text-muted-foreground lg:col-span-5 lg:col-start-8">
                                    Paid plans are per active person, per month
                                    {plans[0]
                                        ? `, in ${plans[0].currency}`
                                        : ''}
                                    . Deactivate someone and they stop counting.{' '}
                                    {freeUntil
                                        ? `Everything is free until ${formatDate(freeUntil, { month: 'long', day: 'numeric', year: 'numeric' })}.`
                                        : `Every new workspace gets ${trialDays} days with everything unlocked first.`}
                                </p>
                            </div>
                            <div className="grid gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-2 lg:grid-cols-4">
                                {plans.map((plan) => (
                                    <PlanColumn
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
                        </div>
                    </section>

                    <section className="bg-panel text-panel-foreground">
                        <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-20 md:px-6 lg:grid-cols-12 lg:items-end">
                            <h2 className="font-display text-4xl leading-tight text-warm-white sm:text-5xl lg:col-span-8">
                                Try it on next week's schedule.
                            </h2>
                            <div className="space-y-3 lg:col-span-4 lg:justify-self-end lg:text-right">
                                <Button
                                    size="lg"
                                    className="bg-panel-primary text-panel-primary-foreground hover:bg-panel-primary/90"
                                    asChild
                                >
                                    <Link
                                        href={
                                            customer ? dashboard() : startFree
                                        }
                                    >
                                        {customer
                                            ? 'Open dashboard'
                                            : 'Start free'}
                                        <ArrowRight />
                                    </Link>
                                </Button>
                                <p className="text-sm text-panel-foreground/70">
                                    No credit card, nothing to install.
                                </p>
                            </div>
                        </div>
                    </section>
                </main>

                <SiteFooter />
            </div>
        </>
    );
}

/**
 * A small uppercase label above a heading, with a short rule instead of a pill.
 */
function Eyebrow({ children }: { children: ReactNode }) {
    return (
        <p className="flex items-center gap-3 text-xs font-semibold tracking-[0.16em] text-primary uppercase">
            <span className="h-px w-8 bg-primary" aria-hidden="true" />
            {children}
        </p>
    );
}

function SectionIntro({
    eyebrow,
    title,
    children,
    className,
}: {
    eyebrow: string;
    title: string;
    children?: ReactNode;
    className?: string;
}) {
    return (
        <div className={cn('space-y-4', className)}>
            <Eyebrow>{eyebrow}</Eyebrow>
            <h2 className="font-display text-4xl leading-[1.05] tracking-tight text-balance sm:text-5xl">
                {title}
            </h2>
            {children && (
                <p className="max-w-sm text-muted-foreground">{children}</p>
            )}
        </div>
    );
}

/**
 * Words with a hand-drawn marker stroke under them.
 */
function HandUnderline({ children }: { children: ReactNode }) {
    return (
        <span className="relative inline-block whitespace-nowrap">
            <span className="relative italic">{children}</span>
            <svg
                aria-hidden="true"
                viewBox="0 0 220 14"
                preserveAspectRatio="none"
                className="absolute -bottom-1 left-0 h-3 w-full text-primary/70"
            >
                <path
                    d="M3 9.6c31-4.1 66-6.9 104-6.7 38 .2 73 2.4 108 5.9"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                />
            </svg>
        </span>
    );
}

/**
 * The paper time card Shiftora replaces: a perforated card with a week of punches in and out,
 * and an approval stamp. Paper stays paper-coloured in dark mode, like a card on a dark desk.
 */
function TimeCard() {
    const punches = [
        ['Mon', '8:58', '5:02', '7h 34m'],
        ['Tue', '9:01', '5:00', '7h 29m'],
        ['Wed', '—', '—', ''],
        ['Thu', '8:55', '6:10', '8h 45m'],
        ['Fri', '9:00', '5:31', '8h 01m'],
    ];

    return (
        <figure
            className="relative mx-auto max-w-sm rotate-[1.5deg] drop-shadow-[0_22px_28px_rgba(30,33,36,0.22)] lg:ml-auto"
            aria-label="A paper time card for Maya Robinson with four days of punches, stamped approved"
        >
            <div className="bg-warm-white px-6 pt-8 pb-6 text-charcoal perforated-top">
                <div className="flex items-baseline justify-between border-b-2 border-charcoal pb-3">
                    <p className="font-display text-3xl">Time card</p>
                    <p className="text-xs font-semibold tracking-[0.16em] uppercase">
                        Week of Oct 26
                    </p>
                </div>
                <p className="mt-3 text-sm">
                    <span className="text-slate-grey">Name</span>{' '}
                    <span className="font-display text-xl italic">
                        Maya Robinson
                    </span>
                </p>
                <table className="mt-4 w-full font-mono text-sm tabular">
                    <thead>
                        <tr className="text-left text-[11px] tracking-[0.14em] text-slate-grey uppercase">
                            <th className="pb-2 font-semibold">Day</th>
                            <th className="pb-2 font-semibold">In</th>
                            <th className="pb-2 font-semibold">Out</th>
                            <th className="pb-2 text-right font-semibold">
                                Hours
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {punches.map(([day, clockIn, clockOut, hours]) => (
                            <tr
                                key={day}
                                className="border-t border-dashed border-charcoal/20"
                            >
                                <td className="py-2 font-sans font-semibold">
                                    {day}
                                </td>
                                <td className="py-2">{clockIn}</td>
                                <td className="py-2">{clockOut}</td>
                                <td className="py-2 text-right">{hours}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="mt-2 flex items-baseline justify-between border-t-2 border-charcoal pt-3">
                    <span className="text-xs font-semibold tracking-[0.16em] uppercase">
                        Total
                    </span>
                    <span className="font-display text-3xl">31h 49m</span>
                </div>
            </div>
            <span
                className="absolute top-[55%] right-8 rotate-[-11deg] rounded-md border-[3px] border-forest/80 px-3 py-1 text-base font-bold tracking-[0.24em] text-forest/80 uppercase mix-blend-multiply"
                aria-hidden="true"
            >
                Approved
            </span>
        </figure>
    );
}

function PlanColumn({
    plan,
    featured,
    ctaHref,
}: {
    plan: Plan;
    featured: boolean;
    ctaHref: string;
}) {
    const isFree = plan.price_per_employee_cents === 0;

    return (
        <div
            className={cn(
                'flex flex-col gap-6 bg-background p-6',
                featured && 'shadow-[inset_0_3px_0_var(--color-primary)]',
            )}
        >
            <div className="space-y-2">
                <h3 className="font-semibold">{plan.name}</h3>
                <p className="text-sm text-muted-foreground lg:min-h-[3.75rem]">
                    {plan.description}
                </p>
            </div>
            <div className="space-y-1">
                <p className="font-display text-5xl leading-none tabular">
                    {isFree
                        ? 'Free'
                        : formatPrice(
                              plan.price_per_employee_cents,
                              plan.currency,
                          )}
                </p>
                <p className="text-sm text-muted-foreground">
                    {isFree ? 'for good' : 'per person, per month'}
                </p>
            </div>
            <p className="text-sm font-medium">
                {plan.employee_limit
                    ? `Up to ${plan.employee_limit} people · ${plan.location_limit === 1 ? '1 location' : 'any number of locations'}`
                    : 'No limit on people or locations'}
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
                <Link href={ctaHref}>
                    {isFree ? 'Start free' : 'Try it free'}
                </Link>
            </Button>
        </div>
    );
}
