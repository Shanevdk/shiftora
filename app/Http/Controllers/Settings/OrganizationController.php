<?php

namespace App\Http\Controllers\Settings;

use App\Enums\Feature;
use App\Http\Controllers\Controller;
use App\Http\Requests\OrganizationSettingsRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class OrganizationController extends Controller
{
    /**
     * Show the organization settings form.
     */
    public function edit(): Response
    {
        $organization = $this->organization();

        Gate::authorize('update', $organization);

        return Inertia::render('settings/organization', [
            'settings' => [
                'name' => $organization->name,
                'timezone' => $organization->timezone,
                'week_starts_on' => $organization->week_starts_on,
                'daily_overtime_hours' => $organization->daily_overtime_minutes === null ? null : $organization->daily_overtime_minutes / 60,
                'weekly_overtime_hours' => $organization->weekly_overtime_minutes === null ? null : $organization->weekly_overtime_minutes / 60,
                'geofencing_enabled' => $organization->geofencing_enabled,
                'logo_url' => $organization->logoUrl(),
            ],
            'payWeekFixed' => $organization->hasFixedPayWeek(),
            'features' => [
                'overtimeRules' => $organization->hasFeature(Feature::OvertimeRules),
                'geofencing' => $organization->hasFeature(Feature::Geofencing),
            ],
        ]);
    }

    public function update(OrganizationSettingsRequest $request): RedirectResponse
    {
        $this->organization()->update($request->organizationAttributes());

        $this->toast(__('Organization settings saved.'));

        return to_route('organization.edit');
    }

    /**
     * Store a new organization logo in the public object storage bucket.
     */
    public function updateLogo(Request $request): RedirectResponse
    {
        $organization = $this->organization();

        Gate::authorize('update', $organization);

        $request->validate([
            'logo' => ['required', 'image', 'mimes:png,jpg,jpeg,webp', 'max:2048', 'dimensions:max_width=2000,max_height=2000'],
        ]);

        $previousPath = $organization->logo_path;

        $organization->forceFill([
            'logo_path' => $request->file('logo')->store("organizations/{$organization->id}/logos", 'public'),
        ])->save();

        if ($previousPath !== null) {
            Storage::disk('public')->delete($previousPath);
        }

        $this->toast(__('Logo updated.'));

        return back();
    }

    public function destroyLogo(): RedirectResponse
    {
        $organization = $this->organization();

        Gate::authorize('update', $organization);

        if ($organization->logo_path !== null) {
            Storage::disk('public')->delete($organization->logo_path);
            $organization->forceFill(['logo_path' => null])->save();
        }

        $this->toast(__('Logo removed.'));

        return back();
    }
}
