<?php

use App\Enums\Role;
use App\Models\Employee;
use App\Models\Location;
use App\Models\Shift;
use App\Models\TimeEntry;
use App\Models\Timesheet;

beforeEach(function () {
    $this->owner = member(Role::Owner);
    $this->otherEmployee = Employee::factory()->create();
});

test('records from another organization are not found', function (Closure $request) {
    $this->actingAs($this->owner);

    $request($this)->assertNotFound();
})->with([
    'edit employee' => [fn ($test) => $test->get(route('employees.edit', $test->otherEmployee))],
    'update employee' => [fn ($test) => $test->put(route('employees.update', $test->otherEmployee), ['first_name' => 'X', 'last_name' => 'Y', 'role' => 'employee'])],
    'deactivate employee' => [fn ($test) => $test->patch(route('employees.status.update', $test->otherEmployee), ['is_active' => false])],
    'view timesheet' => [fn ($test) => $test->get(route('timesheets.show', $test->otherEmployee))],
    'approve timesheet' => [fn ($test) => $test->post(route('timesheets.approve', Timesheet::factory()->for($test->otherEmployee)->submitted()->create()))],
    'edit time entry' => [fn ($test) => $test->delete(route('time-entries.destroy', TimeEntry::factory()->for($test->otherEmployee)->create()))],
    'edit shift' => [fn ($test) => $test->delete(route('shifts.destroy', Shift::factory()->for($test->otherEmployee)->create()))],
    'edit location' => [fn ($test) => $test->delete(route('locations.destroy', Location::factory()->for($test->otherEmployee->organization)->create()))],
]);

test('employees from another organization cannot be scheduled or given time', function () {
    $this->actingAs($this->owner)
        ->post(route('shifts.store'), ['employee_id' => $this->otherEmployee->id, 'date' => '2026-10-13', 'start_time' => '09:00', 'end_time' => '17:00'])
        ->assertSessionHasErrors('employee_id');

    $this->post(route('time-entries.store'), ['employee_id' => $this->otherEmployee->id, 'clock_in_at' => '2026-10-06T09:00', 'clock_out_at' => '2026-10-06T17:00'])
        ->assertSessionHasErrors('employee_id');

    expect(Shift::query()->withoutGlobalScopes()->count())->toBe(0)
        ->and(TimeEntry::query()->withoutGlobalScopes()->count())->toBe(0);
});

test('team lists only include the current organization', function () {
    $this->actingAs($this->owner)
        ->get(route('employees.index'))
        ->assertInertia(fn ($page) => $page
            ->has('employees.data', 1)
            ->where('employees.data.0.id', $this->owner->currentEmployee->id));
});
