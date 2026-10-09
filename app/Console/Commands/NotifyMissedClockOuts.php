<?php

namespace App\Console\Commands;

use App\Enums\Role;
use App\Models\Employee;
use App\Models\TimeEntry;
use App\Notifications\MissedClockOut;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Notification;

#[Signature('shiftora:notify-missed-clock-outs')]
#[Description('Alert managers and employees about time entries that have been open for too long')]
class NotifyMissedClockOuts extends Command
{
    public function handle(): int
    {
        $count = 0;

        TimeEntry::query()
            ->whereNull('clock_out_at')
            ->whereNull('missed_clock_out_notified_at')
            ->where('clock_in_at', '<=', now()->subHours(config('shiftora.missed_clock_out_after_hours')))
            ->with(['employee.user', 'organization'])
            ->orderBy('id')
            ->chunkById(200, function ($entries) use (&$count): void {
                foreach ($entries as $entry) {
                    $entry->forceFill(['missed_clock_out_notified_at' => now()])->saveQuietly();

                    $recipients = Employee::query()
                        ->where('organization_id', $entry->organization_id)
                        ->active()
                        ->whereIn('role', [Role::Owner, Role::Admin, Role::Manager])
                        ->whereNotNull('user_id')
                        ->with('user')
                        ->get()
                        ->pluck('user')
                        ->push($entry->employee->user)
                        ->filter()
                        ->unique('id');

                    Notification::send($recipients, new MissedClockOut($entry));
                    $count++;
                }
            });

        $this->info("Flagged {$count} open time entr(y/ies).");

        return self::SUCCESS;
    }
}
