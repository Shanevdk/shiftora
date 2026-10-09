import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Standard padding and vertical rhythm for workspace pages.
 */
export default function PageContainer({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <div
            className={cn(
                'mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-4 md:p-6',
                className,
            )}
        >
            {children}
        </div>
    );
}
