import { Link, usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
import AppLogoIcon from '@/components/app-logo-icon';
import SiteFooter from '@/components/site-footer';
import { Button } from '@/components/ui/button';
import { dashboard, home, login } from '@/routes';

export default function LegalLayout({ children }: { children: ReactNode }) {
    const { auth } = usePage().props;

    return (
        <div className="flex min-h-screen flex-col bg-background text-foreground">
            <header className="border-b">
                <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 md:px-6">
                    <Link href={home()} className="flex items-center gap-2.5">
                        <span className="flex size-9 items-center justify-center rounded-lg bg-warm-white ring-1 ring-border">
                            <AppLogoIcon className="size-6" />
                        </span>
                        <span className="text-lg font-semibold tracking-tight">
                            Shiftora
                        </span>
                    </Link>
                    {auth.user ? (
                        <Button variant="outline" asChild>
                            <Link href={dashboard()}>Back to dashboard</Link>
                        </Button>
                    ) : (
                        <Button variant="ghost" asChild>
                            <Link href={login()}>Log in</Link>
                        </Button>
                    )}
                </div>
            </header>
            <main className="flex-1">{children}</main>
            <div className="border-t">
                <SiteFooter />
            </div>
        </div>
    );
}
