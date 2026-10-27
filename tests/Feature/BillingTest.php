<?php

use App\Enums\Feature;
use App\Enums\Plan;
use App\Enums\Role;
use App\Models\Employee;
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

test('after the trial an organization that does not pay moves to the free plan', function () {
    $organization = Organization::factory()->trialExpired()->create();

    expect($organization->activePlan())->toBe(Plan::Free)
        ->and($organization->isReadOnly())->toBeFalse()
        ->and($organization->hasFeature(Feature::TimeClock))->toBeTrue()
        ->and($organization->hasFeature(Feature::Scheduling))->toBeFalse();
});

test('a free trial unlocks every feature whatever plan the organization was created on', function () {
    $organization = Organization::factory()->create(['plan' => Plan::Starter]);

    expect($organization->activePlan())->toBe(Organization::TRIAL_PLAN)
        ->and($organization->hasFeature(Feature::AuditLog))->toBeTrue()
        ->and($organization->hasReachedEmployeeLimit())->toBeFalse();
});

test('owners on the free plan can see the paid plans in billing', function () {
    $this->actingAs(member(Role::Owner, Organization::factory()->trialExpired()->create()))
        ->get(route('billing.edit'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('billing.status', 'free_plan')
            ->where('canManage', true)
            ->has('plans', 3));
});

test('plans that are not configured in Stripe cannot be purchased', function () {
    config(['shiftora.plans.starter.stripe_price' => null]);

    $this->actingAs(member(Role::Owner))
        ->post(route('billing.checkout'), ['plan' => 'starter'])
        ->assertSessionHasErrors(['plan' => 'Billing for this plan is not configured yet.']);
});

test('the free plan cannot be bought', function () {
    $this->actingAs(member(Role::Owner))
        ->post(route('billing.checkout'), ['plan' => 'free'])
        ->assertSessionHasErrors('plan');
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

test('a subscription started during the trial is not charged until the trial ends', function () {
    $this->travelTo('2026-10-27 12:00:00');

    $organization = Organization::factory()->subscribed(Plan::Starter)->create();
    $organization->subscriptions()->update(['stripe_status' => 'trialing', 'trial_ends_at' => '2027-01-08 09:00:00']);

    $this->actingAs(member(Role::Owner, $organization))
        ->get(route('billing.edit'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('billing.status', 'free')
            ->where('billing.free_until', null)
            ->where('billing.first_charge_at', '2027-01-08T09:00:00+00:00'));
});

test('once its trial is over a subscription is charged every month', function () {
    $this->actingAs(member(Role::Owner, Organization::factory()->subscribed()->create()))
        ->get(route('billing.edit'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('billing.status', 'active')
            ->where('billing.first_charge_at', null));
});

test('subscribing during the trial carries the rest of it over, unless too little is left for Stripe', function (string $trialEndsAt, ?string $firstChargeAt) {
    $this->travelTo('2026-10-27 12:00:00');

    $organization = Organization::factory()->create(['trial_ends_at' => $trialEndsAt]);

    $this->actingAs(member(Role::Owner, $organization))
        ->get(route('billing.edit'))
        ->assertInertia(fn (Assert $page) => $page->where('billing.first_charge_at', $firstChargeAt));
})->with([
    'weeks left' => ['2026-12-01 12:00:00', '2026-12-01T12:00:00+00:00'],
    'under two days left' => ['2026-10-29 11:00:00', null],
    'trial over' => ['2026-10-26 12:00:00', null],
]);

test('without a card a small team keeps clocking in on the free plan once the trial ends', function () {
    $owner = member(Role::Owner, Organization::factory()->create(['trial_ends_at' => now()->addDays(2)]));

    $this->actingAs($owner)->post(route('time-clock.clock-in'))->assertSessionHasNoErrors();

    $this->travel(3)->days();

    $this->post(route('time-clock.clock-out'))->assertSessionHasNoErrors();
    $this->get(route('schedule.index'))->assertInertia(fn (Assert $page) => $page->component('upgrade'));

    expect(TimeEntry::query()->sole()->clock_out_at)->not->toBeNull();
});

test('a free workspace with more people than the free plan covers is read-only until people are deactivated', function () {
    $organization = Organization::factory()->trialExpired()->create();
    $owner = member(Role::Owner, $organization);
    $extra = Employee::factory()->for($organization)->count(5)->create();

    $this->actingAs($owner)
        ->post(route('time-clock.clock-in'))
        ->assertRedirect(route('continue.show'));

    $this->patch(route('employees.status.update', $extra->first()), ['is_active' => false])
        ->assertSessionHasNoErrors();

    $this->post(route('time-clock.clock-in'))->assertSessionHasNoErrors();

    expect(TimeEntry::query()->count())->toBe(1);
});

test('members of a read-only workspace can look around but are told to ask the owner before changing anything', function () {
    $organization = Organization::factory()->trialExpired()->create();
    $employee = member(Role::Employee, $organization);
    Employee::factory()->for($organization)->count(5)->create();

    $this->actingAs($employee)
        ->get(route('time-clock.show'))
        ->assertOk();

    $this->from(route('time-clock.show'))
        ->post(route('time-clock.clock-in'))
        ->assertRedirect(route('time-clock.show'));

    $this->postJson(route('kiosk.punch'), ['pin' => '1234'])
        ->assertForbidden()
        ->assertJsonPath('message', 'Your workspace is read-only until your account owner sorts out the plan.');

    expect(TimeEntry::query()->count())->toBe(0);
});
