<?php

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
