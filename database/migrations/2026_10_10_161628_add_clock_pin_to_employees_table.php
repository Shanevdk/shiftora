<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->string('clock_pin', 6)->nullable()->after('color');

            $table->unique(['organization_id', 'clock_pin']);
        });

        // Give everyone already on a team a kiosk PIN, unique within their organization.
        $takenByOrganization = [];

        DB::table('employees')->orderBy('id')->select(['id', 'organization_id'])->lazyById()->each(function (object $employee) use (&$takenByOrganization): void {
            $taken = $takenByOrganization[$employee->organization_id] ?? [];

            $attempts = 0;

            do {
                $digits = ++$attempts > 50 ? 6 : 4;
                $pin = str_pad((string) random_int(0, 10 ** $digits - 1), $digits, '0', STR_PAD_LEFT);
            } while (isset($taken[$pin]));

            $takenByOrganization[$employee->organization_id][$pin] = true;

            DB::table('employees')->where('id', $employee->id)->update(['clock_pin' => $pin]);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropUnique(['organization_id', 'clock_pin']);
            $table->dropColumn('clock_pin');
        });
    }
};
