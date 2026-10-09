<?php

namespace App\Http\Controllers;

use App\Actions\Employees\CreateEmployee;
use App\Enums\Role;
use App\Http\Presenters\EmployeePresenter;
use App\Http\Requests\EmployeeRequest;
use App\Models\Employee;
use App\Models\Location;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class EmployeeController extends Controller
{
    /**
     * List the organization's team.
     */
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', Employee::class);

        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', 'in:active,inactive,all'],
        ]);

        $status = $filters['status'] ?? 'active';
        $organization = $this->organization();
        $plan = $organization->activePlan() ?? $organization->plan;

        $employees = Employee::query()
            ->with('location')
            ->when($status !== 'all', fn ($query) => $query->where('is_active', $status === 'active'))
            ->when($filters['search'] ?? null, function ($query, string $search): void {
                $term = '%'.mb_strtolower($search).'%';

                $query->where(fn ($query) => $query
                    ->whereRaw('LOWER(first_name) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(last_name) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(email) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(job_title) LIKE ?', [$term]));
            })
            ->orderBy('first_name')
            ->orderBy('last_name')
            ->orderBy('id')
            ->paginate(25)
            ->withQueryString()
            ->through(fn (Employee $employee): array => EmployeePresenter::detail($employee));

        return Inertia::render('employees/index', [
            'employees' => $employees,
            'filters' => ['search' => $filters['search'] ?? '', 'status' => $status],
            'seats' => [
                'used' => $organization->activeEmployeeCount(),
                'limit' => $plan->employeeLimit(),
            ],
            'canCreate' => $request->user()->can('create', Employee::class),
        ]);
    }

    public function create(Request $request): Response
    {
        Gate::authorize('create', Employee::class);

        return Inertia::render('employees/create', $this->formOptions($request));
    }

    public function store(EmployeeRequest $request, CreateEmployee $createEmployee): RedirectResponse
    {
        $employee = $createEmployee->handle(
            $this->organization(),
            $request->employeeAttributes(),
            $request->boolean('send_invitation', true),
        );

        $this->toast($employee->invited_at !== null
            ? __(':name was added and invited by email.', ['name' => $employee->full_name])
            : __(':name was added to your team.', ['name' => $employee->full_name]));

        return to_route('employees.index');
    }

    public function edit(Request $request, Employee $employee): Response
    {
        Gate::authorize('update', $employee);

        return Inertia::render('employees/edit', [
            'employee' => EmployeePresenter::detail($employee->load('location')),
            'canChangeStatus' => $request->user()->can('changeStatus', $employee),
            ...$this->formOptions($request, $employee),
        ]);
    }

    public function update(EmployeeRequest $request, Employee $employee): RedirectResponse
    {
        $employee->update($request->employeeAttributes());

        $this->toast(__('Saved changes to :name.', ['name' => $employee->full_name]));

        return to_route('employees.edit', $employee);
    }

    /**
     * @return array{roles: list<array{value: string, label: string}>, locations: list<array{id: int, name: string}>, colors: list<string>}
     */
    private function formOptions(Request $request, ?Employee $employee = null): array
    {
        $roles = $employee?->role === Role::Owner
            ? [Role::Owner]
            : Role::assignableBy($request->user()->currentRole());

        return [
            'roles' => array_map(fn (Role $role): array => ['value' => $role->value, 'label' => $role->label()], $roles),
            'locations' => array_values($this->organization()->locations()->orderBy('name')->get()
                ->map(fn (Location $location): array => ['id' => $location->id, 'name' => $location->name])
                ->all()),
            'colors' => Employee::COLORS,
        ];
    }
}
