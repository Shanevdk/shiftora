<?php

namespace App\Http\Requests\Settings;

use App\Concerns\PasswordValidationRules;
use App\Enums\Role;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class ProfileDeleteRequest extends FormRequest
{
    use PasswordValidationRules;

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'password' => $this->currentPasswordRules(),
        ];
    }

    /**
     * Keep organization owners from deleting their login, which would leave the organization (and its billing) without an owner.
     *
     * @return array<int, Closure(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $ownership = $this->user()->memberships()->where('role', Role::Owner)->with('organization')->first();

                if ($ownership !== null) {
                    $validator->errors()->add('account', __('You own :organization, so your account can\'t be deleted. Contact support to transfer ownership or close the organization first.', [
                        'organization' => $ownership->organization->name,
                    ]));
                }
            },
        ];
    }
}
