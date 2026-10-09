<?php

namespace App\Providers;

use App\Models\Employee;
use App\Models\Organization;
use App\Models\Shift;
use App\Models\TimeEntry;
use App\Models\Timesheet;
use App\Support\CurrentOrganization;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;
use Laravel\Cashier\Cashier;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->scoped(CurrentOrganization::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();
        $this->configureBilling();

        Relation::morphMap([
            'employee' => Employee::class,
            'shift' => Shift::class,
            'time_entry' => TimeEntry::class,
            'timesheet' => Timesheet::class,
        ]);
    }

    /**
     * Bill organizations (not individual users) through Stripe.
     */
    protected function configureBilling(): void
    {
        Cashier::useCustomerModel(Organization::class);
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        URL::forceHttps(app()->isProduction());

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }
}
