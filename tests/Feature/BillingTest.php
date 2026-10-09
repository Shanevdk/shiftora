<?php

use App\Enums\Feature;
use App\Enums\Plan;
use App\Enums\Role;
use App\Models\Organization;
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

test('an organization without a trial or subscription has no entitlements', function () {
    $organization = Organization::factory()->trialExpired()->create();

    expect($organization->activePlan())->toBeNull()
        ->and($organization->hasFeature(Feature::TimeClock))->toBeFalse();
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
