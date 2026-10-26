<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;

class EmployeeClockPinController extends Controller
{
    /**
     * Give the employee a new kiosk PIN, e.g. when someone else has learned theirs.
     */
    public function update(Employee $employee): RedirectResponse
    {
        Gate::authorize('update', $employee);

        $employee->update(['clock_pin' => Employee::uniqueClockPin($employee->organization_id)]);

        $this->toast(__(':name\'s new kiosk PIN is :pin.', ['name' => $employee->full_name, 'pin' => $employee->clock_pin]));

        return back();
    }
}
