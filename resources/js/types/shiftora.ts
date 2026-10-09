/**
 * Shapes of the data the Laravel controllers send to Shiftora pages.
 * Timestamps are ISO-8601 strings in UTC; dates are local `YYYY-MM-DD` strings in the organization's timezone.
 */

export type Role = 'owner' | 'admin' | 'manager' | 'employee';

export type FeatureKey =
    | 'time_clock'
    | 'timesheets'
    | 'scheduling'
    | 'timesheet_approvals'
    | 'drag_drop_scheduling'
    | 'reports'
    | 'csv_export'
    | 'overtime_rules'
    | 'geofencing'
    | 'audit_log'
    | 'multiple_locations'
    | 'priority_support';

export type PlanKey = 'starter' | 'professional' | 'business';

export type OrganizationSummary = {
    id: number;
    name: string;
    timezone: string;
    week_starts_on: number;
    logo_url: string | null;
};

export type Permissions = {
    manageOrganization: boolean;
    manageEmployees: boolean;
    manageSchedule: boolean;
    approveTimesheets: boolean;
    viewReports: boolean;
    viewAuditLog: boolean;
    manageBilling: boolean;
};

export type Membership = {
    employee_id: number;
    role: Role;
    can: Permissions;
};

export type SubscriptionState = {
    plan: PlanKey | null;
    plan_name: string | null;
    status: 'active' | 'trial' | 'inactive';
    trial_days_remaining: number | null;
    features: FeatureKey[];
};

export type NotificationItem = {
    id: string;
    title: string;
    body: string;
    url: string | null;
    read: boolean;
    created_at: string;
};

export type NotificationsState = {
    unread_count: number;
    recent: NotificationItem[];
};

export type Plan = {
    value: PlanKey;
    name: string;
    description: string;
    price_per_employee_cents: number;
    employee_limit: number | null;
    location_limit: number | null;
    features: { value: FeatureKey; label: string }[];
};

export type LocationOption = {
    id: number;
    name: string;
};

export type EmployeeSummary = {
    id: number;
    name: string;
    first_name: string;
    last_name: string;
    job_title: string | null;
    color: string | null;
    location_id: number | null;
    role: Role;
    is_active: boolean;
};

export type EmployeeDetail = EmployeeSummary & {
    email: string | null;
    phone: string | null;
    hourly_rate_cents: number | null;
    location: LocationOption | null;
    has_account: boolean;
    invited_at: string | null;
    created_at: string | null;
};

export type Shift = {
    id: number;
    employee_id: number | null;
    location_id: number | null;
    location: LocationOption | null;
    starts_at: string;
    ends_at: string;
    break_minutes: number;
    scheduled_minutes: number;
    position: string | null;
    notes: string | null;
    is_published: boolean;
};

export type TimeEntry = {
    id: number;
    employee_id: number;
    location: LocationOption | null;
    clock_in_at: string;
    clock_out_at: string | null;
    break_minutes: number;
    worked_minutes: number;
    source: 'clock' | 'manual';
    notes: string | null;
    is_open: boolean;
    on_break_since: string | null;
};

export type ClockState = {
    is_clocked_in: boolean;
    is_on_break: boolean;
    clock_in_at: string | null;
    break_started_at: string | null;
    break_minutes: number;
    worked_minutes: number;
    location: LocationOption | null;
};

export type DaySummary = {
    date: string;
    worked_minutes: number;
    regular_minutes: number;
    overtime_minutes: number;
};

export type WeekSummary = {
    days: DaySummary[];
    worked_minutes: number;
    regular_minutes: number;
    overtime_minutes: number;
    break_minutes: number;
    has_open_entry: boolean;
};

export type TimesheetStatus = 'open' | 'submitted' | 'approved' | 'rejected';

export type PaginatorLink = {
    url: string | null;
    label: string;
    active: boolean;
};

export type Paginator<T> = {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
    links: PaginatorLink[];
    prev_page_url: string | null;
    next_page_url: string | null;
};
