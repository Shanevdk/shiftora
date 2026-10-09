<?php

namespace App\Console\Commands;

use App\Enums\Plan;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Laravel\Cashier\Cashier;

#[Signature('shiftora:stripe-setup {--force : Create the products even when using a live Stripe key}')]
#[Description('Create the Shiftora products and per-employee monthly prices in Stripe and print the price IDs')]
class SetUpStripePlans extends Command
{
    public function handle(): int
    {
        $secret = (string) config('cashier.secret');

        if ($secret === '') {
            $this->error('Set STRIPE_SECRET before running this command.');

            return self::FAILURE;
        }

        if (! str_starts_with($secret, 'sk_test_') && ! $this->option('force')) {
            $this->error('Refusing to create products with a live key. Re-run with --force if you are sure.');

            return self::FAILURE;
        }

        $stripe = Cashier::stripe();
        $lines = [];

        foreach (Plan::cases() as $plan) {
            $existing = $stripe->prices->search([
                'query' => "lookup_key:'shiftora_{$plan->value}_monthly'",
            ])->data[0] ?? null;

            if ($existing !== null) {
                $priceId = $existing->id;
                $this->line("Found existing {$plan->label()} price {$priceId}.");
            } else {
                $product = $stripe->products->create([
                    'name' => "Shiftora {$plan->label()}",
                    'description' => $plan->description(),
                    'metadata' => ['shiftora_plan' => $plan->value],
                ]);

                $priceId = $stripe->prices->create([
                    'product' => $product->id,
                    'currency' => config('cashier.currency'),
                    'unit_amount' => $plan->pricePerEmployeeCents(),
                    'recurring' => ['interval' => 'month', 'usage_type' => 'licensed'],
                    'lookup_key' => "shiftora_{$plan->value}_monthly",
                    'nickname' => "{$plan->label()} per employee / month",
                ])->id;

                $this->info("Created {$plan->label()} price {$priceId}.");
            }

            $lines[] = 'STRIPE_PRICE_'.strtoupper($plan->value).'='.$priceId;
        }

        $this->newLine();
        $this->line('Add these to your environment (.env locally, environment variables on Laravel Cloud):');
        $this->newLine();

        foreach ($lines as $line) {
            $this->line($line);
        }

        return self::SUCCESS;
    }
}
