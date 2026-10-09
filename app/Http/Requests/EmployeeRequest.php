<?php

namespace App\Http\Requests;

use App\Enums\Role;
use App\Models\Employee;
use App\Support\CurrentOrganization;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class EmployeeRequest extends FormRequest
{
    public function authorize(): bool
    {
        $employee = $this->route('employee');

        return $employee instanceof Employee
            ? $this->user()->can('update', $employee)
            : $this->user()->can('create', Employee::class);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $organizationId = app(CurrentOrganization::class)->id();
        $employee = $this->route('employee');

        $assignableRoles = array_map(fn (Role $role): string => $role->value, Role::assignableBy($this->user()->currentRole()));

        if ($employee instanceof Employee && $employee->role === Role::Owner) {
            $assignableRoles = [Role::Owner->value];
        }

        return [
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'email' => [
                'nullable',
                'email',
                'max:255',
                Rule::unique('employees', 'email')
                    ->where('organization_id', $organizationId)
                    ->ignore($employee instanceof Employee ? $employee->id : null),
            ],
            'phone' => ['nullable', 'string', 'max:50'],
            'job_title' => ['nullable', 'string', 'max:100'],
            'role' => ['required', Rule::in($assignableRoles)],
            'hourly_rate' => ['nullable', 'numeric', 'min:0', 'max:10000'],
            'location_id' => ['nullable', 'integer', Rule::exists('locations', 'id')->where('organization_id', $organizationId)],
            'color' => ['nullable', 'string', Rule::in(Employee::COLORS)],
        ];
    }

    /**
     * The validated attributes mapped onto employee columns.
     *
     * @return array<string, mixed>
     */
    public function employeeAttributes(): array
    {
        $validated = $this->validated();

        return [
            ...collect($validated)->except(['hourly_rate', ...(empty($validated['color']) ? ['color'] : [])])->all(),
            'email' => isset($validated['email']) ? mb_strtolower($validated['email']) : null,
            'hourly_rate_cents' => isset($validated['hourly_rate']) ? (int) round($validated['hourly_rate'] * 100) : null,
        ];
    }
}
