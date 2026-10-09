<?php

namespace App\Http\Requests;

use App\Models\Employee;
use App\Models\TimeEntry;
use App\Support\CurrentOrganization;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class TimeEntryRequest extends FormRequest
{
    private const MAX_ENTRY_MINUTES = 24 * 60;

    /**
     * Only managers correct time. Whether the affected week is locked depends on the parsed
     * times, so the controller checks that against the policy after validation.
     */
    public function authorize(): bool
    {
        return $this->user()->currentRole()?->canApproveTimesheets() ?? false;
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
            'employee_id' => [
                Rule::requiredIf(! $this->route('timeEntry') instanceof TimeEntry),
                'integer',
                Rule::exists('employees', 'id')->where('organization_id', $organizationId),
            ],
            'clock_in_at' => ['required', 'date_format:Y-m-d\TH:i'],
            'clock_out_at' => ['required', 'date_format:Y-m-d\TH:i'],
            'break_minutes' => ['nullable', 'integer', 'min:0', 'max:600'],
            'location_id' => ['nullable', 'integer', Rule::exists('locations', 'id')->where('organization_id', $organizationId)],
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

                $attributes = $this->entryAttributes();
                $length = $attributes['clock_in_at']->diffInMinutes($attributes['clock_out_at'], false);

                if ($length <= 0) {
                    $validator->errors()->add('clock_out_at', __('Clock out must be after clock in.'));

                    return;
                }

                if ($length > self::MAX_ENTRY_MINUTES) {
                    $validator->errors()->add('clock_out_at', __('A single entry cannot be longer than 24 hours.'));

                    return;
                }

                if ($attributes['break_minutes'] >= $length) {
                    $validator->errors()->add('break_minutes', __('Breaks must be shorter than the time worked.'));

                    return;
                }

                $entry = $this->route('timeEntry');
                $ignoreEntryId = $entry instanceof TimeEntry ? $entry->id : null;

                $overlaps = TimeEntry::query()
                    ->where('employee_id', $this->employee()->id)
                    ->when($ignoreEntryId !== null, fn ($query) => $query->whereKeyNot($ignoreEntryId))
                    ->where('clock_in_at', '<', $attributes['clock_out_at'])
                    ->where(fn ($query) => $query
                        ->whereNull('clock_out_at')
                        ->orWhere('clock_out_at', '>', $attributes['clock_in_at']))
                    ->exists();

                if ($overlaps) {
                    $validator->errors()->add('clock_in_at', __('This entry overlaps another entry for the same employee.'));
                }
            },
        ];
    }

    public function employee(): Employee
    {
        $entry = $this->route('timeEntry');

        return $entry instanceof TimeEntry
            ? $entry->employee
            : Employee::query()->findOrFail($this->integer('employee_id'));
    }

    /**
     * The entry's local times converted to UTC.
     *
     * @return array{clock_in_at: CarbonImmutable, clock_out_at: CarbonImmutable, break_minutes: int, location_id: int|null, notes: string|null}
     */
    public function entryAttributes(): array
    {
        $timezone = app(CurrentOrganization::class)->get()->timezone;

        return [
            'clock_in_at' => CarbonImmutable::createFromFormat('Y-m-d\TH:i', $this->input('clock_in_at'), $timezone)->utc(),
            'clock_out_at' => CarbonImmutable::createFromFormat('Y-m-d\TH:i', $this->input('clock_out_at'), $timezone)->utc(),
            'break_minutes' => $this->integer('break_minutes'),
            'location_id' => $this->filled('location_id') ? $this->integer('location_id') : null,
            'notes' => $this->input('notes'),
        ];
    }
}
