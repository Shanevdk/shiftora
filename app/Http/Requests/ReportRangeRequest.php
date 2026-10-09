<?php

namespace App\Http\Requests;

use App\Support\CurrentOrganization;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class ReportRangeRequest extends FormRequest
{
    public function authorize(): bool
    {
        $organization = app(CurrentOrganization::class)->get();

        return $organization !== null && $this->user()->can('viewReports', $organization);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'from' => ['nullable', 'date_format:Y-m-d'],
            'to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:from'],
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

                [$from, $to] = $this->range();
                $maxDays = config('shiftora.report_max_days');

                if ($from->diffInDays($to) >= $maxDays) {
                    $validator->errors()->add('to', __('Reports can cover at most :days days.', ['days' => $maxDays]));
                }
            },
        ];
    }

    /**
     * The local start-of-day bounds of the report, defaulting to the current pay week.
     *
     * @return array{0: CarbonImmutable, 1: CarbonImmutable}
     */
    public function range(): array
    {
        $organization = app(CurrentOrganization::class)->get();

        $from = $this->filled('from')
            ? CarbonImmutable::createFromFormat('Y-m-d', $this->input('from'), $organization->timezone)->startOfDay()
            : $organization->weekStartFor(now());

        $to = $this->filled('to')
            ? CarbonImmutable::createFromFormat('Y-m-d', $this->input('to'), $organization->timezone)->startOfDay()
            : $from->addDays(6);

        return [$from, $to];
    }
}
