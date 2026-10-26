import { Form, Link, usePage } from '@inertiajs/react';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useWorkspace } from '@/hooks/use-workspace';
import {
    show as comparePlans,
    store as continueWithPlan,
} from '@/routes/continue';
import { create as saveWorkspace } from '@/routes/save-workspace';

/**
 * The owner's way to keep going after the free trial: one click goes straight to checkout with the
 * plan that fits how they've used Shiftora. Hidden in the collapsed sidebar, where the header still
 * counts down the trial.
 */
export function ContinueCard() {
    const { can, subscription } = useWorkspace();
    const { auth } = usePage().props;
    const isLapsed = subscription?.status === 'inactive';
    const days = subscription?.trial_days_remaining ?? null;

    if (
        !can('manageBilling') ||
        auth.user?.is_demo ||
        (subscription?.status !== 'trial' && !isLapsed)
    ) {
        return null;
    }

    if (auth.user?.is_guest) {
        return (
            <div className="space-y-2 rounded-lg border border-sidebar-border bg-sidebar-accent/60 p-3 group-data-[collapsible=icon]:hidden">
                <p className="text-xs text-sidebar-foreground/80">
                    This workspace isn't saved yet. Unsaved workspaces are
                    deleted after a day.
                </p>
                <Button size="sm" className="w-full" asChild>
                    <Link href={saveWorkspace()}>
                        Save my workspace
                        <ArrowRight />
                    </Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-2 rounded-lg border border-sidebar-border bg-sidebar-accent/60 p-3 group-data-[collapsible=icon]:hidden">
            <p className="text-xs text-sidebar-foreground/80">
                {isLapsed
                    ? 'Your free trial has ended, so your workspace is read-only.'
                    : days === null || days === 0
                      ? 'Your free trial ends today.'
                      : `${days} ${days === 1 ? 'day' : 'days'} left in your free trial.`}
            </p>
            <Form {...continueWithPlan.form()}>
                {({ processing }) => (
                    <Button
                        type="submit"
                        size="sm"
                        className="w-full"
                        disabled={processing}
                    >
                        {processing && <Spinner />}
                        Continue
                        <ArrowRight />
                    </Button>
                )}
            </Form>
            <Link
                href={comparePlans()}
                className="block text-center text-xs text-sidebar-foreground/70 underline-offset-4 hover:text-sidebar-foreground hover:underline"
            >
                Compare plans
            </Link>
        </div>
    );
}
