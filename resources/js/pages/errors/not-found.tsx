import { Head, Link } from '@inertiajs/react';
import AppLogoIcon from '@/components/app-logo-icon';
import { Button } from '@/components/ui/button';
import { home } from '@/routes';

export default function NotFound() {
    return (
        <>
            <Head title="Page not found" />

            <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">
                <AppLogoIcon className="size-12" />

                <div className="space-y-2">
                    <p className="text-sm font-medium text-primary">404</p>
                    <h1 className="text-2xl font-semibold tracking-tight">
                        Page not found
                    </h1>
                    <p className="max-w-sm text-sm text-muted-foreground">
                        The page you're looking for doesn't exist or has been
                        moved.
                    </p>
                </div>

                <Button asChild>
                    <Link href={home()}>Back to home</Link>
                </Button>
            </div>
        </>
    );
}
