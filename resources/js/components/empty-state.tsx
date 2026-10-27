import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * What a section shows before there's anything in it: what's missing, and what to do about it.
 */
export default function EmptyState({
    icon: Icon,
    title,
    description,
    action,
}: {
    icon: LucideIcon;
    title: string;
    description?: ReactNode;
    action?: ReactNode;
}) {
    return (
        <div className="flex flex-col gap-4 rounded-xl border border-dashed px-6 py-8 sm:flex-row sm:items-start sm:gap-5">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-dashed border-primary/40 text-primary">
                <Icon className="size-5" aria-hidden="true" />
            </div>
            <div className="space-y-1.5">
                <p className="font-display text-xl leading-tight">{title}</p>
                {description && (
                    <p className="max-w-md text-sm text-muted-foreground">
                        {description}
                    </p>
                )}
                {action && <div className="pt-2">{action}</div>}
            </div>
        </div>
    );
}
