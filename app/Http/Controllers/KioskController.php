<?php

namespace App\Http\Controllers;

use App\Actions\Organizations\CreateSampleOrganization;
use App\Actions\TimeClock\ClockIn;
use App\Actions\TimeClock\ClockOut;
use App\Actions\TimeClock\EndBreak;
use App\Actions\TimeClock\StartBreak;
use App\Enums\Role;
use App\Http\Presenters\TimeEntryPresenter;
use App\Models\Employee;
use App\Models\Organization;
use App\Models\TimeEntry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * A shared time clock: a manager signs in on a tablet at the workplace, and employees punch in
 * and out on it with their personal PIN instead of their own login.
 */
class KioskController extends Controller
{
    /**
     * Session key that locks this device to the kiosk until a manager exits it.
     */
    public const SESSION_KEY = 'kiosk.organization_id';

    /**
     * Wrong PINs allowed per minute before the keypad pauses, so PINs can't be guessed.
     */
    private const MAX_PIN_ATTEMPTS = 5;

    public function show(Request $request): Response
    {
        $this->authorizeKiosk($request);

        $organization = $this->organization();
        $request->session()->put(self::SESSION_KEY, $organization->id);

        return Inertia::render('kiosk', [
            'hasExitPin' => $organization->hasKioskExitPin(),
            'sampleExitPin' => $organization->is_demo ? CreateSampleOrganization::KIOSK_EXIT_PIN : null,
            'samplePins' => ! $organization->is_demo ? [] : Employee::query()
                ->active()
                ->where('role', Role::Employee)
                ->orderBy('first_name')
                ->limit(4)
                ->get()
                ->map(fn (Employee $employee): array => ['name' => $employee->full_name, 'pin' => $employee->clock_pin])
                ->all(),
        ]);
    }

    /**
     * Identify who entered their PIN and what they can do next.
     */
    public function lookup(Request $request): JsonResponse
    {
        $employee = $this->employeeForPin($request);

        return response()->json(['employee' => $this->present($employee)]);
    }

    public function punch(Request $request, ClockIn $clockIn, ClockOut $clockOut, StartBreak $startBreak, EndBreak $endBreak): JsonResponse
    {
        $action = $request->validate([
            'action' => ['required', Rule::in(['clock_in', 'clock_out', 'start_break', 'end_break'])],
        ])['action'];

        $employee = $this->employeeForPin($request);
        $name = $employee->first_name;

        switch ($action) {
            case 'clock_in':
                $clockIn->handle($employee, source: TimeEntry::SOURCE_KIOSK);
                $message = __(':name, you\'re clocked in. Have a great shift!', ['name' => $name]);
                break;
            case 'clock_out':
                $message = $this->clockedOutMessage($name, $clockOut->handle($employee));
                break;
            case 'start_break':
                $startBreak->handle($employee);
                $message = __('Enjoy your break, :name.', ['name' => $name]);
                break;
            default:
                $endBreak->handle($employee);
                $message = __('Welcome back, :name. Break ended.', ['name' => $name]);
        }

        return response()->json([
            'message' => $message,
            'employee' => $this->present($employee),
        ]);
    }

    /**
     * Choose the organization's kiosk exit PIN the first time a kiosk is opened.
     * Once it exists, only admins can change it, from the organization settings.
     */
    public function storeExitPin(Request $request): RedirectResponse
    {
        $this->authorizeKiosk($request);

        $organization = $this->organization();

        abort_if($organization->hasKioskExitPin(), 403);

        $validated = $request->validate([
            'exit_pin' => ['required', 'string', 'regex:'.Organization::KIOSK_EXIT_PIN_PATTERN, 'confirmed'],
        ], ['exit_pin.regex' => __('Use 4 to 8 digits.')]);

        $organization->forceFill(['kiosk_exit_pin' => $validated['exit_pin']])->save();

        $this->toast(__('Organization PIN saved. You\'ll need it to leave the kiosk.'));

        return back();
    }

    /**
     * Leave kiosk mode. The organization PIN is required so employees can't open the manager's account.
     *
     * @throws ValidationException
     */
    public function destroy(Request $request): RedirectResponse
    {
        $organization = $this->organization();
        $pin = $request->validate(['exit_pin' => ['required', 'string']])['exit_pin'];
        $throttleKey = 'kiosk-exit:'.$organization->id.':'.$request->user()->id;

        if (RateLimiter::tooManyAttempts($throttleKey, self::MAX_PIN_ATTEMPTS)) {
            throw ValidationException::withMessages([
                'exit_pin' => __('Too many wrong PINs. Try again in :seconds seconds.', ['seconds' => RateLimiter::availableIn($throttleKey)]),
            ]);
        }

        // Before the first setup there is no PIN to check, so the manager who opened the kiosk can still leave it.
        if ($organization->hasKioskExitPin() && ! $organization->checkKioskExitPin($pin)) {
            RateLimiter::hit($throttleKey);

            throw ValidationException::withMessages(['exit_pin' => __('That isn\'t the organization PIN.')]);
        }

        RateLimiter::clear($throttleKey);
        $request->session()->forget(self::SESSION_KEY);

        return to_route('dashboard');
    }

    private function authorizeKiosk(Request $request): void
    {
        if (! $request->user()->currentRole()?->canRunKiosk()) {
            $request->session()->forget(self::SESSION_KEY);

            abort(403);
        }
    }

    /**
     * Find the active team member with the PIN, pausing the keypad after repeated wrong guesses.
     *
     * @throws ValidationException
     */
    private function employeeForPin(Request $request): Employee
    {
        $this->authorizeKiosk($request);

        $pin = $request->validate(['pin' => ['required', 'string', 'regex:/^\d{4,6}$/']])['pin'];
        $throttleKey = 'kiosk-pin:'.$this->organization()->id.':'.$request->user()->id;

        if (RateLimiter::tooManyAttempts($throttleKey, self::MAX_PIN_ATTEMPTS)) {
            throw ValidationException::withMessages([
                'pin' => __('Too many wrong PINs. Try again in :seconds seconds.', ['seconds' => RateLimiter::availableIn($throttleKey)]),
            ]);
        }

        $employee = Employee::query()->active()->where('clock_pin', $pin)->first();

        if ($employee === null) {
            RateLimiter::hit($throttleKey);

            throw ValidationException::withMessages(['pin' => __('That PIN doesn\'t match anyone on the team.')]);
        }

        RateLimiter::clear($throttleKey);

        return $employee;
    }

    /**
     * @return array{id: int, name: string, first_name: string, last_name: string, color: string|null, clock: array<string, mixed>}
     */
    private function present(Employee $employee): array
    {
        return [
            'id' => $employee->id,
            'name' => $employee->full_name,
            'first_name' => $employee->first_name,
            'last_name' => $employee->last_name,
            'color' => $employee->color,
            'clock' => TimeEntryPresenter::clockState($employee),
        ];
    }

    private function clockedOutMessage(string $name, TimeEntry $entry): string
    {
        $minutes = $entry->workedMinutes();

        return __(':name, you\'re clocked out after :hours. See you next time!', [
            'name' => $name,
            'hours' => sprintf('%dh %02dm', intdiv($minutes, 60), $minutes % 60),
        ]);
    }
}
