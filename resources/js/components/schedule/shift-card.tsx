import type { DragEvent } from 'react';
import { formatTimeRange } from '@/lib/time';
import { cn } from '@/lib/utils';
import type { EmployeeSummary, Shift } from '@/types';

/**
 * Compact shift block used in the schedule grid and the mobile day list.
 * Renders as a button when it can be opened, and as a drag source when drag and drop is enabled.
 */
export default function ShiftCard({
    shift,
    employee,
    timeZone,
    showEmployeeName = false,
    showDraftMarker = false,
    isOwn = false,
    isDragging = false,
    onOpen,
    onDragStart,
    onDragEnd,
}: {
    shift: Shift;
    employee?: EmployeeSummary;
    timeZone: string;
    showEmployeeName?: boolean;
    showDraftMarker?: boolean;
    isOwn?: boolean;
    isDragging?: boolean;
    onOpen?: (shift: Shift) => void;
    onDragStart?: (event: DragEvent<HTMLElement>, shift: Shift) => void;
    onDragEnd?: () => void;
}) {
    const isDraft = showDraftMarker && !shift.is_published;
    const isOpenShift = shift.employee_id === null;
    const details = [shift.position, shift.location?.name].filter(Boolean);

    const content = (
        <>
            <span className="flex items-center justify-between gap-1">
                <span className="truncate font-medium tabular">
                    {formatTimeRange(shift.starts_at, shift.ends_at, timeZone)}
                </span>
                {isDraft && (
                    <span className="shrink-0 rounded-sm bg-warning/15 px-1 text-[10px] leading-4 font-medium text-warning">
                        Draft
                    </span>
                )}
            </span>
            {showEmployeeName && (
                <span className="truncate">
                    {isOpenShift
                        ? 'Open shift'
                        : (employee?.name ?? 'Unassigned')}
                    {isOwn && (
                        <span className="text-muted-foreground"> (you)</span>
                    )}
                </span>
            )}
            {details.length > 0 && (
                <span className="truncate text-muted-foreground">
                    {details.join(' · ')}
                </span>
            )}
        </>
    );

    const className = cn(
        'flex w-full min-w-0 flex-col gap-0.5 rounded-md border border-l-4 bg-card px-2 py-1.5 text-left text-xs shadow-xs transition',
        isOpenShift && 'border-dashed border-l-muted-foreground/50',
        isDraft && 'bg-card/60',
        isOwn && 'bg-accent/60',
        onDragStart && 'cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-40',
    );

    const style =
        !isOpenShift && employee?.color
            ? { borderLeftColor: employee.color }
            : undefined;

    const dragProps = onDragStart
        ? {
              draggable: true,
              onDragStart: (event: DragEvent<HTMLElement>) =>
                  onDragStart(event, shift),
              onDragEnd,
          }
        : {};

    if (onOpen) {
        // A div with button semantics, because Firefox will not start a native drag on a <button>.
        return (
            <div
                role="button"
                tabIndex={0}
                className={cn(
                    className,
                    'hover:bg-accent/60 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none',
                    !onDragStart && 'cursor-pointer',
                )}
                style={style}
                onClick={() => onOpen(shift)}
                onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onOpen(shift);
                    }
                }}
                {...dragProps}
            >
                {content}
            </div>
        );
    }

    return (
        <div className={className} style={style} {...dragProps}>
            {content}
        </div>
    );
}
