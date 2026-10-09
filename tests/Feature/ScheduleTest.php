<?php

use App\Enums\Plan;
use App\Enums\Role;
use App\Models\Organization;
use App\Models\Shift;
use App\Notifications\SchedulePublished;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->travelTo('2026-10-09 12:00:00');

    $this->organization = Organization::factory()->create(['timezone' => 'America/Toronto']);
    $this->manager = member(Role::Manager, $this->organization);
    $this->worker = member(Role::Employee, $this->organization);
    $this->employee = $this->worker->currentEmployee;
});

test('a manager schedules a shift using local times, including overnight shifts', function () {
    $this->actingAs($this->manager)
        ->post(route('shifts.store'), [
            'employee_id' => $this->employee->id,
            'date' => '2026-10-13',
            'start_time' => '22:00',
            'end_time' => '06:00',
            'break_minutes' => 30,
        ])
        ->assertSessionHasNoErrors();

    $shift = Shift::query()->sole();

    expect($shift->starts_at->toDateTimeString())->toBe('2026-10-14 02:00:00')
        ->and($shift->ends_at->toDateTimeString())->toBe('2026-10-14 10:00:00')
        ->and($shift->published_at)->toBeNull();
});

test('overlapping shifts for the same employee are rejected', function () {
    Shift::factory()->for($this->employee)->create([
        'starts_at' => '2026-10-13 13:00:00',
        'ends_at' => '2026-10-13 21:00:00',
    ]);

    $this->actingAs($this->manager)
        ->post(route('shifts.store'), [
            'employee_id' => $this->employee->id,
            'date' => '2026-10-13',
            'start_time' => '15:00',
            'end_time' => '19:00',
        ])
        ->assertSessionHasErrors(['start_time' => 'This employee already has a shift during that time.']);
});

test('employees only see published shifts and cannot create them', function () {
    Shift::factory()->for($this->employee)->published()->create(['starts_at' => '2026-10-06 13:00:00', 'ends_at' => '2026-10-06 21:00:00']);
    Shift::factory()->for($this->employee)->create(['starts_at' => '2026-10-07 13:00:00', 'ends_at' => '2026-10-07 21:00:00']);

    $this->actingAs($this->worker)
        ->get(route('schedule.index', ['week' => '2026-10-05']))
        ->assertInertia(fn (Assert $page) => $page
            ->component('schedule/index')
            ->has('shifts', 1)
            ->where('can.manage', false));

    $this->post(route('shifts.store'), ['date' => '2026-10-08', 'start_time' => '09:00', 'end_time' => '17:00'])->assertForbidden();
});

test('dragging a shift moves it to another day and employee while keeping its local times', function () {
    $other = member(Role::Employee, $this->organization)->currentEmployee;
    $shift = Shift::factory()->for($this->employee)->create(['starts_at' => '2026-10-13 13:00:00', 'ends_at' => '2026-10-13 21:00:00']);

    $this->actingAs($this->manager)
        ->patch(route('shifts.move', $shift), ['employee_id' => $other->id, 'date' => '2026-10-15'])
        ->assertSessionHasNoErrors();

    expect($shift->refresh())
        ->employee_id->toBe($other->id)
        ->and($shift->starts_at->toDateTimeString())->toBe('2026-10-15 13:00:00')
        ->and($shift->ends_at->toDateTimeString())->toBe('2026-10-15 21:00:00');
});

test('starter organizations get the time clock but no scheduling', function () {
    $this->organization->update(['plan' => Plan::Starter]);

    $this->actingAs($this->manager)
        ->get(route('schedule.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('upgrade')
            ->where('feature', 'Shift scheduling')
            ->where('requiredPlan', 'Professional'));

    $this->post(route('shifts.store'), [
        'employee_id' => $this->employee->id,
        'date' => '2026-10-13',
        'start_time' => '09:00',
        'end_time' => '17:00',
    ])->assertForbidden();

    $this->get(route('time-clock.show'))
        ->assertInertia(fn (Assert $page) => $page->component('time-clock')->where('todayShift', null));

    expect(Shift::query()->count())->toBe(0);
});

test('drag and drop scheduling requires the professional plan', function () {
    $this->organization->update(['plan' => Plan::Starter]);
    $shift = Shift::factory()->for($this->employee)->create();

    $this->actingAs($this->manager)
        ->patch(route('shifts.move', $shift), ['employee_id' => null, 'date' => '2026-10-15'])
        ->assertForbidden();
});

test('publishing the week notifies each scheduled employee once', function () {
    Notification::fake();

    Shift::factory()->for($this->employee)->count(2)->sequence(
        ['starts_at' => '2026-10-13 13:00:00', 'ends_at' => '2026-10-13 21:00:00'],
        ['starts_at' => '2026-10-14 13:00:00', 'ends_at' => '2026-10-14 21:00:00'],
    )->create();

    $this->actingAs($this->manager)
        ->post(route('schedule.publish'), ['week' => '2026-10-12'])
        ->assertSessionHasNoErrors();

    expect(Shift::query()->whereNull('published_at')->count())->toBe(0);

    Notification::assertSentToTimes($this->worker, SchedulePublished::class, 1);
    Notification::assertSentTo($this->worker, fn (SchedulePublished $notification) => $notification->shiftCount === 2);
});
