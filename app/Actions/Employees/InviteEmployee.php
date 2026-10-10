<?php

namespace App\Actions\Employees;

use App\Models\Employee;
use App\Notifications\EmployeeInvitation;
use Illuminate\Support\Facades\Notification;
use Throwable;

class InviteEmployee
{
    /**
     * Email the employee a signed link to create (or connect) their Shiftora login.
     *
     * Sent right away rather than queued, so the manager learns immediately whether it went out.
     * Returns false (and reports the error) when the email could not be sent.
     */
    public function handle(Employee $employee): bool
    {
        if ($employee->email === null || $employee->user_id !== null) {
            return false;
        }

        try {
            Notification::route('mail', $employee->email)->notifyNow(new EmployeeInvitation($employee));
        } catch (Throwable $exception) {
            report($exception);

            return false;
        }

        $employee->forceFill(['invited_at' => now()])->saveQuietly();

        return true;
    }
}
