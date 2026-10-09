<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use App\Models\Concerns\BelongsToOrganization;
use Carbon\CarbonInterface;
use Database\Factories\TimeEntryFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $organization_id
 * @property int $employee_id
 * @property int|null $location_id
 * @property Carbon $clock_in_at
 * @property Carbon|null $clock_out_at
 * @property int $break_minutes
 * @property float|null $clock_in_latitude
 * @property float|null $clock_in_longitude
 * @property float|null $clock_out_latitude
 * @property float|null $clock_out_longitude
 * @property string $source
 * @property string|null $notes
 * @property Carbon|null $missed_clock_out_notified_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Employee $employee
 * @property-read Location|null $location
 * @property-read TimeEntryBreak|null $openBreak
 */
#[Fillable(['organization_id', 'employee_id', 'location_id', 'clock_in_at', 'clock_out_at', 'break_minutes', 'clock_in_latitude', 'clock_in_longitude', 'clock_out_latitude', 'clock_out_longitude', 'source', 'notes'])]
class TimeEntry extends Model
{
    /** @use HasFactory<TimeEntryFactory> */
    use Auditable, BelongsToOrganization, HasFactory;

    public const SOURCE_CLOCK = 'clock';

    public const SOURCE_MANUAL = 'manual';

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'clock_in_at' => 'datetime',
            'clock_out_at' => 'datetime',
            'break_minutes' => 'integer',
            'clock_in_latitude' => 'float',
            'clock_in_longitude' => 'float',
            'clock_out_latitude' => 'float',
            'clock_out_longitude' => 'float',
            'missed_clock_out_notified_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Employee, $this>
     */
    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    /**
     * @return BelongsTo<Location, $this>
     */
    public function location(): BelongsTo
    {
        return $this->belongsTo(Location::class);
    }

    /**
     * @return HasMany<TimeEntryBreak, $this>
     */
    public function breaks(): HasMany
    {
        return $this->hasMany(TimeEntryBreak::class);
    }

    /**
     * @return HasOne<TimeEntryBreak, $this>
     */
    public function openBreak(): HasOne
    {
        return $this->hasOne(TimeEntryBreak::class)->whereNull('ended_at');
    }

    public function isOpen(): bool
    {
        return $this->clock_out_at === null;
    }

    /**
     * Minutes worked, excluding breaks. Open entries are measured up to the given moment.
     */
    public function workedMinutes(?CarbonInterface $until = null): int
    {
        $end = $this->clock_out_at ?? $until ?? now();
        $breakMinutes = $this->break_minutes;

        if ($this->clock_out_at === null && $this->openBreak !== null) {
            $breakMinutes += (int) $this->openBreak->started_at->diffInMinutes($end);
        }

        return max(0, (int) $this->clock_in_at->diffInMinutes($end) - $breakMinutes);
    }
}
