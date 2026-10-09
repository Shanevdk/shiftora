<?php

namespace App\Policies;

use App\Enums\Role;
use App\Models\Location;
use App\Models\User;
use App\Policies\Concerns\ChecksOrganizationRole;

class LocationPolicy
{
    use ChecksOrganizationRole;

    public function viewAny(User $user): bool
    {
        return $this->hasRole($user, Role::Admin);
    }

    public function create(User $user): bool
    {
        return $this->hasRole($user, Role::Admin);
    }

    public function update(User $user, Location $location): bool
    {
        return $this->sameOrganization($user, $location) && $this->hasRole($user, Role::Admin);
    }

    public function delete(User $user, Location $location): bool
    {
        return $this->update($user, $location);
    }
}
