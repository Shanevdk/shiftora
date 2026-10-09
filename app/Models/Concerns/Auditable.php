<?php

namespace App\Models\Concerns;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;

/**
 * Records every create, update and delete of the model in the organization's audit log.
 */
trait Auditable
{
    public static function bootAuditable(): void
    {
        static::created(function (Model $model): void {
            AuditLog::record($model, 'created', [], self::auditableValues($model, $model->getAttributes()));
        });

        static::updated(function (Model $model): void {
            $changes = self::auditableValues($model, $model->getChanges());

            if ($changes === []) {
                return;
            }

            $original = array_intersect_key($model->getRawOriginal(), $changes);

            AuditLog::record($model, 'updated', $original, $changes);
        });

        static::deleted(function (Model $model): void {
            AuditLog::record($model, 'deleted', self::auditableValues($model, $model->getRawOriginal()), []);
        });
    }

    /**
     * @param  array<string, mixed>  $values
     * @return array<string, mixed>
     */
    private static function auditableValues(Model $model, array $values): array
    {
        return array_diff_key($values, array_flip([
            ...$model->getHidden(),
            'id',
            'organization_id',
            'created_at',
            'updated_at',
        ]));
    }
}
