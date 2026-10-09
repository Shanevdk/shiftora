import type { Auth } from '@/types/auth';
import type {
    Membership,
    NotificationsState,
    OrganizationSummary,
    SubscriptionState,
} from '@/types/shiftora';

declare module 'react' {
    interface InputHTMLAttributes<T> {
        passwordrules?: string;
    }
}

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        sharedPageProps: {
            name: string;
            auth: Auth;
            sidebarOpen: boolean;
            organization: OrganizationSummary | null;
            membership: Membership | null;
            subscription: SubscriptionState | null;
            organizations: { id: number; name: string }[];
            notifications: NotificationsState | null;
            [key: string]: unknown;
        };
    }
}
