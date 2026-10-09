<?php

namespace App\Notifications;

use App\Models\Organization;
use Carbon\CarbonImmutable;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class SchedulePublished extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public Organization $organization,
        public CarbonImmutable $weekStart,
        public int $shiftCount,
    ) {}

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
            ->subject(__('Your schedule for the week of :week', ['week' => $this->weekStart->format('M j')]))
            ->line(__(':organization published the schedule for the week of :week. You have :count shift(s).', [
                'organization' => $this->organization->name,
                'week' => $this->weekStart->format('F j'),
                'count' => $this->shiftCount,
            ]))
            ->action(__('View schedule'), route('schedule.index', ['week' => $this->weekStart->toDateString()]));
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'organization_id' => $this->organization->id,
            'title' => __('Schedule published'),
            'body' => __('Week of :week · :count shift(s)', ['week' => $this->weekStart->format('M j'), 'count' => $this->shiftCount]),
            'url' => route('schedule.index', ['week' => $this->weekStart->toDateString()], false),
        ];
    }
}
