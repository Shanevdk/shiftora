<?php

use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('guests can read the privacy policy with the configured contact details', function () {
    config([
        'shiftora.legal.company_name' => 'Shiftora Inc.',
        'shiftora.legal.contact_email' => 'privacy@shiftora.test',
    ]);

    $this->get(route('legal.privacy'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('legal/privacy')
            ->where('companyName', 'Shiftora Inc.')
            ->where('contactEmail', 'privacy@shiftora.test')
            ->where('lastUpdated', config('shiftora.legal.last_updated')));
});

test('the cookie policy names the session cookie actually in use', function () {
    config(['session.cookie' => 'shiftora-session', 'session.lifetime' => 120]);

    $this->get(route('legal.cookies'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('legal/cookies')
            ->where('sessionCookieName', 'shiftora-session')
            ->where('sessionLifetimeMinutes', 120));
});

test('signed-in users without an organization can still read the policies', function () {
    $this->actingAs(User::factory()->create());

    $this->get(route('legal.privacy'))->assertOk();
    $this->get(route('legal.cookies'))->assertOk();
});
