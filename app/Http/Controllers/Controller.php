<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\Organization;
use App\Support\CurrentOrganization;
use Inertia\Inertia;

abstract class Controller
{
    /**
     * The organization resolved for this request by the tenant middleware.
     */
    protected function organization(): Organization
    {
        return app(CurrentOrganization::class)->get() ?? abort(404);
    }

    /**
     * The authenticated user's employee record in the current organization.
     */
    protected function currentEmployee(): Employee
    {
        return request()->user()->currentEmployee ?? abort(403);
    }

    /**
     * Flash a toast message for the next page the user sees.
     */
    protected function toast(string $message, string $type = 'success'): void
    {
        Inertia::flash('toast', ['type' => $type, 'message' => $message]);
    }
}
