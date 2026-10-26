<?php

namespace App\Http\Middleware;

use App\Support\CurrentOrganization;
use Closure;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

/**
 * Turns the workspace read-only once the organization's trial or subscription has lapsed.
 *
 * Everyone can still look at their schedules, time and timesheets, so nothing feels lost, but every
 * change is refused until the owner continues with a plan.
 */
class EnsureActiveSubscription
{
    public function __construct(private CurrentOrganization $currentOrganization) {}

    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $organization = $this->currentOrganization->get();

        if ($organization === null || ! $organization->isReadOnly() || $request->isMethodSafe()) {
            return $next($request);
        }

        $canContinue = $request->user()->can('manageBilling', $organization);
        $hadSubscription = $organization->subscription(config('shiftora.subscription_type')) !== null;

        $message = match (true) {
            ! $canContinue => __('Your workspace is read-only until your account owner continues with Shiftora.'),
            $hadSubscription => __('Your subscription has ended, so your workspace is read-only. Continue with Shiftora to keep your data going.'),
            default => __('Your free trial has ended, so your workspace is read-only. Continue with Shiftora to keep your data going.'),
        };

        if ($request->expectsJson()) {
            abort(403, $message);
        }

        Inertia::flash('toast', ['type' => 'error', 'message' => $message]);

        return $canContinue ? to_route('continue.show') : back(fallback: route('dashboard'));
    }
}
