<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Fortify\Events\TwoFactorAuthenticationChallenged;
use Laravel\Socialite\Contracts\User as GoogleUser;
use Laravel\Socialite\Facades\Socialite;
use Symfony\Component\HttpFoundation\RedirectResponse as SymfonyRedirectResponse;
use Throwable;

class GoogleAuthController extends Controller
{
    /**
     * Send the visitor to Google to choose an account.
     */
    public function redirect(): SymfonyRedirectResponse
    {
        abort_unless(self::isConfigured(), 404);

        return Socialite::driver('google')->redirect();
    }

    /**
     * Log in (or sign up) the person Google sent back.
     */
    public function callback(Request $request): RedirectResponse
    {
        abort_unless(self::isConfigured(), 404);

        try {
            $googleUser = Socialite::driver('google')->user();
        } catch (Throwable $exception) {
            // Cancelled consent, an expired state, or a Google outage all land here.
            report($exception);

            return $this->failed('Google sign-in was cancelled or failed. Please try again.');
        }

        $isEmailVerifiedByGoogle = (bool) ($googleUser->getRaw()['email_verified'] ?? false);

        if (blank($googleUser->getEmail()) || ! $isEmailVerifiedByGoogle) {
            return $this->failed('Your Google account needs a verified email address to sign in.');
        }

        $user = $this->findOrCreateUser($googleUser);

        if ($user->hasEnabledTwoFactorAuthentication()) {
            $request->session()->put(['login.id' => $user->getKey(), 'login.remember' => true]);

            TwoFactorAuthenticationChallenged::dispatch($user);

            return redirect()->route('two-factor.login');
        }

        Auth::login($user, remember: true);
        $request->session()->regenerate();

        return redirect()->intended(config('fortify.home'));
    }

    /**
     * Whether Google sign-in credentials have been configured.
     */
    public static function isConfigured(): bool
    {
        return filled(config('services.google.client_id')) && filled(config('services.google.client_secret'));
    }

    /**
     * Match the Google account to a user by Google ID, then by email, or create one.
     *
     * Matching by email is safe because Google has verified the address.
     */
    private function findOrCreateUser(GoogleUser $googleUser): User
    {
        $user = User::query()->where('google_id', $googleUser->getId())->first()
            ?? User::query()->where('email', Str::lower($googleUser->getEmail()))->first();

        if ($user === null) {
            $user = new User([
                'name' => $googleUser->getName() ?: Str::before($googleUser->getEmail(), '@'),
                'email' => Str::lower($googleUser->getEmail()),
                // Google-only accounts can set a real password later via "Forgot password".
                'password' => Str::password(32),
            ]);
        } elseif (! $user->hasVerifiedEmail()) {
            // Someone else may have registered this address without owning it. Google just proved
            // who the owner is, so lock out whoever knows the unverified account's password.
            $user->forceFill(['password' => Str::password(32), 'remember_token' => null]);
            DB::table(config('session.table'))->where('user_id', $user->getKey())->delete();
        }

        $user->forceFill([
            'google_id' => $googleUser->getId(),
            'email_verified_at' => $user->email_verified_at ?? now(),
        ])->save();

        return $user;
    }

    /**
     * Return to the login page with an error under the email field.
     */
    private function failed(string $message): RedirectResponse
    {
        return redirect()->route('login')->withErrors(['email' => $message]);
    }
}
