<?php

namespace App\Policies\Concerns;

use App\Enums\Role;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;

trait ChecksOrganizationRole
{
    /**
     * Whether the model belongs to the organization the user is currently working in.
     */
    protected function sameOrganization(User $user, Model $model): bool
    {
        return $user->current_organization_id !== null
            && (int) $model->getAttribute('organization_id') === $user->current_organization_id;
    }

    /**
     * Whether the user holds at least the given role in their current organization.
     */
    protected function hasRole(User $user, Role $role): bool
    {
        return $user->currentRole()?->isAtLeast($role) ?? false;
    }
}
