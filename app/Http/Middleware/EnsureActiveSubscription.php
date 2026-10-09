<?php

namespace App\Http\Middleware;

use App\Support\CurrentOrganization;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Blocks the workspace once the organization's trial or subscription has lapsed.
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

        if ($organization !== null && ! $organization->hasActiveAccess()) {
            return to_route('billing.edit');
        }

        return $next($request);
    }
}
