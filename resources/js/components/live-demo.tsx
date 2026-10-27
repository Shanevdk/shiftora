import { Link, router, useHttp, usePage } from '@inertiajs/react';
import { ArrowRight, Play } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import { store as startDemo } from '@/routes/demo';

/**
 * One big button into the real Shiftora app.
 *
 * Launching creates a private, throwaway copy of the sample organization on the server, signs the
 * visitor in as its owner and takes them straight to its dashboard, so every screen and action is the
 * genuine one with no account needed. Visitors already in a demo go back to it.
 */
export default function LiveDemo({ className }: { className?: string }) {
    const { auth } = usePage().props;
    const isDemo = auth.user?.is_demo === true;
    const [isLaunching, setIsLaunching] = useState(false);
    const [launchError, setLaunchError] = useState<string | null>(null);
    const { post } = useHttp<Record<string, never>, { url: string }>({});

    const buttonClassName = cn('h-14 px-8 text-lg', className);

    async function launch(): Promise<void> {
        setIsLaunching(true);
        setLaunchError(null);

        try {
            const response = await post(startDemo().url);

            router.visit(response.url);
        } catch {
            setIsLaunching(false);
            setLaunchError(
                "We couldn't start the demo just now. Please wait a minute and try again.",
            );
        }
    }

    if (isDemo) {
        return (
            <Button size="lg" className={buttonClassName} asChild>
                <Link href={dashboard()}>
                    Back to your demo
                    <ArrowRight className="size-5" />
                </Link>
            </Button>
        );
    }

    return (
        <div className="space-y-2">
            <Button
                size="lg"
                className={buttonClassName}
                onClick={launch}
                disabled={isLaunching}
            >
                {isLaunching ? (
                    <Spinner className="size-5" />
                ) : (
                    <Play className="size-5" />
                )}
                {isLaunching ? 'Brewing your demo…' : 'Try the live demo'}
            </Button>
            {launchError !== null && (
                <p className="text-sm text-destructive" role="alert">
                    {launchError}
                </p>
            )}
        </div>
    );
}
