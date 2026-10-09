<?php

namespace App\Http\Controllers;

use App\Actions\Employees\InviteEmployee;
use App\Models\Employee;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

class EmployeeInvitationController extends Controller
{
    /**
     * Send (or resend) an employee's invitation email.
     */
    public function store(Employee $employee, InviteEmployee $inviteEmployee): RedirectResponse
    {
        Gate::authorize('update', $employee);

        if ($employee->email === null || $employee->user_id !== null || ! $employee->is_active) {
            throw ValidationException::withMessages(['email' => __('This employee cannot be invited.')]);
        }

        $inviteEmployee->handle($employee);

        $this->toast(__('Invitation sent to :email.', ['email' => $employee->email]));

        return back();
    }
}
