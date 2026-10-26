<?php

use App\Actions\Billing\StartCheckout;
use App\Enums\Plan;
use App\Enums\Role;
use App\Models\Employee;
use App\Models\Location;
use App\Models\Organization;
use App\Models\Shift;
use Inertia\Testing\AssertableInertia as Assert;

test('the continue page recommends the cheapest plan that keeps what the team has used', function (string $usage, string $recommendedPlan) {
    $organization = Organization::factory()->create();
    $owner = member(Role::Owner, $organization);

    match ($usage) {
        'scheduling' => Shift::factory()->create(['employee_id' => $owner->currentEmployee->id]),
        'second location' => Location::factory()->for($organization)->count(2)->create(),
        'eleven people' => Employee::factory()->for($organization)->count(10)->create(),
        default => null,
    };

    $this->actingAs($owner)
        ->get(route('continue.show'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('continue')
            ->where('recommendedPlan', $recommendedPlan));
})->with([
    'only the time clock' => ['time clock', 'starter'],
    'shift scheduling' => ['scheduling', 'professional'],
    'more than one location' => ['second location', 'business'],
    'more people than Starter allows' => ['eleven people', 'professional'],
]);

test('the continue page warns which plans would take away something the team uses', function () {
    $organization = Organization::factory()->create();
    $owner = member(Role::Owner, $organization);
    Shift::factory()->create(['employee_id' => $owner->currentEmployee->id]);

    $this->actingAs($owner)
        ->get(route('continue.show'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('plans.0.value', 'starter')
            ->where('plans.0.missing_features', ['Shift scheduling'])
            ->where('plans.1.missing_features', []));
});

test('continuing goes straight to checkout with the plan that fits', function () {
    config([
        'cashier.secret' => 'sk_test_shiftora',
        'shiftora.plans.professional.stripe_price' => 'price_professional_test',
    ]);

    $organization = Organization::factory()->create();
    $owner = member(Role::Owner, $organization);
    Shift::factory()->create(['employee_id' => $owner->currentEmployee->id]);

    $this->mock(StartCheckout::class)
        ->shouldReceive('handle')
        ->once()
        ->withArgs(fn (Organization $checkoutFor, Plan $plan, string $cancelUrl): bool => $checkoutFor->is($organization)
            && $plan === Plan::Professional
            && $cancelUrl === route('continue.show'))
        ->andReturn('https://checkout.stripe.test/session');

    $this->actingAs($owner)
        ->post(route('continue.store'))
        ->assertRedirect('https://checkout.stripe.test/session');
});

test('continuing explains when payments are not switched on yet', function () {
    config(['cashier.secret' => null]);

    $this->mock(StartCheckout::class)->shouldNotReceive('handle');

    $this->actingAs(member(Role::Owner))
        ->post(route('continue.store'))
        ->assertRedirect(route('continue.show'));
});

test('only the owner can continue', function () {
    $admin = member(Role::Admin);

    $this->actingAs($admin)->get(route('continue.show'))->assertForbidden();
    $this->post(route('continue.store'))->assertForbidden();
});

test('a subscribed organization manages its plan from billing instead', function () {
    $owner = member(Role::Owner, Organization::factory()->subscribed(Plan::Starter)->create());

    $this->actingAs($owner)->get(route('continue.show'))->assertRedirect(route('billing.edit'));
});
