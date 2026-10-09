<?php

namespace App\Http\Middleware;

use App\Models\User;
use App\Support\CurrentOrganization;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Resolves the organization the user is working in and scopes all tenant data to it.
 *
 * Runs before route model binding so bound models are resolved within the tenant.
 */
class SetCurrentOrganization
{
    public function __construct(private CurrentOrganization $currentOrganization) {}

    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        /** @var User $user */
        $user = $request->user();

        if ($user->currentEmployee === null) {
            $membership = $user->memberships()->with('organization')->oldest()->first();

            if ($membership === null) {
                return to_route('onboarding.create');
            }

            $user->switchOrganization($membership->organization);
        }

        $this->currentOrganization->set($user->currentOrganization);

        return $next($request);
    }

    public function terminate(Request $request, Response $response): void
    {
        $this->currentOrganization->clear();
    }
}
