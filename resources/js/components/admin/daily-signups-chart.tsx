import { useId, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { formatDate } from '@/lib/time';
import { cn } from '@/lib/utils';

export type DailySignups = {
    date: string;
    count: number;
};

const MAX_X_LABELS = 6;

/**
 * Round a maximum up to a whole-number axis step (1, 2 or 5 × 10ⁿ) for at most about four gridlines.
 */
function niceStep(max: number): number {
    const rough = Math.max(max, 1) / 4;
    const magnitude = 10 ** Math.floor(Math.log10(rough));
    const normalized = rough / magnitude;
    const factor =
        normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;

    return Math.max(1, factor * magnitude);
}

function signupLabel(count: number): string {
    return `${count} ${count === 1 ? 'signup' : 'signups'}`;
}

/**
 * New accounts per day as columns. Hover, or focus and use the arrow keys, to read each day.
 */
export default function DailySignupsChart({ days }: { days: DailySignups[] }) {
    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    const descriptionId = useId();

    const max = Math.max(0, ...days.map((day) => day.count));
    const step = niceStep(max);
    const top = Math.max(step, Math.ceil(max / step) * step);
    const ticks = Array.from(
        { length: Math.round(top / step) + 1 },
        (_, index) => index * step,
    );
    const labelEvery = Math.ceil(days.length / MAX_X_LABELS);
    const active = activeIndex === null ? null : days[activeIndex];

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
        const lastIndex = days.length - 1;
        const moves: Record<string, number> = {
            ArrowRight: Math.min(lastIndex, (activeIndex ?? -1) + 1),
            ArrowLeft: Math.max(0, (activeIndex ?? days.length) - 1),
            Home: 0,
            End: lastIndex,
        };

        if (event.key in moves) {
            event.preventDefault();
            setActiveIndex(moves[event.key]);
        } else if (event.key === 'Escape') {
            setActiveIndex(null);
        }
    };

    return (
        <div className="flex gap-2">
            <div
                className="relative w-6 shrink-0 text-right text-[11px] text-muted-foreground tabular"
                aria-hidden="true"
            >
                {ticks.map((tick) => (
                    <span
                        key={tick}
                        className="absolute right-0 translate-y-1/2 leading-none"
                        style={{ bottom: `${(tick / top) * 100}%` }}
                    >
                        {tick}
                    </span>
                ))}
            </div>

            <div className="min-w-0 flex-1">
                <div
                    role="group"
                    tabIndex={0}
                    aria-label="Signups per day"
                    aria-describedby={descriptionId}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setActiveIndex((index) => index ?? 0)}
                    onBlur={() => setActiveIndex(null)}
                    onPointerLeave={() => setActiveIndex(null)}
                    className="relative h-48 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                >
                    <span id={descriptionId} className="sr-only">
                        Use the left and right arrow keys to read each day. The
                        same values are available in the table view.
                    </span>

                    {ticks.map((tick) => (
                        <div
                            key={tick}
                            className={cn(
                                'pointer-events-none absolute inset-x-0 h-px',
                                tick === 0 ? 'bg-border' : 'bg-border/60',
                            )}
                            style={{ bottom: `${(tick / top) * 100}%` }}
                            aria-hidden="true"
                        />
                    ))}

                    <div className="absolute inset-0 flex gap-0.5">
                        {days.map((day, index) => (
                            <div
                                key={day.date}
                                className={cn(
                                    'relative flex flex-1 items-end justify-center rounded-t-sm transition-colors',
                                    activeIndex === index && 'bg-muted/70',
                                )}
                                onPointerEnter={() => setActiveIndex(index)}
                                aria-hidden="true"
                            >
                                {day.count > 0 && (
                                    <div
                                        className="w-[70%] max-w-6 rounded-t-[4px]"
                                        style={{
                                            height: `${(day.count / top) * 100}%`,
                                            backgroundColor: 'var(--chart-1)',
                                        }}
                                    />
                                )}
                            </div>
                        ))}
                    </div>

                    {active && activeIndex !== null && (
                        <ChartTooltip
                            day={active}
                            position={(activeIndex + 0.5) / days.length}
                        />
                    )}

                    <p className="sr-only" aria-live="polite">
                        {active &&
                            `${formatDate(active.date)}: ${signupLabel(active.count)}.`}
                    </p>
                </div>

                <div
                    className="mt-2 flex gap-0.5 text-[11px] text-muted-foreground"
                    aria-hidden="true"
                >
                    {days.map((day, index) => (
                        <div
                            key={day.date}
                            className="flex-1 overflow-visible text-center whitespace-nowrap"
                        >
                            {index % labelEvery === 0 &&
                                formatDate(day.date, {
                                    month: 'short',
                                    day: 'numeric',
                                })}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function ChartTooltip({
    day,
    position,
}: {
    day: DailySignups;
    position: number;
}) {
    const translate = position < 0.2 ? '0%' : position > 0.8 ? '-100%' : '-50%';

    return (
        <div
            className="pointer-events-none absolute top-0 z-10 rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md"
            style={{
                left: `${position * 100}%`,
                transform: `translateX(${translate})`,
            }}
            aria-hidden="true"
        >
            <p className="mb-1 text-muted-foreground">
                {formatDate(day.date, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                })}
            </p>
            <p className="font-semibold tabular">{signupLabel(day.count)}</p>
        </div>
    );
}
