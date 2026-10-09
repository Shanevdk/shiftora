<?php

use App\Enums\Plan;
use App\Enums\Role;
use App\Enums\TimesheetStatus;
use App\Models\Organization;
use App\Models\TimeEntry;
use App\Models\Timesheet;
use App\Notifications\TimesheetReviewed;
use App\Notifications\TimesheetSubmitted;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->travelTo('2026-10-09 18:00:00');

    $this->organization = Organization::factory()->create(['weekly_overtime_minutes' => 2400, 'daily_overtime_minutes' => 480]);
    $this->manager = member(Role::Manager, $this->organization);
    $this->worker = member(Role::Employee, $this->organization);
    $this->employee = $this->worker->currentEmployee;

    // Monday to Thursday, 10 hours a day with a 30 minute break: 9.5h worked each day.
    foreach (range(5, 8) as $day) {
        TimeEntry::factory()->for($this->employee)->create([
            'clock_in_at' => "2026-10-0{$day} 08:00:00",
            'clock_out_at' => "2026-10-0{$day} 18:00:00",
            'break_minutes' => 30,
        ]);
    }

    $this->timesheet = Timesheet::factory()->for($this->employee)->create([
        'period_start' => '2026-10-05',
        'period_end' => '2026-10-11',
    ]);
});

test('an employee submits their timesheet and approvers are notified', function () {
    Notification::fake();

    $this->actingAs($this->worker)
        ->post(route('timesheets.submit', $this->timesheet))
        ->assertSessionHasNoErrors();

    expect($this->timesheet->refresh())
        ->status->toBe(TimesheetStatus::Submitted)
        ->regular_minutes->toBe(4 * 480)
        ->overtime_minutes->toBe(4 * 90)
        ->break_minutes->toBe(120);

    Notification::assertSentTo($this->manager, TimesheetSubmitted::class);
    Notification::assertNotSentTo($this->worker, TimesheetSubmitted::class);
});

test('a timesheet cannot be submitted while the employee is still clocked in', function () {
    TimeEntry::factory()->for($this->employee)->create(['clock_in_at' => now()->subHour(), 'clock_out_at' => null]);

    $this->actingAs($this->worker)
        ->post(route('timesheets.submit', $this->timesheet))
        ->assertSessionHasErrors(['timesheet' => 'Clock out before submitting this timesheet.']);
});

test('a manager approves a submitted timesheet and the employee is notified', function () {
    Notification::fake();
    $this->timesheet->update(['status' => TimesheetStatus::Submitted]);

    $this->actingAs($this->manager)
        ->post(route('timesheets.approve', $this->timesheet), ['note' => 'Thanks!'])
        ->assertSessionHasNoErrors();

    expect($this->timesheet->refresh())
        ->status->toBe(TimesheetStatus::Approved)
        ->reviewed_by->toBe($this->manager->id)
        ->review_note->toBe('Thanks!');

    Notification::assertSentTo($this->worker, TimesheetReviewed::class);
});

test('a timesheet cannot be approved while the employee is still clocked in', function () {
    Notification::fake();
    $this->timesheet->update(['status' => TimesheetStatus::Submitted]);
    TimeEntry::factory()->for($this->employee)->create(['clock_in_at' => now()->subHour(), 'clock_out_at' => null]);

    $this->actingAs($this->manager)
        ->post(route('timesheets.approve', $this->timesheet))
        ->assertSessionHasErrors(['timesheet' => 'This employee is still clocked in. They need to clock out before the timesheet can be approved.']);

    expect($this->timesheet->refresh()->status)->toBe(TimesheetStatus::Submitted);
    Notification::assertNothingSent();
});

test('rejecting a timesheet requires a note', function () {
    $this->timesheet->update(['status' => TimesheetStatus::Submitted]);

    $this->actingAs($this->manager)
        ->post(route('timesheets.reject', $this->timesheet))
        ->assertSessionHasErrors('note');

    expect($this->timesheet->refresh()->status)->toBe(TimesheetStatus::Submitted);
});

test('employees cannot approve timesheets', function () {
    $this->timesheet->update(['status' => TimesheetStatus::Submitted]);

    $this->actingAs($this->worker)
        ->post(route('timesheets.approve', $this->timesheet))
        ->assertForbidden();
});

test('managers cannot approve their own timesheet', function () {
    $timesheet = Timesheet::factory()->for($this->manager->currentEmployee)->submitted()->create();

    $this->actingAs($this->manager)
        ->post(route('timesheets.approve', $timesheet))
        ->assertForbidden();
});

test('approvals are not available on the starter plan', function () {
    $this->organization->update(['plan' => Plan::Starter]);

    $this->actingAs($this->worker)
        ->post(route('timesheets.submit', $this->timesheet))
        ->assertForbidden();

    expect($this->timesheet->refresh()->status)->toBe(TimesheetStatus::Open);
});

test('overtime is only calculated on plans with overtime rules', function () {
    $this->organization->update(['plan' => Plan::Starter]);

    $this->actingAs($this->worker)
        ->get(route('timesheets.show', ['employee' => $this->employee, 'week' => '2026-10-05']))
        ->assertInertia(fn (Assert $page) => $page
            ->component('timesheets/show')
            ->where('summary.overtime_minutes', 0)
            ->where('summary.worked_minutes', 4 * 570)
            ->where('can.submit', false));
});

test('employees cannot view a colleague\'s timesheet', function () {
    $colleague = member(Role::Employee, $this->organization);

    $this->actingAs($colleague)
        ->get(route('timesheets.show', $this->employee))
        ->assertForbidden();
});
