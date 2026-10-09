<?php

namespace App\Notifications;

use App\Models\Shift;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ShiftReminder extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public Shift $shift) {}

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
            ->subject(__('Your shift starts at :time', ['time' => $this->localStart()]))
            ->line(__('Reminder: you are scheduled to work :range:location.', [
                'range' => $this->localStart().' – '.$this->shift->ends_at->setTimezone($this->timezone())->format('g:i A'),
                'location' => $this->shift->location ? ' at '.$this->shift->location->name : '',
            ]))
            ->action(__('Open time clock'), route('time-clock.show'));
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'organization_id' => $this->shift->organization_id,
            'title' => __('Upcoming shift'),
            'body' => __('Starts at :time', ['time' => $this->localStart()]),
            'url' => route('time-clock.show', absolute: false),
        ];
    }

    private function localStart(): string
    {
        return $this->shift->starts_at->setTimezone($this->timezone())->format('g:i A');
    }

    private function timezone(): string
    {
        return $this->shift->organization->timezone;
    }
}
