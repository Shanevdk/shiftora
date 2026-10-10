<?php

use App\Enums\Plan;
use App\Enums\Role;
use App\Models\Organization;
use App\Models\User;

test('a new user creates an organization on a free trial as its owner', function () {
    $user = User::factory()->create(['name' => 'Avery Stone']);

    $this->actingAs($user)
        ->post(route('onboarding.store'), [
            'name' => 'Northwind Coffee',
            'timezone' => 'America/Toronto',
            'plan' => 'starter',
        ])
        ->assertRedirect(route('dashboard'));

    $organization = Organization::query()->sole();

    expect($organization)
        ->name->toBe('Northwind Coffee')
        ->timezone->toBe('America/Toronto')
        ->plan->toBe(Plan::Starter)
        ->and($organization->onGenericTrial())->toBeTrue()
        ->and($organization->trial_ends_at->isSameDay(now()->addDays(2)))->toBeTrue()
        ->and($organization->locations()->count())->toBe(1);

    $owner = $organization->employees()->sole();

    expect($owner)
        ->user_id->toBe($user->id)
        ->role->toBe(Role::Owner)
        ->first_name->toBe('Avery')
        ->last_name->toBe('Stone')
        ->and($user->refresh()->current_organization_id)->toBe($organization->id);
});

test('onboarding validates the organization details', function () {
    $this->actingAs(User::factory()->create())
        ->post(route('onboarding.store'), ['timezone' => 'Mars/Olympus', 'plan' => 'enterprise'])
        ->assertSessionHasErrors(['name', 'timezone', 'plan']);

    expect(Organization::query()->count())->toBe(0);
});

test('members are sent to the dashboard instead of onboarding', function () {
    $this->actingAs(member());

    $this->get(route('onboarding.create'))->assertRedirect(route('dashboard'));
    $this->post(route('onboarding.store'), ['name' => 'Second', 'timezone' => 'UTC', 'plan' => 'starter'])->assertForbidden();
});
