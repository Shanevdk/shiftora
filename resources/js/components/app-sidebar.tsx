import { Link } from '@inertiajs/react';
import {
    BarChart3,
    CalendarDays,
    ClipboardCheck,
    Clock,
    Cookie,
    History,
    LayoutGrid,
    ShieldCheck,
    Users,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { OrganizationSwitcher } from '@/components/organization-switcher';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useWorkspace } from '@/hooks/use-workspace';
import { dashboard } from '@/routes';
import { index as auditLog } from '@/routes/audit-log';
import { index as employees } from '@/routes/employees';
import { cookies, privacy } from '@/routes/legal';
import { index as reports } from '@/routes/reports';
import { index as schedule } from '@/routes/schedule';
import { show as timeClock } from '@/routes/time-clock';
import { index as timesheets } from '@/routes/timesheets';
import type { NavItem } from '@/types';

export function AppSidebar() {
    const { organization, can, hasFeature } = useWorkspace();

    const workNavItems: NavItem[] = organization
        ? [
              { title: 'Dashboard', href: dashboard(), icon: LayoutGrid },
              { title: 'Time clock', href: timeClock(), icon: Clock },
              ...(hasFeature('scheduling')
                  ? [
                        {
                            title: 'Schedule',
                            href: schedule(),
                            icon: CalendarDays,
                        },
                    ]
                  : []),
              {
                  title: 'Timesheets',
                  href: timesheets(),
                  icon: ClipboardCheck,
              },
          ]
        : [];

    const manageNavItems: NavItem[] = [
        ...(can('manageSchedule')
            ? [{ title: 'Team', href: employees(), icon: Users }]
            : []),
        ...(can('viewReports')
            ? [{ title: 'Reports', href: reports(), icon: BarChart3 }]
            : []),
        ...(can('viewAuditLog')
            ? [{ title: 'Audit log', href: auditLog(), icon: History }]
            : []),
    ];

    const legalNavItems: NavItem[] = [
        { title: 'Privacy policy', href: privacy(), icon: ShieldCheck },
        { title: 'Cookie policy', href: cookies(), icon: Cookie },
    ];

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link
                                href={organization ? dashboard() : '/'}
                                prefetch
                            >
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                {workNavItems.length > 0 && (
                    <NavMain label="Work" items={workNavItems} />
                )}
                {manageNavItems.length > 0 && (
                    <NavMain label="Manage" items={manageNavItems} />
                )}
                <NavFooter items={legalNavItems} className="mt-auto" />
            </SidebarContent>

            <SidebarFooter>
                <OrganizationSwitcher />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
