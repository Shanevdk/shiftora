<?php

namespace App\Http\Controllers;

use App\Actions\Organizations\CreateOrganization;
use App\Enums\Plan;
use App\Http\Requests\OnboardingRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class OnboardingController extends Controller
{
    /**
     * Ask a new user to set up their organization.
     */
    public function create(Request $request): Response|RedirectResponse
    {
        if ($request->user()->memberships()->exists()) {
            return to_route('dashboard');
        }

        return Inertia::render('onboarding', [
            'plans' => array_map(fn (Plan $plan): array => $plan->toArray(), Plan::cases()),
            'trialDays' => config('shiftora.trial_days'),
        ]);
    }

    /**
     * Create the organization and start its free trial.
     */
    public function store(OnboardingRequest $request, CreateOrganization $createOrganization): RedirectResponse
    {
        $createOrganization->handle($request->user(), [
            'name' => $request->string('name')->toString(),
            'timezone' => $request->string('timezone')->toString(),
            'plan' => $request->string('plan')->toString(),
        ]);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Welcome to Shiftora! Your :days-day trial has started.', ['days' => config('shiftora.trial_days')]),
        ]);

        return to_route('dashboard');
    }
}
