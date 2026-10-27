<?php

namespace App\Models;

use App\Enums\Feature;
use App\Enums\Plan;
use App\Enums\Role;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Database\Factories\OrganizationFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Prunable;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;
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
 * @property bool $is_guest Started from the landing page without a login, until the workspace is saved.
 * @property int|null $daily_overtime_minutes
 * @property int|null $weekly_overtime_minutes
 * @property bool $geofencing_enabled
 * @property string|null $kiosk_exit_pin Hashed PIN a manager enters to take a device out of kiosk mode.
 * @property string|null $stripe_id
 * @property string|null $pm_type
 * @property string|null $pm_last_four
 * @property Carbon|null $trial_ends_at
 * @property Carbon|null $trial_ending_notified_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['name', 'slug', 'timezone', 'week_starts_on', 'plan', 'daily_overtime_minutes', 'weekly_overtime_minutes', 'geofencing_enabled', 'trial_ends_at'])]
#[Hidden(['kiosk_exit_pin'])]
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
            'kiosk_exit_pin' => 'hashed',
            'trial_ends_at' => 'datetime',
            'trial_ending_notified_at' => 'datetime',
            'is_demo' => 'boolean',
            'is_guest' => 'boolean',
        ];
    }

    /**
     * Demos, and guest workspaces nobody saved with a login, are thrown away a day after they are created.
     *
     * @return Builder<static>
     */
    public function prunable(): Builder
    {
        return static::query()
            ->where(fn (Builder $query) => $query->where('is_demo', true)->orWhere('is_guest', true))
            ->where('created_at', '<=', now()->subDay());
    }

    /**
     * Remove the throwaway logins and logo along with it.
     */
    protected function pruning(): void
    {
        User::query()
            ->where(fn (Builder $query) => $query->where('is_demo', true)->orWhere('is_guest', true))
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
     * Every feature is unlocked during the no-card trial, so people try the whole product before
     * they choose what to pay for.
     */
    public const TRIAL_PLAN = Plan::Business;

    /**
     * The plan whose entitlements currently apply: the subscription's, everything during the trial,
     * or else the free plan, so nobody has to pay to keep using Shiftora.
     */
    public function activePlan(): Plan
    {
        $subscription = $this->subscription(config('shiftora.subscription_type'));

        if ($subscription?->valid()) {
            return Plan::fromStripePrice($subscription->stripe_price) ?? $this->plan;
        }

        if ($this->onGenericTrial()) {
            return self::TRIAL_PLAN;
        }

        return Plan::Free;
    }

    /**
     * Whether the organization is using Shiftora without paying, after its trial or subscription.
     */
    public function isOnFreePlan(): bool
    {
        return $this->activePlan() === Plan::Free;
    }

    /**
     * Whether a free workspace has more active people than the free plan allows. It can still be
     * viewed but not changed until the owner deactivates people or picks a paid plan.
     */
    public function isReadOnly(): bool
    {
        return $this->isOnFreePlan() && $this->activeEmployeeCount() > Plan::Free->employeeLimit();
    }

    /**
     * The plan whose features the workspace shows. A read-only workspace keeps showing what it had
     * (everything after a trial, or the plan of the subscription that ended), so nothing seems lost.
     */
    public function visiblePlan(): Plan
    {
        if (! $this->isReadOnly()) {
            return $this->activePlan();
        }

        $subscription = $this->subscription(config('shiftora.subscription_type'));

        return $subscription === null
            ? self::TRIAL_PLAN
            : (Plan::fromStripePrice($subscription->stripe_price) ?? $this->plan);
    }

    /**
     * The date new subscriptions are first charged, or null when the launch promotion is turned off.
     */
    public static function freeUntil(): ?Carbon
    {
        $freeUntil = config('shiftora.free_until');

        return filled($freeUntil) ? Carbon::parse($freeUntil) : null;
    }

    /**
     * Whether new subscriptions currently start with a free trial that lasts until the promotion ends.
     */
    public static function onFreePromotion(): bool
    {
        return self::freeUntil()?->isFuture() ?? false;
    }

    /**
     * When a new organization's no-card trial ends. During the launch promotion it runs until the promotion does.
     */
    public static function newTrialEndsAt(): CarbonInterface
    {
        $trialEndsAt = now()->addDays(config('shiftora.trial_days'));

        return self::onFreePromotion() ? $trialEndsAt->max(self::freeUntil()) : $trialEndsAt;
    }

    /**
     * When a subscription started now would first be charged: once the launch promotion ends, or
     * else once the no-card trial would have, so subscribing early never costs trial days. Null
     * when it would be charged straight away.
     */
    public function firstChargeAt(): ?CarbonInterface
    {
        $trialEndsAt = match (true) {
            self::onFreePromotion() => self::freeUntil(),
            $this->onGenericTrial() => $this->trial_ends_at,
            default => null,
        };

        // Stripe Checkout only accepts a trial end at least 48 hours away.
        return $trialEndsAt?->isAfter(now()->addDays(2)) ? $trialEndsAt : null;
    }

    public function hasActiveAccess(): bool
    {
        return ! $this->isReadOnly();
    }

    /**
     * Kiosk exit PINs are 4 to 8 digits.
     */
    public const KIOSK_EXIT_PIN_PATTERN = '/^\d{4,8}$/';

    public function hasKioskExitPin(): bool
    {
        return $this->kiosk_exit_pin !== null;
    }

    public function checkKioskExitPin(string $pin): bool
    {
        return $this->hasKioskExitPin() && Hash::check($pin, $this->kiosk_exit_pin);
    }

    /**
     * Whether the workspace shows the feature. A read-only workspace keeps showing what it had, but
     * every change is refused until access is restored.
     */
    public function hasFeature(Feature $feature): bool
    {
        return $this->visiblePlan()->includes($feature);
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
        $limit = $this->visiblePlan()->employeeLimit();

        return $limit !== null && $this->activeEmployeeCount() >= $limit;
    }

    public function hasReachedLocationLimit(): bool
    {
        $limit = $this->visiblePlan()->locationLimit();

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
