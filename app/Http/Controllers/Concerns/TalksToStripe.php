<?php

namespace App\Http\Controllers\Concerns;

use Illuminate\Support\Facades\Log;
use Stripe\Exception\ApiErrorException;
use Symfony\Component\HttpFoundation\Response;

trait TalksToStripe
{
    /**
     * Run a Stripe call, turning API failures into a friendly message instead of an error page.
     *
     * @param  callable(): Response  $callback
     */
    protected function stripe(callable $callback, string $fallbackRoute = 'billing.edit'): Response
    {
        try {
            return $callback();
        } catch (ApiErrorException $exception) {
            Log::warning('Stripe billing request failed.', ['organization_id' => $this->organization()->id, 'message' => $exception->getMessage()]);

            $this->toast(__('We could not reach our payment provider. Please try again in a moment.'), 'error');

            return to_route($fallbackRoute);
        }
    }
}
