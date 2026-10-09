<?php

namespace App\Console\Commands;

use App\Models\Organization;
use App\Notifications\TrialEnding;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('shiftora:send-trial-ending-notices')]
#[Description('Tell organization owners their free trial is about to end')]
class SendTrialEndingNotices extends Command
{
    public function handle(): int
    {
        $sent = 0;

        Organization::query()
            ->whereNull('trial_ending_notified_at')
            ->whereBetween('trial_ends_at', [now(), now()->addDays(config('shiftora.trial_ending_notice_days'))])
            ->whereDoesntHave('subscriptions')
            ->orderBy('id')
            ->chunkById(100, function ($organizations) use (&$sent): void {
                foreach ($organizations as $organization) {
                    $organization->forceFill(['trial_ending_notified_at' => now()])->save();

                    $organization->owner()?->user?->notify(new TrialEnding($organization));
                    $sent++;
                }
            });

        $this->info("Sent {$sent} trial ending notice(s).");

        return self::SUCCESS;
    }
}
