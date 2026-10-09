<?php

namespace App\Actions\Employees;

use App\Models\Employee;
use App\Notifications\EmployeeInvitation;
use Illuminate\Support\Facades\Notification;

class InviteEmployee
{
    /**
     * Email the employee a signed link to create (or connect) their Shiftora login.
     */
    public function handle(Employee $employee): void
    {
        if ($employee->email === null || $employee->user_id !== null) {
            return;
        }

        $employee->forceFill(['invited_at' => now()])->saveQuietly();

        Notification::route('mail', $employee->email)->notify(new EmployeeInvitation($employee));
    }
}
