<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;

class LegalController extends Controller
{
    /**
     * Show the privacy policy.
     */
    public function privacy(): Response
    {
        return Inertia::render('legal/privacy', $this->legalDetails());
    }

    /**
     * Show the cookie policy.
     */
    public function cookies(): Response
    {
        return Inertia::render('legal/cookies', [
            ...$this->legalDetails(),
            'sessionCookieName' => config('session.cookie'),
            'sessionLifetimeMinutes' => (int) config('session.lifetime'),
        ]);
    }

    /**
     * The company details both policies are written against.
     *
     * @return array{companyName: string, contactEmail: string, lastUpdated: string}
     */
    private function legalDetails(): array
    {
        return [
            'companyName' => config('shiftora.legal.company_name'),
            'contactEmail' => config('shiftora.legal.contact_email'),
            'lastUpdated' => config('shiftora.legal.last_updated'),
        ];
    }
}
