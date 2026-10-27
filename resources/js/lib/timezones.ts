export type TimeZoneChoice = {
    /** IANA timezone, e.g. "America/Toronto". */
    value: string;
    label: string;
};

/**
 * The timezones nearly every customer needs, Canada and the US first, rather than all 400-odd
 * IANA zones. Each stands in for its whole region (Toronto and New York keep the same clock).
 */
const commonTimeZones: TimeZoneChoice[] = [
    { value: 'America/St_Johns', label: "Newfoundland (St. John's)" },
    { value: 'America/Halifax', label: 'Atlantic (Halifax)' },
    { value: 'America/Toronto', label: 'Eastern (Toronto, New York)' },
    { value: 'America/Winnipeg', label: 'Central (Winnipeg, Chicago)' },
    { value: 'America/Regina', label: 'Saskatchewan (Regina)' },
    { value: 'America/Edmonton', label: 'Mountain (Edmonton, Denver)' },
    { value: 'America/Phoenix', label: 'Arizona (Phoenix)' },
    { value: 'America/Vancouver', label: 'Pacific (Vancouver, Los Angeles)' },
    { value: 'America/Whitehorse', label: 'Yukon (Whitehorse)' },
    { value: 'America/Anchorage', label: 'Alaska (Anchorage)' },
    { value: 'Pacific/Honolulu', label: 'Hawaii (Honolulu)' },
    { value: 'Europe/London', label: 'UK and Ireland (London)' },
    { value: 'Europe/Paris', label: 'Central Europe (Paris, Berlin)' },
    { value: 'Australia/Sydney', label: 'Eastern Australia (Sydney)' },
    { value: 'Pacific/Auckland', label: 'New Zealand (Auckland)' },
    { value: 'UTC', label: 'UTC' },
];

/**
 * The common timezones, with any others that must be offered (the browser's own, or the one
 * already saved) added at the top.
 */
export function timeZoneChoices(...include: string[]): TimeZoneChoice[] {
    const choices = [...commonTimeZones];

    for (const zone of include) {
        if (zone !== '' && !choices.some((choice) => choice.value === zone)) {
            choices.unshift({ value: zone, label: zone.replaceAll('_', ' ') });
        }
    }

    return choices;
}
