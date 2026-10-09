import { Link } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatWeekRange } from '@/lib/time';

/**
 * Previous / this week / next controls for week-based pages.
 * `hrefForWeek` builds the URL for a given week start date.
 */
export default function WeekNavigator({
    weekStart,
    previousWeek,
    nextWeek,
    hrefForWeek,
    currentWeekHref,
}: {
    weekStart: string;
    previousWeek: string;
    nextWeek: string;
    hrefForWeek: (week: string) => string;
    currentWeekHref: string;
}) {
    return (
        <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" asChild>
                <Link
                    href={hrefForWeek(previousWeek)}
                    preserveScroll
                    aria-label="Previous week"
                >
                    <ChevronLeft />
                </Link>
            </Button>
            <div className="min-w-44 text-center text-sm font-medium tabular">
                {formatWeekRange(weekStart)}
            </div>
            <Button variant="outline" size="icon" asChild>
                <Link
                    href={hrefForWeek(nextWeek)}
                    preserveScroll
                    aria-label="Next week"
                >
                    <ChevronRight />
                </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
                <Link href={currentWeekHref} preserveScroll>
                    This week
                </Link>
            </Button>
        </div>
    );
}
