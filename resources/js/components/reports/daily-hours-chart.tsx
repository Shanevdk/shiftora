import { useId, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { formatDate, formatMinutes } from '@/lib/time';
import { cn } from '@/lib/utils';

export type DailyHours = {
    date: string;
    worked_minutes: number;
    overtime_minutes: number;
    scheduled_minutes: number;
};

const MAX_X_LABELS = 8;

/**
 * Round a maximum up to a clean axis step (1, 2 or 5 × 10ⁿ hours) for roughly four gridlines.
 */
function niceStep(maxHours: number): number {
    const rough = Math.max(maxHours, 1) / 4;
    const magnitude = 10 ** Math.floor(Math.log10(rough));
    const normalized = rough / magnitude;
    const factor =
        normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;

    return factor * magnitude;
}

function formatAxisHours(hours: number): string {
    return `${Number.isInteger(hours) ? hours : hours.toFixed(1)}h`;
}

/**
 * Worked hours per day as columns, with the scheduled hours drawn as a target tick across each column.
 * Hover, focus + arrow keys reveal the day's values; the same data is available as a table.
 */
export default function DailyHoursChart({ days }: { days: DailyHours[] }) {
    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    const descriptionId = useId();

    const maxHours =
        Math.max(
            0,
            ...days.map((day) =>
                Math.max(day.worked_minutes, day.scheduled_minutes),
            ),
        ) / 60;
    const step = niceStep(maxHours);
    const top = Math.max(step, Math.ceil(maxHours / step) * step);
    const ticks = Array.from(
        { length: Math.round(top / step) + 1 },
        (_, index) => index * step,
    );
    const labelEvery = Math.ceil(days.length / MAX_X_LABELS);
    const isShortRange = days.length <= 7;
    const percentOf = (minutes: number): number =>
        Math.min(100, (minutes / 60 / top) * 100);

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
        <div className="flex flex-col gap-3">
            <div
                className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground"
                aria-hidden="true"
            >
                <span className="inline-flex items-center gap-1.5">
                    <span
                        className="size-2.5 rounded-[2px]"
                        style={{ backgroundColor: 'var(--chart-1)' }}
                    />
                    Worked
                </span>
                <span className="inline-flex items-center gap-1.5">
                    <span
                        className="h-0.5 w-3.5 rounded-full"
                        style={{ backgroundColor: 'var(--chart-5)' }}
                    />
                    Scheduled
                </span>
            </div>

            <div className="flex gap-2">
                <div
                    className="relative w-9 shrink-0 text-right text-[11px] text-muted-foreground tabular"
                    aria-hidden="true"
                >
                    {ticks.map((tick) => (
                        <span
                            key={tick}
                            className="absolute right-0 translate-y-1/2 leading-none"
                            style={{ bottom: `${(tick / top) * 100}%` }}
                        >
                            {formatAxisHours(tick)}
                        </span>
                    ))}
                </div>

                <div className="min-w-0 flex-1">
                    <div
                        role="group"
                        tabIndex={0}
                        aria-label="Daily worked and scheduled hours"
                        aria-describedby={descriptionId}
                        onKeyDown={handleKeyDown}
                        onFocus={() => setActiveIndex((index) => index ?? 0)}
                        onBlur={() => setActiveIndex(null)}
                        onPointerLeave={() => setActiveIndex(null)}
                        className="relative h-56 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                    >
                        <span id={descriptionId} className="sr-only">
                            Use the left and right arrow keys to read each day.
                            The same values are available in the table view.
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
                                    {day.worked_minutes > 0 && (
                                        <div
                                            className="w-[70%] max-w-6 rounded-t-[4px]"
                                            style={{
                                                height: `${percentOf(day.worked_minutes)}%`,
                                                backgroundColor:
                                                    'var(--chart-1)',
                                            }}
                                        />
                                    )}
                                    {day.scheduled_minutes > 0 && (
                                        <div
                                            className="absolute left-1/2 h-0.5 w-[90%] max-w-8 -translate-x-1/2 translate-y-1/2 rounded-full"
                                            style={{
                                                bottom: `${percentOf(day.scheduled_minutes)}%`,
                                                backgroundColor:
                                                    'var(--chart-5)',
                                                boxShadow:
                                                    '0 0 0 2px var(--card)',
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
                                `${formatDate(active.date)}: ${formatMinutes(active.worked_minutes)} worked, ${formatMinutes(active.scheduled_minutes)} scheduled, ${formatMinutes(active.overtime_minutes)} overtime.`}
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
                                    (isShortRange
                                        ? formatDate(day.date, {
                                              weekday: 'short',
                                              day: 'numeric',
                                          })
                                        : formatDate(day.date, {
                                              month: 'short',
                                              day: 'numeric',
                                          }))}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function ChartTooltip({
    day,
    position,
}: {
    day: DailyHours;
    position: number;
}) {
    const translate = position < 0.2 ? '0%' : position > 0.8 ? '-100%' : '-50%';

    return (
        <div
            className="pointer-events-none absolute top-0 z-10 min-w-40 rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md"
            style={{
                left: `${position * 100}%`,
                transform: `translateX(${translate})`,
            }}
            aria-hidden="true"
        >
            <p className="mb-1.5 text-muted-foreground">
                {formatDate(day.date, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                })}
            </p>
            <div className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1">
                <TooltipRow
                    label="Worked"
                    value={formatMinutes(day.worked_minutes)}
                    keyClassName="h-0.5 w-3"
                    color="var(--chart-1)"
                />
                <TooltipRow
                    label="Scheduled"
                    value={formatMinutes(day.scheduled_minutes)}
                    keyClassName="h-0.5 w-3"
                    color="var(--chart-5)"
                />
                {day.overtime_minutes > 0 && (
                    <>
                        <span className="font-semibold tabular">
                            {formatMinutes(day.overtime_minutes)}
                        </span>
                        <span className="text-muted-foreground">
                            of overtime
                        </span>
                    </>
                )}
            </div>
        </div>
    );
}

function TooltipRow({
    label,
    value,
    keyClassName,
    color,
}: {
    label: string;
    value: string;
    keyClassName: string;
    color: string;
}) {
    return (
        <>
            <span className="font-semibold tabular">{value}</span>
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <span
                    className={cn('rounded-full', keyClassName)}
                    style={{ backgroundColor: color }}
                />
                {label}
            </span>
        </>
    );
}
