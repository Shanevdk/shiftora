<?php

use App\Enums\Plan;
use App\Enums\Role;
use App\Models\Employee;
use App\Models\Organization;
use App\Notifications\EmployeeInvitation;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Support\Facades\Exceptions;
use Illuminate\Support\Facades\Notification;

beforeEach(function () {
    $this->organization = Organization::factory()->create();
    $this->admin = member(Role::Admin, $this->organization);
});

test('an admin adds an employee and an invitation is emailed', function () {
    Notification::fake();

    $this->actingAs($this->admin)
        ->post(route('employees.store'), [
            'first_name' => 'Jamie',
            'last_name' => 'Lee',
            'email' => 'Jamie@Example.com',
            'role' => 'employee',
            'hourly_rate' => '21.50',
        ])
        ->assertRedirect(route('employees.index'));

    $employee = Employee::query()->where('first_name', 'Jamie')->sole();

    expect($employee)
        ->organization_id->toBe($this->organization->id)
        ->email->toBe('jamie@example.com')
        ->hourly_rate_cents->toBe(2150)
        ->invited_at->not->toBeNull();

    Notification::assertSentTo(
        new AnonymousNotifiable,
        EmployeeInvitation::class,
        fn ($notification, $channels, $notifiable) => $notifiable->routes['mail'] === 'jamie@example.com',
    );
});

test('the starter plan is limited to ten active employees', function () {
    $this->organization->update(['plan' => Plan::Starter]);
    Employee::factory()->for($this->organization)->count(9)->create();

    $this->actingAs($this->admin)
        ->post(route('employees.store'), ['first_name' => 'One', 'last_name' => 'Too many', 'role' => 'employee'])
        ->assertSessionHasErrors(['first_name' => 'The Starter plan includes up to 10 active employees. Upgrade your plan to add more.']);
});

test('admins cannot promote people to admin and managers cannot add employees', function () {
    $this->actingAs($this->admin)
        ->post(route('employees.store'), ['first_name' => 'A', 'last_name' => 'B', 'role' => 'admin'])
        ->assertSessionHasErrors('role');

    $this->actingAs(member(Role::Manager, $this->organization))
        ->post(route('employees.store'), ['first_name' => 'A', 'last_name' => 'B', 'role' => 'employee'])
        ->assertForbidden();
});

test('deactivating an employee removes their seat', function () {
    $employee = Employee::factory()->for($this->organization)->create();

    $this->actingAs($this->admin)
        ->patch(route('employees.status.update', $employee), ['is_active' => false])
        ->assertSessionHasNoErrors();

    expect($employee->refresh()->is_active)->toBeFalse()
        ->and($this->organization->activeEmployeeCount())->toBe(1);
});

test('the owner cannot be deactivated', function () {
    $owner = member(Role::Owner, $this->organization)->currentEmployee;

    $this->actingAs($this->admin)
        ->patch(route('employees.status.update', $owner), ['is_active' => false])
        ->assertForbidden();
});

test('employee emails must be unique within an organization only', function () {
    Employee::factory()->for($this->organization)->create(['email' => 'sam@example.com']);
    Employee::factory()->create(['email' => 'other@example.com']);

    $this->actingAs($this->admin)
        ->post(route('employees.store'), ['first_name' => 'Sam', 'last_name' => 'Two', 'email' => 'sam@example.com', 'role' => 'employee'])
        ->assertSessionHasErrors('email');

    $this->post(route('employees.store'), ['first_name' => 'Other', 'last_name' => 'Org', 'email' => 'other@example.com', 'role' => 'employee', 'send_invitation' => false])
        ->assertSessionHasNoErrors();
});

test('a failed invitation email still adds the employee and tells the admin', function () {
    Exceptions::fake();
    Notification::shouldReceive('sendNow')->andThrow(new RuntimeException('Resend rejected the request'));

    $this->actingAs($this->admin)
        ->post(route('employees.store'), [
            'first_name' => 'Jamie',
            'last_name' => 'Rivera',
            'email' => 'jamie@example.com',
            'role' => 'employee',
        ])
        ->assertRedirect(route('employees.index'))
        ->assertInertiaFlash('toast.type', 'warning');

    expect(Employee::query()->where('first_name', 'Jamie')->sole()->invited_at)->toBeNull();
    Exceptions::assertReported(RuntimeException::class);
});

test('resending an invitation reports when the email could not be sent', function () {
    Exceptions::fake();
    $employee = Employee::factory()->for($this->organization)->create(['email' => 'casey@example.com']);
    Notification::shouldReceive('sendNow')->andThrow(new RuntimeException('Resend rejected the request'));

    $this->actingAs($this->admin)
        ->post(route('employees.invitation.store', $employee))
        ->assertRedirect()
        ->assertInertiaFlash('toast.type', 'error');

    expect($employee->refresh()->invited_at)->toBeNull();
});
