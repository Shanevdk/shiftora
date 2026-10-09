<?php

namespace App\Policies;

use App\Enums\Role;
use App\Models\Shift;
use App\Models\User;
use App\Policies\Concerns\ChecksOrganizationRole;

class ShiftPolicy
{
    use ChecksOrganizationRole;

    public function create(User $user): bool
    {
        return $this->hasRole($user, Role::Manager);
    }

    public function update(User $user, Shift $shift): bool
    {
        return $this->sameOrganization($user, $shift) && $this->hasRole($user, Role::Manager);
    }

    public function delete(User $user, Shift $shift): bool
    {
        return $this->update($user, $shift);
    }
}
