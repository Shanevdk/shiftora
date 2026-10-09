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
        Schema::create('time_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained()->cascadeOnDelete();
            $table->foreignId('location_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamp('clock_in_at');
            $table->timestamp('clock_out_at')->nullable();
            $table->unsignedInteger('break_minutes')->default(0);
            $table->decimal('clock_in_latitude', 10, 7)->nullable();
            $table->decimal('clock_in_longitude', 10, 7)->nullable();
            $table->decimal('clock_out_latitude', 10, 7)->nullable();
            $table->decimal('clock_out_longitude', 10, 7)->nullable();
            $table->string('source')->default('clock');
            $table->text('notes')->nullable();
            $table->timestamp('missed_clock_out_notified_at')->nullable();
            $table->timestamps();

            $table->index(['employee_id', 'clock_in_at']);
            $table->index(['organization_id', 'clock_in_at']);
        });

        // Guarantees at most one open entry per employee, even under concurrent clock-ins.
        DB::statement('CREATE UNIQUE INDEX time_entries_one_open_per_employee ON time_entries (employee_id) WHERE clock_out_at IS NULL');

        Schema::create('time_entry_breaks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('time_entry_id')->constrained()->cascadeOnDelete();
            $table->timestamp('started_at');
            $table->timestamp('ended_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('time_entry_breaks');
        Schema::dropIfExists('time_entries');
    }
};
