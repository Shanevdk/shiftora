import { usePage } from '@inertiajs/react';

import AppLogoIcon from '@/components/app-logo-icon';

export default function AppLogo() {
    const { name, organization } = usePage().props;

    return (
        <>
            <div className="flex aspect-square size-8 items-center justify-center overflow-hidden rounded-md bg-warm-white">
                {organization?.logo_url ? (
                    <img
                        src={organization.logo_url}
                        alt=""
                        className="size-full bg-white object-contain p-0.5"
                    />
                ) : (
                    <AppLogoIcon className="size-6" />
                )}
            </div>
            <div className="ml-1 grid flex-1 text-left text-sm">
                <span className="truncate leading-tight font-semibold">
                    {organization?.name ?? name}
                </span>
                {organization && (
                    <span className="truncate text-xs leading-tight text-sidebar-foreground/60">
                        {name}
                    </span>
                )}
            </div>
        </>
    );
}
