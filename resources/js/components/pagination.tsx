import { Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import type { Paginator } from '@/types';

/**
 * Previous / next links and a range summary for Laravel paginators.
 */
export default function Pagination<T>({
    paginator,
    noun = 'results',
}: {
    paginator: Paginator<T>;
    noun?: string;
}) {
    if (paginator.last_page <= 1) {
        return null;
    }

    return (
        <nav
            className="flex items-center justify-between gap-4 text-sm"
            aria-label="Pagination"
        >
            <p className="text-muted-foreground tabular">
                {paginator.from}–{paginator.to} of {paginator.total} {noun}
            </p>
            <div className="flex gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    disabled={!paginator.prev_page_url}
                    asChild={!!paginator.prev_page_url}
                >
                    {paginator.prev_page_url ? (
                        <Link href={paginator.prev_page_url} preserveScroll>
                            Previous
                        </Link>
                    ) : (
                        'Previous'
                    )}
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    disabled={!paginator.next_page_url}
                    asChild={!!paginator.next_page_url}
                >
                    {paginator.next_page_url ? (
                        <Link href={paginator.next_page_url} preserveScroll>
                            Next
                        </Link>
                    ) : (
                        'Next'
                    )}
                </Button>
            </div>
        </nav>
    );
}
