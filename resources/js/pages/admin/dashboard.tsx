import { Head } from '@inertiajs/react';
import {
    Building2,
    CalendarDays,
    CreditCard,
    Hourglass,
    TrendingUp,
    UserPlus,
    Users,
} from 'lucide-react';
import { useState } from 'react';
import DailySignupsChart from '@/components/admin/daily-signups-chart';
import type { DailySignups } from '@/components/admin/daily-signups-chart';
import PageContainer from '@/components/page-container';
import PageHeader from '@/components/page-header';
import StatCard from '@/components/stat-card';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { formatDate, formatDateTime, formatRelative } from '@/lib/time';
import { dashboard } from '@/routes/admin';

type RecentSignup = {
    id: number;
    name: string;
    email: string;
    organizations: string[];
    is_admin: boolean;
    created_at: string;
};

type Props = {
    users: { total: number; in_an_organization: number };
    signups: {
        today: number;
        last_7_days: number;
        last_30_days: number;
        previous_30_days: number;
    };
    organizationCounts: { total: number; paying: number; trialing: number };
    dailySignups: DailySignups[];
    recentSignups: RecentSignup[];
};

const numberFormat = new Intl.NumberFormat();
const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

/**
 * "12 more than the 30 days before" style comparison for the 30-day tile.
 */
function trendHint(current: number, previous: number): string {
    const difference = current - previous;

    if (difference === 0) {
        return 'Same as the 30 days before';
    }

    return `${numberFormat.format(Math.abs(difference))} ${difference > 0 ? 'more' : 'fewer'} than the 30 days before`;
}

export default function AdminDashboard({
    users,
    signups,
    organizationCounts,
    dailySignups,
    recentSignups,
}: Props) {
    return (
        <>
            <Head title="Admin" />

            <PageContainer>
                <PageHeader
                    title="Admin"
                    description="Everyone who has signed up for Shiftora. Demo visitors are not counted."
                />

                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    <StatCard
                        label="Total users"
                        value={numberFormat.format(users.total)}
                        hint={`${numberFormat.format(users.in_an_organization)} in an organization`}
                        icon={Users}
                    />
                    <StatCard
                        label="Signups today"
                        value={numberFormat.format(signups.today)}
                        hint="Since midnight UTC"
                        icon={UserPlus}
                    />
                    <StatCard
                        label="Last 7 days"
                        value={numberFormat.format(signups.last_7_days)}
                        hint="New accounts"
                        icon={CalendarDays}
                    />
                    <StatCard
                        label="Last 30 days"
                        value={numberFormat.format(signups.last_30_days)}
                        hint={trendHint(
                            signups.last_30_days,
                            signups.previous_30_days,
                        )}
                        icon={TrendingUp}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                    <StatCard
                        label="Organizations"
                        value={numberFormat.format(organizationCounts.total)}
                        hint="Workspaces created"
                        icon={Building2}
                    />
                    <StatCard
                        label="Paying"
                        value={numberFormat.format(organizationCounts.paying)}
                        hint="Active subscription"
                        icon={CreditCard}
                    />
                    <StatCard
                        label="On free trial"
                        value={numberFormat.format(organizationCounts.trialing)}
                        hint="Trial not yet ended"
                        icon={Hourglass}
                    />
                </div>

                <SignupsSection days={dailySignups} />

                <section
                    aria-labelledby="recent-signups-heading"
                    className="rounded-xl border bg-card p-4 shadow-xs"
                >
                    <div className="mb-4">
                        <h2 id="recent-signups-heading" className="font-medium">
                            Latest signups
                        </h2>
                        <p className="text-xs text-muted-foreground">
                            The {recentSignups.length} most recent accounts
                        </p>
                    </div>
                    <div className="overflow-hidden rounded-lg border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Organization</TableHead>
                                    <TableHead>Signed up</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {recentSignups.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell>
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                <span className="font-medium">
                                                    {user.name}
                                                </span>
                                                {user.is_admin && (
                                                    <Badge variant="secondary">
                                                        Admin
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {user.email}
                                            </div>
                                        </TableCell>
                                        <TableCell className="whitespace-normal">
                                            {user.organizations.length > 0 ? (
                                                user.organizations.join(', ')
                                            ) : (
                                                <span className="text-muted-foreground">
                                                    Not set up yet
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <span
                                                title={formatDateTime(
                                                    user.created_at,
                                                    timeZone,
                                                )}
                                            >
                                                {formatRelative(
                                                    user.created_at,
                                                )}
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </section>
            </PageContainer>
        </>
    );
}

function SignupsSection({ days }: { days: DailySignups[] }) {
    const [view, setView] = useState<'chart' | 'table'>('chart');

    return (
        <section
            aria-labelledby="daily-signups-heading"
            className="rounded-xl border bg-card p-4 shadow-xs"
        >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 id="daily-signups-heading" className="font-medium">
                        Signups per day
                    </h2>
                    <p className="text-xs text-muted-foreground">
                        New accounts over the last 30 days (UTC)
                    </p>
                </div>
                <ToggleGroup
                    type="single"
                    variant="outline"
                    size="sm"
                    value={view}
                    onValueChange={(value) =>
                        setView(value === 'table' ? 'table' : 'chart')
                    }
                    aria-label="Signups view"
                >
                    <ToggleGroupItem value="chart" className="px-3">
                        Chart
                    </ToggleGroupItem>
                    <ToggleGroupItem value="table" className="px-3">
                        Table
                    </ToggleGroupItem>
                </ToggleGroup>
            </div>

            {view === 'chart' ? (
                <DailySignupsChart days={days} />
            ) : (
                <div className="max-h-96 overflow-y-auto rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead className="text-right">
                                    Signups
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {[...days].reverse().map((day) => (
                                <TableRow key={day.date}>
                                    <TableCell>
                                        {formatDate(day.date)}
                                    </TableCell>
                                    <TableCell className="text-right tabular">
                                        {day.count}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </section>
    );
}

AdminDashboard.layout = {
    breadcrumbs: [{ title: 'Admin', href: dashboard() }],
};
