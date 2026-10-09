<?php

namespace App\Notifications;

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
            ->line(__('The free trial for :organization ends on :date. Choose a plan to keep your team clocking in without interruption.', [
                'organization' => $this->organization->name,
                'date' => $this->organization->trial_ends_at?->format('F j'),
            ]))
            ->action(__('Choose a plan'), route('billing.edit'));
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
            'url' => route('billing.edit', absolute: false),
        ];
    }
}
