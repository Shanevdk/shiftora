<?php

use App\Models\User;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Support\Facades\Exceptions;
use Illuminate\Support\Facades\Notification;
use Laravel\Fortify\Features;

beforeEach(function () {
    $this->skipUnlessFortifyHas(Features::emailVerification());
});

/**
 * Log in through the login form, then log back out so the next attempt is a fresh login.
 */
function logInThroughForm(User $user): void
{
    test()->post(route('login.store'), [
        'email' => $user->email,
        'password' => 'password',
    ]);

    test()->assertAuthenticatedAs($user);

    auth()->logout();
}

test('logging in as an unverified user emails a verification link', function () {
    Notification::fake();

    $user = User::factory()->unverified()->create();

    logInThroughForm($user);

    Notification::assertSentToTimes($user, VerifyEmail::class, 1);
});

test('repeated logins are throttled to one verification email', function () {
    Notification::fake();

    $user = User::factory()->unverified()->create();

    logInThroughForm($user);
    logInThroughForm($user);

    Notification::assertSentToTimes($user, VerifyEmail::class, 1);

    $this->travel(11)->minutes();
    logInThroughForm($user);

    Notification::assertSentToTimes($user, VerifyEmail::class, 2);
});

test('verified users are not emailed on login', function () {
    Notification::fake();

    logInThroughForm(User::factory()->create());

    Notification::assertNothingSent();
});

test('registering sends exactly one verification email', function () {
    $this->skipUnlessFortifyHas(Features::registration());

    Notification::fake();

    $this->post(route('register.store'), [
        'name' => 'New Person',
        'email' => 'new@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    Notification::assertSentToTimes(User::firstWhere('email', 'new@example.com'), VerifyEmail::class, 1);
});

test('a mail failure does not block the login', function () {
    Exceptions::fake();

    $user = User::factory()->unverified()->create();

    Notification::shouldReceive('send')->andThrow(new RuntimeException('SMTP is down'));

    $this->post(route('login.store'), [
        'email' => $user->email,
        'password' => 'password',
    ])->assertRedirect(route('dashboard', absolute: false));

    $this->assertAuthenticatedAs($user);
    Exceptions::assertReported(RuntimeException::class);
});
