<?php

use App\Enums\Plan;
use App\Enums\Role;
use App\Models\Employee;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

/*
|--------------------------------------------------------------------------
| Test Case
|--------------------------------------------------------------------------
|
| The closure you provide to your test functions is always bound to a specific PHPUnit test
| case class. By default, that class is "PHPUnit\Framework\TestCase". Of course, you may
| need to change it using the "pest()" function to bind different classes or traits.
|
*/

pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)
    ->in('Feature');

/*
|--------------------------------------------------------------------------
| Expectations
|--------------------------------------------------------------------------
|
| When you're writing tests, you often need to check that values meet certain conditions. The
| "expect()" function gives you access to a set of "expectations" methods that you can use
| to assert different things. Of course, you may extend the Expectation API at any time.
|
*/

expect()->extend('toBeOne', function () {
    return $this->toBe(1);
});

/*
|--------------------------------------------------------------------------
| Functions
|--------------------------------------------------------------------------
|
| While Pest is very powerful out-of-the-box, you may have some testing code specific to your
| project that you don't want to repeat in every file. Here you can also expose helpers as
| global functions to help you to reduce the number of lines of code in your test files.
|
*/

/**
 * Create a user who belongs to the organization with the given role and is working in it.
 */
function member(Role $role = Role::Owner, ?Organization $organization = null): User
{
    $employee = Employee::factory()
        ->for($organization ?? Organization::factory()->create())
        ->role($role)
        ->withUser()
        ->create();

    return $employee->user->refresh();
}

/**
 * Move the organization from its free trial (which includes every feature) onto a paid subscription
 * to the given plan, so only that plan's features apply.
 */
function subscribeTo(Organization $organization, Plan $plan): Organization
{
    $organization->forceFill(['plan' => $plan, 'stripe_id' => 'cus_'.Str::random(14), 'trial_ends_at' => null])->save();

    $organization->subscriptions()->create([
        'type' => config('shiftora.subscription_type'),
        'stripe_id' => 'sub_'.Str::random(14),
        'stripe_status' => 'active',
        'stripe_price' => $plan->stripePrice() ?? 'price_'.$plan->value,
        'quantity' => 1,
    ]);

    return $organization->refresh();
}
