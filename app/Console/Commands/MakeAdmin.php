<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

#[Signature('shiftora:make-admin
    {email : Email address of the admin account}
    {--name= : Name to use if the account has to be created}
    {--revoke : Remove admin access instead of granting it}')]
#[Description('Grant (or revoke) access to the Shiftora admin dashboard, creating the account if needed')]
class MakeAdmin extends Command
{
    public function handle(): int
    {
        $email = Str::lower(trim((string) $this->argument('email')));

        if (Validator::make(['email' => $email], ['email' => ['required', 'email']])->fails()) {
            $this->error("\"{$email}\" is not a valid email address.");

            return self::FAILURE;
        }

        $user = User::query()->where('email', $email)->first();

        if ($this->option('revoke')) {
            return $this->revoke($user, $email);
        }

        if ($user?->is_demo) {
            $this->error('Demo accounts cannot be admins.');

            return self::FAILURE;
        }

        if ($user !== null) {
            $user->forceFill(['is_admin' => true])->save();
            $this->info("{$email} is now an admin. Log in as usual and open /admin.");

            return self::SUCCESS;
        }

        $password = Str::password(20);

        User::query()->create([
            'name' => $this->option('name') ?: Str::headline(Str::before($email, '@')),
            'email' => $email,
            'password' => $password,
        ])->forceFill(['is_admin' => true, 'email_verified_at' => now()])->save();

        $this->info("Created admin account {$email}.");
        $this->line("Temporary password: {$password}");
        $this->warn('This password is only shown once. Change it under Settings > Security after logging in.');

        return self::SUCCESS;
    }

    private function revoke(?User $user, string $email): int
    {
        if ($user === null) {
            $this->error("No account uses {$email}.");

            return self::FAILURE;
        }

        $user->forceFill(['is_admin' => false])->save();
        $this->info("{$email} is no longer an admin.");

        return self::SUCCESS;
    }
}
