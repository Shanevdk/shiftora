<?php

use Illuminate\Support\Facades\Schedule;

/*
|--------------------------------------------------------------------------
| Scheduled Tasks
|--------------------------------------------------------------------------
|
| Laravel Cloud runs `schedule:run` every minute once the scheduler is enabled
| on the environment. `onOneServer` keeps each task to a single replica, using
| the environment's cache store for the lock.
|
*/

Schedule::command('shiftora:send-shift-reminders')
    ->everyFiveMinutes()
    ->withoutOverlapping()
    ->onOneServer();

Schedule::command('shiftora:notify-missed-clock-outs')
    ->hourly()
    ->withoutOverlapping()
    ->onOneServer();

Schedule::command('shiftora:send-trial-ending-notices')
    ->dailyAt('14:00')
    ->onOneServer();

Schedule::command('model:prune')
    ->hourly()
    ->withoutOverlapping()
    ->onOneServer();
