<?php

use App\Models\Employee;
use App\Models\User;
use App\Notifications\EmployeeInvitation;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->employee = Employee::factory()->create(['email' => 'casey@example.com', 'first_name' => 'Casey']);
    $this->url = (new EmployeeInvitation($this->employee))->acceptUrl();
});

test('an invitee creates their login and joins the organization', function () {
    $this->get($this->url)
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('invitations/accept')
            ->where('mode', 'register')
            ->where('invitation.email', 'casey@example.com'));

    $acceptUrl = $this->get($this->url)->viewData('page')['props']['acceptUrl'];

    $this->post($acceptUrl, [
        'name' => 'Casey Jones',
        'password' => 'password',
        'password_confirmation' => 'password',
    ])->assertRedirect(route('dashboard'));

    $user = User::query()->where('email', 'casey@example.com')->sole();

    $this->assertAuthenticatedAs($user);
    expect($this->employee->refresh()->user_id)->toBe($user->id)
        ->and($user->current_organization_id)->toBe($this->employee->organization_id)
        ->and($user->hasVerifiedEmail())->toBeTrue();
});

test('invitation links must be signed', function () {
    $this->get(route('invitations.show', $this->employee))->assertForbidden();
    $this->post(route('invitations.store', $this->employee), ['name' => 'X'])->assertForbidden();

    expect(User::query()->count())->toBe(0);
});

test('an invitation link stops working when the employee\'s email changes', function () {
    $acceptUrl = $this->get($this->url)->viewData('page')['props']['acceptUrl'];
    $this->employee->update(['email' => 'someone-else@example.com']);

    $this->get($this->url)->assertForbidden();
    $this->post($acceptUrl, [
        'name' => 'Casey Jones',
        'password' => 'password',
        'password_confirmation' => 'password',
        'hash' => sha1('someone-else@example.com'),
    ])->assertForbidden();

    $this->assertGuest();
    expect(User::query()->count())->toBe(0)
        ->and($this->employee->refresh()->user_id)->toBeNull();
});

test('a signed-in user with a different email cannot claim the invitation', function () {
    $acceptUrl = $this->get($this->url)->viewData('page')['props']['acceptUrl'];

    $this->actingAs(User::factory()->create(['email' => 'someone@example.com']))
        ->post($acceptUrl)
        ->assertForbidden();

    expect($this->employee->refresh()->user_id)->toBeNull();
});
