<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Lets the landing page embed the app in its live demo frame, and nobody else frame it.
 *
 * Laravel Cloud's edge adds "X-Frame-Options: deny" to every response, which would leave the demo
 * frame blank ("refused to connect"). Browsers follow a Content-Security-Policy frame-ancestors
 * policy instead of X-Frame-Options whenever both are present.
 */
class AllowSameOriginFraming
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        if (! $response->headers->has('Content-Security-Policy')) {
            $response->headers->set('Content-Security-Policy', "frame-ancestors 'self'");
        }

        return $response;
    }
}
