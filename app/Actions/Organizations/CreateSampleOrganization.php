<?php

namespace App\Actions\Organizations;

use App\Enums\Plan;
use App\Enums\Role;
use App\Enums\TimesheetStatus;
use App\Models\Employee;
use App\Models\Location;
use App\Models\Organization;
use App\Models\Shift;
use App\Models\TimeEntry;
use App\Models\Timesheet;
use App\Models\User;
use App\Support\Timesheets\TimesheetCalculator;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Arr;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Builds "Northwind Coffee Co.", a realistic organization with two locations, a team of eleven,
 * three weeks of schedules, time entries and last week's timesheets.
 *
 * It powers both the local database seeder and the public "try it" demo, so it must not rely on
 * model factories or Faker, which are not installed in production.
 */
class CreateSampleOrganization
{
    /**
     * Create the sample organization and return its owner.
     *
     * A demo organization gets a unique slug and email domain, random passwords and is flagged
     * so it can be pruned and kept from sending email. The seeded one uses the documented
     * test@example.com logins with the password "password".
     *
     * Model events are skipped so the sample history doesn't fill the audit log.
     */
    public function handle(bool $isDemo = false): User
    {
        return Model::withoutEvents(fn (): User => DB::transaction(function () use ($isDemo): User {
            $token = Str::lower(Str::random(10));

            $organization = Organization::forceCreate([
                'name' => 'Northwind Coffee Co.',
                'slug' => $isDemo ? "northwind-coffee-demo-{$token}" : 'northwind-coffee',
                'timezone' => 'America/Toronto',
                'plan' => Plan::Business,
                'is_demo' => $isDemo,
                'daily_overtime_minutes' => 480,
                'weekly_overtime_minutes' => 2400,
                'trial_ends_at' => now()->addDays(config('shiftora.trial_days')),
            ]);

            $cafe = $organization->locations()->create([
                'name' => 'Distillery District Café',
                'address' => '55 Mill St, Toronto, ON',
                'latitude' => 43.6503,
                'longitude' => -79.3596,
                'geofence_radius_meters' => 200,
            ]);
            $roastery = $organization->locations()->create([
                'name' => 'Leslieville Roastery',
                'address' => '1020 Queen St E, Toronto, ON',
                'geofence_radius_meters' => 150,
            ]);

            $employees = $this->createTeam($organization, $cafe, $roastery, $isDemo, $token);

            $thisWeek = $organization->weekStartFor(now());
            $today = $organization->localNow()->startOfDay();

            foreach ([$thisWeek->subWeek(), $thisWeek, $thisWeek->addWeek()] as $weekStart) {
                $this->createSchedule($organization, $employees, $weekStart, published: $weekStart->lessThanOrEqualTo($thisWeek));
            }

            $this->createTimeEntries($employees, $thisWeek->subWeek(), $today);
            $this->createLastWeeksTimesheets($organization, $employees, $thisWeek->subWeek());

            return $employees->firstWhere('role', Role::Owner)->user;
        }));
    }

    /**
     * @return Collection<int, Employee>
     */
    private function createTeam(Organization $organization, Location $cafe, Location $roastery, bool $isDemo, string $token): Collection
    {
        $people = [
            [$isDemo ? 'Alex' : 'Test', $isDemo ? 'Morgan' : 'User', 'test@example.com', Role::Owner, 'Owner', $cafe],
            ['Priya', 'Natarajan', 'admin@example.com', Role::Admin, 'Operations Lead', $cafe],
            ['Marcus', 'Bell', 'manager@example.com', Role::Manager, 'Café Manager', $cafe],
            ['Elena', 'Kovacs', null, Role::Manager, 'Roastery Manager', $roastery],
            ['Jordan', 'Price', 'employee@example.com', Role::Employee, 'Barista', $cafe],
            ['Maya', 'Robinson', null, Role::Employee, 'Barista', $cafe],
            ['Sam', 'Okafor', null, Role::Employee, 'Shift Lead', $cafe],
            ['Lucía', 'Fernández', null, Role::Employee, 'Barista', $cafe],
            ['Theo', 'Nguyen', null, Role::Employee, 'Roaster', $roastery],
            ['Hannah', 'Schmidt', null, Role::Employee, 'Packer', $roastery],
            ['Omar', 'Haddad', null, Role::Employee, 'Delivery Driver', $roastery],
        ];

        $password = $isDemo ? Str::password(32) : 'password';

        return collect($people)->values()->map(function (array $person, int $index) use ($organization, $isDemo, $token, $password): Employee {
            [$firstName, $lastName, $loginEmail, $role, $jobTitle, $location] = $person;

            $mailbox = Str::lower(Str::ascii("{$firstName}.{$lastName}"));
            $email = match (true) {
                $isDemo => "{$mailbox}@northwind-{$token}.example",
                $loginEmail !== null => $loginEmail,
                default => "{$mailbox}@northwind.test",
            };

            $user = $loginEmail === null ? null : User::forceCreate([
                'name' => "{$firstName} {$lastName}",
                'email' => $email,
                'is_demo' => $isDemo,
                'email_verified_at' => now(),
                'password' => $password,
                'current_organization_id' => $organization->id,
            ]);

            return $organization->employees()->create([
                'user_id' => $user?->id,
                'location_id' => $location->id,
                'first_name' => $firstName,
                'last_name' => $lastName,
                'email' => $email,
                'job_title' => $jobTitle,
                'role' => $role,
                'hourly_rate_cents' => $role === Role::Employee ? random_int(1750, 2300) : random_int(2600, 3600),
                'color' => Employee::COLORS[$index % count(Employee::COLORS)],
            ]);
        });
    }

