<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\Organization;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Inertia\Inertia;
use Inertia\Response;

class AdminDashboardController extends Controller
{
    private const int CHART_DAYS = 30;

    private const int RECENT_SIGNUPS = 25;

    /**
     * Platform-wide user and signup numbers. Demo visitors are left out of every figure.
     */
    public function __invoke(): Response
    {
        $now = CarbonImmutable::now();

        return Inertia::render('admin/dashboard', [
            'users' => [
                'total' => $this->users()->count(),
                'in_an_organization' => $this->users()->whereHas('memberships')->count(),
            ],
            'signups' => [
                'today' => $this->users()->where('created_at', '>=', $now->startOfDay())->count(),
                'last_7_days' => $this->users()->where('created_at', '>=', $now->subDays(7))->count(),
                'last_30_days' => $this->users()->where('created_at', '>=', $now->subDays(30))->count(),
                'previous_30_days' => $this->users()
                    ->whereBetween('created_at', [$now->subDays(60), $now->subDays(30)])
                    ->count(),
            ],
            'organizationCounts' => [
                'total' => $this->organizations()->count(),
                'paying' => $this->organizations()->whereHas('subscriptions', fn (Builder $query) => $query->active())->count(),
                'trialing' => $this->organizations()
                    ->where('trial_ends_at', '>', $now)
                    ->whereDoesntHave('subscriptions', fn (Builder $query) => $query->active())
                    ->count(),
            ],
            'dailySignups' => $this->dailySignups($now),
            'recentSignups' => $this->users()
                ->with('memberships.organization:id,name')
                ->latest()
                ->latest('id')
                ->limit(self::RECENT_SIGNUPS)
                ->get()
                ->map(fn (User $user): array => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'organizations' => $user->memberships->map(fn (Employee $membership): string => $membership->organization->name)->values()->all(),
                    'is_admin' => $user->is_admin,
                    'created_at' => $user->created_at->toIso8601String(),
                ]),
        ]);
    }

    /**
     * @return Builder<User>
     */
    private function users(): Builder
    {
        return User::query()->where('is_demo', false);
    }

    /**
     * @return Builder<Organization>
     */
    private function organizations(): Builder
    {
        return Organization::query()->where('is_demo', false);
    }

    /**
     * Signups per UTC day for the chart, oldest first, with empty days filled in.
     *
     * @return list<array{date: string, count: int}>
     */
    private function dailySignups(CarbonImmutable $now): array
    {
        $firstDay = $now->startOfDay()->subDays(self::CHART_DAYS - 1);

        $countsByDate = $this->users()
            ->where('created_at', '>=', $firstDay)
            ->pluck('created_at')
            ->countBy(fn (CarbonImmutable $createdAt): string => $createdAt->toDateString());

        return collect(range(0, self::CHART_DAYS - 1))
            ->map(function (int $offset) use ($firstDay, $countsByDate): array {
                $date = $firstDay->addDays($offset)->toDateString();

                return ['date' => $date, 'count' => $countsByDate->get($date, 0)];
            })
            ->all();
    }
}
