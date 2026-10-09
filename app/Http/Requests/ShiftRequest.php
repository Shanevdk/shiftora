<?php

namespace App\Http\Requests;

use App\Models\Shift;
use App\Support\CurrentOrganization;
use App\Support\Scheduling\ShiftConflicts;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class ShiftRequest extends FormRequest
{
    public function authorize(): bool
    {
        $shift = $this->route('shift');

        return $shift instanceof Shift
            ? $this->user()->can('update', $shift)
            : $this->user()->can('create', Shift::class);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $organizationId = app(CurrentOrganization::class)->id();

        return [
            'employee_id' => ['nullable', 'integer', Rule::exists('employees', 'id')->where('organization_id', $organizationId)->where('is_active', true)],
            'location_id' => ['nullable', 'integer', Rule::exists('locations', 'id')->where('organization_id', $organizationId)],
            'date' => ['required', 'date_format:Y-m-d'],
            'start_time' => ['required', 'date_format:H:i'],
            'end_time' => ['required', 'date_format:H:i', 'different:start_time'],
            'break_minutes' => ['nullable', 'integer', 'min:0', 'max:240'],
            'position' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }

    /**
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($validator->errors()->isNotEmpty()) {
                    return;
                }

                $attributes = $this->shiftAttributes();

                if ($attributes['starts_at']->diffInMinutes($attributes['ends_at']) <= $attributes['break_minutes']) {
                    $validator->errors()->add('break_minutes', __('The break must be shorter than the shift.'));

                    return;
                }

                $shift = $this->route('shift');

                if (ShiftConflicts::exists($attributes['employee_id'], $attributes['starts_at'], $attributes['ends_at'], $shift instanceof Shift ? $shift->id : null)) {
                    $validator->errors()->add('start_time', __('This employee already has a shift during that time.'));
                }
            },
        ];
    }

    /**
     * Convert the local date and times into UTC shift timestamps. An end time before the start time means the shift ends the next day.
     *
     * @return array{employee_id: int|null, location_id: int|null, starts_at: CarbonImmutable, ends_at: CarbonImmutable, break_minutes: int, position: string|null, notes: string|null}
     */
    public function shiftAttributes(): array
    {
        $timezone = app(CurrentOrganization::class)->get()->timezone;

        $startsAt = CarbonImmutable::createFromFormat('Y-m-d H:i', "{$this->input('date')} {$this->input('start_time')}", $timezone);
        $endsAt = CarbonImmutable::createFromFormat('Y-m-d H:i', "{$this->input('date')} {$this->input('end_time')}", $timezone);

        if ($endsAt->lessThanOrEqualTo($startsAt)) {
            $endsAt = $endsAt->addDay();
        }

        return [
            'employee_id' => $this->filled('employee_id') ? $this->integer('employee_id') : null,
            'location_id' => $this->filled('location_id') ? $this->integer('location_id') : null,
            'starts_at' => $startsAt->utc(),
            'ends_at' => $endsAt->utc(),
            'break_minutes' => $this->integer('break_minutes'),
            'position' => $this->input('position'),
            'notes' => $this->input('notes'),
        ];
    }
}
