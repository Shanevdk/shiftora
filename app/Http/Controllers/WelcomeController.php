<?php

namespace App\Http\Controllers;

use App\Enums\Plan;
use Inertia\Inertia;
use Inertia\Response;

class WelcomeController extends Controller
{
    /**
     * The page title, before the app layout appends " - Shiftora".
     */
    private const string PAGE_TITLE = 'Employee Time Clock, Scheduling & Timesheets';

    /**
     * Show the marketing landing page with plan pricing.
     */
    public function __invoke(): Response
    {
        $trialDays = config('shiftora.trial_days');

        return Inertia::render('welcome', [
            'pageTitle' => self::PAGE_TITLE,
            'plans' => array_map(fn (Plan $plan): array => $plan->toArray(), Plan::cases()),
            'trialDays' => $trialDays,
        ])->withViewData([
            // Rendered into the HTML itself, so search engines and link previews see them without running JavaScript.
            'metaTitle' => self::PAGE_TITLE.' - '.config('app.name'),
            'metaDescription' => 'Simple time clock, shift scheduling and timesheet software for hourly teams. '
                ."Clock in from any phone, publish schedules and export payroll. Free {$trialDays}-day trial.",
        ]);
    }
}
