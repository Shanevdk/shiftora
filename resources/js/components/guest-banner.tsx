import { Link, usePage } from '@inertiajs/react';
import { ArrowRight } from 'lucide-react';
import { create as saveWorkspace } from '@/routes/save-workspace';

/**
 * Reminds a visitor that the workspace they're building isn't kept until they give it a login.
 */
export function GuestBanner() {
    const { auth } = usePage().props;

    if (!auth.user?.is_guest) {
        return null;
    }

    return (
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-panel px-4 py-2 text-center text-sm text-panel-foreground">
            <span>
                You're using Shiftora without an account. Save your workspace to
                keep it; unsaved ones are deleted after a day.
            </span>
            <Link
                href={saveWorkspace()}
                className="inline-flex items-center gap-1 font-medium text-panel-primary underline-offset-4 hover:underline"
            >
                Save my workspace
                <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
        </div>
    );
}
