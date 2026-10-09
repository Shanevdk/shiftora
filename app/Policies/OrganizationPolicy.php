<?php

namespace App\Policies;

use App\Enums\Role;
use App\Models\Organization;
use App\Models\User;
use App\Policies\Concerns\ChecksOrganizationRole;

class OrganizationPolicy
{
    use ChecksOrganizationRole;

    public function update(User $user, Organization $organization): bool
    {
        return $this->isCurrent($user, $organization) && $this->hasRole($user, Role::Admin);
    }

    public function manageBilling(User $user, Organization $organization): bool
    {
        return $this->isCurrent($user, $organization) && $user->currentRole() === Role::Owner;
    }

    public function viewReports(User $user, Organization $organization): bool
    {
        return $this->isCurrent($user, $organization) && $this->hasRole($user, Role::Manager);
    }

    public function viewAuditLog(User $user, Organization $organization): bool
    {
        return $this->isCurrent($user, $organization) && $this->hasRole($user, Role::Admin);
    }

    private function isCurrent(User $user, Organization $organization): bool
    {
        return $user->current_organization_id === $organization->id;
    }
}
