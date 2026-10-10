<?php

use Inertia\Testing\AssertableInertia as Assert;

test('returns a successful response', function () {
    $response = $this->get(route('home'));

    $response->assertOk();
});

test('the homepage has a descriptive title and meta description in its HTML', function () {
    config(['shiftora.trial_days' => 14]);

    $this->get(route('home'))
        ->assertSee('<title>Employee Time Clock, Scheduling &amp; Timesheets - Shiftora</title>', escape: false)
        ->assertSee('<meta name="description" content="Simple time clock, shift scheduling and timesheet software for hourly teams.', escape: false)
        ->assertSee('Free 14-day trial.', escape: false)
        ->assertSee('<meta property="og:title"', escape: false);
});

test('other pages do not reuse the homepage description', function () {
    $this->get(route('login'))->assertDontSee('<meta name="description"', escape: false);
});

test('the homepage shows the free-until banner date only while the promotion runs', function () {
    config(['shiftora.free_until' => now()->addMonth()->toDateString()]);

    $this->get(route('home'))->assertInertia(fn (Assert $page) => $page->where('freeUntil', now()->addMonth()->toDateString()));

    config(['shiftora.free_until' => now()->subDay()->toDateString()]);

    $this->get(route('home'))->assertInertia(fn (Assert $page) => $page->where('freeUntil', null));
});

test('the homepage tells search engines which logo to show', function () {
    $html = $this->get(route('home'))->getContent();

    preg_match('#<script type="application/ld\+json">(.*?)</script>#s', $html, $matches);
    $structuredData = json_decode(trim($matches[1]), true, flags: JSON_THROW_ON_ERROR);
    $organization = $structuredData['@graph'][0];

    expect($structuredData['@context'])->toBe('https://schema.org')
        ->and($organization['@type'])->toBe('Organization')
        ->and($organization['logo'])->toBe(asset('logo.png'))
        ->and(file_exists(public_path('logo.png')))->toBeTrue()
        ->and($html)->toContain('href="/favicon-192.png" type="image/png" sizes="192x192"')
        ->and(getimagesize(public_path('favicon-192.png'))[0])->toBe(192)
        ->and(getimagesize(public_path('favicon-48.png'))[0])->toBe(48);
});
