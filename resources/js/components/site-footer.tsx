import { Link } from '@inertiajs/react';
import { cookies, privacy } from '@/routes/legal';

/**
 * The public-site footer, with links to the legal pages.
 */
export default function SiteFooter() {
    return (
        <footer className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between md:px-6">
            <p>© {new Date().getFullYear()} Shiftora</p>
            <nav aria-label="Legal" className="flex items-center gap-5">
                <Link href={privacy()} className="hover:text-foreground">
                    Privacy policy
                </Link>
                <Link href={cookies()} className="hover:text-foreground">
                    Cookie policy
                </Link>
            </nav>
            <p>Work smarter. Shift better.</p>
        </footer>
    );
}
