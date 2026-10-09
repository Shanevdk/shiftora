<?php

namespace App\Listeners;

use App\Models\User;
use App\Support\CurrentOrganization;
use Illuminate\Notifications\Events\NotificationSending;

/**
 * Keeps the public demo from sending real email.
 *
 * Demo visitors can invite "employees" with any address, so every channel except the
 * in-app (database) one is cancelled for demo users and inside demo organizations.
 */
class SuppressDemoNotifications
{
    public function __construct(private CurrentOrganization $currentOrganization) {}

    public function handle(NotificationSending $event): ?bool
    {
        if ($event->channel === 'database') {
            return null;
        }

        $isDemoRecipient = $event->notifiable instanceof User && $event->notifiable->is_demo;

        if ($isDemoRecipient || $this->currentOrganization->get()?->is_demo) {
            return false;
        }

        return null;
    }
}
