<?php

namespace App\Policies;

use App\Enums\Role;
use App\Models\Employee;
use App\Models\User;
use App\Policies\Concerns\ChecksOrganizationRole;

class EmployeePolicy
{
    use ChecksOrganizationRole;

    public function viewAny(User $user): bool
    {
        return $this->hasRole($user, Role::Manager);
    }

    public function create(User $user): bool
    {
        return $this->hasRole($user, Role::Admin);
    }

    /**
     * Admins manage the team, but only an owner may change another owner or admin.
     */
    public function update(User $user, Employee $employee): bool
    {
        if (! $this->sameOrganization($user, $employee) || ! $this->hasRole($user, Role::Admin)) {
            return false;
        }

        if ($user->currentRole() === Role::Owner) {
            return true;
        }

        return ! $employee->role->isAtLeast(Role::Admin);
    }

    /**
     * Activation changes billing and access, so owners can never be deactivated and nobody deactivates themselves.
     */
    public function changeStatus(User $user, Employee $employee): bool
    {
        return $this->update($user, $employee)
            && $employee->role !== Role::Owner
            && $employee->user_id !== $user->id;
    }
}
