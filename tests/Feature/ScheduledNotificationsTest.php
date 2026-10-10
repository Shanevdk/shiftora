<?php

use App\Enums\Role;
use App\Models\Organization;
use App\Models\Shift;
use App\Models\TimeEntry;
use App\Notifications\MissedClockOut;
use App\Notifications\ShiftReminder;
use App\Notifications\TrialEnding;
use Illuminate\Support\Facades\Notification;

beforeEach(function () {
    Notification::fake();
});

test('employees are reminded once about published shifts starting within the hour', function () {
    $worker = member(Role::Employee);
    $soon = Shift::factory()->for($worker->currentEmployee)->published()->create(['starts_at' => now()->addMinutes(45), 'ends_at' => now()->addHours(8)]);
    Shift::factory()->for($worker->currentEmployee)->create(['starts_at' => now()->addMinutes(30), 'ends_at' => now()->addHours(4)]);

    $this->artisan('shiftora:send-shift-reminders')->assertSuccessful();
    $this->artisan('shiftora:send-shift-reminders')->assertSuccessful();

    Notification::assertSentToTimes($worker, ShiftReminder::class, 1);
    expect($soon->refresh()->reminder_sent_at)->not->toBeNull();
});

test('managers and the employee hear about entries left open too long', function () {
    $organization = Organization::factory()->create();
    $manager = member(Role::Manager, $organization);
    $worker = member(Role::Employee, $organization);
    TimeEntry::factory()->for($worker->currentEmployee)->create(['clock_in_at' => now()->subHours(15), 'clock_out_at' => null]);

    $this->artisan('shiftora:notify-missed-clock-outs')->assertSuccessful();
    $this->artisan('shiftora:notify-missed-clock-outs')->assertSuccessful();

    Notification::assertSentToTimes($manager, MissedClockOut::class, 1);
    Notification::assertSentToTimes($worker, MissedClockOut::class, 1);
});

test('owners are told when their trial is about to end', function () {
    $owner = member(Role::Owner, Organization::factory()->create(['trial_ends_at' => now()->addHours(12)]));
    member(Role::Owner, Organization::factory()->create(['trial_ends_at' => now()->addDays(10)]));

    $this->artisan('shiftora:send-trial-ending-notices')->assertSuccessful();

    Notification::assertSentTo($owner, TrialEnding::class);
    Notification::assertCount(1);
});
