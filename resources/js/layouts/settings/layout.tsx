import { Link } from '@inertiajs/react';
import type { PropsWithChildren } from 'react';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { useWorkspace } from '@/hooks/use-workspace';
import { cn, toUrl } from '@/lib/utils';
import { edit as editAppearance } from '@/routes/appearance';
import { edit as editBilling } from '@/routes/billing';
import { index as locations } from '@/routes/locations';
import { edit as editOrganization } from '@/routes/organization';
import { edit } from '@/routes/profile';
import { edit as editSecurity } from '@/routes/security';
import type { NavItem } from '@/types';

export default function SettingsLayout({ children }: PropsWithChildren) {
    const { isCurrentOrParentUrl } = useCurrentUrl();
    const { organization, can } = useWorkspace();

    const accountNavItems: NavItem[] = [
        { title: 'Profile', href: edit(), icon: null },
        { title: 'Security', href: editSecurity(), icon: null },
        { title: 'Appearance', href: editAppearance(), icon: null },
    ];

    const organizationNavItems: NavItem[] = organization
        ? [
              ...(can('manageOrganization')
                  ? [
                        {
                            title: 'Organization',
                            href: editOrganization(),
                            icon: null,
                        },
                        { title: 'Locations', href: locations(), icon: null },
                    ]
                  : []),
              { title: 'Billing', href: editBilling(), icon: null },
          ]
        : [];

    const renderItems = (items: NavItem[]) =>
        items.map((item, index) => (
            <Button
                key={`${toUrl(item.href)}-${index}`}
                size="sm"
                variant="ghost"
                asChild
                className={cn('w-full justify-start', {
                    'bg-muted': isCurrentOrParentUrl(item.href),
                })}
            >
                <Link href={item.href}>
                    {item.icon && <item.icon className="h-4 w-4" />}
                    {item.title}
                </Link>
            </Button>
        ));

    return (
        <div className="px-4 py-6 md:px-6">
            <Heading
                title="Settings"
                description="Manage your account and your organization"
            />

            <div className="flex flex-col lg:flex-row lg:space-x-12">
                <aside className="w-full max-w-xl lg:w-48">
                    <nav
                        className="flex flex-col space-y-1 space-x-0"
                        aria-label="Settings"
                    >
                        <p className="px-3 pb-1 text-xs font-medium text-muted-foreground">
                            Account
                        </p>
                        {renderItems(accountNavItems)}
                        {organizationNavItems.length > 0 && (
                            <>
                                <p className="px-3 pt-4 pb-1 text-xs font-medium text-muted-foreground">
                                    Organization
                                </p>
                                {renderItems(organizationNavItems)}
                            </>
                        )}
                    </nav>
                </aside>

                <Separator className="my-6 lg:hidden" />

                <div className="flex-1 md:max-w-3xl">
                    <section className="max-w-3xl space-y-12">
                        {children}
                    </section>
                </div>
            </div>
        </div>
    );
}
