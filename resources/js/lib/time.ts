/**
 * Date, time and money formatting for Shiftora.
 *
 * The server sends UTC ISO timestamps and local `YYYY-MM-DD` dates. Every timestamp is
 * displayed in the organization's timezone (not the browser's), so a manager in another
 * city sees the same times as the people on site.
 */

/**
 * How far the server's clock is ahead of this device's, in milliseconds.
 *
 * Live timers compare server timestamps with "now", so a device clock that runs two minutes fast
 * would start a fresh clock-in at 0:02:00. The server stamps every full page load with its time,
 * and comparing that with when this device received the page gives the difference. A page shown
 * from the browser cache (back/forward) carries an old stamp, so it falls back to the device clock.
 */
const serverClockOffset = measureServerClockOffset();

function measureServerClockOffset(): number {
    if (typeof document === 'undefined') {
        return 0;
    }

    const serverTime = Number(
        document
            .querySelector('meta[name="server-time"]')
            ?.getAttribute('content'),
    );
    const [navigation] = performance.getEntriesByType(
        'navigation',
    ) as PerformanceNavigationTiming[];

    if (
        !serverTime ||
        navigation === undefined ||
        navigation.type === 'back_forward' ||
        navigation.transferSize === 0
    ) {
        return 0;
    }

    const receivedAt =
        Date.now() - (performance.now() - navigation.responseStart);
    const offset = serverTime - receivedAt;

    // A second or two is only the time the page took to arrive, not a wrong clock.
    return Math.abs(offset) < 5000 ? 0 : offset;
}

/** The current time by the server's clock, in milliseconds. Use it instead of `Date.now()`. */
export function serverNow(): number {
    return Date.now() + serverClockOffset;
}

/** "7h 30m", "45m" or "0m". */
export function formatMinutes(minutes: number): string {
    const safeMinutes = Math.max(0, Math.round(minutes));
    const hours = Math.floor(safeMinutes / 60);
    const remainder = safeMinutes % 60;

    if (hours === 0) {
        return `${remainder}m`;
    }

    return remainder === 0 ? `${hours}h` : `${hours}h ${remainder}m`;
}

/** Time worked from seconds: "45s" under a minute, otherwise whole minutes like "1h 5m". */
export function formatWorkedSeconds(seconds: number): string {
    const safeSeconds = Math.max(0, Math.floor(seconds));

    if (safeSeconds > 0 && safeSeconds < 60) {
        return `${safeSeconds}s`;
    }

    return formatMinutes(Math.floor(safeSeconds / 60));
}

/** Decimal hours with two places, e.g. "7.50". */
export function formatHours(minutes: number): string {
    return (minutes / 60).toFixed(2);
}

/** "9:05 AM" in the given timezone. */
export function formatTime(iso: string, timeZone: string): string {
    return new Intl.DateTimeFormat(undefined, {
        hour: 'numeric',
        minute: '2-digit',
        timeZone,
    }).format(new Date(iso));
}

/** "9:05 AM – 5:30 PM". */
export function formatTimeRange(
    startIso: string,
    endIso: string,
    timeZone: string,
): string {
    return `${formatTime(startIso, timeZone)} – ${formatTime(endIso, timeZone)}`;
}

/** "Mon, Oct 6" for an ISO timestamp, in the given timezone. */
export function formatDateTimeDay(
    iso: string,
    timeZone: string,
    options: Intl.DateTimeFormatOptions = {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
    },
): string {
    return new Intl.DateTimeFormat(undefined, { ...options, timeZone }).format(
        new Date(iso),
    );
}

/** "Oct 6, 2026, 9:05 AM". */
export function formatDateTime(iso: string, timeZone: string): string {
    return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZone,
    }).format(new Date(iso));
}

/**
 * Format a local `YYYY-MM-DD` date. Dates carry no timezone, so they are formatted as UTC noon
 * to avoid shifting to the previous or next day.
 */
export function formatDate(
    date: string,
    options: Intl.DateTimeFormatOptions = {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
    },
): string {
    return new Intl.DateTimeFormat(undefined, {
        ...options,
        timeZone: 'UTC',
    }).format(new Date(`${date}T12:00:00Z`));
}

/** "Oct 6 – 12, 2026" for a week starting on the given local date. */
export function formatWeekRange(weekStart: string): string {
    const end = addDays(weekStart, 6);

    return `${formatDate(weekStart, { month: 'short', day: 'numeric' })} – ${formatDate(end, { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

/** Add days to a local `YYYY-MM-DD` date. */
export function addDays(date: string, days: number): string {
    const value = new Date(`${date}T12:00:00Z`);
    value.setUTCDate(value.getUTCDate() + days);

    return value.toISOString().slice(0, 10);
}

/** Parts of an ISO timestamp as seen in the given timezone. */
function zonedParts(iso: string, timeZone: string): Record<string, string> {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
    }).formatToParts(new Date(iso));

    return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

/** The local `YYYY-MM-DD` date of a timestamp in the given timezone. */
export function localDate(iso: string, timeZone: string): string {
    const parts = zonedParts(iso, timeZone);

    return `${parts.year}-${parts.month}-${parts.day}`;
}

/** The local `HH:mm` time of a timestamp in the given timezone. */
export function localTime(iso: string, timeZone: string): string {
    const parts = zonedParts(iso, timeZone);

    return `${parts.hour}:${parts.minute}`;
}

/** Value for an `<input type="datetime-local">`, e.g. "2026-10-06T09:05". */
export function toDateTimeLocalInput(iso: string, timeZone: string): string {
    return `${localDate(iso, timeZone)}T${localTime(iso, timeZone)}`;
}

/** Today's local `YYYY-MM-DD` date in the given timezone. */
export function today(timeZone: string): string {
    return localDate(new Date(serverNow()).toISOString(), timeZone);
}

/** Whole minutes elapsed since the timestamp. */
export function minutesSince(
    iso: string,
    now: Date = new Date(serverNow()),
): number {
    return Math.max(
        0,
        Math.floor((now.getTime() - new Date(iso).getTime()) / 60000),
    );
}

/** "$1,234.50" from cents. */
export function formatCurrency(cents: number, currency = 'USD'): string {
    return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency,
    }).format(cents / 100);
}

/** A Shiftora plan price with its currency spelled out: "$7 CAD", "$84.50 CAD". */
export function formatPrice(cents: number, currency: string): string {
    const amount = new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency,
        currencyDisplay: 'narrowSymbol',
        minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    }).format(cents / 100);

    return `${amount} ${currency}`;
}

/** "3 minutes ago", "yesterday". */
export function formatRelative(
    iso: string,
    now: Date = new Date(serverNow()),
): string {
    const seconds = Math.round(
        (new Date(iso).getTime() - now.getTime()) / 1000,
    );
    const formatter = new Intl.RelativeTimeFormat(undefined, {
        numeric: 'auto',
    });
    const units: [Intl.RelativeTimeFormatUnit, number][] = [
        ['year', 31536000],
        ['month', 2592000],
        ['week', 604800],
        ['day', 86400],
        ['hour', 3600],
        ['minute', 60],
    ];

    for (const [unit, size] of units) {
        if (Math.abs(seconds) >= size) {
            return formatter.format(Math.round(seconds / size), unit);
        }
    }

    return formatter.format(seconds, 'second');
}
