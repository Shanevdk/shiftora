<?php

namespace App\Actions\Organizations;

use App\Actions\Employees\InviteEmployee;
use App\Enums\Role;
use App\Models\Employee;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class SaveGuestWorkspace
{
    public function __construct(private InviteEmployee $inviteEmployee) {}

    /**
     * Turn a guest's throwaway login into a real account, so the workspace they built is kept,
     * then send the invitations that were held back until now.
     *
     * @param  array{email: string, password: string}  $data
     * @return int The number of invitations sent.
     */
    public function handle(User $user, array $data): int
    {
        $organization = $user->currentOrganization;

        DB::transaction(function () use ($user, $organization, $data): void {
            $user->forceFill([
                'email' => $data['email'],
                'password' => $data['password'],
                'is_guest' => false,
            ])->save();

            $organization->forceFill(['is_guest' => false])->save();

            Employee::withoutGlobalScopes()
                ->where('organization_id', $organization->id)
                ->where('user_id', $user->id)
                ->where('role', Role::Owner)
                ->update(['email' => $data['email']]);
        });

        return Employee::withoutGlobalScopes()
            ->where('organization_id', $organization->id)
            ->where('is_active', true)
            ->whereNull('user_id')
            ->whereNull('invited_at')
            ->whereNotNull('email')
            ->get()
            ->filter(fn (Employee $employee): bool => $this->inviteEmployee->handle($employee))
            ->count();
    }
}
