import { Link, useHttp, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    Maximize2,
    Minimize2,
    Play,
    RotateCcw,
} from 'lucide-react';
import type { SyntheticEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import AppLogoIcon from '@/components/app-logo-icon';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import { store as startDemo } from '@/routes/demo';

/** Paths that mean the demo session is over (signed out or expired), so the launcher should come back. */
const signedOutPaths = ['/', '/login', '/register'];

/**
 * The real Shiftora app, embedded on the landing page.
 *
 * Launching creates a private, throwaway copy of the sample organization on the server and signs the
 * visitor in as its owner, so every screen and action is the genuine one with no account needed.
 * The frame can be expanded to full screen.
 */
export default function LiveDemo() {
    const { auth } = usePage().props;
    const isDemo = auth.user?.is_demo === true;
    const isCustomer = auth.user != null && !isDemo;

    const frameRef = useRef<HTMLDivElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);
    const [appUrl, setAppUrl] = useState<string | null>(
        isDemo ? dashboard().url : null,
    );
    const [frameKey, setFrameKey] = useState(0);
    const [launchError, setLaunchError] = useState<string | null>(null);
    const { post, processing } = useHttp<
        Record<string, never>,
        { url: string }
    >({});

    useEffect(() => {
        function syncNativeFullscreen(): void {
            const isActive = document.fullscreenElement === frameRef.current;

            setIsNativeFullscreen(isActive);

            if (!isActive) {
                setIsFullscreen(false);
            }
        }

        document.addEventListener('fullscreenchange', syncNativeFullscreen);

        return () =>
            document.removeEventListener(
                'fullscreenchange',
                syncNativeFullscreen,
            );
    }, []);

    useEffect(() => {
        if (!isFullscreen || isNativeFullscreen) {
            return;
        }

        // Browsers without the Fullscreen API (e.g. iPhone Safari) get a fixed overlay instead.
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        function closeOnEscape(event: KeyboardEvent): void {
            if (event.key === 'Escape') {
                setIsFullscreen(false);
            }
        }

        window.addEventListener('keydown', closeOnEscape);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', closeOnEscape);
        };
    }, [isFullscreen, isNativeFullscreen]);

    async function toggleFullscreen(): Promise<void> {
        if (isFullscreen) {
            if (document.fullscreenElement) {
                await document.exitFullscreen();
            }

            setIsFullscreen(false);

            return;
        }

        setIsFullscreen(true);

        try {
            await frameRef.current?.requestFullscreen?.();
        } catch {
            // Fall back to the CSS overlay already applied by isFullscreen.
        }
    }

    async function launch(): Promise<void> {
        setLaunchError(null);

        try {
            const response = await post(startDemo().url);

            setAppUrl(response.url);
            setFrameKey((key) => key + 1);
        } catch {
            setLaunchError(
                "We couldn't start the demo just now. Please wait a minute and try again.",
            );
        }
    }

    function handleFrameLoad(event: SyntheticEvent<HTMLIFrameElement>): void {
        const path = event.currentTarget.contentWindow?.location.pathname;

        if (path !== undefined && signedOutPaths.includes(path)) {
            setAppUrl(null);
        }
    }

    return (
        <div
            ref={frameRef}
            className={cn(
                'flex flex-col overflow-hidden rounded-2xl border bg-background shadow-xl',
                isFullscreen
                    ? 'fixed inset-0 z-50 rounded-none border-0'
                    : 'h-[44rem] max-h-[85vh]',
            )}
        >
            <div className="flex items-center gap-2 border-b bg-sidebar px-3 py-2 text-sidebar-foreground">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
                    <AppLogoIcon className="size-4" />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                    Shiftora live demo
                </span>
                {appUrl !== null && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={launch}
                        disabled={processing}
                        className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    >
                        {processing ? <Spinner /> : <RotateCcw />}
                        <span className="hidden sm:inline">Start over</span>
                    </Button>
                )}
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleFullscreen}
                    className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                >
                    {isFullscreen ? <Minimize2 /> : <Maximize2 />}
                    <span className="hidden sm:inline">
                        {isFullscreen ? 'Exit full screen' : 'Full screen'}
                    </span>
                </Button>
            </div>

            <div className="relative min-h-0 flex-1">
                {appUrl !== null ? (
                    <iframe
                        key={frameKey}
                        src={appUrl}
                        title="Shiftora live demo"
                        allow="geolocation; clipboard-write"
                        onLoad={handleFrameLoad}
                        className="size-full border-0 bg-background"
                    />
                ) : (
                    <div className="flex size-full flex-col items-center justify-center gap-6 overflow-y-auto p-6 text-center">
                        {isCustomer ? (
                            <>
                                <div className="max-w-md space-y-2">
                                    <h3 className="text-xl font-semibold">
                                        You're already signed in
                                    </h3>
                                    <p className="text-muted-foreground">
                                        The live demo is for visitors. Your own
                                        workspace is one click away.
                                    </p>
                                </div>
                                <Button size="lg" asChild>
                                    <Link href={dashboard()}>
                                        Open your dashboard
                                        <ArrowRight />
                                    </Link>
                                </Button>
                            </>
                        ) : (
                            <>
                                <div className="max-w-lg space-y-2">
                                    <h3 className="text-xl font-semibold">
                                        The real app, ready to explore
                                    </h3>
                                    <p className="text-muted-foreground">
                                        We'll set up a private copy of Northwind
                                        Coffee Co. with 11 staff, two locations
                                        and three weeks of schedules, time and
                                        timesheets. You're the owner, so every
                                        feature is unlocked.
                                    </p>
                                </div>
                                <Button
                                    size="lg"
                                    onClick={launch}
                                    disabled={processing}
                                >
                                    {processing ? <Spinner /> : <Play />}
                                    {processing
                                        ? 'Setting up your workspace…'
                                        : 'Launch the live demo'}
                                </Button>
                                {launchError !== null && (
                                    <p
                                        className="text-sm text-destructive"
                                        role="alert"
                                    >
                                        {launchError}
                                    </p>
                                )}
                                <p className="text-xs text-muted-foreground">
                                    No sign-up or login. Nothing you do is
                                    shared, and it resets after a day.
                                </p>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
