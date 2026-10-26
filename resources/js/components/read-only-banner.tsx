import { Link } from '@inertiajs/react';
import { ArrowRight } from 'lucide-react';
import { useWorkspace } from '@/hooks/use-workspace';
import { show as continueWithShiftora } from '@/routes/continue';

/**
 * Explains a lapsed workspace: everything is still there to look at, and continuing brings it back.
 */
export function ReadOnlyBanner() {
    const { can, subscription } = useWorkspace();

    if (subscription?.status !== 'inactive') {
        return null;
    }

    return (
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-warning/30 bg-warning/15 px-4 py-2 text-center text-sm">
            <span>
                Your workspace is read-only. Everything you've set up is still
                here.
            </span>
            {can('manageBilling') ? (
                <Link
                    href={continueWithShiftora()}
                    className="inline-flex items-center gap-1 font-medium underline-offset-4 hover:underline"
                >
                    Continue with Shiftora
                    <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
            ) : (
                <span className="text-muted-foreground">
                    Ask your account owner to continue.
                </span>
            )}
        </div>
    );
}
