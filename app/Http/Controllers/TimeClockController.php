<?php

namespace App\Http\Controllers;

use App\Actions\TimeClock\ClockIn;
use App\Actions\TimeClock\ClockOut;
use App\Actions\TimeClock\EndBreak;
use App\Actions\TimeClock\StartBreak;
use App\Enums\Feature;
use App\Http\Presenters\ShiftPresenter;
use App\Http\Presenters\TimeEntryPresenter;
use App\Models\Location;
use App\Models\Shift;
use App\Models\TimeEntry;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TimeClockController extends Controller
{
    /**
     * Show the employee's time clock.
     */
    public function show(): Response
    {
        $organization = $this->organization();
        $employee = $this->currentEmployee();
        $localToday = $organization->localNow()->startOfDay();

        $geofenceRequired = $organization->geofencing_enabled && $organization->hasFeature(Feature::Geofencing);

        /** @var Shift|null $todayShift */
        $todayShift = ! $organization->hasFeature(Feature::Scheduling) ? null : $employee->shifts()
            ->published()
            ->with('location')
            ->overlapping($localToday->utc(), $localToday->addDay()->utc())
            ->orderBy('starts_at')
            ->first();

        return Inertia::render('time-clock', [
            'clock' => TimeEntryPresenter::clockState($employee),
            'todayEntries' => $employee->timeEntries()
                ->with(['openBreak', 'location'])
                ->where('clock_in_at', '>=', $localToday->utc())
                ->orderBy('clock_in_at')
                ->get()
                ->map(fn (TimeEntry $entry): array => TimeEntryPresenter::present($entry)),
            'todayShift' => $todayShift === null ? null : ShiftPresenter::present($todayShift),
            'geofence' => [
                'required' => $geofenceRequired,
                'locations' => $geofenceRequired
                    ? $organization->locations()
                        ->whereNotNull('latitude')
                        ->get()
                        ->map(fn (Location $location): array => $location->only(['id', 'name', 'latitude', 'longitude', 'geofence_radius_meters']))
                    : [],
            ],
        ]);
    }

    public function clockIn(Request $request, ClockIn $clockIn): RedirectResponse
    {
        $coordinates = $this->coordinates($request);

        $clockIn->handle($this->currentEmployee(), ...$coordinates);

        $this->toast(__('You are clocked in. Have a great shift!'));

        return back();
    }

    public function clockOut(Request $request, ClockOut $clockOut): RedirectResponse
    {
        $entry = $clockOut->handle($this->currentEmployee(), ...$this->coordinates($request));

        $this->toast(__('Clocked out after :hours.', ['hours' => sprintf('%dh %02dm', intdiv($entry->workedMinutes(), 60), $entry->workedMinutes() % 60)]));

        return back();
    }

    public function startBreak(StartBreak $startBreak): RedirectResponse
    {
        $startBreak->handle($this->currentEmployee());

        $this->toast(__('Break started.'), 'info');

        return back();
    }

    public function endBreak(EndBreak $endBreak): RedirectResponse
    {
        $endBreak->handle($this->currentEmployee());

        $this->toast(__('Welcome back! Break ended.'), 'info');

        return back();
    }

    /**
     * @return array{latitude: float|null, longitude: float|null}
     */
    private function coordinates(Request $request): array
    {
        $validated = $request->validate([
            'latitude' => ['nullable', 'numeric', 'between:-90,90', 'required_with:longitude'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180', 'required_with:latitude'],
        ]);

        return [
            'latitude' => isset($validated['latitude']) ? (float) $validated['latitude'] : null,
            'longitude' => isset($validated['longitude']) ? (float) $validated['longitude'] : null,
        ];
    }
}
