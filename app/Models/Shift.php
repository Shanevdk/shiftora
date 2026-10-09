<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use App\Models\Concerns\BelongsToOrganization;
use Database\Factories\ShiftFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $organization_id
 * @property int|null $employee_id
 * @property int|null $location_id
 * @property Carbon $starts_at
 * @property Carbon $ends_at
 * @property int $break_minutes
 * @property string|null $position
 * @property string|null $notes
 * @property Carbon|null $published_at
 * @property Carbon|null $reminder_sent_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Employee|null $employee
 * @property-read Location|null $location
 */
#[Fillable(['organization_id', 'employee_id', 'location_id', 'starts_at', 'ends_at', 'break_minutes', 'position', 'notes', 'published_at'])]
class Shift extends Model
{
    /** @use HasFactory<ShiftFactory> */
    use Auditable, BelongsToOrganization, HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'break_minutes' => 'integer',
            'published_at' => 'datetime',
            'reminder_sent_at' => 'datetime',
        ];
    }

    /**
     * @param  Builder<self>  $query
     */
    #[Scope]
    protected function published(Builder $query): void
    {
        $query->whereNotNull('published_at');
    }

    /**
     * Shifts that intersect the given time range.
     *
     * @param  Builder<self>  $query
     */
    #[Scope]
    protected function overlapping(Builder $query, Carbon|\DateTimeInterface $startsAt, Carbon|\DateTimeInterface $endsAt): void
    {
        $query->where('starts_at', '<', $endsAt)->where('ends_at', '>', $startsAt);
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

    public function isPublished(): bool
    {
        return $this->published_at !== null;
    }

    /**
     * Scheduled working minutes, excluding the planned break.
     */
    public function scheduledMinutes(): int
    {
        return max(0, (int) $this->starts_at->diffInMinutes($this->ends_at) - $this->break_minutes);
    }
}
