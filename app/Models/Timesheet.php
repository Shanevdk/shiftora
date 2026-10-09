<?php

namespace App\Models;

use App\Enums\TimesheetStatus;
use App\Models\Concerns\Auditable;
use App\Models\Concerns\BelongsToOrganization;
use Carbon\CarbonImmutable;
use Database\Factories\TimesheetFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $organization_id
 * @property int $employee_id
 * @property CarbonImmutable $period_start
 * @property CarbonImmutable $period_end
 * @property TimesheetStatus $status
 * @property Carbon|null $submitted_at
 * @property Carbon|null $reviewed_at
 * @property int|null $reviewed_by
 * @property string|null $review_note
 * @property int $regular_minutes
 * @property int $overtime_minutes
 * @property int $break_minutes
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Employee $employee
 * @property-read User|null $reviewer
 */
#[Fillable(['organization_id', 'employee_id', 'period_start', 'period_end', 'status', 'submitted_at', 'reviewed_at', 'reviewed_by', 'review_note', 'regular_minutes', 'overtime_minutes', 'break_minutes'])]
class Timesheet extends Model
{
    /** @use HasFactory<TimesheetFactory> */
    use Auditable, BelongsToOrganization, HasFactory;

    /**
     * @var array<string, mixed>
     */
    protected $attributes = [
        'status' => 'open',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'period_start' => 'immutable_date',
            'period_end' => 'immutable_date',
            'status' => TimesheetStatus::class,
            'submitted_at' => 'datetime',
            'reviewed_at' => 'datetime',
            'regular_minutes' => 'integer',
            'overtime_minutes' => 'integer',
            'break_minutes' => 'integer',
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
     * @return BelongsTo<User, $this>
     */
    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function isLocked(): bool
    {
        return $this->status === TimesheetStatus::Approved;
    }

    /**
     * Find or start the employee's timesheet for the pay week beginning on the given local date.
     */
    public static function forWeek(Employee $employee, CarbonImmutable $weekStart): self
    {
        $existing = self::findForWeek($employee, $weekStart);

        if ($existing !== null) {
            return $existing;
        }

        try {
            return self::create([
                'organization_id' => $employee->organization_id,
                'employee_id' => $employee->id,
                'period_start' => $weekStart->toDateString(),
                'period_end' => $weekStart->addDays(6)->toDateString(),
            ]);
        } catch (UniqueConstraintViolationException $exception) {
            // Another request created the timesheet first; use theirs.
            return self::findForWeek($employee, $weekStart) ?? throw $exception;
        }
    }

    private static function findForWeek(Employee $employee, CarbonImmutable $weekStart): ?self
    {
        return self::query()
            ->where('employee_id', $employee->id)
            ->whereDate('period_start', $weekStart->toDateString())
            ->first();
    }
}
