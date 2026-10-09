<?php

namespace App\Http\Middleware;

use App\Enums\Feature;
use App\Models\Employee;
use App\Models\Organization;
use App\Support\CurrentOrganization;
use Illuminate\Http\Request;
use Illuminate\Notifications\DatabaseNotification;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $request->user(),
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            'organization' => function () use ($request): ?array {
                $organization = $this->organization($request);

                return $organization === null ? null : [
                    ...$organization->only(['id', 'name', 'timezone', 'week_starts_on']),
                    'logo_url' => $organization->logoUrl(),
                ];
            },
            'membership' => fn (): ?array => $this->membership($request),
            'subscription' => fn (): ?array => $this->subscription($request),
            'organizations' => fn (): array => $request->user()
                ?->memberships()
                ->with('organization:id,name')
                ->get()
                ->map(fn (Employee $membership): array => $membership->organization->only(['id', 'name']))
                ->sortBy('name')
                ->values()
                ->all() ?? [],
            'notifications' => fn (): ?array => $request->user() === null ? null : [
                'unread_count' => $request->user()->unreadNotifications()->count(),
                'recent' => $request->user()->notifications()->latest()->limit(8)->get()
                    ->map(fn (DatabaseNotification $notification): array => [
                        'id' => $notification->id,
                        'title' => $notification->data['title'] ?? '',
                        'body' => $notification->data['body'] ?? '',
                        'url' => $notification->data['url'] ?? null,
                        'read' => $notification->read_at !== null,
                        'created_at' => $notification->created_at?->toIso8601String(),
                    ])
                    ->all(),
            ],
        ];
    }

    /**
     * The organization the user is working in, even on routes outside the tenant middleware.
     */
    private function organization(Request $request): ?Organization
    {
        $user = $request->user();

        if ($user === null) {
            return null;
        }

        return app(CurrentOrganization::class)->get()
            ?? ($user->currentEmployee !== null ? $user->currentOrganization : null);
    }

    /**
     * The user's role and the permissions the interface uses to show or hide controls.
     *
     * Every permission is enforced again on the server; these flags only shape the UI.
     *
     * @return array{employee_id: int, role: string, can: array<string, bool>}|null
     */
    private function membership(Request $request): ?array
    {
        $employee = $request->user()?->currentEmployee;

        if ($employee === null) {
            return null;
        }

        $role = $employee->role;

        return [
            'employee_id' => $employee->id,
            'role' => $role->value,
            'can' => [
                'manageOrganization' => $role->canManageOrganization(),
                'manageEmployees' => $role->canManageEmployees(),
                'manageSchedule' => $role->canManageSchedule(),
                'approveTimesheets' => $role->canApproveTimesheets(),
                'viewReports' => $role->canViewReports(),
                'viewAuditLog' => $role->canManageOrganization(),
                'manageBilling' => $role->canManageBilling(),
            ],
        ];
    }

    /**
     * @return array{plan: string|null, plan_name: string|null, status: string, trial_days_remaining: int|null, features: list<string>}|null
     */
    private function subscription(Request $request): ?array
    {
        $organization = $this->organization($request);

        if ($organization === null) {
            return null;
        }

        $plan = $organization->activePlan();

        return [
            'plan' => $plan?->value,
            'plan_name' => $plan?->label(),
            'status' => match (true) {
                $organization->isSubscribed() => 'active',
                $plan !== null => 'trial',
                default => 'inactive',
            },
            'trial_days_remaining' => $organization->trialDaysRemaining(),
            'features' => array_map(fn (Feature $feature): string => $feature->value, $plan?->features() ?? []),
        ];
    }
}
