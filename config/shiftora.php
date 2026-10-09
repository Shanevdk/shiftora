<?php

/*
|--------------------------------------------------------------------------
| Shiftora Product Configuration
|--------------------------------------------------------------------------
|
| Subscription plans, their entitlements, and workforce defaults. Prices are
| per active employee per month, in cents. Stripe price IDs come from the
| environment so test and live mode can use different Stripe accounts.
|
*/

return [

    'trial_days' => (int) env('SHIFTORA_TRIAL_DAYS', 14),

    'subscription_type' => 'default',

    'plans' => [

        'starter' => [
            'name' => 'Starter',
            'description' => 'A simple time clock for small crews.',
            'price_per_employee_cents' => 400,
            'stripe_price' => env('STRIPE_PRICE_STARTER'),
            'employee_limit' => 10,
            'location_limit' => 1,
            'features' => [
                'time_clock',
                'timesheets',
            ],
        ],

        'professional' => [
            'name' => 'Professional',
            'description' => 'Shift scheduling, approvals and reporting for growing teams.',
            'price_per_employee_cents' => 700,
            'stripe_price' => env('STRIPE_PRICE_PROFESSIONAL'),
            'employee_limit' => 100,
            'location_limit' => 1,
            'features' => [
                'time_clock',
                'timesheets',
                'scheduling',
                'timesheet_approvals',
                'drag_drop_scheduling',
                'reports',
                'csv_export',
                'overtime_rules',
            ],
        ],

        'business' => [
            'name' => 'Business',
            'description' => 'Geofencing, audit trails and multiple locations for established operations.',
            'price_per_employee_cents' => 1000,
            'stripe_price' => env('STRIPE_PRICE_BUSINESS'),
            'employee_limit' => null,
            'location_limit' => null,
            'features' => [
                'time_clock',
                'timesheets',
                'scheduling',
                'timesheet_approvals',
                'drag_drop_scheduling',
                'reports',
                'csv_export',
                'overtime_rules',
                'geofencing',
                'audit_log',
                'multiple_locations',
                'priority_support',
            ],
        ],

    ],

    'overtime_multiplier' => 1.5,

    'missed_clock_out_after_hours' => 14,

    'shift_reminder_lead_minutes' => 60,

    'trial_ending_notice_days' => 3,

    'report_max_days' => 93,

    /*
    |--------------------------------------------------------------------------
    | Legal Pages
    |--------------------------------------------------------------------------
    |
    | Shown on the privacy and cookie policies. Bump "last_updated" whenever
    | the wording of either policy changes.
    |
    */

    'legal' => [
        'company_name' => env('SHIFTORA_LEGAL_NAME', 'Shiftora'),
        'contact_email' => env('SHIFTORA_PRIVACY_EMAIL', env('MAIL_FROM_ADDRESS', 'hello@example.com')),
        'last_updated' => '2026-10-09',
    ],

];
