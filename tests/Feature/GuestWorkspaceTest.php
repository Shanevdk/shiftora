<?php

use App\Enums\Feature;
use App\Enums\Role;
use App\Models\Employee;
use App\Models\Organization;
use App\Models\User;
use App\Notifications\EmployeeInvitation;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;

function startGuestWorkspace(): User
{
    test()->post(route('start.store'), [
        'owner_name' => 'Avery Stone',
        'name' => 'Harbor Street Café',
        'timezone' => 'America/Toronto',
    ])->assertRedirect(route('dashboard'));

    return auth()->user();
}

test('a visitor starts a real workspace without signing up', function () {
    $guest = startGuestWorkspace();
    $organization = Organization::query()->sole();

    expect($guest)
        ->is_guest->toBeTrue()
        ->current_organization_id->toBe($organization->id)
        ->and($organization)
        ->name->toBe('Harbor Street Café')
        ->is_guest->toBeTrue()
        ->and($organization->hasFeature(Feature::Scheduling))->toBeTrue()
        ->and($organization->owner()->user_id)->toBe($guest->id);

    $this->get(route('dashboard'))->assertOk();
});

test('signed-in customers skip the guest start', function () {
    $this->actingAs(member(Role::Owner))->get(route('start.create'))->assertRedirect(route('dashboard'));
});

test('invites wait until the guest saves their workspace, then go out', function () {
    Notification::fake();
    $guest = startGuestWorkspace();

    $this->post(route('employees.store'), [
        'first_name' => 'Jamie',
        'last_name' => 'Lee',
        'email' => 'jamie@example.com',
        'role' => 'employee',
    ])->assertRedirect(route('employees.index'));

    Notification::assertNothingSent();
    expect(Employee::query()->where('first_name', 'Jamie')->sole()->invited_at)->toBeNull();

    $this->post(route('save-workspace.store'), [
        'email' => 'avery@example.com',
        'password' => 'a-long-enough-password',
        'password_confirmation' => 'a-long-enough-password',
    ])->assertRedirect(route('dashboard'));

    $guest->refresh();

    expect($guest)
        ->is_guest->toBeFalse()
        ->email->toBe('avery@example.com')
        ->and(Hash::check('a-long-enough-password', $guest->password))->toBeTrue()
        ->and(Organization::query()->sole()->is_guest)->toBeFalse()
        ->and(Employee::withoutGlobalScopes()->where('user_id', $guest->id)->sole()->email)->toBe('avery@example.com')
        ->and(Employee::withoutGlobalScopes()->where('first_name', 'Jamie')->sole()->invited_at)->not->toBeNull();

    Notification::assertSentTo(
        new AnonymousNotifiable,
        EmployeeInvitation::class,
        fn ($notification, $channels, $notifiable) => $notifiable->routes['mail'] === 'jamie@example.com',
    );
});

test('saving a workspace needs an unused email and a confirmed password', function () {
    User::factory()->create(['email' => 'taken@example.com']);
    startGuestWorkspace();

    $this->post(route('save-workspace.store'), [
        'email' => 'taken@example.com',
        'password' => 'a-long-enough-password',
        'password_confirmation' => 'something-else',
    ])->assertSessionHasErrors(['email', 'password']);

    expect(auth()->user()->refresh()->is_guest)->toBeTrue();
});

test('only guests can save a workspace', function () {
    $this->actingAs(member(Role::Owner));

    $this->get(route('save-workspace.create'))->assertRedirect(route('dashboard'));
    $this->post(route('save-workspace.store'), [
        'email' => 'someone@example.com',
        'password' => 'a-long-enough-password',
        'password_confirmation' => 'a-long-enough-password',
    ])->assertForbidden();
});

test('guests are asked to save their workspace before paying or changing their account', function () {
    startGuestWorkspace();

    $this->post(route('continue.store'))->assertRedirect(route('save-workspace.create'));
    $this->patch(route('profile.update'), ['name' => 'Avery', 'email' => 'avery@example.com'])
        ->assertRedirect(route('save-workspace.create'));
});

test('unsaved guest workspaces are pruned after a day, saved ones are kept', function () {
    $unsaved = startGuestWorkspace();
    auth()->logout();

    startGuestWorkspace();
    $this->post(route('save-workspace.store'), [
        'email' => 'avery@example.com',
        'password' => 'a-long-enough-password',
        'password_confirmation' => 'a-long-enough-password',
    ]);

    $this->travel(25)->hours();
    $this->artisan('model:prune', ['--model' => Organization::class])->assertSuccessful();

    expect(User::query()->find($unsaved->id))->toBeNull()
        ->and(Organization::query()->pluck('is_guest')->all())->toBe([false])
        ->and(User::query()->where('email', 'avery@example.com')->exists())->toBeTrue();
});

test('browsers that report a fixed-offset timezone can still start a workspace', function () {
    $this->post(route('start.store'), [
        'owner_name' => 'Avery Stone',
        'name' => 'Harbor Street Café',
        'timezone' => 'Etc/GMT+4',
    ])->assertSessionHasNoErrors();

    expect(Organization::query()->sole()->timezone)->toBe('Etc/GMT+4');
});
