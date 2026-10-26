<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Keep every existing workspace open without a card until the launch promotion ends,
     * including ones whose short trial has already run out. Their trial-ending reminder is
     * reset so it goes out again just before the new end date.
     */
    public function up(): void
    {
        $freeUntil = filled(config('shiftora.free_until')) ? Carbon::parse(config('shiftora.free_until')) : null;

        if ($freeUntil === null || $freeUntil->isPast()) {
            return;
        }

        DB::table('organizations')
            ->where('trial_ends_at', '<', $freeUntil)
            ->update([
                'trial_ends_at' => $freeUntil,
                'trial_ending_notified_at' => null,
            ]);
    }

    /**
     * The original trial end dates aren't kept, so there is nothing to restore.
     */
    public function down(): void
    {
        //
    }
};
