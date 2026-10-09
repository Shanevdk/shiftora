<?php

namespace App\Notifications;

use App\Models\Timesheet;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class TimesheetSubmitted extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public Timesheet $timesheet) {}

    /**
     * @return list<string>
     */
    public function via(object $notifiable): array
    {
        return ['mail', 'database'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject(__(':name submitted a timesheet', ['name' => $this->timesheet->employee->full_name]))
            ->line(__(':name submitted their timesheet for the week of :week for approval.', [
                'name' => $this->timesheet->employee->full_name,
                'week' => $this->timesheet->period_start->format('F j'),
            ]))
            ->action(__('Review timesheet'), $this->url(absolute: true));
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'organization_id' => $this->timesheet->organization_id,
            'title' => __('Timesheet submitted'),
            'body' => __(':name · week of :week', [
                'name' => $this->timesheet->employee->full_name,
                'week' => $this->timesheet->period_start->format('M j'),
            ]),
            'url' => $this->url(absolute: false),
        ];
    }

    private function url(bool $absolute): string
    {
        return route('timesheets.show', [
            'employee' => $this->timesheet->employee_id,
            'week' => $this->timesheet->period_start->toDateString(),
        ], $absolute);
    }
}
