<?php

use App\Enums\Plan;
use App\Enums\Role;
use App\Models\Employee;
use App\Models\Location;
use App\Models\Organization;
use App\Models\TimeEntry;

/**
 * Put the manager's device into kiosk mode and return an active employee of the same organization.
 */
function startKiosk(object $test, ?Organization $organization = null): array
{
    $manager = member(Role::Manager, $organization);
    $manager->currentOrganization->forceFill(['kiosk_exit_pin' => '2468'])->save();
    $employee = Employee::factory()->for($manager->currentOrganization)->role(Role::Employee)->create();

    $test->actingAs($manager)->get(route('kiosk.show'))->assertOk();

    return [$manager, $employee];
}

test('every employee gets a unique kiosk PIN', function () {
    $organization = Organization::factory()->create();
    $employees = Employee::factory()->for($organization)->count(5)->create();

    expect($employees->pluck('clock_pin')->every(fn (?string $pin): bool => (bool) preg_match('/^\d{4}$/', (string) $pin)))->toBeTrue()
        ->and($employees->pluck('clock_pin')->unique())->toHaveCount(5);
});

test('employees cannot open the kiosk', function () {
    $this->actingAs(member(Role::Employee))->get(route('kiosk.show'))->assertForbidden();
});

test('a PIN shows who is punching in and their clock status', function () {
    [, $employee] = startKiosk($this);

    $this->postJson(route('kiosk.lookup'), ['pin' => $employee->clock_pin])
        ->assertOk()
        ->assertJsonPath('employee.id', $employee->id)
        ->assertJsonPath('employee.clock.is_clocked_in', false);
});

test('an employee clocks in and out on the kiosk with their PIN', function () {
    [, $employee] = startKiosk($this);

    $this->postJson(route('kiosk.punch'), ['pin' => $employee->clock_pin, 'action' => 'clock_in'])
        ->assertOk()
        ->assertJsonPath('employee.clock.is_clocked_in', true);

    $entry = TimeEntry::query()->sole();
    expect($entry->employee_id)->toBe($employee->id)
        ->and($entry->source)->toBe(TimeEntry::SOURCE_KIOSK);

    $this->travel(2)->hours();

    $this->postJson(route('kiosk.punch'), ['pin' => $employee->clock_pin, 'action' => 'clock_out'])
        ->assertOk()
        ->assertJsonPath('employee.clock.is_clocked_in', false);

    expect($entry->refresh()->clock_out_at)->not->toBeNull();
});

test('kiosk clock-ins skip the geofence because the device is on site', function () {
    $organization = Organization::factory()->subscribed(Plan::Business)->create(['geofencing_enabled' => true]);
    $location = Location::factory()->for($organization)->geofenced()->create();
    [, $employee] = startKiosk($this, $organization);
    $employee->update(['location_id' => $location->id]);

    $this->postJson(route('kiosk.punch'), ['pin' => $employee->clock_pin, 'action' => 'clock_in'])->assertOk();

    expect(TimeEntry::query()->sole()->location_id)->toBe($location->id);
});

test('PINs only work for active employees of the same organization', function () {
    [, $employee] = startKiosk($this);
    $outsider = Employee::factory()->create();
    $employee->update(['is_active' => false]);

    $this->postJson(route('kiosk.lookup'), ['pin' => $employee->clock_pin])->assertJsonValidationErrors('pin');

    $this->postJson(route('kiosk.lookup'), ['pin' => $outsider->clock_pin])->assertJsonValidationErrors('pin');

    expect(TimeEntry::query()->exists())->toBeFalse();
});

test('the keypad pauses after too many wrong PINs', function () {
    [, $employee] = startKiosk($this);
    $wrongPin = $employee->clock_pin === '0000' ? '1111' : '0000';

    foreach (range(1, 5) as $attempt) {
        $this->postJson(route('kiosk.lookup'), ['pin' => $wrongPin])->assertJsonValidationErrors('pin');
    }

    $this->postJson(route('kiosk.lookup'), ['pin' => $employee->clock_pin])
        ->assertJsonValidationErrors(['pin' => 'Too many wrong PINs']);
});

test('kiosk mode keeps the device on the keypad until someone enters the organization PIN', function () {
    startKiosk($this);

    $this->get(route('dashboard'))->assertRedirect(route('kiosk.show'));
    $this->get(route('employees.index'))->assertRedirect(route('kiosk.show'));

    $this->delete(route('kiosk.destroy'), ['exit_pin' => '1357'])->assertSessionHasErrors('exit_pin');
    $this->get(route('dashboard'))->assertRedirect(route('kiosk.show'));

    $this->delete(route('kiosk.destroy'), ['exit_pin' => '2468'])->assertRedirect(route('dashboard'));
    $this->get(route('dashboard'))->assertOk();
});

test('guessing the organization PIN is paused after too many tries', function () {
    startKiosk($this);

    foreach (range(1, 5) as $attempt) {
        $this->delete(route('kiosk.destroy'), ['exit_pin' => '0000'])->assertSessionHasErrors('exit_pin');
    }

    $this->delete(route('kiosk.destroy'), ['exit_pin' => '2468'])->assertSessionHasErrors('exit_pin');

    expect(session('errors')->first('exit_pin'))->toStartWith('Too many wrong PINs');
    $this->get(route('dashboard'))->assertRedirect(route('kiosk.show'));
});

test('the first kiosk opened sets the organization PIN, which then cannot be overwritten from the kiosk', function () {
    $manager = member(Role::Manager);
    $organization = $manager->currentOrganization;

    $this->actingAs($manager)->get(route('kiosk.show'))
        ->assertInertia(fn ($page) => $page->component('kiosk')->where('hasExitPin', false));

    $this->put(route('kiosk.exit-pin.store'), ['exit_pin' => '12', 'exit_pin_confirmation' => '12'])
        ->assertSessionHasErrors('exit_pin');
    $this->put(route('kiosk.exit-pin.store'), ['exit_pin' => '8642', 'exit_pin_confirmation' => '8642'])
        ->assertSessionHasNoErrors();

    expect($organization->refresh()->checkKioskExitPin('8642'))->toBeTrue();

    $this->put(route('kiosk.exit-pin.store'), ['exit_pin' => '1111', 'exit_pin_confirmation' => '1111'])->assertForbidden();
    expect($organization->refresh()->checkKioskExitPin('8642'))->toBeTrue();
});

test('admins change the organization PIN in settings', function () {
    $admin = member(Role::Admin);

    $this->actingAs($admin)
        ->put(route('organization.kiosk-pin.update'), ['exit_pin' => '97531', 'exit_pin_confirmation' => '97531'])
        ->assertSessionHasNoErrors();

    expect($admin->currentOrganization->refresh()->checkKioskExitPin('97531'))->toBeTrue();

    $this->actingAs(member(Role::Manager, $admin->currentOrganization))
        ->put(route('organization.kiosk-pin.update'), ['exit_pin' => '1111', 'exit_pin_confirmation' => '1111'])
        ->assertForbidden();
});

test('an admin can give an employee a new PIN', function () {
    $admin = member(Role::Admin);
    $employee = Employee::factory()->for($admin->currentOrganization)->create();
    $oldPin = $employee->clock_pin;

    $this->actingAs($admin)->put(route('employees.clock-pin.update', $employee))->assertRedirect();

    expect($employee->refresh()->clock_pin)->not->toBe($oldPin)->toMatch('/^\d{4}$/');
});
