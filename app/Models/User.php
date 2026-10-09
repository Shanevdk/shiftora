<?php

namespace App\Models;

use App\Enums\Role;
use App\Models\Scopes\OrganizationScope;
use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;
use Laravel\Fortify\Contracts\PasskeyUser;
use Laravel\Fortify\PasskeyAuthenticatable;
use Laravel\Fortify\TwoFactorAuthenticatable;

/**
 * @property int $id
 * @property string $name
 * @property string $email
 * @property bool $is_demo
 * @property int|null $current_organization_id
 * @property Carbon|null $email_verified_at
 * @property string $password
 * @property string|null $two_factor_secret
 * @property string|null $two_factor_recovery_codes
 * @property Carbon|null $two_factor_confirmed_at
 * @property string|null $remember_token
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Organization|null $currentOrganization
 * @property-read Employee|null $currentEmployee
 */
#[Fillable(['name', 'email', 'password'])]
#[Hidden(['password', 'two_factor_secret', 'two_factor_recovery_codes', 'remember_token'])]
class User extends Authenticatable implements MustVerifyEmail, PasskeyUser
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, PasskeyAuthenticatable, TwoFactorAuthenticatable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'is_demo' => 'boolean',
            'password' => 'hashed',
            'two_factor_confirmed_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Organization, $this>
     */
    public function currentOrganization(): BelongsTo
    {
        return $this->belongsTo(Organization::class, 'current_organization_id');
    }

    /**
     * The user's employee record in the organization they are currently working in.
     *
     * @return HasOne<Employee, $this>
     */
    public function currentEmployee(): HasOne
    {
        return $this->hasOne(Employee::class)
            ->withoutGlobalScope(OrganizationScope::class)
            ->where('organization_id', $this->current_organization_id)
            ->where('is_active', true);
    }

    /**
     * Every active employee record for this user, across all organizations.
     *
     * @return HasMany<Employee, $this>
     */
    public function memberships(): HasMany
    {
        return $this->hasMany(Employee::class)
            ->withoutGlobalScope(OrganizationScope::class)
            ->where('is_active', true);
    }

    /**
     * The user's role in their current organization, if they are an active member.
     */
    public function currentRole(): ?Role
    {
        return $this->currentEmployee?->role;
    }

    /**
     * Make the given organization the one the user is working in.
     */
    public function switchOrganization(Organization $organization): void
    {
        $this->forceFill(['current_organization_id' => $organization->id])->save();

        $this->unsetRelation('currentOrganization');
        $this->unsetRelation('currentEmployee');
    }
}
