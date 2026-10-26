<?php

use App\Enums\Feature;
use App\Enums\Plan;
use App\Enums\Role;
use App\Models\Organization;
use App\Models\TimeEntry;
use Inertia\Testing\AssertableInertia as Assert;

test('every member can see the billing page but only the owner can manage it', function () {
    $organization = Organization::factory()->create();

    $this->actingAs(member(Role::Admin, $organization))
        ->get(route('billing.edit'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('settings/billing')
            ->where('billing.status', 'trial')
            ->where('billing.trial_days_remaining', 14)
            ->where('canManage', false)
            ->has('plans', 3));

    $this->post(route('billing.checkout'), ['plan' => 'starter'])->assertForbidden();
});

test('a subscription unlocks the subscribed plan after the trial', function () {
    config(['shiftora.plans.business.stripe_price' => 'price_business_test']);

    $organization = Organization::factory()->subscribed(Plan::Business)->create(['plan' => Plan::Starter]);

    expect($organization->activePlan())->toBe(Plan::Business)
        ->and($organization->hasFeature(Feature::AuditLog))->toBeTrue()
        ->and($organization->trialDaysRemaining())->toBeNull();
});

test('an organization without a trial or subscription is read-only but keeps showing what it had', function () {
    $organization = Organization::factory()->trialExpired()->create();

    expect($organization->activePlan())->toBeNull()
        ->and($organization->isReadOnly())->toBeTrue()
        ->and($organization->hasFeature(Feature::Scheduling))->toBeTrue();
});

test('a free trial unlocks every feature whatever plan the organization was created on', function () {
    $organization = Organization::factory()->create(['plan' => Plan::Starter]);

    expect($organization->activePlan())->toBe(Organization::TRIAL_PLAN)
        ->and($organization->hasFeature(Feature::AuditLog))->toBeTrue()
        ->and($organization->hasReachedEmployeeLimit())->toBeFalse();
});

test('owners of a lapsed organization can still reach billing', function () {
    $this->actingAs(member(Role::Owner, Organization::factory()->trialExpired()->create()))
        ->get(route('billing.edit'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('billing.status', 'inactive')
            ->where('canManage', true));
});

test('plans that are not configured in Stripe cannot be purchased', function () {
    config(['shiftora.plans.starter.stripe_price' => null]);

    $this->actingAs(member(Role::Owner))
        ->post(route('billing.checkout'), ['plan' => 'starter'])
        ->assertSessionHasErrors(['plan' => 'Billing for this plan is not configured yet.']);
});

test('a subscription started during the promotion shows as free until it ends', function () {
    config(['shiftora.free_until' => now()->addMonth()->toDateString()]);

    $organization = Organization::factory()->subscribed(Plan::Starter)->create();
    $organization->subscriptions()->update(['stripe_status' => 'trialing', 'trial_ends_at' => Organization::freeUntil()]);

    $this->actingAs(member(Role::Owner, $organization))
        ->get(route('billing.edit'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('billing.status', 'free')
            ->where('billing.plan', 'starter')
            ->where('billing.free_until', Organization::freeUntil()->toIso8601String()));
});

test('without a card the workspace turns read-only once the trial ends, even during the promotion', function () {
    config(['shiftora.free_until' => now()->addMonth()->toDateString()]);

    $owner = member(Role::Owner, Organization::factory()->create(['trial_ends_at' => now()->addDays(2)]));

    $this->actingAs($owner)->post(route('time-clock.clock-in'))->assertSessionHasNoErrors();

    $this->travel(3)->days();

    $this->get(route('dashboard'))->assertOk();
    $this->get(route('timesheets.index'))->assertOk();
    $this->post(route('time-clock.clock-out'))->assertRedirect(route('continue.show'));

    expect(TimeEntry::query()->sole()->clock_out_at)->toBeNull();
});

test('members of a read-only workspace can look around but are told to ask the owner before changing anything', function () {
    $employee = member(Role::Employee, Organization::factory()->trialExpired()->create());

    $this->actingAs($employee)
        ->get(route('time-clock.show'))
        ->assertOk();

    $this->from(route('time-clock.show'))
        ->post(route('time-clock.clock-in'))
        ->assertRedirect(route('time-clock.show'));

    $this->postJson(route('kiosk.punch'), ['pin' => '1234'])
        ->assertForbidden()
        ->assertJsonPath('message', 'Your workspace is read-only until your account owner continues with Shiftora.');

    expect(TimeEntry::query()->count())->toBe(0);
});
