<?php

namespace App\Http\Controllers;

use App\Concerns\PasswordValidationRules;
use App\Models\Employee;
use App\Models\Scopes\OrganizationScope;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\URL;
use Inertia\Inertia;
use Inertia\Response;

class InvitationController extends Controller
{
    use PasswordValidationRules;

    /**
     * Show the invitation acceptance screen reached from the signed email link.
     */
    public function show(Request $request, int $employee): Response|RedirectResponse
    {
        $invitee = $this->invitee($request, $employee);

        if ($invitee->user_id !== null) {
            $this->toast(__('This invitation has already been accepted. Log in to continue.'), 'info');

            return to_route($request->user() ? 'dashboard' : 'login');
        }

        $user = $request->user();
        $existingAccount = User::query()->where('email', $invitee->email)->exists();

        // Bring the invitee back here after they log in with the right account.
        if ($existingAccount || ($user !== null && $user->email !== $invitee->email)) {
            redirect()->setIntendedUrl($request->fullUrl());
        }

        return Inertia::render('invitations/accept', [
            'invitation' => [
                'first_name' => $invitee->first_name,
                'last_name' => $invitee->last_name,
                'email' => $invitee->email,
                'organization' => $invitee->organization->name,
            ],
            'acceptUrl' => URL::temporarySignedRoute(
                'invitations.store',
                now()->addHour(),
                ['employee' => $invitee->id, 'hash' => $invitee->invitationHash()],
            ),
            'mode' => match (true) {
                $user !== null && $user->email === $invitee->email => 'join',
                $user !== null => 'wrong-account',
                $existingAccount => 'login',
                default => 'register',
            },
        ]);
    }

    /**
     * Accept the invitation, creating a login if the invitee does not have one yet.
     */
    public function store(Request $request, int $employee): RedirectResponse
    {
        $invitee = $this->invitee($request, $employee);

        abort_if($invitee->user_id !== null, 410, __('This invitation has already been accepted.'));

        $user = $request->user();

        if ($user !== null) {
            abort_unless($user->email === $invitee->email, 403, __('This invitation was sent to a different email address.'));
        } else {
            abort_if(User::query()->where('email', $invitee->email)->exists(), 409, __('Log in to accept this invitation.'));

            $validated = $request->validate([
                'name' => ['required', 'string', 'max:255'],
                'password' => $this->passwordRules(),
            ]);

            $user = new User([
                'name' => $validated['name'],
                'email' => $invitee->email,
                'password' => $validated['password'],
            ]);
            $user->forceFill(['email_verified_at' => now()]);
        }

        DB::transaction(function () use ($user, $invitee): void {
            $user->save();
            $invitee->update(['user_id' => $user->id]);
            $user->switchOrganization($invitee->organization);
        });

        Auth::login($user);
        $request->session()->regenerate();

        $this->toast(__('Welcome to :organization!', ['organization' => $invitee->organization->name]));

        return to_route('dashboard');
    }

    /**
     * Find the invited employee, refusing links that were sent to an email address the employee no longer has.
     */
    private function invitee(Request $request, int $employeeId): Employee
    {
        $invitee = Employee::query()
            ->withoutGlobalScope(OrganizationScope::class)
            ->with('organization')
            ->whereKey($employeeId)
            ->where('is_active', true)
            ->whereNotNull('email')
            ->firstOrFail();

        abort_unless(
            hash_equals($invitee->invitationHash(), (string) $request->query('hash')),
            403,
            __('This invitation is no longer valid. Ask your manager to send a new one.'),
        );

        return $invitee;
    }
}
