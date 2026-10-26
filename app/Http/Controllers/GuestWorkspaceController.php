<?php

namespace App\Http\Controllers;

use App\Actions\Organizations\StartGuestWorkspace;
use App\Http\Requests\StartWorkspaceRequest;
use App\Models\Organization;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Lets a visitor start using Shiftora with their own team before creating an account. The workspace
 * is real; it just isn't kept unless they save it with an email and password.
 */
class GuestWorkspaceController extends Controller
{
    /**
     * Ask only what the workspace needs: who they are, the business and its timezone.
     */
    public function create(Request $request): Response|RedirectResponse
    {
        if ($request->user() !== null && ! $request->user()->is_demo) {
            return to_route('dashboard');
        }

        return Inertia::render('onboarding', [
            'trialDays' => config('shiftora.trial_days'),
            'freeUntil' => Organization::onFreePromotion() ? Organization::freeUntil()->toDateString() : null,
            'isGuest' => true,
        ]);
    }

    /**
     * Create the workspace, sign the visitor in as its owner and take them to their dashboard.
     */
    public function store(StartWorkspaceRequest $request, StartGuestWorkspace $startGuestWorkspace): RedirectResponse
    {
        if ($request->user() !== null && ! $request->user()->is_demo) {
            return to_route('dashboard');
        }

        if ($request->user()?->is_demo) {
            Auth::guard('web')->logout();
        }

        $owner = $startGuestWorkspace->handle([
            'owner_name' => $request->string('owner_name')->toString(),
            'name' => $request->string('name')->toString(),
            'timezone' => $request->string('timezone')->toString(),
        ]);

        Auth::login($owner, remember: true);
        $request->session()->regenerate();

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Welcome to Shiftora! Start by adding your team.'),
        ]);

        return to_route('dashboard');
    }
}
