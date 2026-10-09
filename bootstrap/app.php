<?php

use App\Http\Middleware\EnsureActiveSubscription;
use App\Http\Middleware\EnsureFeature;
use App\Http\Middleware\EnsureNotDemo;
use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\SetCurrentOrganization;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;
use Illuminate\Routing\Middleware\SubstituteBindings;
use Inertia\ExceptionResponse;
use Inertia\Inertia;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->encryptCookies(except: ['appearance', 'sidebar_state']);

        // Stripe signs its webhooks; Cashier verifies the signature instead of a CSRF token.
        $middleware->validateCsrfTokens(except: ['stripe/*']);

        $middleware->web(append: [
            HandleAppearance::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);

        $middleware->alias([
            'organization' => SetCurrentOrganization::class,
            'subscribed' => EnsureActiveSubscription::class,
            'feature' => EnsureFeature::class,
            'not-demo' => EnsureNotDemo::class,
        ]);

        // Resolve the tenant before route model binding so bound models are scoped to it.
        $middleware->prependToPriorityList(SubstituteBindings::class, SetCurrentOrganization::class);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        Inertia::handleExceptionsUsing(function (ExceptionResponse $response): ?ExceptionResponse {
            if ($response->statusCode() !== 404 || $response->request->is('api/*') || $response->request->expectsJson()) {
                return null;
            }

            return $response->render('errors/not-found');
        });
    })->create();
