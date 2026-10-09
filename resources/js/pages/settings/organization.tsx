import { Form, Head } from '@inertiajs/react';
import { Building2, ImageUp, Trash2 } from 'lucide-react';
import { useState } from 'react';
import OrganizationController from '@/actions/App/Http/Controllers/Settings/OrganizationController';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import UpgradeCallout from '@/components/upgrade-callout';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { edit } from '@/routes/organization';

type Props = {
    settings: {
        name: string;
        timezone: string;
        week_starts_on: number;
        daily_overtime_hours: number | null;
        weekly_overtime_hours: number | null;
        geofencing_enabled: boolean;
        logo_url: string | null;
    };
    features: {
        overtimeRules: boolean;
        geofencing: boolean;
    };
    payWeekFixed: boolean;
};

const weekdays = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
];

function timeZoneOptions(current: string): string[] {
    const zones = Intl.supportedValuesOf('timeZone');

    return zones.includes(current) ? zones : [current, ...zones];
}

export default function OrganizationSettings({
    settings,
    features,
    payWeekFixed,
}: Props) {
    const [timezone, setTimezone] = useState(settings.timezone);
    const [weekStartsOn, setWeekStartsOn] = useState(
        String(settings.week_starts_on),
    );
    const [geofencingEnabled, setGeofencingEnabled] = useState(
        settings.geofencing_enabled,
    );
    const [timeZones] = useState(() => timeZoneOptions(settings.timezone));

    return (
        <>
            <Head title="Organization settings" />

            <h1 className="sr-only">Organization settings</h1>

            <Form
                {...OrganizationController.update.form()}
                options={{ preserveScroll: true }}
                className="space-y-12"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="space-y-6">
                            <Heading
                                variant="small"
                                title="General"
                                description="Your organization's name, timezone and pay week"
                            />

                            <div className="grid gap-2">
                                <Label htmlFor="name">Organization name</Label>
                                <Input
                                    id="name"
                                    name="name"
                                    defaultValue={settings.name}
                                    required
                                    maxLength={255}
                                    autoComplete="organization"
                                />
                                <InputError message={errors.name} />
                            </div>

                            <div className="grid gap-6 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="timezone">Timezone</Label>
                                    <input
                                        type="hidden"
                                        name="timezone"
                                        value={timezone}
                                    />
                                    <Select
                                        value={timezone}
                                        onValueChange={setTimezone}
                                        disabled={payWeekFixed}
                                    >
                                        <SelectTrigger
                                            id="timezone"
                                            className="w-full"
                                        >
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-72">
                                            {timeZones.map((zone) => (
                                                <SelectItem
                                                    key={zone}
                                                    value={zone}
                                                >
                                                    {zone.replaceAll('_', ' ')}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">
                                        Every time in Shiftora is shown in this
                                        timezone.
                                    </p>
                                    <InputError message={errors.timezone} />
                                </div>

                                <div className="grid content-start gap-2">
                                    <Label htmlFor="week_starts_on">
                                        Week starts on
                                    </Label>
                                    <input
                                        type="hidden"
                                        name="week_starts_on"
                                        value={weekStartsOn}
                                    />
                                    <Select
                                        value={weekStartsOn}
                                        onValueChange={setWeekStartsOn}
                                        disabled={payWeekFixed}
                                    >
                                        <SelectTrigger
                                            id="week_starts_on"
                                            className="w-full"
                                        >
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {weekdays.map((day, index) => (
                                                <SelectItem
                                                    key={day}
                                                    value={String(index)}
                                                >
                                                    {day}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">
                                        Schedules, timesheets and weekly
                                        overtime use this week.
                                    </p>
                                    <InputError
                                        message={errors.week_starts_on}
                                    />
                                </div>
                            </div>

                            {payWeekFixed && (
                                <p className="text-sm text-muted-foreground">
                                    The timezone and first day of the week are
                                    locked because timesheets have already been
                                    submitted for these pay weeks.
                                </p>
                            )}
                        </div>

                        <div className="space-y-6">
                            <Heading
                                variant="small"
                                title="Overtime rules"
                                description="Hours worked past these thresholds are counted as overtime on timesheets and reports. Leave blank for no limit."
                            />

                            {!features.overtimeRules && (
                                <UpgradeCallout
                                    feature="Overtime rules"
                                    plan="Professional"
                                    description="Track daily and weekly overtime automatically on every timesheet."
                                />
                            )}

                            <div className="grid gap-6 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="daily_overtime_hours">
                                        Daily overtime after
                                    </Label>
                                    <div className="relative">
                                        <Input
                                            id="daily_overtime_hours"
                                            name="daily_overtime_hours"
                                            type="number"
                                            inputMode="decimal"
                                            min={1}
                                            max={24}
                                            step="0.25"
                                            className="pr-14 tabular"
                                            defaultValue={
                                                settings.daily_overtime_hours ??
                                                ''
                                            }
                                            placeholder="e.g. 8"
                                            disabled={!features.overtimeRules}
                                        />
                                        <span
                                            className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground"
                                            aria-hidden="true"
                                        >
                                            hours
                                        </span>
                                    </div>
                                    <InputError
                                        message={errors.daily_overtime_hours}
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="weekly_overtime_hours">
                                        Weekly overtime after
                                    </Label>
                                    <div className="relative">
                                        <Input
                                            id="weekly_overtime_hours"
                                            name="weekly_overtime_hours"
                                            type="number"
                                            inputMode="decimal"
                                            min={1}
                                            max={168}
                                            step="0.25"
                                            className="pr-14 tabular"
                                            defaultValue={
                                                settings.weekly_overtime_hours ??
                                                ''
                                            }
                                            placeholder="e.g. 40"
                                            disabled={!features.overtimeRules}
                                        />
                                        <span
                                            className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground"
                                            aria-hidden="true"
                                        >
                                            hours
                                        </span>
                                    </div>
                                    <InputError
                                        message={errors.weekly_overtime_hours}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <Heading
                                variant="small"
                                title="Geofenced clock-in"
                                description="Only let people clock in when they're on site"
                            />

                            {!features.geofencing && (
                                <UpgradeCallout
                                    feature="Geofenced clock-in"
                                    plan="Business"
                                    description="Make sure people are at work when they clock in."
                                />
                            )}

                            <div className="flex items-start gap-3">
                                {features.geofencing && (
                                    <input
                                        type="hidden"
                                        name="geofencing_enabled"
                                        value={geofencingEnabled ? '1' : '0'}
                                    />
                                )}
                                <Checkbox
                                    id="geofencing_enabled"
                                    checked={
                                        features.geofencing && geofencingEnabled
                                    }
                                    onCheckedChange={(checked) =>
                                        setGeofencingEnabled(checked === true)
                                    }
                                    disabled={!features.geofencing}
                                    className="mt-0.5"
                                />
                                <div className="grid gap-1">
                                    <Label htmlFor="geofencing_enabled">
                                        Require people to be at a location to
                                        clock in
                                    </Label>
                                    <p className="text-sm text-muted-foreground">
                                        Shiftora checks the device's position
                                        against each location's coordinates and
                                        radius, set on the Locations page.
                                        Locations without coordinates aren't
                                        restricted.
                                    </p>
                                    <InputError
                                        message={errors.geofencing_enabled}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <Button type="submit" disabled={processing}>
                                {processing && <Spinner />}
                                Save
                            </Button>
                        </div>
                    </>
                )}
            </Form>

            <LogoSection logoUrl={settings.logo_url} name={settings.name} />
        </>
    );
}

OrganizationSettings.layout = {
    breadcrumbs: [
        {
            title: 'Organization settings',
            href: edit(),
        },
    ],
};

function LogoSection({
    logoUrl,
    name,
}: {
    logoUrl: string | null;
    name: string;
}) {
    return (
        <div className="space-y-6">
            <Heading
                variant="small"
                title="Logo"
                description="Shown in the sidebar for everyone in your organization. PNG, JPG or WebP, up to 2 MB."
            />

            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted/40">
                    {logoUrl ? (
                        <img
                            src={logoUrl}
                            alt={`${name} logo`}
                            className="size-full object-contain"
                        />
                    ) : (
                        <Building2
                            className="size-8 text-muted-foreground"
                            aria-hidden="true"
                        />
                    )}
                </div>

                <div className="flex-1 space-y-3">
                    <Form
                        {...OrganizationController.updateLogo.form()}
                        options={{ preserveScroll: true }}
                        resetOnSuccess
                        className="space-y-3"
                    >
                        {({ processing, progress, errors }) => (
                            <>
                                <div className="grid gap-2">
                                    <Label htmlFor="logo">
                                        {logoUrl
                                            ? 'Replace logo'
                                            : 'Upload a logo'}
                                    </Label>
                                    <Input
                                        id="logo"
                                        name="logo"
                                        type="file"
                                        accept="image/png,image/jpeg,image/webp"
                                        required
                                        className="cursor-pointer"
                                    />
                                    <InputError message={errors.logo} />
                                </div>

                                {progress && (
                                    <progress
                                        value={progress.percentage}
                                        max={100}
                                        className="h-1.5 w-full overflow-hidden rounded-full accent-primary"
                                    >
                                        {progress.percentage}%
                                    </progress>
                                )}

                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        type="submit"
                                        variant="outline"
                                        disabled={processing}
                                    >
                                        {processing ? (
                                            <Spinner />
                                        ) : (
                                            <ImageUp aria-hidden="true" />
                                        )}
                                        Upload
                                    </Button>
                                </div>
                            </>
                        )}
                    </Form>

                    {logoUrl && (
                        <Form
                            {...OrganizationController.destroyLogo.form()}
                            options={{ preserveScroll: true }}
                        >
                            {({ processing }) => (
                                <Button
                                    type="submit"
                                    variant="ghost"
                                    size="sm"
                                    className="text-destructive hover:text-destructive"
                                    disabled={processing}
                                >
                                    <Trash2 aria-hidden="true" />
                                    Remove logo
                                </Button>
                            )}
                        </Form>
                    )}
                </div>
            </div>
        </div>
    );
}
