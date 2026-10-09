import { Link } from '@inertiajs/react';
import { Cookie } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCookieNotice } from '@/hooks/use-cookie-notice';
import { cookies } from '@/routes/legal';

/**
 * A one-time notice that Shiftora only uses essential and preference cookies.
 *
 * There are no optional cookies to accept or reject, so this informs rather than asks.
 */
export default function CookieNotice() {
    const { isDismissed, dismiss } = useCookieNotice();

    if (isDismissed) {
        return null;
    }

    return (
        <div
            role="region"
            aria-label="Cookie notice"
            className="fixed inset-x-4 bottom-4 z-50 rounded-xl border bg-card p-4 text-card-foreground shadow-lg sm:right-auto sm:max-w-sm"
        >
            <div className="flex gap-3">
                <Cookie
                    className="mt-0.5 size-5 shrink-0 text-primary"
                    aria-hidden="true"
                />
                <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                        Shiftora only uses cookies that keep you signed in and
                        remember your settings. No ads, no tracking.{' '}
                        <Link
                            href={cookies()}
                            className="font-medium text-foreground underline underline-offset-4"
                        >
                            Cookie policy
                        </Link>
                    </p>
                    <Button size="sm" onClick={dismiss}>
                        Got it
                    </Button>
                </div>
            </div>
        </div>
    );
}
