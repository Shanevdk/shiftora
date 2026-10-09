<?php

namespace App\Http\Controllers;

use App\Http\Requests\ShiftRequest;
use App\Models\Shift;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;

class ShiftController extends Controller
{
    public function store(ShiftRequest $request): RedirectResponse
    {
        Shift::create($request->shiftAttributes());

        $this->toast(__('Shift added. Publish the schedule to notify your team.'));

        return back();
    }

    public function update(ShiftRequest $request, Shift $shift): RedirectResponse
    {
        $shift->update($request->shiftAttributes());

        $this->toast(__('Shift updated.'));

        return back();
    }

    public function destroy(Shift $shift): RedirectResponse
    {
        Gate::authorize('delete', $shift);

        $shift->delete();

        $this->toast(__('Shift deleted.'));

        return back();
    }
}
