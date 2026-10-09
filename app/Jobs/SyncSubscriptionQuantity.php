<?php

namespace App\Jobs;

use App\Models\Organization;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

/**
 * Keeps the per-employee Stripe subscription quantity in line with the number of active employees.
 */
class SyncSubscriptionQuantity implements ShouldBeUnique, ShouldQueue
{
    use Queueable;

    public int $tries = 5;

    public int $uniqueFor = 60;

    /**
     * @var list<int>
     */
    public array $backoff = [10, 60, 300];

    public function __construct(public Organization $organization) {}

    public function uniqueId(): string
    {
        return (string) $this->organization->id;
    }

    public function handle(): void
    {
        $subscription = $this->organization->subscription(config('shiftora.subscription_type'));

        if ($subscription === null || ! $subscription->valid() || $subscription->hasIncompletePayment()) {
            return;
        }

        $quantity = max(1, $this->organization->activeEmployeeCount());

        if ($subscription->quantity !== $quantity) {
            $subscription->updateQuantity($quantity);
        }
    }
}