    /**
     * Give everyone a regular pattern of shifts, with an open shift on busy days.
     *
     * @param  Collection<int, Employee>  $employees
     */
    private function createSchedule(Organization $organization, Collection $employees, CarbonImmutable $weekStart, bool $published): void
    {
        $shifts = [];

        foreach ($employees as $index => $employee) {
            if ($employee->role === Role::Owner) {
                continue;
            }

            foreach (range(0, 6) as $day) {
                // Five shifts a week, with days off staggered across the team.
                if (in_array(($day + $index) % 7, [5, 6], true)) {
                    continue;
                }

                $date = $weekStart->addDays($day);
                $startHour = [6, 7, 9, 11][$index % 4];
                $startsAt = $date->setTime($startHour, 0);

                $shifts[] = [
                    'employee_id' => $employee->id,
                    'location_id' => $employee->location_id,
                    'starts_at' => $startsAt->utc(),
                    'ends_at' => $startsAt->addHours(8)->utc(),
                    'break_minutes' => 30,
                    'position' => $employee->job_title,
                ];
            }
        }

        foreach ([4, 5] as $day) {
            $startsAt = $weekStart->addDays($day)->setTime(16, 0);

            $shifts[] = [
                'employee_id' => null,
                'location_id' => $employees->first()->location_id,
                'starts_at' => $startsAt->utc(),
                'ends_at' => $startsAt->addHours(5)->utc(),
                'break_minutes' => 0,
                'position' => 'Evening barista',
            ];
        }

        // One insert per week keeps starting a demo quick.
        Shift::insert(array_map(fn (array $shift): array => [
            ...$shift,
            'organization_id' => $organization->id,
            'published_at' => $published ? $weekStart->subDays(3)->utc() : null,
            'created_at' => now(),
            'updated_at' => now(),
        ], $shifts));
    }

    /**
     * Turn past shifts into realistic clock-ins, leaving a couple of people on the clock right now.
     *
     * @param  Collection<int, Employee>  $employees
     */
    private function createTimeEntries(Collection $employees, CarbonImmutable $from, CarbonImmutable $today): void
    {
        $now = CarbonImmutable::now();

        Shift::query()
            ->whereIn('employee_id', $employees->pluck('id'))
            ->where('starts_at', '>=', $from->utc())
            ->where('starts_at', '<', $today->addDay()->utc())
            ->orderBy('starts_at')
            ->get()
            ->each(function (Shift $shift) use ($now): void {
                $clockIn = CarbonImmutable::instance($shift->starts_at)->addMinutes(random_int(-8, 6));

                if ($clockIn->isFuture()) {
                    return;
                }

                $clockOut = CarbonImmutable::instance($shift->ends_at)->addMinutes(random_int(-5, 45));
                $isOpen = $clockOut->isFuture();

                $entry = TimeEntry::create([
                    'organization_id' => $shift->organization_id,
                    'employee_id' => $shift->employee_id,
                    'location_id' => $shift->location_id,
                    'clock_in_at' => $clockIn,
                    'clock_out_at' => $isOpen ? null : $clockOut,
                    'break_minutes' => $isOpen ? 0 : Arr::random([30, 30, 30, 45]),
                ]);

                if ($isOpen && $clockIn->diffInHours($now) >= 4) {
                    $entry->breaks()->create(['started_at' => $clockIn->addHours(4), 'ended_at' => $clockIn->addHours(4)->addMinutes(30)]);
                    $entry->update(['break_minutes' => 30]);
                }
            });
    }

    /**
     * Last week: most timesheets approved, a few waiting for review, one sent back.
     *
     * @param  Collection<int, Employee>  $employees
     */
    private function createLastWeeksTimesheets(Organization $organization, Collection $employees, CarbonImmutable $weekStart): void
    {
        $reviewer = $employees->firstWhere('role', Role::Manager)?->user;

        foreach ($employees->where('role', '!=', Role::Owner)->values() as $index => $employee) {
            $summary = TimesheetCalculator::summarizeWeek(
                $organization,
                TimesheetCalculator::entriesForWeek($employee, $weekStart),
                $weekStart,
            );

            $status = match (true) {
                $index < 5 => TimesheetStatus::Approved,
                $index < 8 => TimesheetStatus::Submitted,
                default => TimesheetStatus::Rejected,
            };

            Timesheet::create([
                'organization_id' => $organization->id,
                'employee_id' => $employee->id,
                'period_start' => $weekStart->toDateString(),
                'period_end' => $weekStart->addDays(6)->toDateString(),
                'status' => $status,
                'submitted_at' => $weekStart->addDays(7)->setTime(9, 0),
                'reviewed_at' => $status === TimesheetStatus::Submitted ? null : $weekStart->addDays(8)->setTime(10, 0),
                'reviewed_by' => $status === TimesheetStatus::Submitted ? null : $reviewer?->id,
                'review_note' => $status === TimesheetStatus::Rejected ? 'Please add the delivery run you did on Friday.' : null,
                'regular_minutes' => $summary['regular_minutes'],
                'overtime_minutes' => $summary['overtime_minutes'],
                'break_minutes' => $summary['break_minutes'],
            ]);
        }
    }
}
