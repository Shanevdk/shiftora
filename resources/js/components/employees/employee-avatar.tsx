import { cn } from '@/lib/utils';

/**
 * Round initials badge tinted with the employee's colour.
 */
export default function EmployeeAvatar({
    firstName,
    lastName,
    color,
    className,
}: {
    firstName: string;
    lastName: string;
    color: string | null;
    className?: string;
}) {
    const initials =
        `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

    return (
        <span
            aria-hidden="true"
            className={cn(
                'flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                color ? 'text-white' : 'bg-muted text-muted-foreground',
                className,
            )}
            style={color ? { backgroundColor: color } : undefined}
        >
            {initials}
        </span>
    );
}
