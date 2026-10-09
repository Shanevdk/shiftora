import { Check } from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { EmployeeDetail, LocationOption, Role } from '@/types';

export type RoleOption = {
    value: Role;
    label: string;
};

export type EmployeeFormOptions = {
    roles: RoleOption[];
    locations: LocationOption[];
    colors: string[];
};

const NO_LOCATION = 'none';

const colorNames: Record<string, string> = {
    '#2F6B4F': 'Forest',
    '#3B6E8F': 'Lake',
    '#8A5A44': 'Clay',
    '#6B5B95': 'Plum',
    '#B8860B': 'Gold',
    '#4A7C59': 'Moss',
    '#A0522D': 'Rust',
    '#5F6B7A': 'Slate',
};

/**
 * The fields shared by the create and edit employee forms. Render inside an Inertia `<Form>`.
 */
export default function EmployeeFormFields({
    employee,
    roles,
    locations,
    colors,
    errors,
}: EmployeeFormOptions & {
    employee?: EmployeeDetail;
    errors: Partial<Record<string, string>>;
}) {
    const defaultRole =
        employee?.role ??
        roles.find((role) => role.value === 'employee')?.value ??
        roles[0]?.value ??
        'employee';

    const [role, setRole] = useState<string>(defaultRole);
    const [locationId, setLocationId] = useState<string>(
        employee?.location_id
            ? String(employee.location_id)
            : locations.length === 1
              ? String(locations[0].id)
              : NO_LOCATION,
    );

    return (
        <div className="grid gap-6">
            <div className="grid gap-6 sm:grid-cols-2">
                <div className="grid gap-2">
                    <Label htmlFor="first_name">First name</Label>
                    <Input
                        id="first_name"
                        name="first_name"
                        defaultValue={employee?.first_name}
                        required
                        maxLength={100}
                        autoComplete="off"
                    />
                    <InputError message={errors.first_name} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="last_name">Last name</Label>
                    <Input
                        id="last_name"
                        name="last_name"
                        defaultValue={employee?.last_name}
                        required
                        maxLength={100}
                        autoComplete="off"
                    />
                    <InputError message={errors.last_name} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="email">Email address</Label>
                    <Input
                        id="email"
                        name="email"
                        type="email"
                        defaultValue={employee?.email ?? ''}
                        maxLength={255}
                        autoComplete="off"
                        placeholder="name@example.com"
                        aria-describedby="email-hint"
                    />
                    <p
                        id="email-hint"
                        className="text-xs text-muted-foreground"
                    >
                        Optional. Needed to invite them so they can clock in and
                        see their schedule.
                    </p>
                    <InputError message={errors.email} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        defaultValue={employee?.phone ?? ''}
                        maxLength={50}
                        autoComplete="off"
                        placeholder="Optional"
                    />
                    <InputError message={errors.phone} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="job_title">Job title</Label>
                    <Input
                        id="job_title"
                        name="job_title"
                        defaultValue={employee?.job_title ?? ''}
                        maxLength={100}
                        placeholder="e.g. Barista"
                    />
                    <InputError message={errors.job_title} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="hourly_rate">Hourly rate</Label>
                    <div className="relative">
                        <span
                            className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground"
                            aria-hidden="true"
                        >
                            $
                        </span>
                        <Input
                            id="hourly_rate"
                            name="hourly_rate"
                            type="number"
                            inputMode="decimal"
                            min={0}
                            max={10000}
                            step="0.01"
                            className="pl-7 tabular"
                            defaultValue={
                                employee?.hourly_rate_cents != null
                                    ? (
                                          employee.hourly_rate_cents / 100
                                      ).toFixed(2)
                                    : ''
                            }
                            placeholder="0.00"
                        />
                    </div>
                    <InputError message={errors.hourly_rate} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="role">Role</Label>
                    <input type="hidden" name="role" value={role} />
                    <Select
                        value={role}
                        onValueChange={setRole}
                        disabled={roles.length <= 1}
                    >
                        <SelectTrigger id="role" className="w-full">
                            <SelectValue placeholder="Choose a role" />
                        </SelectTrigger>
                        <SelectContent>
                            {roles.map((option) => (
                                <SelectItem
                                    key={option.value}
                                    value={option.value}
                                >
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <InputError message={errors.role} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="location_id">Location</Label>
                    <input
                        type="hidden"
                        name="location_id"
                        value={locationId === NO_LOCATION ? '' : locationId}
                    />
                    <Select value={locationId} onValueChange={setLocationId}>
                        <SelectTrigger id="location_id" className="w-full">
                            <SelectValue placeholder="No location" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={NO_LOCATION}>
                                No location
                            </SelectItem>
                            {locations.map((location) => (
                                <SelectItem
                                    key={location.id}
                                    value={String(location.id)}
                                >
                                    {location.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <InputError message={errors.location_id} />
                </div>
            </div>

            <fieldset className="grid gap-3">
                <legend className="mb-2 text-sm leading-none font-medium">
                    Color
                </legend>
                <p className="-mt-1 text-xs text-muted-foreground">
                    Used for their avatar and shifts on the schedule.
                    {!employee &&
                        ' Leave unselected to pick one automatically.'}
                </p>
                <div className="flex flex-wrap gap-3">
                    {colors.map((color, index) => (
                        <label key={color} className="relative cursor-pointer">
                            <input
                                type="radio"
                                name="color"
                                value={color}
                                defaultChecked={employee?.color === color}
                                className="peer sr-only"
                            />
                            <span
                                aria-hidden="true"
                                className="flex size-8 items-center justify-center rounded-full text-white ring-offset-2 ring-offset-background transition-shadow peer-checked:ring-2 peer-checked:ring-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-ring [&>svg]:hidden peer-checked:[&>svg]:block"
                                style={{ backgroundColor: color }}
                            >
                                <Check className="size-4" />
                            </span>
                            <span className="sr-only">
                                {colorNames[color] ?? `Color ${index + 1}`}
                            </span>
                        </label>
                    ))}
                </div>
                <InputError message={errors.color} />
            </fieldset>
        </div>
    );
}
