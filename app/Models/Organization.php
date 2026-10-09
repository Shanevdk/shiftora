<?php

namespace App\Models;

use App\Enums\Feature;
use App\Enums\Plan;
use App\Enums\Role;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Database\Factories\OrganizationFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Prunable;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Laravel\Cashier\Billable;

/**
 * @property int $id
 * @property string $name
 * @property string $slug
 * @property string $timezone
 * @property int $week_starts_on
 * @property string|null $logo_path
 * @property Plan $plan
 * @property bool $is_demo
 * @property int|null $daily_overtime_minutes
 * @property int|null $weekly_overtime_minutes
 * @property bool $geofencing_enabled
 * @property string|null $stripe_id
 * @property string|null $pm_type
 * @property string|null $pm_last_four
 * @property Carbon|null $trial_ends_at
 * @property Carbon|null $trial_ending_notified_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['name', 'slug', 'timezone', 'week_starts_on', 'plan', 'daily_overtime_minutes', 'weekly_overtime_minutes', 'geofencing_enabled', 'trial_ends_at'])]
class Organization extends Model
{
    /** @use HasFactory<OrganizationFactory> */
    use Billable, HasFactory, Prunable;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'plan' => Plan::class,
            'week_starts_on' => 'integer',
            'daily_overtime_minutes' => 'integer',
            'weekly_overtime_minutes' => 'integer',
            'geofencing_enabled' => 'boolean',
            'trial_ends_at' => 'datetime',
            'trial_ending_notified_at' => 'datetime',
            'is_demo' => 'boolean',
        ];
    }

    /**
     * Demo workspaces started from the landing page are thrown away a day after they are created.
     *
     * @return Builder<static>
     */
    public function prunable(): Builder
    {
        return static::query()
            ->where('is_demo', true)
            ->where('created_at', '<=', now()->subDay());
    }

    /**
     * Remove the demo's throwaway logins and logo along with it.
     */
    protected function pruning(): void
    {
        User::query()
            ->where('is_demo', true)
            ->whereIn('id', Employee::withoutGlobalScopes()->where('organization_id', $this->id)->whereNotNull('user_id')->select('user_id'))
            ->get()
            ->each(function (User $user): void {
                $user->notifications()->delete();
                $user->delete();
            });

        if ($this->logo_path !== null) {
            Storage::disk('public')->delete($this->logo_path);
        }
    }

    /**
     * @return HasMany<Employee, $this>
     */
    public function employees(): HasMany
    {
        return $this->hasMany(Employee::class);
    }

    /**
     * @return HasMany<Location, $this>
     */
    public function locations(): HasMany
    {
        return $this->hasMany(Location::class);
    }

    /**
     * @return HasMany<TimeEntry, $this>
     */
    public function timeEntries(): HasMany
    {
        return $this->hasMany(TimeEntry::class);
    }

    /**
     * @return HasMany<Timesheet, $this>
     */
    public function timesheets(): HasMany
    {
        return $this->hasMany(Timesheet::class);
    }

    /**
     * @return HasMany<Shift, $this>
     */
    public function shifts(): HasMany
    {
        return $this->hasMany(Shift::class);
    }

    /**
     * @return HasMany<AuditLog, $this>
     */
    public function auditLogs(): HasMany
    {
        return $this->hasMany(AuditLog::class);
    }

    /**
     * The plan whose entitlements currently apply, or null when access has lapsed.
     */
    public function activePlan(): ?Plan
    {
        $subscription = $this->subscription(config('shiftora.subscription_type'));

        if ($subscription?->valid()) {
            return Plan::fromStripePrice($subscription->stripe_price) ?? $this->plan;
        }

        if ($this->onGenericTrial()) {
            return $this->plan;
        }

        return null;
    }

    public function hasActiveAccess(): bool
    {
        return $this->activePlan() !== null;
    }

    public function hasFeature(Feature $feature): bool
    {
        return $this->activePlan()?->includes($feature) ?? false;
    }

    public function isSubscribed(): bool
    {
        return $this->subscribed(config('shiftora.subscription_type'));
    }

    public function trialDaysRemaining(): ?int
    {
        if (! $this->onGenericTrial() || $this->isSubscribed()) {
            return null;
        }

        return (int) max(0, ceil(now()->diffInHours($this->trial_ends_at) / 24));
    }

    public function activeEmployeeCount(): int
    {
        return $this->employees()->where('is_active', true)->count();
    }

    public function hasReachedEmployeeLimit(): bool
    {
        $limit = ($this->activePlan() ?? $this->plan)->employeeLimit();

        return $limit !== null && $this->activeEmployeeCount() >= $limit;
    }

    public function hasReachedLocationLimit(): bool
    {
        $limit = ($this->activePlan() ?? $this->plan)->locationLimit();

        return $limit !== null && $this->locations()->count() >= $limit;
    }

    public function owner(): ?Employee
    {
        return $this->employees()->where('role', Role::Owner)->with('user')->first();
    }

    public function logoUrl(): ?string
    {
        return $this->logo_path === null ? null : Storage::disk('public')->url($this->logo_path);
    }

    /**
     * The current moment expressed in the organization's timezone.
     */
    public function localNow(): CarbonImmutable
    {
        return CarbonImmutable::now($this->timezone);
    }

    /**
     * The first local day of the pay week that contains the given moment.
     */
    public function weekStartFor(CarbonInterface $moment): CarbonImmutable
    {
        return CarbonImmutable::instance($moment)
            ->setTimezone($this->timezone)
            ->startOfWeek($this->week_starts_on);
    }

    /**
     * Whether the pay week (timezone and first weekday) is fixed because timesheets have been submitted against it.
     *
     * Timesheets store their period as local dates, so moving the week would detach them from their entries.
     */
    public function hasFixedPayWeek(): bool
    {
        return $this->timesheets()->whereNotNull('submitted_at')->exists();
    }

    /**
     * Parse a local Y-m-d date (or now) and snap it to the start of its pay week.
     */
    public function weekStartFromDate(?string $date): CarbonImmutable
    {
        $moment = rescue(
            fn () => $date === null ? $this->localNow() : CarbonImmutable::createFromFormat('Y-m-d', $date, $this->timezone),
            fn () => $this->localNow(),
            report: false,
        );

        return $this->weekStartFor($moment ?: $this->localNow());
    }

    /**
     * Stripe customer email, taken from the organization owner.
     */
    public function stripeEmail(): ?string
    {
        return $this->owner()?->user?->email;
    }
}
