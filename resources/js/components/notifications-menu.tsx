import { Link, router, usePage } from '@inertiajs/react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatRelative } from '@/lib/time';
import { cn } from '@/lib/utils';
import { read as markAllRead } from '@/routes/notifications';

export function NotificationsMenu() {
    const { notifications } = usePage().props;

    if (!notifications) {
        return null;
    }

    const unread = notifications.unread_count;

    return (
        <DropdownMenu
            onOpenChange={(open) => {
                if (!open && unread > 0) {
                    router.post(
                        markAllRead.url(),
                        {},
                        {
                            preserveScroll: true,
                            preserveState: true,
                            only: ['notifications'],
                        },
                    );
                }
            }}
        >
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative"
                    aria-label={
                        unread > 0
                            ? `Notifications (${unread} unread)`
                            : 'Notifications'
                    }
                >
                    <Bell />
                    {unread > 0 && (
                        <span className="absolute top-1.5 right-1.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-4 font-semibold text-primary-foreground tabular">
                            {unread > 9 ? '9+' : unread}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications.recent.length === 0 ? (
                    <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                        You're all caught up.
                    </p>
                ) : (
                    notifications.recent.map((notification) => (
                        <DropdownMenuItem
                            key={notification.id}
                            asChild={!!notification.url}
                            className="items-start"
                        >
                            {notification.url ? (
                                <Link href={notification.url}>
                                    <NotificationBody {...notification} />
                                </Link>
                            ) : (
                                <NotificationBody {...notification} />
                            )}
                        </DropdownMenuItem>
                    ))
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

function NotificationBody({
    title,
    body,
    read,
    created_at,
}: {
    title: string;
    body: string;
    read: boolean;
    created_at: string;
}) {
    return (
        <div className="flex w-full gap-2">
            <span
                className={cn(
                    'mt-1.5 size-2 shrink-0 rounded-full',
                    read ? 'bg-transparent' : 'bg-primary',
                )}
                aria-hidden="true"
            />
            <div className="min-w-0 space-y-0.5">
                <p className="text-sm font-medium">{title}</p>
                <p className="truncate text-xs text-muted-foreground">{body}</p>
                <p className="text-xs text-muted-foreground">
                    {formatRelative(created_at)}
                </p>
            </div>
        </div>
    );
}
