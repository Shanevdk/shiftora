<?php

namespace App\Enums;

enum Role: string
{
    case Owner = 'owner';
    case Admin = 'admin';
    case Manager = 'manager';
    case Employee = 'employee';

    public function label(): string
    {
        return ucfirst($this->value);
    }

    /**
     * Determine whether this role has at least the privileges of the given role.
     */
    public function isAtLeast(self $role): bool
    {
        return $this->rank() >= $role->rank();
    }

    public function canManageOrganization(): bool
    {
        return $this->isAtLeast(self::Admin);
    }

    public function canManageEmployees(): bool
    {
        return $this->isAtLeast(self::Admin);
    }

    public function canManageSchedule(): bool
    {
        return $this->isAtLeast(self::Manager);
    }

    public function canApproveTimesheets(): bool
    {
        return $this->isAtLeast(self::Manager);
    }

    public function canViewReports(): bool
    {
        return $this->isAtLeast(self::Manager);
    }

    public function canManageBilling(): bool
    {
        return $this === self::Owner;
    }

    /**
     * Roles that the given role is allowed to assign to other employees.
     *
     * @return list<self>
     */
    public static function assignableBy(self $role): array
    {
        return array_values(array_filter(
            [self::Admin, self::Manager, self::Employee],
            fn (self $assignable): bool => $role === self::Owner || $role->rank() > $assignable->rank(),
        ));
    }

    private function rank(): int
    {
        return match ($this) {
            self::Owner => 4,
            self::Admin => 3,
            self::Manager => 2,
            self::Employee => 1,
        };
    }
}
