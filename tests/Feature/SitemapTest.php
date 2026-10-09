<?php

test('the sitemap lists the public pages as valid XML', function () {
    $response = $this->get('/sitemap.xml');

    $response->assertOk()->assertHeader('Content-Type', 'application/xml; charset=UTF-8');

    $sitemap = simplexml_load_string($response->getContent());
    $urls = array_map('strval', $sitemap->xpath('//*[local-name()="loc"]'));

    expect($urls)->toBe([
        route('home'),
        route('register'),
        route('login'),
        route('legal.privacy'),
        route('legal.cookies'),
    ]);
});

test('robots.txt points crawlers to the sitemap and away from the app', function () {
    $this->get('/robots.txt')
        ->assertOk()
        ->assertHeader('Content-Type', 'text/plain; charset=UTF-8')
        ->assertSee('Sitemap: '.route('sitemap'), escape: false)
        ->assertSee('Disallow: /dashboard', escape: false);
});
