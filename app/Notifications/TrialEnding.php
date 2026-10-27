<?php

namespace App\Notifications;

use App\Enums\Plan;
use App\Models\Organization;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class TrialEnding extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public Organization $organization) {}

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
            ->subject(__('Your Shiftora trial ends :date', ['date' => $this->organization->trial_ends_at?->format('F j')]))
            ->line(__('The free trial for :organization ends on :date. Continue with Shiftora to keep your team\'s schedules, time and timesheets going.', [
                'organization' => $this->organization->name,
                'date' => $this->organization->trial_ends_at?->format('F j'),
            ]))
            ->line(__('If you don\'t, you move to the free plan: the time clock and timesheets for up to :limit people. Nothing is deleted.', [
                'limit' => Plan::Free->employeeLimit(),
            ]))
            ->action(__('Continue with Shiftora'), route('continue.show'));
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'organization_id' => $this->organization->id,
            'title' => __('Trial ending soon'),
            'body' => __('Your trial ends :date.', ['date' => $this->organization->trial_ends_at?->format('M j')]),
            'url' => route('continue.show', absolute: false),
        ];
    }
}
