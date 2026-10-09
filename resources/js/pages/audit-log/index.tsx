import { Head, router } from '@inertiajs/react';
import { ArrowRight, History, Pencil, Plus, Trash2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import EmptyState from '@/components/empty-state';
import PageContainer from '@/components/page-container';
import PageHeader from '@/components/page-header';
import Pagination from '@/components/pagination';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useWorkspace } from '@/hooks/use-workspace';
import { formatDateTime, formatRelative } from '@/lib/time';
import { cn } from '@/lib/utils';
import { index } from '@/routes/audit-log';
import type { Paginator } from '@/types';

type AuditValues = Record<string, unknown> | null;

type AuditLogEntry = {
    id: number;
    event: string;
    subject_type: string;
    subject_id: number;
    user: string | null;
    old_values: AuditValues;
    new_values: AuditValues;
    ip_address: string | null;
    created_at: string;
};

type Props = {
    logs: Paginator<AuditLogEntry>;
    filters: { type: string | null };
    types: { value: string; label: string }[];
};

const ALL_TYPES = 'all';

const eventStyles: Record<
    string,
    { label: string; icon: LucideIcon; className: string }
> = {
    created: {
        label: 'Created',
        icon: Plus,
        className: 'border-success/30 bg-accent text-accent-foreground',
    },
    updated: {
        label: 'Updated',
        icon: Pencil,
        className: 'border-border bg-muted text-muted-foreground',
    },
    deleted: {
        label: 'Deleted',
        icon: Trash2,
        className:
            'border-destructive/30 bg-destructive/10 text-destructive dark:text-destructive-foreground',
    },
};

export default function AuditLogIndex({ logs, filters, types }: Props) {
    const { timeZone } = useWorkspace();

    const filterByType = (value: string): void => {
        router.get(
            index.url({
                query: value === ALL_TYPES ? {} : { type: value },
            }),
            {},
            { preserveScroll: true, preserveState: true },
        );
    };

    return (
        <>
            <Head title="Audit log" />

            <PageContainer>
                <PageHeader
                    title="Audit log"
                    description="Every change to time entries, timesheets, shifts and employees, newest first."
                    actions={
                        <div className="flex items-center gap-2">
                            <Label
                                htmlFor="audit-type"
                                className="text-sm text-muted-foreground"
                            >
                                Show
                            </Label>
                            <Select
                                value={filters.type ?? ALL_TYPES}
                                onValueChange={filterByType}
                            >
                                <SelectTrigger id="audit-type" className="w-44">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={ALL_TYPES}>
                                        All changes
                                    </SelectItem>
                                    {types.map((type) => (
                                        <SelectItem
                                            key={type.value}
                                            value={type.value}
                                        >
                                            {type.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    }
                />

                {logs.data.length === 0 ? (
                    <EmptyState
                        icon={History}
                        title="No changes recorded"
                        description={
                            filters.type
                                ? 'Nothing of this type has changed yet. Try showing all changes.'
                                : 'Edits to time entries, timesheets, shifts and employees will appear here.'
                        }
                    />
                ) : (
                    <ol className="divide-y rounded-xl border bg-card shadow-xs">
                        {logs.data.map((log) => (
                            <AuditLogItem
                                key={log.id}
                                log={log}
                                timeZone={timeZone}
                            />
                        ))}
                    </ol>
                )}

                <Pagination paginator={logs} noun="changes" />
            </PageContainer>
        </>
    );
}

function AuditLogItem({
    log,
    timeZone,
}: {
    log: AuditLogEntry;
    timeZone: string;
}) {
    const event = eventStyles[log.event] ?? {
        label: log.event,
        icon: History,
        className: 'border-border bg-muted text-muted-foreground',
    };
    const EventIcon = event.icon;
    const changes = diffValues(log.old_values, log.new_values);

    return (
        <li className="flex flex-col gap-3 px-4 py-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div className="flex flex-wrap items-center gap-2">
                    <span
                        className={cn(
                            'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium',
                            event.className,
                        )}
                    >
                        <EventIcon className="size-3" aria-hidden="true" />
                        {event.label}
                    </span>
                    <span className="font-medium">
                        {log.subject_type} #{log.subject_id}
                    </span>
                    <span className="text-sm text-muted-foreground">
                        by {log.user ?? 'System'}
                    </span>
                </div>
                <time
                    dateTime={log.created_at}
                    title={formatRelative(log.created_at)}
                    className="shrink-0 text-xs text-muted-foreground tabular"
                >
                    {formatDateTime(log.created_at, timeZone)}
                </time>
            </div>

            {changes.length > 0 && (
                <dl className="grid gap-x-4 gap-y-1.5 rounded-lg bg-muted/50 px-3 py-2 font-mono text-xs sm:grid-cols-[minmax(8rem,auto)_1fr]">
                    {changes.map((change) => (
                        <div key={change.key} className="contents">
                            <dt className="text-muted-foreground">
                                {change.key}
                            </dt>
                            <dd className="flex min-w-0 flex-wrap items-center gap-1.5 break-all">
                                {log.event !== 'created' && change.hasOld && (
                                    <ChangeValue
                                        value={change.oldValue}
                                        className={
                                            log.event === 'updated'
                                                ? 'text-muted-foreground line-through decoration-muted-foreground/50'
                                                : undefined
                                        }
                                    />
                                )}
                                {log.event === 'updated' &&
                                    change.hasOld &&
                                    change.hasNew && (
                                        <ArrowRight
                                            className="size-3 shrink-0 text-muted-foreground"
                                            aria-label="changed to"
                                        />
                                    )}
                                {log.event !== 'deleted' && change.hasNew && (
                                    <ChangeValue value={change.newValue} />
                                )}
                            </dd>
                        </div>
                    ))}
                </dl>
            )}

            {log.ip_address && (
                <p className="text-xs text-muted-foreground">
                    IP {log.ip_address}
                </p>
            )}
        </li>
    );
}

type Change = {
    key: string;
    oldValue: unknown;
    newValue: unknown;
    hasOld: boolean;
    hasNew: boolean;
};

/**
 * Pair up the old and new values of every attribute that appears in either side.
 */
function diffValues(oldValues: AuditValues, newValues: AuditValues): Change[] {
    const keys = Array.from(
        new Set([
            ...Object.keys(oldValues ?? {}),
            ...Object.keys(newValues ?? {}),
        ]),
    );

    return keys.map((key) => ({
        key,
        oldValue: oldValues?.[key],
        newValue: newValues?.[key],
        hasOld: oldValues !== null && key in oldValues,
        hasNew: newValues !== null && key in newValues,
    }));
}

function ChangeValue({
    value,
    className,
}: {
    value: unknown;
    className?: string;
}) {
    if (value === null || value === undefined || value === '') {
        return (
            <span className={cn('text-muted-foreground italic', className)}>
                empty
            </span>
        );
    }

    const text =
        typeof value === 'string' || typeof value === 'number'
            ? String(value)
            : JSON.stringify(value);

    return <span className={className}>{text}</span>;
}

AuditLogIndex.layout = {
    breadcrumbs: [{ title: 'Audit log', href: index() }],
};
