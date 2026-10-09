<?php

namespace App\Actions\Organizations;

use App\Enums\Plan;
use App\Enums\Role;
use App\Models\Employee;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CreateOrganization
{
    /**
     * Create an organization on a no-card free trial, with the user as its owner.
     *
     * @param  array{name: string, timezone: string, plan: string}  $data
     */
    public function handle(User $user, array $data): Organization
    {
        return DB::transaction(function () use ($user, $data): Organization {
            $organization = Organization::create([
                'name' => $data['name'],
                'slug' => $this->uniqueSlug($data['name']),
                'timezone' => $data['timezone'],
                'plan' => Plan::from($data['plan']),
                'trial_ends_at' => now()->addDays(config('shiftora.trial_days')),
            ]);

            $location = $organization->locations()->create(['name' => __('Main location')]);

            [$firstName, $lastName] = $this->splitName($user->name);

            $organization->employees()->create([
                'user_id' => $user->id,
                'location_id' => $location->id,
                'first_name' => $firstName,
                'last_name' => $lastName,
                'email' => $user->email,
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
