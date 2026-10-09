<?php

namespace App\Policies;

use App\Enums\Role;
use App\Models\Employee;
use App\Models\Timesheet;
use App\Models\User;
use App\Policies\Concerns\ChecksOrganizationRole;

class TimesheetPolicy
{
    use ChecksOrganizationRole;

    public function viewAny(User $user): bool
    {
        return $this->hasRole($user, Role::Manager);
    }

    /**
     * Employees see their own timesheets; managers see everyone's.
     */
    public function viewForEmployee(User $user, Employee $employee): bool
    {
        if (! $this->sameOrganization($user, $employee)) {
            return false;
        }

        return $employee->user_id === $user->id || $this->hasRole($user, Role::Manager);
    }

    public function submit(User $user, Timesheet $timesheet): bool
    {
        return $this->sameOrganization($user, $timesheet)
            && $timesheet->employee_id === $user->currentEmployee?->id;
    }

    /**
     * Managers review timesheets, but only owners may approve their own.
     */
    public function review(User $user, Timesheet $timesheet): bool
    {
        if (! $this->sameOrganization($user, $timesheet) || ! $this->hasRole($user, Role::Manager)) {
            return false;
        }

        return $timesheet->employee_id !== $user->currentEmployee?->id
            || $user->currentRole() === Role::Owner;
    }
}
