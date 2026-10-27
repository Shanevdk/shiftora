<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * How long the no-card trial lasts now that payments start once it ends.
     */
    private const TRIAL_DAYS = 90;

    /**
     * Give every existing workspace the full trial, counted from when it signed up, in place of the
     * launch promotion's end date. A trial that already runs longer is never shortened, and the
     * trial-ending reminder is reset so it goes out again just before the new end date.
     */
    public function up(): void
    {
        DB::table('organizations')
            ->whereNotNull('trial_ends_at')
            ->whereNotNull('created_at')
            ->chunkById(100, function ($organizations): void {
                foreach ($organizations as $organization) {
                    $fullTrialEndsAt = Carbon::parse($organization->created_at)->addDays(self::TRIAL_DAYS);

                    if ($fullTrialEndsAt->isPast() || Carbon::parse($organization->trial_ends_at)->gte($fullTrialEndsAt)) {
                        continue;
                    }

                    DB::table('organizations')->where('id', $organization->id)->update([
                        'trial_ends_at' => $fullTrialEndsAt,
                        'trial_ending_notified_at' => null,
                    ]);
                }
            });
    }

    /**
     * The earlier trial end dates aren't kept, so there is nothing to restore.
     */
    public function down(): void
    {
        //
    }
};
