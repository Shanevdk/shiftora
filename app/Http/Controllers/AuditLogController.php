<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class AuditLogController extends Controller
{
    /**
     * @var list<string>
     */
    private const TYPES = ['time_entry', 'timesheet', 'shift', 'employee'];

    /**
     * Browse the organization's change history.
     */
    public function index(Request $request): Response
    {
        Gate::authorize('viewAuditLog', $this->organization());

        $type = $request->validate(['type' => ['nullable', 'in:'.implode(',', self::TYPES)]])['type'] ?? null;

        $logs = AuditLog::query()
            ->with('user:id,name')
            ->when($type !== null, fn ($query) => $query->where('auditable_type', $type))
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate(30)
            ->withQueryString()
            ->through(fn (AuditLog $log): array => [
                'id' => $log->id,
                'event' => $log->event,
                'subject_type' => Str::headline($log->auditable_type),
                'subject_id' => $log->auditable_id,
                'user' => $log->user?->name,
                'old_values' => $log->old_values,
                'new_values' => $log->new_values,
                'ip_address' => $log->ip_address,
                'created_at' => $log->created_at->toIso8601String(),
            ]);

        return Inertia::render('audit-log/index', [
            'logs' => $logs,
            'filters' => ['type' => $type],
            'types' => array_map(fn (string $value): array => ['value' => $value, 'label' => Str::headline($value)], self::TYPES),
        ]);
    }
}
