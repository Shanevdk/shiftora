<?php

use App\Enums\Plan;
use App\Enums\Role;
use App\Models\Location;
use App\Models\Organization;
use App\Models\TimeEntry;
use App\Models\Timesheet;

test('an employee clocks in and the open entry is recorded', function () {
    $user = member(Role::Employee);

    $this->actingAs($user)
        ->post(route('time-clock.clock-in'))
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $entry = TimeEntry::query()->sole();

    expect($entry)
        ->employee_id->toBe($user->currentEmployee->id)
        ->organization_id->toBe($user->current_organization_id)
        ->clock_out_at->toBeNull()
        ->source->toBe(TimeEntry::SOURCE_CLOCK);
});

test('an employee cannot clock in twice', function () {
    $user = member(Role::Employee);

    $this->actingAs($user)->post(route('time-clock.clock-in'));

    $this->post(route('time-clock.clock-in'))->assertSessionHasErrors(['clock' => 'You are already clocked in.']);

    expect(TimeEntry::query()->count())->toBe(1);
});

test('clocking out closes the entry and ends a running break', function () {
    $user = member(Role::Employee);

    $this->travelTo(now()->setTime(9, 0));
    $this->actingAs($user)->post(route('time-clock.clock-in'));

    $this->travelTo(now()->setTime(12, 0));
    $this->post(route('time-clock.break.start'));

    $this->travelTo(now()->setTime(12, 30));
    $this->post(route('time-clock.clock-out'))->assertSessionHasNoErrors();

    $entry = TimeEntry::query()->sole();

    expect($entry->clock_out_at)->not->toBeNull()
        ->and($entry->break_minutes)->toBe(30)
        ->and($entry->workedMinutes())->toBe(180)
        ->and($entry->breaks()->whereNull('ended_at')->exists())->toBeFalse();
});

test('ending a break adds its length to the entry', function () {
    $user = member(Role::Employee);

    $this->travelTo(now()->setTime(9, 0));
    $this->actingAs($user)->post(route('time-clock.clock-in'));
    $this->post(route('time-clock.break.start'));
    $this->post(route('time-clock.break.start'))->assertSessionHasErrors(['clock' => 'You are already on a break.']);

    $this->travelTo(now()->setTime(9, 15));
    $this->delete(route('time-clock.break.end'))->assertSessionHasNoErrors();

    expect(TimeEntry::query()->sole()->break_minutes)->toBe(15);
});

test('an employee cannot clock in to a week whose timesheet is approved', function () {
    $this->travelTo('2026-10-09 09:00:00');
    $user = member(Role::Employee);
    Timesheet::factory()->for($user->currentEmployee)->approved()->create(['period_start' => '2026-10-05', 'period_end' => '2026-10-11']);

    $this->actingAs($user)
        ->post(route('time-clock.clock-in'))
        ->assertSessionHasErrors(['clock' => 'This week\'s timesheet has been approved. Ask a manager to reopen it before clocking in.']);

    expect(TimeEntry::query()->count())->toBe(0);
});

test('clocking out without an open entry is rejected', function () {
    $this->actingAs(member(Role::Employee))
        ->post(route('time-clock.clock-out'))
        ->assertSessionHasErrors(['clock' => 'You are not clocked in.']);
});

describe('geofencing', function () {
    beforeEach(function () {
        $this->organization = Organization::factory()->onPlan(Plan::Business)->create(['geofencing_enabled' => true]);
        $this->location = Location::factory()->for($this->organization)->geofenced(43.6532, -79.3832, 150)->create();
        $this->user = member(Role::Employee, $this->organization);
        $this->user->currentEmployee->update(['location_id' => $this->location->id]);
    });

    test('rejects a clock-in from outside the work location', function () {
        $this->actingAs($this->user)
            ->post(route('time-clock.clock-in'), ['latitude' => 43.70, 'longitude' => -79.42])
            ->assertSessionHasErrors(['location' => 'You need to be at your work location to clock in.']);

        expect(TimeEntry::query()->count())->toBe(0);
    });

    test('requires coordinates when the location has a geofence', function () {
        $this->actingAs($this->user)
            ->post(route('time-clock.clock-in'))
            ->assertSessionHasErrors('location');
    });

    test('accepts a clock-in inside the radius and records the location', function () {
        $this->actingAs($this->user)
            ->post(route('time-clock.clock-in'), ['latitude' => 43.6535, 'longitude' => -79.3830])
            ->assertSessionHasNoErrors();

        expect(TimeEntry::query()->sole())
            ->location_id->toBe($this->location->id)
            ->clock_in_latitude->toBe(43.6535);
    });

    test('is not enforced on plans without geofencing', function () {
        $this->organization->update(['plan' => Plan::Professional]);

        $this->actingAs($this->user)
            ->post(route('time-clock.clock-in'), ['latitude' => 10.0, 'longitude' => 10.0])
            ->assertSessionHasNoErrors();
    });
});

test('deactivated employees lose access to the workspace', function () {
    $user = member(Role::Employee);
    $user->currentEmployee->update(['is_active' => false]);

    $this->actingAs($user->fresh())
        ->post(route('time-clock.clock-in'))
        ->assertRedirect(route('onboarding.create'));

    expect(TimeEntry::query()->count())->toBe(0);
});
