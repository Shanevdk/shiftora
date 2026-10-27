<?php

namespace App\Support\Billing;

use App\Enums\Feature;
use App\Enums\Plan;
use App\Models\Organization;
use Illuminate\Validation\ValidationException;

/**
 * Works out which plans fit an organization, so continuing after the trial never quietly takes away
 * something the team has been using.
 */
class PlanAdvisor
{
    /**
     * The cheapest plan that fits the team and keeps every feature the organization has used.
     */
    public static function recommend(Organization $organization): Plan
    {
        $usedFeatures = self::usedFeatures($organization);
        $activeEmployees = $organization->activeEmployeeCount();

        foreach (Plan::paid() as $plan) {
            if (self::seatsFit($plan, $activeEmployees) && self::missingFeatures($plan, $usedFeatures) === []) {
                return $plan;
            }
        }

        return Plan::Business;
    }

    /**
     * Paid features the organization has actually put to use.
     *
     * @return list<Feature>
     */
    public static function usedFeatures(Organization $organization): array
    {
        return array_values(array_filter([
            $organization->shifts()->exists() ? Feature::Scheduling : null,
            $organization->timesheets()->whereNotNull('submitted_at')->exists() ? Feature::TimesheetApprovals : null,
            $organization->geofencing_enabled ? Feature::Geofencing : null,
            $organization->locations()->count() > 1 ? Feature::MultipleLocations : null,
        ]));
    }

    /**
     * The used features the plan doesn't include.
     *
     * @param  list<Feature>  $usedFeatures
     * @return list<Feature>
     */
    public static function missingFeatures(Plan $plan, array $usedFeatures): array
    {
        return array_values(array_filter($usedFeatures, fn (Feature $feature): bool => ! $plan->includes($feature)));
    }

    public static function seatsFit(Plan $plan, int $activeEmployees): bool
    {
        return $plan->employeeLimit() === null || $activeEmployees <= $plan->employeeLimit();
    }

    /**
     * Refuse a plan the organization's active employees don't fit into.
     *
     * @throws ValidationException
     */
    public static function ensureSeatsFit(Organization $organization, Plan $plan): void
    {
        $activeEmployees = $organization->activeEmployeeCount();

        if (! self::seatsFit($plan, $activeEmployees)) {
            throw ValidationException::withMessages([
                'plan' => __('The :plan plan allows :limit active employees and you have :count. Deactivate employees first.', [
                    'plan' => $plan->label(),
                    'limit' => $plan->employeeLimit(),
                    'count' => $activeEmployees,
                ]),
            ]);
        }
    }
}
