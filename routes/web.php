<?php

use App\Http\Controllers\AuditLogController;
use App\Http\Controllers\CurrentOrganizationController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DemoController;
use App\Http\Controllers\EmployeeController;
use App\Http\Controllers\EmployeeInvitationController;
use App\Http\Controllers\EmployeeStatusController;
use App\Http\Controllers\InvitationController;
use App\Http\Controllers\LegalController;
use App\Http\Controllers\MoveShiftController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\OnboardingController;
use App\Http\Controllers\PublishScheduleController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\ScheduleController;
use App\Http\Controllers\ShiftController;
use App\Http\Controllers\TimeClockController;
use App\Http\Controllers\TimeEntryController;
use App\Http\Controllers\TimesheetController;
use App\Http\Controllers\TimesheetReviewController;
use App\Http\Controllers\TimesheetSubmissionController;
use App\Http\Controllers\WelcomeController;
use Illuminate\Support\Facades\Route;

Route::get('/', WelcomeController::class)->name('home');
Route::get('privacy', [LegalController::class, 'privacy'])->name('legal.privacy');
Route::get('cookies', [LegalController::class, 'cookies'])->name('legal.cookies');

Route::post('demo', [DemoController::class, 'store'])->middleware('throttle:5,1')->name('demo.store');
Route::get('demo/exit', [DemoController::class, 'destroy'])->name('demo.destroy');

Route::middleware('signed')->group(function () {
    Route::get('invitations/{employee}', [InvitationController::class, 'show'])->name('invitations.show');
    Route::post('invitations/{employee}', [InvitationController::class, 'store'])
        ->middleware('throttle:6,1')
        ->name('invitations.store');
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('onboarding', [OnboardingController::class, 'create'])->name('onboarding.create');
    Route::post('onboarding', [OnboardingController::class, 'store'])->name('onboarding.store');

    Route::middleware('organization')->group(function () {
        Route::put('current-organization', [CurrentOrganizationController::class, 'update'])->name('current-organization.update');
        Route::post('notifications/read', [NotificationController::class, 'markAllRead'])->name('notifications.read');

        Route::middleware('subscribed')->group(function () {
            Route::get('dashboard', DashboardController::class)->name('dashboard');

            Route::get('time-clock', [TimeClockController::class, 'show'])->name('time-clock.show');
            Route::middleware('throttle:30,1')->group(function () {
                Route::post('time-clock/clock-in', [TimeClockController::class, 'clockIn'])->name('time-clock.clock-in');
                Route::post('time-clock/clock-out', [TimeClockController::class, 'clockOut'])->name('time-clock.clock-out');
                Route::post('time-clock/break', [TimeClockController::class, 'startBreak'])->name('time-clock.break.start');
                Route::delete('time-clock/break', [TimeClockController::class, 'endBreak'])->name('time-clock.break.end');
            });

            Route::get('timesheets', [TimesheetController::class, 'index'])->name('timesheets.index');
            Route::get('timesheets/{employee}', [TimesheetController::class, 'show'])->name('timesheets.show');
            Route::post('time-entries', [TimeEntryController::class, 'store'])->name('time-entries.store');
            Route::put('time-entries/{timeEntry}', [TimeEntryController::class, 'update'])->name('time-entries.update');
            Route::delete('time-entries/{timeEntry}', [TimeEntryController::class, 'destroy'])->name('time-entries.destroy');

            Route::middleware('feature:timesheet_approvals')->group(function () {
                Route::post('timesheets/{timesheet}/submission', [TimesheetSubmissionController::class, 'store'])->name('timesheets.submit');
                Route::post('timesheets/{timesheet}/approval', [TimesheetReviewController::class, 'approve'])->name('timesheets.approve');
                Route::post('timesheets/{timesheet}/rejection', [TimesheetReviewController::class, 'reject'])->name('timesheets.reject');
                Route::post('timesheets/{timesheet}/reopen', [TimesheetReviewController::class, 'reopen'])->name('timesheets.reopen');
            });

            Route::middleware('feature:scheduling')->group(function () {
                Route::get('schedule', [ScheduleController::class, 'index'])->name('schedule.index');
                Route::post('schedule/publish', [PublishScheduleController::class, 'store'])->name('schedule.publish');
                Route::post('shifts', [ShiftController::class, 'store'])->name('shifts.store');
                Route::put('shifts/{shift}', [ShiftController::class, 'update'])->name('shifts.update');
                Route::delete('shifts/{shift}', [ShiftController::class, 'destroy'])->name('shifts.destroy');
                Route::patch('shifts/{shift}/move', MoveShiftController::class)
                    ->middleware('feature:drag_drop_scheduling')
                    ->name('shifts.move');
            });

            Route::resource('employees', EmployeeController::class)->except(['show', 'destroy']);
            Route::patch('employees/{employee}/status', [EmployeeStatusController::class, 'update'])->name('employees.status.update');
            Route::post('employees/{employee}/invitation', [EmployeeInvitationController::class, 'store'])
                ->middleware('throttle:6,1')
                ->name('employees.invitation.store');

            Route::middleware('feature:reports')->group(function () {
                Route::get('reports', [ReportController::class, 'index'])->name('reports.index');
                Route::get('reports/export', [ReportController::class, 'export'])
                    ->middleware('feature:csv_export')
                    ->name('reports.export');
            });

            Route::get('audit-log', [AuditLogController::class, 'index'])
                ->middleware('feature:audit_log')
                ->name('audit-log.index');
        });
    });
});

require __DIR__.'/settings.php';
