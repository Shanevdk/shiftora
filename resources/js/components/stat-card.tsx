import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * A single headline number with a label, used in KPI rows.
 */
export default function StatCard({
    label,
    value,
    hint,
    icon: Icon,
    className,
}: {
    label: string;
    value: ReactNode;
    hint?: ReactNode;
    icon?: LucideIcon;
    className?: string;
}) {
    return (
        <div
            className={cn(
                'flex flex-col gap-2 rounded-xl border bg-card p-4 shadow-xs',
                className,
            )}
        >
            <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
                <span>{label}</span>
                {Icon && <Icon className="size-4" aria-hidden="true" />}
            </div>
            <div className="text-2xl font-semibold tracking-tight tabular">
                {value}
            </div>
            {hint && (
                <div className="text-xs text-muted-foreground">{hint}</div>
            )}
        </div>
    );
}
