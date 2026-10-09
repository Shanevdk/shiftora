import { Head, Link, router } from '@inertiajs/react';
import { AlertTriangle, ChevronRight, Plus, Search, Users } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import EmployeeAvatar from '@/components/employees/employee-avatar';
import EmptyState from '@/components/empty-state';
import PageContainer from '@/components/page-container';
import PageHeader from '@/components/page-header';
import Pagination from '@/components/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useWorkspace } from '@/hooks/use-workspace';
import { formatCurrency } from '@/lib/time';
import { cn } from '@/lib/utils';
import { edit as editBilling } from '@/routes/billing';
import { create, edit, index } from '@/routes/employees';
import type { EmployeeDetail, Paginator } from '@/types';

type StatusFilter = 'active' | 'inactive' | 'all';

type Props = {
    employees: Paginator<EmployeeDetail>;
    filters: { search: string; status: StatusFilter };
    seats: { used: number; limit: number | null };
    canCreate: boolean;
};

const roleLabels: Record<EmployeeDetail['role'], string> = {
    owner: 'Owner',
    admin: 'Admin',
    manager: 'Manager',
    employee: 'Employee',
};

export default function EmployeesIndex({
    employees,
    filters,
    seats,
    canCreate,
}: Props) {
    const [search, setSearch] = useState(filters.search);
    const searchTimeout = useRef<number | undefined>(undefined);

    useEffect(() => () => window.clearTimeout(searchTimeout.current), []);

    const visit = (next: { search: string; status: StatusFilter }) => {
        window.clearTimeout(searchTimeout.current);

        router.get(
            index.url(),
            {
                ...(next.search.trim() !== '' && {
                    search: next.search.trim(),
                }),
                ...(next.status !== 'active' && { status: next.status }),
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const updateSearch = (value: string) => {
        setSearch(value);
        window.clearTimeout(searchTimeout.current);
        searchTimeout.current = window.setTimeout(
            () => visit({ search: value, status: filters.status }),
            300,
        );
    };

    const isFiltered = filters.search !== '' || filters.status !== 'active';

    return (
        <>
            <Head title="Employees" />

            <PageContainer>
                <PageHeader
                    title="Employees"
                    description="Everyone on your team, their roles and how they sign in."
                    actions={
                        canCreate && (
                            <Button asChild>
                                <Link href={create()}>
                                    <Plus aria-hidden="true" />
                                    Add employee
                                </Link>
                            </Button>
                        )
                    }
                />

                <SeatUsage used={seats.used} limit={seats.limit} />

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="relative w-full sm:max-w-xs">
                        <Search
                            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                            aria-hidden="true"
                        />
                        <Input
                            type="search"
                            value={search}
                            onChange={(event) =>
                                updateSearch(event.target.value)
                            }
                            placeholder="Search name, email or title"
                            aria-label="Search employees"
                            className="pl-9"
                        />
                    </div>

                    <ToggleGroup
                        type="single"
                        variant="outline"
                        value={filters.status}
                        onValueChange={(value) => {
                            if (value) {
                                visit({
                                    search,
                                    status: value as StatusFilter,
                                });
                            }
                        }}
                        aria-label="Filter by status"
                    >
                        <ToggleGroupItem value="active" className="px-3">
                            Active
                        </ToggleGroupItem>
                        <ToggleGroupItem value="inactive" className="px-3">
                            Inactive
                        </ToggleGroupItem>
                        <ToggleGroupItem value="all" className="px-3">
                            All
                        </ToggleGroupItem>
                    </ToggleGroup>
                </div>

                {employees.data.length === 0 ? (
                    isFiltered ? (
                        <EmptyState
                            icon={Search}
                            title="No matching employees"
                            description="Try a different search or status filter."
                            action={
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setSearch('');
                                        visit({ search: '', status: 'active' });
                                    }}
                                >
                                    Clear filters
                                </Button>
                            }
                        />
                    ) : (
                        <EmptyState
                            icon={Users}
                            title="No employees yet"
                            description="Add your team so they can clock in, see their schedule and submit timesheets."
                            action={
                                canCreate && (
                                    <Button asChild>
                                        <Link href={create()}>
                                            <Plus aria-hidden="true" />
                                            Add employee
                                        </Link>
                                    </Button>
                                )
                            }
                        />
                    )
                ) : (
                    <>
                        <div className="hidden overflow-x-auto rounded-xl border bg-card md:block">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="pl-4">
                                            Name
                                        </TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead>Location</TableHead>
                                        <TableHead>Account</TableHead>
                                        <TableHead className="text-right">
                                            Hourly rate
                                        </TableHead>
                                        <TableHead className="w-0 pr-4">
                                            <span className="sr-only">
                                                Actions
                                            </span>
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {employees.data.map((employee) => (
                                        <TableRow key={employee.id}>
                                            <TableCell className="pl-4">
                                                <EmployeeIdentity
                                                    employee={employee}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <RoleBadge
                                                    role={employee.role}
                                                />
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {employee.location?.name ?? '—'}
                                            </TableCell>
                                            <TableCell>
                                                <AccountStatus
                                                    employee={employee}
                                                />
                                            </TableCell>
                                            <TableCell className="text-right tabular">
                                                <HourlyRate
                                                    cents={
                                                        employee.hourly_rate_cents
                                                    }
                                                />
                                            </TableCell>
                                            <TableCell className="pr-4 text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    asChild
                                                >
                                                    <Link
                                                        href={edit(employee.id)}
                                                    >
                                                        Edit
                                                        <span className="sr-only">
                                                            {' '}
                                                            {employee.name}
                                                        </span>
                                                    </Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        <ul className="grid gap-3 md:hidden">
                            {employees.data.map((employee) => (
                                <li key={employee.id}>
                                    <Link
                                        href={edit(employee.id)}
                                        className="flex items-center gap-3 rounded-xl border bg-card p-4 transition-colors hover:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                                    >
                                        <div className="min-w-0 flex-1 space-y-2">
                                            <EmployeeIdentity
                                                employee={employee}
                                            />
                                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                                <RoleBadge
                                                    role={employee.role}
                                                />
                                                <AccountStatus
                                                    employee={employee}
                                                />
                                                {employee.location && (
                                                    <span>
                                                        {employee.location.name}
                                                    </span>
                                                )}
                                                <span className="tabular">
                                                    <HourlyRate
                                                        cents={
                                                            employee.hourly_rate_cents
                                                        }
                                                    />
                                                </span>
                                            </div>
                                        </div>
                                        <ChevronRight
                                            className="size-4 shrink-0 text-muted-foreground"
                                            aria-hidden="true"
                                        />
                                    </Link>
                                </li>
                            ))}
                        </ul>

                        <Pagination paginator={employees} noun="employees" />
                    </>
                )}
            </PageContainer>
        </>
    );
}

EmployeesIndex.layout = {
    breadcrumbs: [{ title: 'Employees', href: index() }],
};

function SeatUsage({ used, limit }: { used: number; limit: number | null }) {
    const { can } = useWorkspace();

    if (limit === null) {
        return (
            <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground tabular">
                    {used}
                </span>{' '}
                active {used === 1 ? 'employee' : 'employees'} · unlimited seats
                on your plan
            </p>
        );
    }

    const isFull = used >= limit;
    const percentage = Math.min(100, Math.round((used / limit) * 100));

    return (
        <div
            className={cn(
                'flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between',
                isFull && 'border-warning/40 bg-warning/10',
            )}
        >
            <div className="flex-1 space-y-2">
                <p className="flex items-center gap-2 text-sm">
                    {isFull && (
                        <AlertTriangle
                            className="size-4 text-warning"
                            aria-hidden="true"
                        />
                    )}
                    <span>
                        <span className="font-medium tabular">
                            {used} of {limit}
                        </span>{' '}
                        seats used
                        {isFull && (
                            <span className="text-muted-foreground">
                                {' '}
                                · deactivate someone or upgrade to add more
                            </span>
                        )}
                    </span>
                </p>
                <div
                    className="h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-muted"
                    role="progressbar"
                    aria-label="Seats used"
                    aria-valuemin={0}
                    aria-valuemax={limit}
                    aria-valuenow={used}
                >
                    <div
                        className={cn(
                            'h-full rounded-full',
                            isFull ? 'bg-warning' : 'bg-primary',
                        )}
                        style={{ width: `${percentage}%` }}
                    />
                </div>
            </div>
            {isFull && can('manageBilling') && (
                <Button size="sm" variant="outline" asChild>
                    <Link href={editBilling()}>Upgrade plan</Link>
                </Button>
            )}
        </div>
    );
}

function EmployeeIdentity({ employee }: { employee: EmployeeDetail }) {
    return (
        <div className="flex min-w-0 items-center gap-3">
            <EmployeeAvatar
                firstName={employee.first_name}
                lastName={employee.last_name}
                color={employee.color}
            />
            <div className="min-w-0">
                <p className="flex items-center gap-2 truncate font-medium">
                    <span className="truncate">{employee.name}</span>
                    {!employee.is_active && (
                        <Badge
                            variant="outline"
                            className="text-muted-foreground"
                        >
                            Inactive
                        </Badge>
                    )}
                </p>
                <p className="truncate text-sm text-muted-foreground">
                    {employee.job_title ?? employee.email ?? 'No job title'}
                </p>
            </div>
        </div>
    );
}

function RoleBadge({ role }: { role: EmployeeDetail['role'] }) {
    return (
        <Badge
            variant={role === 'employee' ? 'outline' : 'secondary'}
            className={cn(
                role === 'owner' && 'bg-accent text-accent-foreground',
            )}
        >
            {roleLabels[role]}
        </Badge>
    );
}

function AccountStatus({ employee }: { employee: EmployeeDetail }) {
    if (employee.has_account) {
        return (
            <span className="inline-flex items-center gap-1.5 text-sm">
                <span
                    className="size-2 rounded-full bg-success"
                    aria-hidden="true"
                />
                Active account
            </span>
        );
    }

    if (employee.invited_at) {
        return (
            <span className="inline-flex items-center gap-1.5 text-sm">
                <span
                    className="size-2 rounded-full bg-warning"
                    aria-hidden="true"
                />
                Invited
            </span>
        );
    }

    return (
        <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <span
                className="size-2 rounded-full border border-muted-foreground/60"
                aria-hidden="true"
            />
            Not invited
        </span>
    );
}

function HourlyRate({ cents }: { cents: number | null }) {
    if (cents === null) {
        return <span className="text-muted-foreground">—</span>;
    }

    return (
        <>
            {formatCurrency(cents)}
            <span className="text-muted-foreground">/hr</span>
        </>
    );
}
