<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

/**
 * Turns off account and billing changes for visitors exploring the public demo, and sends guests who
 * haven't saved their workspace yet to do that first.
 */
class EnsureNotDemo
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user()?->is_guest) {
            Inertia::flash('toast', [
                'type' => 'info',
                'message' => __('Save your workspace first. It takes a few seconds and keeps everything you have set up.'),
            ]);

            return to_route('save-workspace.create');
        }

        if (! $request->user()?->is_demo) {
            return $next($request);
        }

        Inertia::flash('toast', [
            'type' => 'error',
            'message' => __('That is turned off in the demo. Start a free trial to use it.'),
        ]);

        return back(fallback: route('dashboard'));
    }
}
