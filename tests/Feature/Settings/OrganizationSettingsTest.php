<?php

use App\Enums\Role;
use App\Models\Organization;
use App\Models\Timesheet;

beforeEach(function () {
    $this->organization = Organization::factory()->create(['timezone' => 'America/Toronto', 'week_starts_on' => 1]);
    $this->owner = member(Role::Owner, $this->organization);
});

test('the pay week can be changed before any timesheet is submitted', function () {
    Timesheet::factory()->for($this->owner->currentEmployee)->create();

    $this->actingAs($this->owner)
        ->patch(route('organization.update'), ['name' => 'Acme', 'timezone' => 'America/Vancouver', 'week_starts_on' => 0])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('organization.edit'));

    expect($this->organization->refresh())
        ->timezone->toBe('America/Vancouver')
        ->week_starts_on->toBe(0);
});

test('the pay week cannot be changed once a timesheet has been submitted', function () {
    Timesheet::factory()->for($this->owner->currentEmployee)->approved()->create();

    $this->actingAs($this->owner)
        ->patch(route('organization.update'), ['name' => 'Acme', 'timezone' => 'America/Vancouver', 'week_starts_on' => 0])
        ->assertSessionHasErrors([
            'timezone' => 'This can\'t be changed after timesheets have been submitted.',
            'week_starts_on' => 'This can\'t be changed after timesheets have been submitted.',
        ]);

    expect($this->organization->refresh())
        ->timezone->toBe('America/Toronto')
        ->week_starts_on->toBe(1);
});

test('other settings can still be saved once the pay week is fixed', function () {
    Timesheet::factory()->for($this->owner->currentEmployee)->approved()->create();

    $this->actingAs($this->owner)
        ->patch(route('organization.update'), ['name' => 'Acme Renamed', 'timezone' => 'America/Toronto', 'week_starts_on' => 1])
        ->assertSessionHasNoErrors();

    expect($this->organization->refresh()->name)->toBe('Acme Renamed');
});
