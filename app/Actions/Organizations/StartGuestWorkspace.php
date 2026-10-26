<?php

namespace App\Actions\Organizations;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class StartGuestWorkspace
{
    public function __construct(private CreateOrganization $createOrganization) {}

    /**
     * Create a real, empty workspace for a visitor who hasn't signed up, owned by a throwaway guest login.
     *
     * The visitor keeps it by saving it with an email and password; otherwise it is pruned after a day.
     *
     * @param  array{owner_name: string, name: string, timezone: string}  $data
     */
    public function handle(array $data): User
    {
        return DB::transaction(function () use ($data): User {
            $user = User::create([
                'name' => $data['owner_name'],
                'email' => 'guest-'.Str::lower(Str::ulid()).'@guest.shiftora.invalid',
                'password' => Str::password(32),
            ]);
            $user->forceFill(['is_guest' => true])->save();

            $organization = $this->createOrganization->handle($user, [
                'name' => $data['name'],
                'timezone' => $data['timezone'],
            ]);
            $organization->forceFill(['is_guest' => true])->save();

            return $user;
        });
    }
}
