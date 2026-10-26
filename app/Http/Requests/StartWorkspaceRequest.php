<?php

namespace App\Http\Requests;

use App\Concerns\ProfileValidationRules;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StartWorkspaceRequest extends FormRequest
{
    use ProfileValidationRules;

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'owner_name' => $this->nameRules(),
            'name' => ['required', 'string', 'max:255'],
            'timezone' => ['required', 'timezone:all_with_bc'],
        ];
    }
}
