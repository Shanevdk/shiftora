<?php

namespace App\Actions\TimeClock;

use App\Enums\Feature;
use App\Models\Employee;
use App\Models\Location;
use App\Models\TimeEntry;
use App\Support\Timesheets\TimesheetLock;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ClockIn
{
    /**
     * Start a new time entry for the employee.
     *
     * The employee row is locked for the duration of the transaction so concurrent
     * clock-ins and timesheet approvals are serialized; a partial unique index backs this
     * up at the database level.
     *
     * @throws ValidationException
     */
    public function handle(Employee $employee, ?float $latitude = null, ?float $longitude = null): TimeEntry
    {
        $location = $this->resolveLocation($employee, $latitude, $longitude);

        try {
            return DB::transaction(function () use ($employee, $location, $latitude, $longitude): TimeEntry {
                Employee::query()->whereKey($employee->id)->lockForUpdate()->first();

                if ($employee->timeEntries()->whereNull('clock_out_at')->exists()) {
                    throw ValidationException::withMessages(['clock' => __('You are already clocked in.')]);
                }

                if (TimesheetLock::coversMoment($employee, now())) {
                    throw ValidationException::withMessages(['clock' => __('This week\'s timesheet has been approved. Ask a manager to reopen it before clocking in.')]);
                }

                return $employee->timeEntries()->create([
                    'organization_id' => $employee->organization_id,
                    'location_id' => $location?->id,
                    'clock_in_at' => now(),
                    'clock_in_latitude' => $latitude,
                    'clock_in_longitude' => $longitude,
                    'source' => TimeEntry::SOURCE_CLOCK,
                ]);
            });
        } catch (UniqueConstraintViolationException) {
            throw ValidationException::withMessages(['clock' => __('You are already clocked in.')]);
        }
    }

    /**
     * Determine the work location for the clock-in, enforcing geofences when the organization requires them.
     *
     * @throws ValidationException
     */
    private function resolveLocation(Employee $employee, ?float $latitude, ?float $longitude): ?Location
    {
        $organization = $employee->organization;

        $enforcesGeofence = $organization->geofencing_enabled && $organization->hasFeature(Feature::Geofencing);

        if (! $enforcesGeofence) {
            return $employee->location;
        }

        $candidates = $employee->location !== null
            ? collect([$employee->location])
            : $organization->locations()->get();

        $geofenced = $candidates->filter(fn (Location $location): bool => $location->hasGeofence());

        if ($geofenced->isEmpty()) {
            return $employee->location;
        }

        if ($latitude === null || $longitude === null) {
            throw ValidationException::withMessages([
                'location' => __('Location access is required to clock in. Allow location sharing and try again.'),
            ]);
        }

        $match = $geofenced->first(fn (Location $location): bool => $location->contains($latitude, $longitude));

        if ($match === null) {
            throw ValidationException::withMessages([
                'location' => __('You need to be at your work location to clock in.'),
            ]);
        }

        return $match;
    }
}
