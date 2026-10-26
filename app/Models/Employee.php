<?php

namespace App\Models;

use App\Enums\Role;
use App\Models\Concerns\Auditable;
use App\Models\Concerns\BelongsToOrganization;
use Database\Factories\EmployeeFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $organization_id
 * @property int|null $user_id
 * @property int|null $location_id
 * @property string $first_name
 * @property string $last_name
 * @property-read string $full_name
 * @property string|null $email
 * @property string|null $phone
 * @property string|null $job_title
 * @property Role $role
 * @property int|null $hourly_rate_cents
 * @property string|null $color
 * @property string|null $clock_pin
 * @property bool $is_active
 * @property Carbon|null $invited_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read User|null $user
 * @property-read Location|null $location
 */
#[Fillable(['organization_id', 'user_id', 'location_id', 'first_name', 'last_name', 'email', 'phone', 'job_title', 'role', 'hourly_rate_cents', 'color', 'clock_pin', 'is_active', 'invited_at'])]
#[Hidden(['clock_pin'])]
class Employee extends Model
{
    /** @use HasFactory<EmployeeFactory> */
    use Auditable, BelongsToOrganization, HasFactory;

    /**
     * Palette used to colour-code employees on the schedule.
     *
     * @var list<string>
     */
    public const COLORS = ['#2F6B4F', '#3B6E8F', '#8A5A44', '#6B5B95', '#B8860B', '#4A7C59', '#A0522D', '#5F6B7A'];

    protected static function booted(): void
    {
        static::creating(function (self $employee): void {
            $employee->clock_pin ??= self::uniqueClockPin((int) $employee->organization_id);
        });
    }

    /**
     * A random kiosk PIN nobody else in the organization has: four digits, or six once four-digit PINs run short.
     */
    public static function uniqueClockPin(int $organizationId): string
    {
        $attempts = 0;

        do {
            $digits = ++$attempts > 50 ? 6 : 4;
            $pin = str_pad((string) random_int(0, 10 ** $digits - 1), $digits, '0', STR_PAD_LEFT);
        } while (static::withoutGlobalScopes()->where('organization_id', $organizationId)->where('clock_pin', $pin)->exists());

        return $pin;
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'role' => Role::class,
            'hourly_rate_cents' => 'integer',
            'is_active' => 'boolean',
            'invited_at' => 'datetime',
        ];
    }

    /**
     * @return Attribute<string, never>
     */
    protected function fullName(): Attribute
    {
        return Attribute::get(fn (): string => trim("{$this->first_name} {$this->last_name}"));
    }

    /**
     * @param  Builder<self>  $query
     */
    #[Scope]
    protected function active(Builder $query): void
    {
        $query->where('is_active', true);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return BelongsTo<Location, $this>
     */
    public function location(): BelongsTo
    {
        return $this->belongsTo(Location::class);
    }

    /**
     * @return HasMany<TimeEntry, $this>
     */
    public function timeEntries(): HasMany
    {
        return $this->hasMany(TimeEntry::class);
    }

    /**
     * @return HasOne<TimeEntry, $this>
     */
    public function openTimeEntry(): HasOne
    {
        return $this->hasOne(TimeEntry::class)->whereNull('clock_out_at');
    }

    /**
     * @return HasMany<Shift, $this>
     */
    public function shifts(): HasMany
    {
        return $this->hasMany(Shift::class);
    }

    /**
     * @return HasMany<Timesheet, $this>
     */
    public function timesheets(): HasMany
    {
        return $this->hasMany(Timesheet::class);
    }

    /**
     * Fingerprint of the employee's email, signed into invitation links so they stop working if the email changes.
     */
    public function invitationHash(): string
    {
        return sha1((string) $this->email);
    }
}
