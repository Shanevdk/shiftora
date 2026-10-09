<?php

use App\Enums\Role;
use App\Models\Employee;
use App\Models\Organization;
use App\Models\Shift;
use App\Models\User;
use Illuminate\Notifications\Events\NotificationSent;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Hash;

test('a visitor starts a private demo and is signed in as its owner', function () {
    $this->postJson(route('demo.store'))
        ->assertOk()
        ->assertJson(['url' => route('dashboard')]);

    $organization = Organization::query()->sole();
    $user = auth()->user();

    expect($organization->is_demo)->toBeTrue()
        ->and($organization->hasActiveAccess())->toBeTrue()
        ->and($user->is_demo)->toBeTrue()
        ->and($user->currentRole())->toBe(Role::Owner)
        ->and($organization->employees()->count())->toBe(11)
        ->and(Shift::query()->where('organization_id', $organization->id)->exists())->toBeTrue();

    $this->get(route('dashboard'))->assertOk();
});

test('every demo gets its own organization and logins', function () {
    $this->postJson(route('demo.store'))->assertOk();
    $firstDemoUser = auth()->user();

    $this->postJson(route('demo.store'))->assertOk();

    expect(Organization::query()->count())->toBe(2)
        ->and(auth()->id())->not->toBe($firstDemoUser->id);
});

test('a signed-in customer is never switched into a demo', function () {
    $user = member();

    $this->actingAs($user)->postJson(route('demo.store'))->assertForbidden();

    expect(auth()->id())->toBe($user->id)
        ->and(Organization::query()->where('is_demo', true)->exists())->toBeFalse();
});

test('leaving the demo signs the visitor out and points them to sign up', function () {
    $this->postJson(route('demo.store'));

    $this->get(route('demo.destroy'))->assertRedirect(route('register'));

    $this->assertGuest();
});

test('leaving the demo never signs out a real customer', function () {
    $user = member();

    $this->actingAs($user)->get(route('demo.destroy'))->assertRedirect(route('register'));

    $this->assertAuthenticatedAs($user);
});

test('demo invitations are never emailed', function () {
    Event::fake([NotificationSent::class]);
    $this->postJson(route('demo.store'));
    $employee = Employee::query()->whereNull('user_id')->where('role', Role::Employee)->first();

    $this->post(route('employees.invitation.store', $employee))
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    expect($employee->refresh()->invited_at)->not->toBeNull();
    Event::assertNotDispatched(NotificationSent::class);
});

test('account and billing changes are turned off in the demo', function () {
    $this->postJson(route('demo.store'));
    $user = auth()->user();

    $this->from(route('profile.edit'))
        ->patch(route('profile.update'), ['name' => 'Someone', 'email' => 'real.person@example.com'])
        ->assertRedirect(route('profile.edit'));
    $this->from(route('billing.edit'))
        ->post(route('billing.checkout'), ['plan' => 'business'])
        ->assertRedirect(route('billing.edit'));

    expect($user->refresh()->email)->not->toBe('real.person@example.com');
});

test('demos are pruned after a day without touching real organizations', function () {
    $this->postJson(route('demo.store'));
    $demoUser = auth()->user();
    $realUser = member();

    $this->travel(25)->hours();
    $this->artisan('model:prune', ['--model' => Organization::class])->assertSuccessful();

    expect(Organization::query()->where('is_demo', true)->exists())->toBeFalse()
        ->and(User::query()->find($demoUser->id))->toBeNull()
        ->and($realUser->currentOrganization()->exists())->toBeTrue()
        ->and(User::query()->find($realUser->id))->not->toBeNull();
});

test('recent demos are kept', function () {
    $this->postJson(route('demo.store'));

    $this->travel(2)->hours();
    $this->artisan('model:prune', ['--model' => Organization::class])->assertSuccessful();

    expect(Organization::query()->where('is_demo', true)->exists())->toBeTrue();
});

test('the database seeder creates the documented sample logins', function () {
    $this->seed();

    $owner = User::query()->where('email', 'test@example.com')->sole();

    expect(Hash::check('password', $owner->password))->toBeTrue()
        ->and($owner->is_demo)->toBeFalse()
        ->and($owner->currentOrganization->is_demo)->toBeFalse()
        ->and($owner->currentRole())->toBe(Role::Owner);
});
