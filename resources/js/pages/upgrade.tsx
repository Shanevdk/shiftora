import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Lock, Sparkles } from 'lucide-react';
import PageContainer from '@/components/page-container';
import { Button } from '@/components/ui/button';
import { useWorkspace } from '@/hooks/use-workspace';
import { dashboard } from '@/routes';
import { edit as billing } from '@/routes/billing';

export default function Upgrade({
    feature,
    requiredPlan,
}: {
    feature: string;
    requiredPlan: string;
}) {
    const { can, subscription } = useWorkspace();
    const canManageBilling = can('manageBilling');

    return (
        <>
            <Head title={`${feature} needs an upgrade`} />
            <PageContainer className="items-center justify-center py-12">
                <div className="flex w-full max-w-md flex-col items-center gap-6 rounded-xl border bg-card px-6 py-10 text-center shadow-xs sm:px-10">
                    <div className="flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
                        <Lock className="size-5" aria-hidden="true" />
                    </div>

                    <div className="space-y-2">
                        <h1 className="text-xl font-semibold tracking-tight">
                            {feature} isn't on your plan yet
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {feature} is included with the{' '}
                            <span className="font-medium text-foreground">
                                {requiredPlan}
                            </span>{' '}
                            plan and above
                            {subscription?.plan_name
                                ? `. You're currently on ${subscription.plan_name}.`
                                : '.'}
                        </p>
                    </div>

                    {canManageBilling ? (
                        <div className="flex w-full flex-col gap-2">
                            <Button size="lg" className="w-full" asChild>
                                <Link href={billing()}>
                                    <Sparkles />
                                    Upgrade to {requiredPlan}
                                </Link>
                            </Button>
                        </div>
                    ) : (
                        <p className="rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
                            Only your account owner can change the plan. Ask
                            them to upgrade to {requiredPlan} to unlock it.
                        </p>
                    )}

                    <Button variant="ghost" size="sm" asChild>
                        <Link href={dashboard()}>
                            <ArrowLeft />
                            Back to dashboard
                        </Link>
                    </Button>
                </div>
            </PageContainer>
        </>
    );
}
