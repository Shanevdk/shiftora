import { cn } from '@/lib/utils';

/**
 * Marks a time entry (or a week containing one) that is still clocked in.
 */
export default function InProgressHint({ className }: { className?: string }) {
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap text-primary',
                className,
            )}
        >
            <span className="relative flex size-2" aria-hidden="true">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/50 motion-reduce:animate-none" />
                <span className="relative inline-flex size-2 rounded-full bg-primary" />
            </span>
            In progress
        </span>
    );
}
