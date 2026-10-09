<?php

namespace App\Http\Controllers\Settings;

use App\Enums\Feature;
use App\Http\Controllers\Controller;
use App\Http\Requests\LocationRequest;
use App\Models\Location;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class LocationController extends Controller
{
    /**
     * List the organization's work locations.
     */
    public function index(): Response
    {
        Gate::authorize('viewAny', Location::class);

        $organization = $this->organization();
        $plan = $organization->activePlan() ?? $organization->plan;

        return Inertia::render('settings/locations', [
            'locations' => Location::query()
                ->withCount(['employees' => fn ($query) => $query->where('is_active', true)])
                ->orderBy('name')
                ->get()
                ->map(fn (Location $location): array => [
                    ...$location->only(['id', 'name', 'address', 'latitude', 'longitude', 'geofence_radius_meters']),
                    'employee_count' => $location->employees_count,
                ]),
            'limit' => $plan->locationLimit(),
            'canAdd' => ! $organization->hasReachedLocationLimit(),
            'geofencingAvailable' => $plan->includes(Feature::Geofencing),
        ]);
    }

    public function store(LocationRequest $request): RedirectResponse
    {
        if ($this->organization()->hasReachedLocationLimit()) {
            throw ValidationException::withMessages([
                'name' => __('Your plan includes a single location. Upgrade to Business to add more.'),
            ]);
        }

        $location = $this->organization()->locations()->create($request->validated());

        $this->toast(__(':name added.', ['name' => $location->name]));

        return back();
    }

    public function update(LocationRequest $request, Location $location): RedirectResponse
    {
        $location->update($request->validated());

        $this->toast(__('Saved :name.', ['name' => $location->name]));

        return back();
    }

    public function destroy(Location $location): RedirectResponse
    {
        Gate::authorize('delete', $location);

        if (Location::query()->count() <= 1) {
            throw ValidationException::withMessages(['location' => __('Your organization needs at least one location.')]);
        }

        $location->delete();

        $this->toast(__(':name removed.', ['name' => $location->name]));

        return back();
    }
}
