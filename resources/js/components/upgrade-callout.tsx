import { Link } from '@inertiajs/react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWorkspace } from '@/hooks/use-workspace';
import { edit as billing } from '@/routes/billing';

/**
 * Inline prompt shown where a feature is not included in the organization's plan.
 */
export default function UpgradeCallout({
    feature,
    plan,
    description,
}: {
    feature: string;
    plan: string;
    description?: string;
}) {
    const { can } = useWorkspace();

    return (
        <div className="flex flex-col gap-3 rounded-xl border border-primary/20 bg-accent/60 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
                <Sparkles
                    className="mt-0.5 size-4 shrink-0 text-primary"
                    aria-hidden="true"
                />
                <div className="space-y-0.5 text-sm">
                    <p className="font-medium text-accent-foreground">
                        {feature} is available on the {plan} plan
                    </p>
                    {description && (
                        <p className="text-muted-foreground">{description}</p>
                    )}
                </div>
            </div>
            {can('manageBilling') ? (
                <Button size="sm" asChild>
                    <Link href={billing()}>Upgrade to {plan}</Link>
                </Button>
            ) : (
                <p className="text-xs text-muted-foreground">
                    Ask your account owner to upgrade.
                </p>
            )}
        </div>
    );
}
