<?php

namespace App\Http\Middleware;

use App\Enums\Plan;
use App\Support\CurrentOrganization;
use Closure;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

/**
 * Turns a free workspace read-only while it has more active people than the free plan allows.
 *
 * Everyone can still look at their schedules, time and timesheets, so nothing feels lost, but every
 * change is refused until people are deactivated (which stays allowed) or the owner picks a paid plan.
 */
class EnsureActiveSubscription
{
    /**
     * Changes that get a read-only workspace back under the free plan's limit.
     *
     * @var list<string>
     */
    private const ALLOWED_WHILE_READ_ONLY = ['employees.status.update'];

    public function __construct(private CurrentOrganization $currentOrganization) {}

    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $organization = $this->currentOrganization->get();

        if ($organization === null
            || $request->isMethodSafe()
            || $request->routeIs(self::ALLOWED_WHILE_READ_ONLY)
            || ! $organization->isReadOnly()) {
            return $next($request);
        }

        $user = $request->user();
        $canPay = $user->can('manageBilling', $organization);
        $canDeactivate = $user->currentRole()?->canManageEmployees() ?? false;
        $limits = ['count' => $organization->activeEmployeeCount(), 'limit' => Plan::Free->employeeLimit()];

        $message = match (true) {
            $canPay => __(':count people are active and the free plan covers :limit. Deactivate people on the Team page or continue with a paid plan.', $limits),
            $canDeactivate => __(':count people are active and the free plan covers :limit. Deactivate people on the Team page, or ask your account owner to pick a paid plan.', $limits),
            default => __('Your workspace is read-only until your account owner sorts out the plan.'),
        };

        if ($request->expectsJson()) {
            abort(403, $message);
        }

        Inertia::flash('toast', ['type' => 'error', 'message' => $message]);

        return match (true) {
            $canPay => to_route('continue.show'),
            $canDeactivate => to_route('employees.index'),
            default => back(fallback: route('dashboard')),
        };
    }
}
