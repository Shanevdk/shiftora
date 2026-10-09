<?php

use App\Http\Controllers\Settings\BillingController;
use App\Http\Controllers\Settings\LocationController;
use App\Http\Controllers\Settings\OrganizationController;
use App\Http\Controllers\Settings\ProfileController;
use App\Http\Controllers\Settings\SecurityController;
use Illuminate\Auth\Middleware\RequirePassword;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth'])->group(function () {
    Route::get('settings', fn () => to_route('profile.edit'));

    Route::get('settings/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('settings/profile', [ProfileController::class, 'update'])->middleware('not-demo')->name('profile.update');
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::delete('settings/profile', [ProfileController::class, 'destroy'])->middleware('not-demo')->name('profile.destroy');

    Route::get('settings/security', [SecurityController::class, 'edit'])
        ->middleware(['not-demo', RequirePassword::class])
        ->name('security.edit');

    Route::put('settings/password', [SecurityController::class, 'update'])
        ->middleware(['not-demo', 'throttle:6,1'])
        ->name('user-password.update');

    Route::inertia('settings/appearance', 'settings/appearance')->name('appearance.edit');

    Route::middleware('organization')->group(function () {
        Route::get('settings/billing', [BillingController::class, 'edit'])->name('billing.edit');

        Route::middleware('not-demo')->group(function () {
            Route::post('settings/billing/checkout', [BillingController::class, 'checkout'])->name('billing.checkout');
            Route::put('settings/billing/plan', [BillingController::class, 'swap'])->name('billing.swap');
            Route::get('settings/billing/portal', [BillingController::class, 'portal'])->name('billing.portal');
        });

        Route::middleware('subscribed')->group(function () {
            Route::get('settings/organization', [OrganizationController::class, 'edit'])->name('organization.edit');
            Route::patch('settings/organization', [OrganizationController::class, 'update'])->name('organization.update');
            Route::post('settings/organization/logo', [OrganizationController::class, 'updateLogo'])->middleware('not-demo')->name('organization.logo.update');
            Route::delete('settings/organization/logo', [OrganizationController::class, 'destroyLogo'])->name('organization.logo.destroy');

            Route::get('settings/locations', [LocationController::class, 'index'])->name('locations.index');
            Route::post('settings/locations', [LocationController::class, 'store'])->name('locations.store');
            Route::put('settings/locations/{location}', [LocationController::class, 'update'])->name('locations.update');
            Route::delete('settings/locations/{location}', [LocationController::class, 'destroy'])->name('locations.destroy');
        });
    });
});

Route::get('.well-known/passkey-endpoints', function () {
    return response()->json([
        'enroll' => route('security.edit'),
        'manage' => route('security.edit'),
    ]);
})->name('well-known.passkeys');
