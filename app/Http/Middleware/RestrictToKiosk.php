<?php

namespace App\Http\Middleware;

use App\Http\Controllers\KioskController;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Keeps a device in kiosk mode on the PIN pad, so employees using it can't reach the
 * signed-in manager's account. Only the kiosk itself and logging out stay available.
 */
class RestrictToKiosk
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user === null || ! $request->session()->has(KioskController::SESSION_KEY) || $request->routeIs('kiosk.*', 'logout')) {
            return $next($request);
        }

        // A lapsed subscription closes the kiosk instead of bouncing between it and billing.
        if (! $user->currentOrganization?->hasActiveAccess()) {
            $request->session()->forget(KioskController::SESSION_KEY);

            return $next($request);
        }

        if ($request->expectsJson()) {
            abort(403, __('This device is in kiosk mode.'));
        }

        return to_route('kiosk.show');
    }
}
