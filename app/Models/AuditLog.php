<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Support\Carbon;

/**
 * Append-only history of changes to tenant data.
 *
 * @property int $id
 * @property int $organization_id
 * @property int|null $user_id
 * @property string $auditable_type
 * @property int $auditable_id
 * @property string $event
 * @property array<string, mixed>|null $old_values
 * @property array<string, mixed>|null $new_values
 * @property string|null $ip_address
 * @property Carbon $created_at
 */
#[Fillable(['organization_id', 'user_id', 'auditable_type', 'auditable_id', 'event', 'old_values', 'new_values', 'ip_address'])]
class AuditLog extends Model
{
    use BelongsToOrganization;

    public const UPDATED_AT = null;

    /**
     * Record a change to an organization-owned model.
     *
     * @param  array<string, mixed>  $oldValues
     * @param  array<string, mixed>  $newValues
     */
    public static function record(Model $model, string $event, array $oldValues, array $newValues): void
    {
        $organizationId = $model->getAttribute('organization_id');

        if ($organizationId === null) {
            return;
        }

        static::create([
            'organization_id' => $organizationId,
            'user_id' => auth()->id(),
            'auditable_type' => $model->getMorphClass(),
            'auditable_id' => $model->getKey(),
            'event' => $event,
            'old_values' => $oldValues === [] ? null : $oldValues,
            'new_values' => $newValues === [] ? null : $newValues,
            'ip_address' => app()->runningInConsole() ? null : request()->ip(),
        ]);
    }

    protected static function booted(): void
    {
        static::updating(fn (): bool => false);
        static::deleting(fn (): bool => false);
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'old_values' => 'array',
            'new_values' => 'array',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return MorphTo<Model, $this>
     */
    public function auditable(): MorphTo
    {
        return $this->morphTo();
    }
}
