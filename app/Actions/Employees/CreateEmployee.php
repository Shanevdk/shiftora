<?php

namespace App\Actions\Employees;

use App\Jobs\SyncSubscriptionQuantity;
use App\Models\Employee;
use App\Models\Organization;
use Illuminate\Validation\ValidationException;

class CreateEmployee
{
    public function __construct(private InviteEmployee $inviteEmployee) {}

    /**
     * Add an employee to the organization, enforcing the plan's seat limit, and invite them by email.
     *
     * @param  array<string, mixed>  $data
     *
     * @throws ValidationException
     */
    public function handle(Organization $organization, array $data, bool $sendInvitation = true): Employee
    {
        if ($organization->hasReachedEmployeeLimit()) {
            $plan = $organization->activePlan() ?? $organization->plan;

            throw ValidationException::withMessages([
                'first_name' => __('The :plan plan includes up to :limit active employees. Upgrade your plan to add more.', [
                    'plan' => $plan->label(),
                    'limit' => $plan->employeeLimit(),
                ]),
            ]);
        }

        $employee = $organization->employees()->create([
            ...$data,
            'color' => $data['color'] ?? Employee::COLORS[$organization->employees()->count() % count(Employee::COLORS)],
        ]);

        if ($sendInvitation && $employee->email !== null) {
            $this->inviteEmployee->handle($employee);
        }

        SyncSubscriptionQuantity::dispatch($organization);

        return $employee;
    }
}
