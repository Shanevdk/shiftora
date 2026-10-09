<?php

use App\Enums\Role;
use App\Models\AuditLog;
use App\Models\Organization;
use App\Models\TimeEntry;
use App\Models\Timesheet;

beforeEach(function () {
    $this->travelTo('2026-10-09 18:00:00');

    $this->organization = Organization::factory()->create(['timezone' => 'America/Toronto']);
    $this->manager = member(Role::Manager, $this->organization);
    $this->employee = member(Role::Employee, $this->organization)->currentEmployee;
});

test('a manager adds a manual entry in the organization timezone and it is audited', function () {
    $this->actingAs($this->manager)
        ->post(route('time-entries.store'), [
            'employee_id' => $this->employee->id,
            'clock_in_at' => '2026-10-06T09:00',
            'clock_out_at' => '2026-10-06T17:00',
            'break_minutes' => 30,
            'notes' => 'Forgot to clock in',
        ])
        ->assertSessionHasNoErrors();

    $entry = TimeEntry::query()->sole();

    expect($entry)
        ->source->toBe(TimeEntry::SOURCE_MANUAL)
        ->and($entry->clock_in_at->toDateTimeString())->toBe('2026-10-06 13:00:00')
        ->and($entry->workedMinutes())->toBe(450);

    expect(AuditLog::query()->where('auditable_type', 'time_entry')->sole())
        ->event->toBe('created')
        ->auditable_type->toBe('time_entry')
        ->user_id->toBe($this->manager->id);
});

test('editing an entry keeps the previous values in the audit log', function () {
    $entry = TimeEntry::factory()->for($this->employee)->create([
        'clock_in_at' => '2026-10-06 13:00:00',
        'clock_out_at' => '2026-10-06 21:00:00',
        'break_minutes' => 30,
    ]);

    $this->actingAs($this->manager)
        ->put(route('time-entries.update', $entry), [
            'clock_in_at' => '2026-10-06T09:00',
            'clock_out_at' => '2026-10-06T16:00',
            'break_minutes' => 30,
        ])
        ->assertSessionHasNoErrors();

    $log = AuditLog::query()->where('event', 'updated')->sole();

    expect($log->old_values['clock_out_at'])->toBe('2026-10-06 21:00:00')
        ->and($log->new_values['clock_out_at'])->toBe('2026-10-06 20:00:00');
});

test('entries that overlap another entry are rejected', function () {
    TimeEntry::factory()->for($this->employee)->create([
        'clock_in_at' => '2026-10-06 13:00:00',
        'clock_out_at' => '2026-10-06 21:00:00',
    ]);

    $this->actingAs($this->manager)
        ->post(route('time-entries.store'), [
            'employee_id' => $this->employee->id,
            'clock_in_at' => '2026-10-06T16:00',
            'clock_out_at' => '2026-10-06T18:00',
        ])
        ->assertSessionHasErrors(['clock_in_at' => 'This entry overlaps another entry for the same employee.']);
});

test('clock out must be after clock in', function () {
    $this->actingAs($this->manager)
        ->post(route('time-entries.store'), [
            'employee_id' => $this->employee->id,
            'clock_in_at' => '2026-10-06T16:00',
            'clock_out_at' => '2026-10-06T15:00',
        ])
        ->assertSessionHasErrors(['clock_out_at' => 'Clock out must be after clock in.']);
});

test('entries in an approved week are locked', function () {
    $entry = TimeEntry::factory()->for($this->employee)->create([
        'clock_in_at' => '2026-10-06 13:00:00',
        'clock_out_at' => '2026-10-06 21:00:00',
    ]);
    Timesheet::factory()->for($this->employee)->approved()->create(['period_start' => '2026-10-05', 'period_end' => '2026-10-11']);

    $this->actingAs($this->manager)
        ->delete(route('time-entries.destroy', $entry))
        ->assertForbidden();

    expect($entry->fresh())->not->toBeNull();
});

test('employees cannot edit time entries', function () {
    $entry = TimeEntry::factory()->for($this->employee)->create();

    $this->actingAs($this->employee->user)
        ->put(route('time-entries.update', $entry), [
            'clock_in_at' => '2026-10-06T09:00',
            'clock_out_at' => '2026-10-06T23:00',
        ])
        ->assertForbidden();
});

test('audit log entries cannot be changed or removed', function () {
    $entry = TimeEntry::factory()->for($this->employee)->create();
    $log = AuditLog::query()->where('auditable_type', 'time_entry')->sole();

    $log->update(['event' => 'tampered']);
    $log->delete();

    expect(AuditLog::query()->where('auditable_type', 'time_entry')->sole()->event)->toBe('created')
        ->and($entry->exists)->toBeTrue();
});
