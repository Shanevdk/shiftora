import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'kiosk_install_tip_dismissed';

const listeners = new Set<() => void>();
let dismissedThisVisit = false;

const subscribe = (callback: () => void) => {
    listeners.add(callback);

    return () => listeners.delete(callback);
};

/** True once the kiosk was opened from the home screen, so it already runs like an app. */
const isInstalled = (): boolean =>
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && navigator.standalone === true);

const readHidden = (): boolean => {
    if (dismissedThisVisit || isInstalled()) {
        return true;
    }

    try {
        return localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
        // Storage can be blocked (private mode, strict settings).
        return false;
    }
};

export type UseKioskInstallTipReturn = {
    readonly isHidden: boolean;
    readonly dismiss: () => void;
};

/**
 * Tracks whether to show the "Add to Home Screen" tip on the kiosk.
 */
export function useKioskInstallTip(): UseKioskInstallTipReturn {
    const isHidden = useSyncExternalStore(
        subscribe,
        readHidden,
        // Never render the tip on the server, so it can't flash on an installed kiosk.
        () => true,
    );

    const dismiss = (): void => {
        dismissedThisVisit = true;

        try {
            localStorage.setItem(STORAGE_KEY, '1');
        } catch {
            // Without storage the tip returns on the next visit, which is acceptable.
        }

        listeners.forEach((listener) => listener());
    };

    return { isHidden, dismiss } as const;
}
