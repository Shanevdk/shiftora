<?php

namespace App\Http\Controllers;

use App\Jobs\SyncSubscriptionQuantity;
use App\Models\Employee;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

class EmployeeStatusController extends Controller
{
    /**
     * Activate or deactivate an employee. Deactivated employees lose access and stop counting toward billing.
     */
    public function update(Request $request, Employee $employee): RedirectResponse
    {
        Gate::authorize('changeStatus', $employee);

        $isActive = $request->validate(['is_active' => ['required', 'boolean']])['is_active'];
        $organization = $this->organization();

        if ($isActive && ! $employee->is_active && $organization->hasReachedEmployeeLimit()) {
            throw ValidationException::withMessages([
                'is_active' => __('Your plan has no free seats. Upgrade or deactivate someone else first.'),
            ]);
        }

        $employee->update(['is_active' => (bool) $isActive]);

        SyncSubscriptionQuantity::dispatch($organization);

        $this->toast($isActive
            ? __(':name has been reactivated.', ['name' => $employee->full_name])
            : __(':name has been deactivated.', ['name' => $employee->full_name]));

        return back();
    }
}
