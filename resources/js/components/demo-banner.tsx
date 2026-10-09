import { usePage } from '@inertiajs/react';
import { ArrowRight } from 'lucide-react';
import { destroy as leaveDemo } from '@/routes/demo';

/**
 * Reminds visitors in the public demo that they are using sample data, with a way out to sign up.
 * The link targets the top window so it also escapes the landing page's embedded demo frame.
 */
export function DemoBanner() {
    const { auth } = usePage().props;

    if (!auth.user?.is_demo) {
        return null;
    }

    return (
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-sidebar px-4 py-2 text-center text-sm text-sidebar-foreground">
            <span>
                You're exploring a live demo with sample data. It's private to
                you and resets after a day.
            </span>
            <a
                href={leaveDemo().url}
                target="_top"
                className="inline-flex items-center gap-1 font-medium text-sidebar-primary underline-offset-4 hover:underline"
            >
                Start your free trial
                <ArrowRight className="size-3.5" aria-hidden="true" />
            </a>
        </div>
    );
}
