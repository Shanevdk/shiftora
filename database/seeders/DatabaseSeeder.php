<?php

namespace Database\Seeders;

use App\Actions\Organizations\CreateSampleOrganization;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed a realistic demo organization.
     *
     * Log in as test@example.com (owner), manager@example.com or employee@example.com; every password is "password".
     */
    public function run(CreateSampleOrganization $createSampleOrganization): void
    {
        $createSampleOrganization->handle();
    }
}
