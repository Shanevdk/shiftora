import { cn } from '@/lib/utils';
import type { TimesheetStatus } from '@/types';

const styles: Record<TimesheetStatus, string> = {
    open: 'border-border bg-muted text-muted-foreground',
    submitted: 'border-warning/30 bg-warning/10 text-warning dark:text-warning',
    approved: 'border-success/30 bg-accent text-accent-foreground',
    rejected:
        'border-destructive/30 bg-destructive/10 text-destructive dark:text-destructive-foreground',
};

const labels: Record<TimesheetStatus, string> = {
    open: 'Open',
    submitted: 'Awaiting approval',
    approved: 'Approved',
    rejected: 'Needs changes',
};

export default function TimesheetStatusBadge({
    status,
    className,
}: {
    status: TimesheetStatus;
    className?: string;
}) {
    return (
        <span
            className={cn(
                'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap',
                styles[status],
                className,
            )}
        >
            {labels[status]}
        </span>
    );
}
