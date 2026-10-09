import { Form, Head } from '@inertiajs/react';
import { Crosshair, MapPin, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import LocationController from '@/actions/App/Http/Controllers/Settings/LocationController';
import EmptyState from '@/components/empty-state';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import UpgradeCallout from '@/components/upgrade-callout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { index } from '@/routes/locations';

type Location = {
    id: number;
    name: string;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
    geofence_radius_meters: number;
    employee_count: number;
};

type Props = {
    locations: Location[];
    limit: number | null;
    canAdd: boolean;
    geofencingAvailable: boolean;
};

export default function Locations({
    locations,
    limit,
    canAdd,
    geofencingAvailable,
}: Props) {
    return (
        <>
            <Head title="Locations" />

            <h1 className="sr-only">Locations</h1>

            <div className="space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <Heading
                        variant="small"
                        title="Locations"
                        description={
                            limit === null
                                ? 'The places your team works. Assign employees and shifts to a location.'
                                : `The places your team works. Your plan includes ${limit} ${limit === 1 ? 'location' : 'locations'}.`
                        }
                    />
                    {canAdd && (
                        <LocationDialog
                            geofencingAvailable={geofencingAvailable}
                            trigger={
                                <Button className="shrink-0">
                                    <Plus aria-hidden="true" />
                                    Add location
                                </Button>
                            }
                        />
                    )}
                </div>

                {!canAdd && (
                    <UpgradeCallout
                        feature="Multiple locations"
                        plan="Business"
                        description="Run several sites from one workspace, each with its own team and geofence."
                    />
                )}

                {locations.length === 0 ? (
                    <EmptyState
                        icon={MapPin}
                        title="No locations yet"
                        description="Add the place your team works so you can assign shifts and set up geofenced clock-in."
                    />
                ) : (
                    <ul className="divide-y rounded-xl border bg-card">
                        {locations.map((location) => (
                            <LocationRow
                                key={location.id}
                                location={location}
                                geofencingAvailable={geofencingAvailable}
                                canDelete={locations.length > 1}
                            />
                        ))}
                    </ul>
                )}
            </div>
        </>
    );
}

Locations.layout = {
    breadcrumbs: [
        {
            title: 'Locations',
            href: index(),
        },
    ],
};

function LocationRow({
    location,
    geofencingAvailable,
    canDelete,
}: {
    location: Location;
    geofencingAvailable: boolean;
    canDelete: boolean;
}) {
    const hasCoordinates =
        location.latitude !== null && location.longitude !== null;

    return (
        <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                    <MapPin className="size-4" aria-hidden="true" />
                </div>
                <div className="min-w-0 space-y-1">
                    <p className="font-medium">{location.name}</p>
                    <p className="text-sm text-muted-foreground">
                        {location.address ?? 'No address'}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                            <Users className="size-3.5" aria-hidden="true" />
                            <span className="tabular">
                                {location.employee_count}
                            </span>{' '}
                            active{' '}
                            {location.employee_count === 1
                                ? 'employee'
                                : 'employees'}
                        </span>
                        {hasCoordinates ? (
                            <span className="inline-flex items-center gap-1">
                                <Crosshair
                                    className="size-3.5"
                                    aria-hidden="true"
                                />
                                <span className="tabular">
                                    {location.latitude?.toFixed(5)},{' '}
                                    {location.longitude?.toFixed(5)}
                                </span>
                                {geofencingAvailable && (
                                    <Badge variant="outline" className="ml-1">
                                        {location.geofence_radius_meters} m
                                        geofence
                                    </Badge>
                                )}
                            </span>
                        ) : (
                            <span>No coordinates</span>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex shrink-0 gap-2 pl-12 sm:pl-0">
                <LocationDialog
                    location={location}
                    geofencingAvailable={geofencingAvailable}
                    trigger={
                        <Button variant="outline" size="sm">
                            <Pencil aria-hidden="true" />
                            Edit
                            <span className="sr-only"> {location.name}</span>
                        </Button>
                    }
                />
                {canDelete && <DeleteLocationDialog location={location} />}
            </div>
        </li>
    );
}

function LocationDialog({
    location,
    geofencingAvailable,
    trigger,
}: {
    location?: Location;
    geofencingAvailable: boolean;
    trigger: ReactNode;
}) {
    const [open, setOpen] = useState(false);
    const [latitude, setLatitude] = useState(
        location?.latitude?.toString() ?? '',
    );
    const [longitude, setLongitude] = useState(
        location?.longitude?.toString() ?? '',
    );
    const [locating, setLocating] = useState(false);
    const [locateError, setLocateError] = useState<string | null>(null);

    const formAction = location
        ? LocationController.update.form(location.id)
        : LocationController.store.form();
    const idPrefix = location ? `location-${location.id}` : 'location-new';

    const locateCurrentPosition = () => {
        if (!('geolocation' in navigator)) {
            setLocateError("This browser can't share its location.");

            return;
        }

        setLocating(true);
        setLocateError(null);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLatitude(position.coords.latitude.toFixed(7));
                setLongitude(position.coords.longitude.toFixed(7));
                setLocating(false);
            },
            (error) => {
                setLocateError(
                    error.code === error.PERMISSION_DENIED
                        ? 'Location access was blocked. Allow it in your browser, or enter the coordinates by hand.'
                        : "We couldn't find your location. Try again or enter the coordinates by hand.",
                );
                setLocating(false);
            },
            { enableHighAccuracy: true, timeout: 10000 },
        );
    };

    const handleOpenChange = (isOpen: boolean) => {
        setOpen(isOpen);

        if (isOpen) {
            setLatitude(location?.latitude?.toString() ?? '');
            setLongitude(location?.longitude?.toString() ?? '');
            setLocateError(null);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent className="max-h-[90svh] overflow-y-auto">
                <DialogTitle>
                    {location ? `Edit ${location.name}` : 'Add a location'}
                </DialogTitle>
                <DialogDescription>
                    {location
                        ? 'Update the name, address or geofence for this location.'
                        : 'Add a place where your team works.'}
                </DialogDescription>

                <Form
                    {...formAction}
                    options={{ preserveScroll: true }}
                    resetOnSuccess={!location}
                    onSuccess={() => setOpen(false)}
                    className="space-y-5"
                >
                    {({ processing, errors, clearErrors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor={`${idPrefix}-name`}>Name</Label>
                                <Input
                                    id={`${idPrefix}-name`}
                                    name="name"
                                    defaultValue={location?.name}
                                    required
                                    maxLength={100}
                                    placeholder="e.g. Downtown café"
                                />
                                <InputError message={errors.name} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor={`${idPrefix}-address`}>
                                    Address
                                </Label>
                                <Input
                                    id={`${idPrefix}-address`}
                                    name="address"
                                    defaultValue={location?.address ?? ''}
                                    maxLength={255}
                                    placeholder="Optional"
                                    autoComplete="street-address"
                                />
                                <InputError message={errors.address} />
                            </div>

                            <fieldset className="space-y-4 rounded-lg border p-4">
                                <legend className="px-1 text-sm font-medium">
                                    Geofence
                                </legend>
                                <p className="text-xs text-muted-foreground">
                                    {geofencingAvailable
                                        ? 'With geofenced clock-in turned on, people must be within this radius of the coordinates to clock in. Leave the coordinates blank to skip the check here.'
                                        : 'Coordinates are optional. Geofenced clock-in, which uses them, needs the Business plan.'}
                                </p>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label htmlFor={`${idPrefix}-latitude`}>
                                            Latitude
                                        </Label>
                                        <Input
                                            id={`${idPrefix}-latitude`}
                                            name="latitude"
                                            type="number"
                                            inputMode="decimal"
                                            step="any"
                                            min={-90}
                                            max={90}
                                            className="tabular"
                                            value={latitude}
                                            onChange={(event) =>
                                                setLatitude(event.target.value)
                                            }
                                            placeholder="e.g. 40.7128"
                                        />
                                        <InputError message={errors.latitude} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label
                                            htmlFor={`${idPrefix}-longitude`}
                                        >
                                            Longitude
                                        </Label>
                                        <Input
                                            id={`${idPrefix}-longitude`}
                                            name="longitude"
                                            type="number"
                                            inputMode="decimal"
                                            step="any"
                                            min={-180}
                                            max={180}
                                            className="tabular"
                                            value={longitude}
                                            onChange={(event) =>
                                                setLongitude(event.target.value)
                                            }
                                            placeholder="e.g. -74.0060"
                                        />
                                        <InputError
                                            message={errors.longitude}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            clearErrors(
                                                'latitude',
                                                'longitude',
                                            );
                                            locateCurrentPosition();
                                        }}
                                        disabled={locating}
                                    >
                                        {locating ? (
                                            <Spinner />
                                        ) : (
                                            <Crosshair aria-hidden="true" />
                                        )}
                                        Use my current location
                                    </Button>
                                    {locateError && (
                                        <p
                                            className="text-xs text-destructive"
                                            role="alert"
                                        >
                                            {locateError}
                                        </p>
                                    )}
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor={`${idPrefix}-radius`}>
                                        Radius
                                    </Label>
                                    <div className="relative sm:max-w-48">
                                        <Input
                                            id={`${idPrefix}-radius`}
                                            name="geofence_radius_meters"
                                            type="number"
                                            inputMode="numeric"
                                            min={25}
                                            max={5000}
                                            step={1}
                                            required
                                            className="pr-16 tabular"
                                            defaultValue={
                                                location?.geofence_radius_meters ??
                                                150
                                            }
                                        />
                                        <span
                                            className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground"
                                            aria-hidden="true"
                                        >
                                            meters
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Between 25 and 5,000 meters. 150 m suits
                                        most single buildings.
                                    </p>
                                    <InputError
                                        message={errors.geofence_radius_meters}
                                    />
                                </div>
                            </fieldset>

                            <DialogFooter className="gap-2">
                                <DialogClose asChild>
                                    <Button type="button" variant="secondary">
                                        Cancel
                                    </Button>
                                </DialogClose>
                                <Button type="submit" disabled={processing}>
                                    {processing && <Spinner />}
                                    {location
                                        ? 'Save location'
                                        : 'Add location'}
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}

function DeleteLocationDialog({ location }: { location: Location }) {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                >
                    <Trash2 aria-hidden="true" />
                    Delete
                    <span className="sr-only"> {location.name}</span>
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogTitle>Delete {location.name}?</DialogTitle>
                <DialogDescription>
                    {location.employee_count > 0
                        ? `${location.employee_count} active ${location.employee_count === 1 ? 'employee is' : 'employees are'} assigned here and will no longer have a location. `
                        : ''}
                    Past shifts and time entries are kept. This can't be undone.
                </DialogDescription>

                <Form
                    {...LocationController.destroy.form(location.id)}
                    options={{ preserveScroll: true }}
                    onSuccess={() => setOpen(false)}
                    className="space-y-4"
                >
                    {({ processing, errors }) => (
                        <>
                            <InputError message={errors.location} />
                            <DialogFooter className="gap-2">
                                <DialogClose asChild>
                                    <Button type="button" variant="secondary">
                                        Cancel
                                    </Button>
                                </DialogClose>
                                <Button
                                    type="submit"
                                    variant="destructive"
                                    disabled={processing}
                                >
                                    {processing && <Spinner />}
                                    Delete location
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}
