<?php

namespace App\Http\Controllers;

use App\Enums\Plan;
use Inertia\Inertia;
use Inertia\Response;

class WelcomeController extends Controller
{
    /**
     * Show the marketing landing page with plan pricing.
     */
    public function __invoke(): Response
    {
        return Inertia::render('welcome', [
            'plans' => array_map(fn (Plan $plan): array => $plan->toArray(), Plan::cases()),
            'trialDays' => config('shiftora.trial_days'),
        ]);
    }
}
