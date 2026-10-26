<?php

namespace App\Http\Controllers;

use App\Actions\Organizations\SaveGuestWorkspace;
use App\Http\Requests\SaveWorkspaceRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Where a guest keeps the workspace they built by giving it a login.
 */
class SaveWorkspaceController extends Controller
{
    public function create(Request $request): Response|RedirectResponse
    {
        if (! $request->user()->is_guest) {
            return to_route('dashboard');
        }

        return Inertia::render('save-workspace', [
            'passwordRules' => Password::defaults()->toPasswordRulesString(),
            'pendingInvitations' => $request->user()->currentOrganization
                ?->employees()
                ->where('is_active', true)
                ->whereNull('user_id')
                ->whereNull('invited_at')
                ->whereNotNull('email')
                ->count() ?? 0,
        ]);
    }

    public function store(SaveWorkspaceRequest $request, SaveGuestWorkspace $saveGuestWorkspace): RedirectResponse
    {
        $invitationsSent = $saveGuestWorkspace->handle($request->user(), [
            'email' => $request->string('email')->toString(),
            'password' => $request->string('password')->toString(),
        ]);

        $this->toast($invitationsSent > 0
            ? trans_choice('Your workspace is saved, and :count invite is on its way.|Your workspace is saved, and :count invites are on their way.', $invitationsSent)
            : __('Your workspace is saved. Log in with :email from now on.', ['email' => $request->string('email')->toString()]));

        return to_route('dashboard');
    }
}
