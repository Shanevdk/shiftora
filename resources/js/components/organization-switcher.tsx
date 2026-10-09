import { router, usePage } from '@inertiajs/react';
import { Building2, Check, ChevronsUpDown, Plus } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { update as switchOrganization } from '@/routes/current-organization';

/**
 * Lets people who belong to more than one organization move between them.
 */
export function OrganizationSwitcher() {
    const { organization, organizations } = usePage().props;

    if (!organization || organizations.length < 2) {
        return null;
    }

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            tooltip={{ children: 'Switch organization' }}
                        >
                            <Building2 />
                            <span className="truncate">
                                {organization.name}
                            </span>
                            <ChevronsUpDown className="ml-auto size-4" />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="min-w-56"
                        align="start"
                        side="top"
                    >
                        <DropdownMenuLabel className="text-xs text-muted-foreground">
                            Organizations
                        </DropdownMenuLabel>
                        {organizations.map((item) => (
                            <DropdownMenuItem
                                key={item.id}
                                onSelect={() =>
                                    item.id !== organization.id &&
                                    router.put(switchOrganization.url(), {
                                        organization_id: item.id,
                                    })
                                }
                            >
                                <span className="truncate">{item.name}</span>
                                {item.id === organization.id && (
                                    <Check className="ml-auto size-4" />
                                )}
                            </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem disabled>
                            <Plus className="size-4" />
                            Invitations arrive by email
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
