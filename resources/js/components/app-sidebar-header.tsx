import { Link } from '@inertiajs/react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { NotificationsMenu } from '@/components/notifications-menu';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useWorkspace } from '@/hooks/use-workspace';
import { edit as billing } from '@/routes/billing';
import type { BreadcrumbItem as BreadcrumbItemType } from '@/types';

export function AppSidebarHeader({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItemType[];
}) {
    const { subscription } = useWorkspace();

    return (
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-sidebar-border/50 px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-4">
            <div className="flex min-w-0 items-center gap-2">
                <SidebarTrigger className="-ml-1" />
                <Breadcrumbs breadcrumbs={breadcrumbs} />
            </div>
            <div className="ml-auto flex items-center gap-2">
                {subscription?.status === 'trial' &&
                    subscription.trial_days_remaining !== null && (
                        <Link
                            href={billing()}
                            className="hidden rounded-full border border-primary/25 bg-accent px-3 py-1 text-xs font-medium text-accent-foreground transition-colors hover:bg-accent/70 sm:inline-flex"
                        >
                            {subscription.trial_days_remaining === 1
                                ? '1 day'
                                : `${subscription.trial_days_remaining} days`}{' '}
                            left in your {subscription.plan_name} trial
                        </Link>
                    )}
                <NotificationsMenu />
            </div>
        </header>
    );
}
