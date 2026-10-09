<?php

namespace App\Notifications;

use App\Models\TimeEntry;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class MissedClockOut extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public TimeEntry $timeEntry) {}

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
            ->subject(__(':name may have forgotten to clock out', ['name' => $this->timeEntry->employee->full_name]))
            ->line(__(':name has been clocked in since :time. Please review the entry and correct the clock-out time.', [
                'name' => $this->timeEntry->employee->full_name,
                'time' => $this->localClockIn(),
            ]))
            ->action(__('Review timesheet'), $this->url(absolute: true));
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'organization_id' => $this->timeEntry->organization_id,
            'title' => __('Possible missed clock-out'),
            'body' => __(':name · clocked in :time', ['name' => $this->timeEntry->employee->full_name, 'time' => $this->localClockIn()]),
            'url' => $this->url(absolute: false),
        ];
    }

    private function localClockIn(): string
    {
        return $this->timeEntry->clock_in_at
            ->setTimezone($this->timeEntry->organization->timezone)
            ->format('D M j, g:i A');
    }

    private function url(bool $absolute): string
    {
        return route('timesheets.show', [
            'employee' => $this->timeEntry->employee_id,
            'week' => $this->timeEntry->organization->weekStartFor($this->timeEntry->clock_in_at)->toDateString(),
        ], $absolute);
    }
}
