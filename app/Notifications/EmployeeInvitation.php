<?php

namespace App\Notifications;

use App\Models\Employee;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\URL;

class EmployeeInvitation extends Notification implements ShouldQueue
{
    use Queueable;

    public const EXPIRES_IN_DAYS = 7;

    /**
     * Captured when the invitation is created, so a queued email links to the address it was addressed to.
     */
    public string $emailHash;

    public function __construct(public Employee $employee)
    {
        $this->emailHash = $employee->invitationHash();
    }

    /**
     * @return list<string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $organization = $this->employee->organization;

        return (new MailMessage)
            ->subject(__('You have been invited to :organization on Shiftora', ['organization' => $organization->name]))
            ->greeting(__('Hi :name,', ['name' => $this->employee->first_name]))
            ->line(__(':organization uses Shiftora for time tracking and scheduling, and has added you to their team.', ['organization' => $organization->name]))
            ->action(__('Accept invitation'), $this->acceptUrl())
            ->line(__('This invitation expires in :days days.', ['days' => self::EXPIRES_IN_DAYS]));
    }

    public function acceptUrl(): string
    {
        return URL::temporarySignedRoute(
            'invitations.show',
            now()->addDays(self::EXPIRES_IN_DAYS),
            ['employee' => $this->employee->id, 'hash' => $this->emailHash],
        );
    }
}
