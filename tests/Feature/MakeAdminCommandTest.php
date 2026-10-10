<?php

use App\Models\User;
use Illuminate\Support\Facades\Hash;

test('it creates a verified admin account with a one-time password', function () {
    $this->artisan('shiftora:make-admin', ['email' => 'Owner@Shiftora.ca', '--name' => 'Shane'])
        ->expectsOutputToContain('Created admin account owner@shiftora.ca')
        ->expectsOutputToContain('Temporary password:')
        ->assertSuccessful();

    $admin = User::firstWhere('email', 'owner@shiftora.ca');

    expect($admin->name)->toBe('Shane')
        ->and($admin->is_admin)->toBeTrue()
        ->and($admin->hasVerifiedEmail())->toBeTrue();
});

test('it promotes an existing account without touching its password', function () {
    $user = User::factory()->create(['email' => 'shane@example.com']);

    $this->artisan('shiftora:make-admin', ['email' => 'shane@example.com'])
        ->expectsOutputToContain('is now an admin')
        ->assertSuccessful();

    expect($user->fresh()->is_admin)->toBeTrue()
        ->and(Hash::check('password', $user->fresh()->password))->toBeTrue()
        ->and(User::count())->toBe(1);
});

test('it can revoke admin access', function () {
    $user = User::factory()->create(['email' => 'shane@example.com']);
    $user->forceFill(['is_admin' => true])->save();

    $this->artisan('shiftora:make-admin', ['email' => 'shane@example.com', '--revoke' => true])->assertSuccessful();

    expect($user->fresh()->is_admin)->toBeFalse();
});

test('it rejects invalid emails and demo accounts', function () {
    $this->artisan('shiftora:make-admin', ['email' => 'not-an-email'])->assertFailed();

    User::factory()->create(['email' => 'demo@example.com', 'is_demo' => true]);
    $this->artisan('shiftora:make-admin', ['email' => 'demo@example.com'])->assertFailed();

    expect(User::where('is_admin', true)->exists())->toBeFalse();
});
