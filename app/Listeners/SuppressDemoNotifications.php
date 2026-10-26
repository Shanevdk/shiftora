<?php

namespace App\Listeners;

use App\Models\User;
use App\Support\CurrentOrganization;
use Illuminate\Notifications\Events\NotificationSending;

/**
 * Keeps the public demo, and guest workspaces nobody has saved yet, from sending real email.
 *
 * Visitors can invite "employees" with any address, so every channel except the in-app (database)
 * one is cancelled for demo and guest users and inside demo and guest organizations.
 */
class SuppressDemoNotifications
{
    public function __construct(private CurrentOrganization $currentOrganization) {}

    public function handle(NotificationSending $event): ?bool
    {
        if ($event->channel === 'database') {
            return null;
        }

        $isThrowawayRecipient = $event->notifiable instanceof User && ($event->notifiable->is_demo || $event->notifiable->is_guest);
        $organization = $this->currentOrganization->get();

        if ($isThrowawayRecipient || $organization?->is_demo || $organization?->is_guest) {
            return false;
        }

        return null;
    }
}
