<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Mark workspaces started from the landing page without an account, and their owners,
     * until the visitor saves the workspace by creating a login.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('is_guest')->default(false)->after('is_demo');
        });

        Schema::table('organizations', function (Blueprint $table) {
            $table->boolean('is_guest')->default(false)->after('is_demo');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('is_guest');
        });

        Schema::table('organizations', function (Blueprint $table) {
            $table->dropColumn('is_guest');
        });
    }
};
