<?php

namespace App\Http\Middleware;

use App\Enums\Feature;
use App\Support\CurrentOrganization;
use Closure;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

/**
 * Restricts a route to organizations whose plan includes the given feature.
 */
class EnsureFeature
{
    public function __construct(private CurrentOrganization $currentOrganization) {}

    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next, string $feature): Response
    {
        $feature = Feature::from($feature);

        if ($this->currentOrganization->get()?->hasFeature($feature)) {
            return $next($request);
        }

        if (! $request->isMethod('GET')) {
            abort(403, __(':feature is not included in your plan.', ['feature' => $feature->label()]));
        }

        return Inertia::render('upgrade', [
            'feature' => $feature->label(),
            'requiredPlan' => $feature->minimumPlan()->label(),
        ])->toResponse($request);
    }
}
