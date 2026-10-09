import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { redirect } from '@/routes/auth/google';

/**
 * "Continue with Google", followed by a divider before the email form.
 *
 * A plain link, not an Inertia visit, because the browser has to leave for Google.
 */
export default function GoogleSignIn({
    label = 'Continue with Google',
    separator = 'Or continue with email',
}: {
    label?: string;
    separator?: string;
}) {
    return (
        <>
            <Button variant="outline" className="w-full" asChild>
                <a href={redirect.url()}>
                    <GoogleLogo />
                    {label}
                </a>
            </Button>

            <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                        {separator}
                    </span>
                </div>
            </div>
        </>
    );
}

function GoogleLogo() {
    return (
        <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
            <path
                fill="#4285F4"
                d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.81Z"
            />
            <path
                fill="#34A853"
                d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3.01c-1.07.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.72-4.95H1.27v3.11A12 12 0 0 0 12 24Z"
            />
            <path
                fill="#FBBC05"
                d="M5.28 14.28A7.2 7.2 0 0 1 4.9 12c0-.79.14-1.56.38-2.28V6.61H1.27A12 12 0 0 0 0 12c0 1.94.46 3.77 1.27 5.39l4.01-3.11Z"
            />
            <path
                fill="#EA4335"
                d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44A11.53 11.53 0 0 0 12 0 12 12 0 0 0 1.27 6.61l4.01 3.11C6.22 6.88 8.87 4.77 12 4.77Z"
            />
        </svg>
    );
}
