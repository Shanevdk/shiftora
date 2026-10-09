<?php

namespace App\Support;

use App\Models\Organization;

/**
 * Holds the organization (tenant) resolved for the current request.
 *
 * Tenant-owned models read this to scope every query to the active organization.
 */
class CurrentOrganization
{
    private ?Organization $organization = null;

    public function set(Organization $organization): void
    {
        $this->organization = $organization;
    }

    public function get(): ?Organization
    {
        return $this->organization;
    }

    public function id(): ?int
    {
        return $this->organization?->id;
    }

    public function clear(): void
    {
        $this->organization = null;
    }
}
