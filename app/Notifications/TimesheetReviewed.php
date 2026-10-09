<?php

namespace App\Notifications;

use App\Enums\TimesheetStatus;
use App\Models\Timesheet;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class TimesheetReviewed extends Notification implements ShouldQueue
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
        $message = (new MailMessage)
            ->subject($this->title())
            ->line(__('Your timesheet for the week of :week was :status.', [
                'week' => $this->timesheet->period_start->format('F j'),
                'status' => strtolower($this->timesheet->status->label()),
            ]));

        if ($this->timesheet->review_note !== null) {
            $message->line(__('Note from your manager: :note', ['note' => $this->timesheet->review_note]));
        }

        return $message->action(__('View timesheet'), $this->url(absolute: true));
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'organization_id' => $this->timesheet->organization_id,
            'title' => $this->title(),
            'body' => $this->timesheet->review_note ?? __('Week of :week', ['week' => $this->timesheet->period_start->format('M j')]),
            'url' => $this->url(absolute: false),
        ];
    }

    private function title(): string
    {
        return $this->timesheet->status === TimesheetStatus::Approved
            ? __('Timesheet approved')
            : __('Timesheet needs changes');
    }

    private function url(bool $absolute): string
    {
        return route('timesheets.show', [
            'employee' => $this->timesheet->employee_id,
            'week' => $this->timesheet->period_start->toDateString(),
        ], $absolute);
    }
}
