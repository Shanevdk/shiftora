<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class CurrentOrganizationController extends Controller
{
    /**
     * Switch the organization the user is working in.
     */
    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate(['organization_id' => ['required', 'integer']]);

        /** @var Employee|null $membership */
        $membership = $request->user()
            ->memberships()
            ->where('organization_id', $validated['organization_id'])
            ->with('organization')
            ->first();

        if ($membership === null) {
            throw ValidationException::withMessages(['organization_id' => __('You are not a member of that organization.')]);
        }

        $request->user()->switchOrganization($membership->organization);

        return to_route('dashboard');
    }
}
