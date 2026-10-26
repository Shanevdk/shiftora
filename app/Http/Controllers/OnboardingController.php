<?php

namespace App\Http\Controllers;

use App\Actions\Organizations\CreateOrganization;
use App\Http\Requests\OnboardingRequest;
use App\Models\Organization;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class OnboardingController extends Controller
{
    /**
     * Ask a new user to set up their organization. Plans come later, once they have tried it.
     */
    public function create(Request $request): Response|RedirectResponse
    {
        if ($request->user()->memberships()->exists()) {
            return to_route('dashboard');
        }

        return Inertia::render('onboarding', [
            'trialDays' => config('shiftora.trial_days'),
            'freeUntil' => Organization::onFreePromotion() ? Organization::freeUntil()->toDateString() : null,
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
        ]);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Welcome to Shiftora! Start by adding your team.'),
        ]);

        return to_route('dashboard');
    }
}
