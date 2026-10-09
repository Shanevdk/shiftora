<?php

use App\Enums\Role;
use App\Models\Organization;
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

test('members of an organization whose trial has ended are sent to billing', function () {
    $this->actingAs(member(Role::Employee, Organization::factory()->trialExpired()->create()));

    $this->get(route('dashboard'))->assertRedirect(route('billing.edit'));
});
