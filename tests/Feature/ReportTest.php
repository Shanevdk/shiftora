<?php

use App\Enums\Plan;
use App\Enums\Role;
use App\Models\Organization;
use App\Models\TimeEntry;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->travelTo('2026-10-09 18:00:00');

    $this->organization = Organization::factory()->create(['weekly_overtime_minutes' => 2400]);
    $this->manager = member(Role::Manager, $this->organization);
    $this->employee = member(Role::Employee, $this->organization)->currentEmployee;
    $this->employee->update(['hourly_rate_cents' => 2000, 'first_name' => '=SUM(A1)']);

    TimeEntry::factory()->for($this->employee)->create([
        'clock_in_at' => '2026-10-06 09:00:00',
        'clock_out_at' => '2026-10-06 17:00:00',
        'break_minutes' => 0,
    ]);
});

test('managers see hours and labor cost for the range', function () {
    $this->actingAs($this->manager)
        ->get(route('reports.index', ['from' => '2026-10-05', 'to' => '2026-10-11']))
        ->assertInertia(fn (Assert $page) => $page
            ->component('reports/index')
            ->where('totals.worked_minutes', 480)
            ->where('totals.labor_cost_cents', 16000)
            ->has('daily', 7)
            ->has('employees', 1));
});

test('employees cannot view reports', function () {
    $this->actingAs($this->employee->user)
        ->get(route('reports.index'))
        ->assertForbidden();
});

test('starter organizations see an upgrade prompt instead of reports', function () {
    $this->organization->update(['plan' => Plan::Starter]);

    $this->actingAs($this->manager)
        ->get(route('reports.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('upgrade')
            ->where('feature', 'Reports')
            ->where('requiredPlan', 'Professional'));
});

test('reports cannot span more than the maximum range', function () {
    $this->actingAs($this->manager)
        ->get(route('reports.index', ['from' => '2026-01-01', 'to' => '2026-10-01']))
        ->assertSessionHasErrors('to');
});

test('the payroll summary exports as CSV with formulas neutralized', function () {
    $response = $this->actingAs($this->manager)
        ->get(route('reports.export', ['from' => '2026-10-05', 'to' => '2026-10-11', 'type' => 'summary']));

    $response->assertOk()->assertDownload('shiftora-summary-2026-10-05-to-2026-10-11.csv');

    expect($response->streamedContent())
        ->toContain('Employee,"Job title","Regular hours"')
        ->toContain("'=SUM(A1)")
        ->toContain('8.00')
        ->toContain('160.00');
});
