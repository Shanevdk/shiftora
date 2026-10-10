<?php

use App\Enums\Role;
use App\Models\Organization;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

function admin(): User
{
    $admin = User::factory()->create();
    $admin->forceFill(['is_admin' => true])->save();

    return $admin;
}

test('only admins can open the admin dashboard', function () {
    $this->get(route('admin.dashboard'))->assertRedirect(route('login'));

    $this->actingAs(member(Role::Owner))->get(route('admin.dashboard'))->assertForbidden();

    $this->actingAs(admin())->get(route('admin.dashboard'))->assertOk();
});

test('the page keeps the shared organization switcher list intact', function () {
    $owner = member(Role::Owner);
    $owner->forceFill(['is_admin' => true])->save();

    $this->actingAs($owner)
        ->get(route('admin.dashboard'))
        ->assertInertia(fn (Assert $page) => $page->has('organizations', 1));
});

test('it counts users and signups, leaving out demo visitors', function () {
    $this->freezeTime();
    $admin = admin();

    $trialingOrganization = Organization::factory()->create();
    Organization::factory()->subscribed()->create();

    User::factory()->create(['created_at' => now()->subDays(3)]);
    member(Role::Employee, $trialingOrganization)->forceFill(['created_at' => now()->subDays(20)])->save();
    User::factory()->create(['created_at' => now()->subDays(45)]);
    User::factory()->create(['is_demo' => true]);

    Organization::factory()->create(['is_demo' => true]);

    $this->actingAs($admin)
        ->get(route('admin.dashboard'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/dashboard')
            ->where('users.total', 4)
            ->where('users.in_an_organization', 1)
            ->where('signups.today', 1)
            ->where('signups.last_7_days', 2)
            ->where('signups.last_30_days', 3)
            ->where('signups.previous_30_days', 1)
            ->where('organizationCounts.total', 2)
            ->where('organizationCounts.paying', 1)
            ->where('organizationCounts.trialing', 1)
            ->has('dailySignups', 30)
            ->where('dailySignups.29', ['date' => now()->toDateString(), 'count' => 1])
            ->where('dailySignups.26', ['date' => now()->subDays(3)->toDateString(), 'count' => 1])
            ->has('recentSignups', 4)
            ->where('recentSignups.0.email', $admin->email));
});
