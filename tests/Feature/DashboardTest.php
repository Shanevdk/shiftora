<?php

use App\Enums\Role;
use App\Models\Employee;
use App\Models\Organization;
use App\Models\Shift;
use App\Models\TimeEntry;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('guests are redirected to the login page', function () {
    $response = $this->get(route('dashboard'));
    $response->assertRedirect(route('login'));
});

test('users without an organization are sent to onboarding', function () {
    $this->actingAs(User::factory()->create());

    $this->get(route('dashboard'))->assertRedirect(route('onboarding.create'));
});

test('organization members can visit the dashboard', function () {
    $this->actingAs(member(Role::Employee));

    $this->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('dashboard')
            ->where('clock.is_clocked_in', false)
            ->where('team', null)
            ->where('setup', null)
            ->where('membership.role', 'employee'));
});

test('managers get a deferred team overview', function () {
    $this->actingAs(member(Role::Manager));

    $this->get(route('dashboard'))
        ->assertInertia(fn (Assert $page) => $page
            ->missing('team')
            ->loadDeferredProps(fn (Assert $reload) => $reload
                ->where('team.activeEmployeeCount', 1)
                ->has('team.clockedIn', 0)));
});

test('members of a free workspace with more people than the plan covers still see everything, read-only', function () {
    $organization = Organization::factory()->trialExpired()->create();
    $this->actingAs(member(Role::Employee, $organization));
    Employee::factory()->for($organization)->count(5)->create();

    $this->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('subscription.status', 'inactive')
            ->where('subscription.features', fn ($features): bool => collect($features)->contains('scheduling')));
});

test('owners get a setup checklist that follows their team getting started', function () {
    $organization = Organization::factory()->create();
    $owner = member(Role::Owner, $organization);
    TimeEntry::factory()->create(['employee_id' => $owner->currentEmployee->id]);

    $this->actingAs($owner)
        ->get(route('dashboard'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('setup.team_count', 0)
            ->where('setup.has_published_shift', false)
            ->where('setup.has_team_clock_in', false));

    $joined = member(Role::Employee, $organization)->currentEmployee;
    Employee::factory()->for($organization)->create(['invited_at' => now()]);
    Employee::factory()->for($organization)->create(['email' => null]);
    Shift::factory()->published()->create(['employee_id' => $joined->id]);
    TimeEntry::factory()->create(['employee_id' => $joined->id]);

    $this->get(route('dashboard'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('setup.team_count', 3)
            ->where('setup.invited_count', 2)
            ->where('setup.joined_count', 1)
            ->where('setup.has_published_shift', true)
            ->where('setup.has_team_clock_in', true));
});
