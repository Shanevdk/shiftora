import type { ReactNode } from 'react';

/**
 * Formats a policy's ISO "last updated" date for display.
 */
function formatPolicyDate(isoDate: string): string {
    return new Date(`${isoDate}T00:00:00`).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

/**
 * The page shell for a policy document: title, revision date and body copy.
 */
export function LegalDocument({
    title,
    lastUpdated,
    summary,
    children,
}: {
    title: string;
    lastUpdated: string;
    summary: ReactNode;
    children: ReactNode;
}) {
    return (
        <article className="mx-auto w-full max-w-3xl px-4 py-12 md:px-6 md:py-16">
            <header className="space-y-4 border-b pb-8">
                <p className="text-sm text-muted-foreground">
                    Last updated {formatPolicyDate(lastUpdated)}
                </p>
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                    {title}
                </h1>
                <div className="text-lg text-muted-foreground">{summary}</div>
            </header>
            <div className="space-y-10 pt-10 text-[15px] leading-relaxed [&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 [&_li]:pl-1 [&_p]:text-foreground/90 [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
                {children}
            </div>
        </article>
    );
}

/**
 * A numbered, linkable section within a policy document.
 */
export function LegalSection({
    id,
    title,
    children,
}: {
    id: string;
    title: string;
    children: ReactNode;
}) {
    return (
        <section id={id} className="scroll-mt-8 space-y-4">
            <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
            {children}
        </section>
    );
}
