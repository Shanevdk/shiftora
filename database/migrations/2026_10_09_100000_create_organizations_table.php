<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('organizations', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('timezone')->default('UTC');
            $table->unsignedTinyInteger('week_starts_on')->default(1);
            $table->string('logo_path')->nullable();
            $table->string('plan')->default('professional');
            $table->unsignedInteger('daily_overtime_minutes')->nullable();
            $table->unsignedInteger('weekly_overtime_minutes')->nullable()->default(2400);
            $table->boolean('geofencing_enabled')->default(false);
            $table->timestamp('trial_ending_notified_at')->nullable();
            $table->timestamps();
        });

        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('current_organization_id')
                ->nullable()
                ->after('email')
                ->constrained('organizations')
                ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('current_organization_id');
        });

        Schema::dropIfExists('organizations');
    }
};
