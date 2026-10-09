import { usePage } from '@inertiajs/react';
import type {
    FeatureKey,
    Membership,
    OrganizationSummary,
    Permissions,
    SubscriptionState,
} from '@/types';

export type Workspace = {
    organization: OrganizationSummary | null;
    membership: Membership | null;
    subscription: SubscriptionState | null;
    /** The organization's timezone; every timestamp is displayed in it. */
    timeZone: string;
    can: (permission: keyof Permissions) => boolean;
    hasFeature: (feature: FeatureKey) => boolean;
};

/**
 * The organization, role and plan entitlements shared with every page.
 * These flags only shape the UI; the server enforces every permission again.
 */
export function useWorkspace(): Workspace {
    const { organization, membership, subscription } = usePage().props;

    return {
        organization,
        membership,
        subscription,
        timeZone:
            organization?.timezone ??
            Intl.DateTimeFormat().resolvedOptions().timeZone,
        can: (permission) => membership?.can[permission] ?? false,
        hasFeature: (feature) =>
            subscription?.features.includes(feature) ?? false,
    };
}
