<?php

namespace App\Actions\Organizations;

use App\Enums\Role;
use App\Models\Employee;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CreateOrganization
{
    /**
     * Create an organization on a no-card free trial with every feature unlocked, with the user as its owner.
     * The plan is chosen when the owner continues after trying it.
     *
     * @param  array{name: string, timezone: string}  $data
     */
    public function handle(User $user, array $data): Organization
    {
        return DB::transaction(function () use ($user, $data): Organization {
            $organization = Organization::create([
                'name' => $data['name'],
                'slug' => $this->uniqueSlug($data['name']),
                'timezone' => $data['timezone'],
                'plan' => Organization::TRIAL_PLAN,
                'trial_ends_at' => Organization::newTrialEndsAt(),
            ]);

            $location = $organization->locations()->create(['name' => __('Main location')]);

            [$firstName, $lastName] = $this->splitName($user->name);

            $organization->employees()->create([
                'user_id' => $user->id,
                'location_id' => $location->id,
                'first_name' => $firstName,
                'last_name' => $lastName,
                'email' => $user->is_guest ? null : $user->email,
                'role' => Role::Owner,
                'color' => Employee::COLORS[0],
            ]);

            $user->switchOrganization($organization);

            return $organization;
        });
    }

    private function uniqueSlug(string $name): string
    {
        $base = Str::slug($name) ?: 'organization';
        $slug = $base;

        while (Organization::query()->where('slug', $slug)->exists()) {
            $slug = $base.'-'.Str::lower(Str::random(4));
        }

        return $slug;
    }

    /**
     * @return array{0: string, 1: string}
     */
    private function splitName(string $name): array
    {
        $parts = preg_split('/\s+/', trim($name), 2) ?: [];

        return [$parts[0] ?? $name, $parts[1] ?? ''];
    }
}
