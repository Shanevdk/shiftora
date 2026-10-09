import { useSyncExternalStore } from 'react';

export const COOKIE_NOTICE_STORAGE_KEY = 'cookie_notice_dismissed';

const listeners = new Set<() => void>();
let dismissedThisVisit = false;

const subscribe = (callback: () => void) => {
    listeners.add(callback);

    return () => listeners.delete(callback);
};

const readDismissed = (): boolean => {
    try {
        return (
            dismissedThisVisit ||
            localStorage.getItem(COOKIE_NOTICE_STORAGE_KEY) === '1'
        );
    } catch {
        // Storage can be blocked (private mode, strict settings).
        return dismissedThisVisit;
    }
};

export type UseCookieNoticeReturn = {
    readonly isDismissed: boolean;
    readonly dismiss: () => void;
};

/**
 * Tracks whether the visitor has acknowledged the cookie notice.
 */
export function useCookieNotice(): UseCookieNoticeReturn {
    const isDismissed = useSyncExternalStore(
        subscribe,
        readDismissed,
        // Never render the notice on the server, so it can't flash for visitors who dismissed it.
        () => true,
    );

    const dismiss = (): void => {
        dismissedThisVisit = true;

        try {
            localStorage.setItem(COOKIE_NOTICE_STORAGE_KEY, '1');
        } catch {
            // Without storage the notice will return on the next visit, which is acceptable.
        }

        listeners.forEach((listener) => listener());
    };

    return { isDismissed, dismiss } as const;
}
