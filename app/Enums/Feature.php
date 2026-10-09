<?php

namespace App\Enums;

enum Feature: string
{
    case TimeClock = 'time_clock';
    case Timesheets = 'timesheets';
    case Scheduling = 'scheduling';
    case TimesheetApprovals = 'timesheet_approvals';
    case DragDropScheduling = 'drag_drop_scheduling';
    case Reports = 'reports';
    case CsvExport = 'csv_export';
    case OvertimeRules = 'overtime_rules';
    case Geofencing = 'geofencing';
    case AuditLog = 'audit_log';
    case MultipleLocations = 'multiple_locations';
    case PrioritySupport = 'priority_support';

    /**
     * Get the human readable feature name.
     */
    public function label(): string
    {
        return match ($this) {
            self::TimeClock => 'Time clock',
            self::Timesheets => 'Timesheets',
            self::Scheduling => 'Shift scheduling',
            self::TimesheetApprovals => 'Timesheet approvals',
            self::DragDropScheduling => 'Drag-and-drop scheduling',
            self::Reports => 'Reports',
            self::CsvExport => 'CSV export',
            self::OvertimeRules => 'Overtime rules',
            self::Geofencing => 'Geofenced clock-in',
            self::AuditLog => 'Audit log',
            self::MultipleLocations => 'Multiple locations',
            self::PrioritySupport => 'Priority support',
        };
    }

    /**
     * Get the cheapest plan that includes this feature.
     */
    public function minimumPlan(): Plan
    {
        foreach (Plan::cases() as $plan) {
            if ($plan->includes($this)) {
                return $plan;
            }
        }

        return Plan::Business;
    }
}
