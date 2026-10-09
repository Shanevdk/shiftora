<?php

use Inertia\Testing\AssertableInertia as Assert;

test('unknown pages render the not found page', function () {
    $this->get('/this-page-does-not-exist')
        ->assertNotFound()
        ->assertInertia(fn (Assert $page) => $page->component('errors/not-found'));
});

test('json requests still receive a json not found response', function () {
    $this->getJson('/this-page-does-not-exist')
        ->assertNotFound()
        ->assertJsonStructure(['message']);
});
