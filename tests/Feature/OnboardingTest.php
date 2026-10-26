<?php

use App\Enums\Feature;
use App\Enums\Role;
use App\Models\Organization;
use App\Models\User;

test('a new user creates an organization on a free trial with every feature unlocked', function () {
    $user = User::factory()->create(['name' => 'Avery Stone']);

    $this->actingAs($user)
        ->post(route('onboarding.store'), [
            'name' => 'Northwind Coffee',
            'timezone' => 'America/Toronto',
        ])
        ->assertRedirect(route('dashboard'));

    $organization = Organization::query()->sole();
    $lockedFeatures = array_filter(Feature::cases(), fn (Feature $feature): bool => ! $organization->activePlan()->includes($feature));

    expect($organization)
        ->name->toBe('Northwind Coffee')
        ->timezone->toBe('America/Toronto')
        ->and($lockedFeatures)->toBeEmpty()
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

test('during the promotion a new workspace stays open without a card until the promotion ends, then turns read-only', function () {
    $this->freezeSecond();
    config(['shiftora.free_until' => now()->addMonths(2)->toDateString()]);

    $this->actingAs(User::factory()->create())
        ->post(route('onboarding.store'), ['name' => 'Northwind Coffee', 'timezone' => 'UTC'])
        ->assertRedirect(route('dashboard'));

    expect(Organization::query()->sole()->trial_ends_at->equalTo(Organization::freeUntil()))->toBeTrue();

    $this->travel(1)->month();
    $this->get(route('dashboard'))->assertOk();

    $this->travelTo(Organization::freeUntil()->addMinute());
    $this->get(route('dashboard'))->assertOk();

    expect(Organization::query()->sole()->isReadOnly())->toBeTrue();
});

test('a promotion ending sooner than the regular trial does not shorten it', function () {
    $this->freezeSecond();
    config(['shiftora.trial_days' => 14, 'shiftora.free_until' => now()->addDays(3)->toDateString()]);

    $this->actingAs(User::factory()->create())
        ->post(route('onboarding.store'), ['name' => 'Northwind Coffee', 'timezone' => 'UTC']);

    expect(Organization::query()->sole()->trial_ends_at->equalTo(now()->addDays(14)))->toBeTrue();
});

test('existing workspaces, including lapsed ones, are kept open until the promotion ends', function () {
    $this->freezeSecond();
    config(['shiftora.free_until' => now()->addMonths(2)->toDateString()]);

    $lapsed = Organization::factory()->trialExpired()->create(['trial_ending_notified_at' => now()->subDays(2)]);
    $trialing = Organization::factory()->create(['trial_ends_at' => now()->addDay()]);
    $longTrial = Organization::factory()->create(['trial_ends_at' => now()->addYear()]);

    (require database_path('migrations/2026_10_22_194751_extend_trials_until_free_promotion_ends.php'))->up();

    expect($lapsed->refresh())
        ->hasActiveAccess()->toBeTrue()
        ->trial_ending_notified_at->toBeNull()
        ->and($lapsed->trial_ends_at->equalTo(Organization::freeUntil()))->toBeTrue()
        ->and($trialing->refresh()->trial_ends_at->equalTo(Organization::freeUntil()))->toBeTrue()
        ->and($longTrial->refresh()->trial_ends_at->equalTo(now()->addYear()))->toBeTrue();
});

test('onboarding validates the organization details', function () {
    $this->actingAs(User::factory()->create())
        ->post(route('onboarding.store'), ['timezone' => 'Mars/Olympus'])
        ->assertSessionHasErrors(['name', 'timezone']);

    expect(Organization::query()->count())->toBe(0);
});

test('members are sent to the dashboard instead of onboarding', function () {
    $this->actingAs(member());

    $this->get(route('onboarding.create'))->assertRedirect(route('dashboard'));
    $this->post(route('onboarding.store'), ['name' => 'Second', 'timezone' => 'UTC'])->assertForbidden();
});
