<?php

namespace App\Http\Controllers;

use App\Actions\Organizations\CreateSampleOrganization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class DemoController extends Controller
{
    /**
     * Start a fresh, private demo workspace and sign the visitor in as its owner.
     *
     * Visitors already in a demo get a new one (a reset); real accounts are never signed out.
     */
    public function store(Request $request, CreateSampleOrganization $createSampleOrganization): JsonResponse
    {
        $user = $request->user();

        abort_if($user !== null && ! $user->is_demo, 403);

        if ($user !== null) {
            Auth::guard('web')->logout();
        }

        $owner = $createSampleOrganization->handle(isDemo: true);

        Auth::login($owner);
        $request->session()->regenerate();

        return response()->json(['url' => route('dashboard')]);
    }

    /**
     * Leave the demo and go to sign-up. Real accounts pass straight through untouched.
     */
    public function destroy(Request $request): RedirectResponse
    {
        if ($request->user()?->is_demo) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return to_route('register');
    }
}
