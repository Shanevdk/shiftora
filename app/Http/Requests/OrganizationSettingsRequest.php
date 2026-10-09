<?php

namespace App\Http\Requests;

use App\Enums\Feature;
use App\Support\CurrentOrganization;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class OrganizationSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        $organization = app(CurrentOrganization::class)->get();

        return $organization !== null && $this->user()->can('update', $organization);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'timezone' => ['required', 'timezone:all'],
            'week_starts_on' => ['required', 'integer', 'between:0,6'],
            'daily_overtime_hours' => ['nullable', 'numeric', 'min:1', 'max:24'],
            'weekly_overtime_hours' => ['nullable', 'numeric', 'min:1', 'max:168'],
            'geofencing_enabled' => ['boolean'],
        ];
    }

    /**
     * Reject pay week changes once timesheets have been submitted, since approved weeks are keyed to it.
     *
     * @return array<int, Closure(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $organization = app(CurrentOrganization::class)->get();

                $timezoneChanged = $this->input('timezone') !== $organization->timezone;
                $weekStartChanged = (int) $this->input('week_starts_on') !== $organization->week_starts_on;

                if ((! $timezoneChanged && ! $weekStartChanged) || ! $organization->hasFixedPayWeek()) {
                    return;
                }

                $message = __('This can\'t be changed after timesheets have been submitted.');

                if ($timezoneChanged) {
                    $validator->errors()->add('timezone', $message);
                }

                if ($weekStartChanged) {
                    $validator->errors()->add('week_starts_on', $message);
                }
            },
        ];
    }

    /**
     * The validated settings mapped onto organization columns, ignoring settings the plan does not include.
     *
     * @return array<string, mixed>
     */
    public function organizationAttributes(): array
    {
        $organization = app(CurrentOrganization::class)->get();
        $validated = $this->validated();

        $attributes = [
            'name' => $validated['name'],
            'timezone' => $validated['timezone'],
            'week_starts_on' => (int) $validated['week_starts_on'],
        ];

        if ($organization->hasFeature(Feature::OvertimeRules)) {
            $attributes['daily_overtime_minutes'] = isset($validated['daily_overtime_hours']) ? (int) round($validated['daily_overtime_hours'] * 60) : null;
            $attributes['weekly_overtime_minutes'] = isset($validated['weekly_overtime_hours']) ? (int) round($validated['weekly_overtime_hours'] * 60) : null;
        }

        if ($organization->hasFeature(Feature::Geofencing)) {
            $attributes['geofencing_enabled'] = $this->boolean('geofencing_enabled');
        }

        return $attributes;
    }
}
