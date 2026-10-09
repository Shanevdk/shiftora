<?php

namespace App\Listeners;

use Illuminate\Auth\Events\Login;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\RateLimiter;
use Throwable;

/**
 * Emails a fresh verification link whenever an unverified user logs in.
 *
 * Throttled per user so repeated logins don't flood their inbox; the "Resend" button on
 * the verification screen is unaffected and always available.
 */
class SendVerificationEmailOnLogin
{
    /**
     * How long to wait before another login may send another link.
     */
    public const int THROTTLE_SECONDS = 600;

    public function handle(Login $event): void
    {
        $user = $event->user;

        if (! $user instanceof MustVerifyEmail || $user->hasVerifiedEmail()) {
            return;
        }

        // Registration logs the new user straight in, and has already sent them a link.
        if ($user instanceof Model && $user->wasRecentlyCreated) {
            return;
        }

        $throttleKey = 'verification-email-on-login:'.$user->getAuthIdentifier();

        if (RateLimiter::tooManyAttempts($throttleKey, 1)) {
            return;
        }

        RateLimiter::hit($throttleKey, self::THROTTLE_SECONDS);

        // A mail outage must never stop someone from logging in.
        try {
            $user->sendEmailVerificationNotification();
        } catch (Throwable $exception) {
            report($exception);
        }
    }
}
