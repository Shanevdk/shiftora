<?php

namespace App\Enums;

enum TimesheetStatus: string
{
    case Open = 'open';
    case Submitted = 'submitted';
    case Approved = 'approved';
    case Rejected = 'rejected';

    public function label(): string
    {
        return ucfirst($this->value);
    }

    /**
     * Whether the employee may still submit the timesheet for approval.
     */
    public function isSubmittable(): bool
    {
        return in_array($this, [self::Open, self::Rejected], true);
    }
}
