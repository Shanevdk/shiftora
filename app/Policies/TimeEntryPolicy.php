<?php

namespace App\Policies;

use App\Enums\Role;
use App\Models\Employee;
use App\Models\TimeEntry;
use App\Models\User;
use App\Policies\Concerns\ChecksOrganizationRole;
use App\Support\Timesheets\TimesheetLock;
use Carbon\CarbonInterface;

class TimeEntryPolicy
{
    use ChecksOrganizationRole;

    /**
     * Managers may add manual entries for employees whose timesheet is not yet approved.
     */
    public function createFor(User $user, Employee $employee, CarbonInterface $clockInAt): bool
    {
        return $this->sameOrganization($user, $employee)
            && $this->hasRole($user, Role::Manager)
            && ! TimesheetLock::coversMoment($employee, $clockInAt);
    }

    public function update(User $user, TimeEntry $timeEntry): bool
    {
        return $this->sameOrganization($user, $timeEntry)
            && $this->hasRole($user, Role::Manager)
            && ! TimesheetLock::coversMoment($timeEntry->employee, $timeEntry->clock_in_at);
    }

    public function delete(User $user, TimeEntry $timeEntry): bool
    {
        return $this->update($user, $timeEntry);
    }
}
