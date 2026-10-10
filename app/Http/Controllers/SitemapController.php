<?php

namespace App\Http\Controllers;

use Illuminate\Http\Response;

class SitemapController extends Controller
{
    /**
     * List the public pages for search engines.
     */
    public function index(): Response
    {
        $policiesUpdatedAt = config('shiftora.legal.last_updated');

        return response()
            ->view('sitemap', ['pages' => [
                ['url' => route('home'), 'changefreq' => 'weekly', 'priority' => '1.0', 'lastmod' => null],
                ['url' => route('register'), 'changefreq' => 'monthly', 'priority' => '0.8', 'lastmod' => null],
                ['url' => route('login'), 'changefreq' => 'monthly', 'priority' => '0.5', 'lastmod' => null],
                ['url' => route('legal.privacy'), 'changefreq' => 'yearly', 'priority' => '0.3', 'lastmod' => $policiesUpdatedAt],
                ['url' => route('legal.cookies'), 'changefreq' => 'yearly', 'priority' => '0.3', 'lastmod' => $policiesUpdatedAt],
            ]])
            ->header('Content-Type', 'application/xml; charset=UTF-8');
    }

    /**
     * Point crawlers at the sitemap and keep them out of the signed-in app.
     */
    public function robots(): Response
    {
        $disallowedPaths = ['/dashboard', '/time-clock', '/schedule', '/timesheets', '/employees', '/reports', '/audit-log', '/settings', '/onboarding', '/invitations', '/admin'];

        $lines = [
            'User-agent: *',
            ...array_map(fn (string $path): string => "Disallow: {$path}", $disallowedPaths),
            '',
            'Sitemap: '.route('sitemap'),
        ];

        return response(implode("\n", $lines)."\n")->header('Content-Type', 'text/plain; charset=UTF-8');
    }
}
