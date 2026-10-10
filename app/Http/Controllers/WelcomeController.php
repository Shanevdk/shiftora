<?php

namespace App\Http\Controllers;

use App\Enums\Plan;
use App\Models\Organization;
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
            'freeUntil' => Organization::onFreePromotion() ? Organization::freeUntil()->toDateString() : null,
        ])->withViewData([
            // Rendered into the HTML itself, so search engines and link previews see them without running JavaScript.
            'metaTitle' => self::PAGE_TITLE.' - '.config('app.name'),
            'metaDescription' => 'Simple time clock, shift scheduling and timesheet software for hourly teams. '
                ."Clock in from any phone, publish schedules and export payroll. Free {$trialDays}-day trial.",
            'structuredData' => $this->structuredData(),
        ]);
    }

    /**
     * Schema.org data that tells Google which name and logo to show for Shiftora in search results.
     */
    private function structuredData(): string
    {
        $organizationId = url('/').'#organization';

        return json_encode([
            '@context' => 'https://schema.org',
            '@graph' => [
                [
                    '@type' => 'Organization',
                    '@id' => $organizationId,
                    'name' => config('app.name'),
                    'url' => url('/'),
                    'logo' => asset('logo.png'),
                ],
                [
                    '@type' => 'WebSite',
                    'name' => config('app.name'),
                    'url' => url('/'),
                    'publisher' => ['@id' => $organizationId],
                ],
            ],
        ], JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_THROW_ON_ERROR);
    }
}
