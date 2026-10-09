<?php

namespace App\Console\Commands;

use App\Enums\Feature;
use App\Models\Shift;
use App\Notifications\ShiftReminder;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('shiftora:send-shift-reminders')]
#[Description('Remind employees about published shifts that start soon')]
class SendShiftReminders extends Command
{
    public function handle(): int
    {
        $sent = 0;

        Shift::query()
            ->published()
            ->whereNull('reminder_sent_at')
            ->whereNotNull('employee_id')
            ->whereBetween('starts_at', [now(), now()->addMinutes(config('shiftora.shift_reminder_lead_minutes'))])
            ->with(['employee.user', 'organization', 'location'])
            ->orderBy('id')
            ->chunkById(200, function ($shifts) use (&$sent): void {
                foreach ($shifts as $shift) {
                    $shift->forceFill(['reminder_sent_at' => now()])->saveQuietly();

                    // Organizations that moved to a plan without scheduling keep old shifts but get no reminders.
                    if (! $shift->organization->hasFeature(Feature::Scheduling)) {
                        continue;
                    }

                    if ($shift->employee?->is_active && $shift->employee->user !== null) {
                        $shift->employee->user->notify(new ShiftReminder($shift));
                        $sent++;
                    }
                }
            });

        $this->info("Sent {$sent} shift reminder(s).");

        return self::SUCCESS;
    }
}
