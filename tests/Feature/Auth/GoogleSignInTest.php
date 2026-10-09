<?php

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as GoogleUser;

beforeEach(function () {
    config([
        'services.google.client_id' => 'test-client-id',
        'services.google.client_secret' => 'test-client-secret',
    ]);
});

/**
 * Fake Google returning the given account to the callback.
 *
 * @param  array<string, mixed>  $attributes
 */
function fakeGoogleAccount(array $attributes = []): void
{
    Socialite::fake('google', GoogleUser::fake([
        'id' => 'google-123',
        'name' => 'Maya Robinson',
        'email' => 'maya@example.com',
        'email_verified' => true,
        ...$attributes,
    ]));
}

test('the login and register pages offer Google sign-in only when it is configured', function () {
    $this->get(route('login'))->assertInertia(fn (Assert $page) => $page->where('googleSignInEnabled', true));
    $this->get(route('register'))->assertInertia(fn (Assert $page) => $page->where('googleSignInEnabled', true));

    config(['services.google.client_id' => null]);

    $this->get(route('login'))->assertInertia(fn (Assert $page) => $page->where('googleSignInEnabled', false));
    $this->get(route('auth.google.redirect'))->assertNotFound();
});

test('a new Google user gets a verified account and is logged in', function () {
    fakeGoogleAccount();

    $this->get(route('auth.google.callback'))->assertRedirect(route('dashboard', absolute: false));

    $user = User::firstWhere('email', 'maya@example.com');

    expect($user->name)->toBe('Maya Robinson')
        ->and($user->google_id)->toBe('google-123')
        ->and($user->hasVerifiedEmail())->toBeTrue();
    $this->assertAuthenticatedAs($user);
});

test('an existing account is linked by email and keeps its password', function () {
    $user = User::factory()->create(['email' => 'maya@example.com']);
    fakeGoogleAccount();

    $this->get(route('auth.google.callback'));

    $this->assertAuthenticatedAs($user);
    expect($user->fresh()->google_id)->toBe('google-123')
        ->and(Hash::check('password', $user->fresh()->password))->toBeTrue()
        ->and(User::count())->toBe(1);
});

test('linking an unverified account verifies it and locks out its old password and sessions', function () {
    $user = User::factory()->unverified()->create(['email' => 'maya@example.com']);
    DB::table('sessions')->insert([
        'id' => 'squatter-session', 'user_id' => $user->id, 'payload' => '', 'last_activity' => now()->timestamp,
    ]);
    fakeGoogleAccount();

    $this->get(route('auth.google.callback'));

    $this->assertAuthenticatedAs($user);
    expect($user->fresh()->hasVerifiedEmail())->toBeTrue()
        ->and(Hash::check('password', $user->fresh()->password))->toBeFalse()
        ->and(DB::table('sessions')->where('id', 'squatter-session')->exists())->toBeFalse();
});

test('a Google account without a verified email is refused', function () {
    User::factory()->create(['email' => 'maya@example.com']);
    fakeGoogleAccount(['email_verified' => false]);

    $this->get(route('auth.google.callback'))
        ->assertRedirect(route('login'))
        ->assertSessionHasErrors('email');

    $this->assertGuest();
});

test('users with two-factor authentication still have to pass the challenge', function () {
    $user = User::factory()->withTwoFactor()->create(['email' => 'maya@example.com']);
    fakeGoogleAccount();

    $this->get(route('auth.google.callback'))
        ->assertRedirect(route('two-factor.login'))
        ->assertSessionHas('login.id', $user->id);

    $this->assertGuest();
});

test('a failed or cancelled Google sign-in returns to the login page', function () {
    Socialite::shouldReceive('driver->user')->andThrow(new RuntimeException('access_denied'));

    $this->get(route('auth.google.callback'))
        ->assertRedirect(route('login'))
        ->assertSessionHasErrors('email');

    $this->assertGuest();
});
