import { Link } from '@inertiajs/react';
import { ArrowRight } from 'lucide-react';
import { useWorkspace } from '@/hooks/use-workspace';
import { show as continueWithShiftora } from '@/routes/continue';
import { index as team } from '@/routes/employees';

/**
 * Explains a read-only workspace: it's on the free plan with more active people than the plan
 * covers. Everything is still there to look at; deactivating people or paying brings it back.
 */
export function ReadOnlyBanner() {
    const { can, subscription } = useWorkspace();

    if (subscription?.status !== 'inactive') {
        return null;
    }

    return (
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-warning/30 bg-warning/15 px-4 py-2 text-center text-sm">
            <span>
                Your workspace is read-only:{' '}
                {subscription.active_employee_count} people are active and the
                free plan covers {subscription.free_employee_limit}. Everything
                is still here.
            </span>
            {can('manageEmployees') && (
                <Link
                    href={team()}
                    className="font-medium underline-offset-4 hover:underline"
                >
                    Deactivate people
                </Link>
            )}
            {can('manageBilling') ? (
                <Link
                    href={continueWithShiftora()}
                    className="inline-flex items-center gap-1 font-medium underline-offset-4 hover:underline"
                >
                    Pick a paid plan
                    <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
            ) : (
                !can('manageEmployees') && (
                    <span className="text-muted-foreground">
                        Ask your account owner to sort out the plan.
                    </span>
                )
            )}
        </div>
    );
}
