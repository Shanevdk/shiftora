<?php

use App\Support\Timesheets\OvertimeCalculator;

test('without thresholds every minute is regular', function () {
    $days = OvertimeCalculator::calculate(['2026-10-05' => 600], null, null);

    expect($days['2026-10-05'])->toBe(['worked_minutes' => 600, 'regular_minutes' => 600, 'overtime_minutes' => 0]);
});

test('daily overtime starts after the daily threshold', function () {
    $days = OvertimeCalculator::calculate(['2026-10-05' => 600, '2026-10-06' => 420], 480, null);

    expect($days['2026-10-05']['overtime_minutes'])->toBe(120)
        ->and($days['2026-10-06']['overtime_minutes'])->toBe(0);
});

test('weekly overtime applies once regular minutes pass the weekly threshold in date order', function () {
    $days = OvertimeCalculator::calculate([
        '2026-10-09' => 540,
        '2026-10-05' => 540,
        '2026-10-06' => 540,
        '2026-10-07' => 540,
        '2026-10-08' => 540,
    ], null, 2400);

    expect(array_column($days, 'overtime_minutes'))->toBe([0, 0, 0, 0, 300])
        ->and(array_sum(array_column($days, 'regular_minutes')))->toBe(2400);
});

test('daily overtime is never counted again toward weekly overtime', function () {
    $days = OvertimeCalculator::calculate([
        '2026-10-05' => 720,
        '2026-10-06' => 720,
        '2026-10-07' => 720,
        '2026-10-08' => 720,
    ], 480, 1800);

    expect(array_sum(array_column($days, 'overtime_minutes')))->toBe(960 + 120)
        ->and(array_sum(array_column($days, 'regular_minutes')))->toBe(1800)
        ->and($days['2026-10-08'])->toBe(['worked_minutes' => 720, 'regular_minutes' => 360, 'overtime_minutes' => 360]);
});
