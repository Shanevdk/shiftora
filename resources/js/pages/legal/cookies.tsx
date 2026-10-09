import { Head, Link } from '@inertiajs/react';
import { LegalDocument, LegalSection } from '@/components/legal-document';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { COOKIE_NOTICE_STORAGE_KEY } from '@/hooks/use-cookie-notice';
import { privacy } from '@/routes/legal';

type Props = {
    companyName: string;
    contactEmail: string;
    lastUpdated: string;
    sessionCookieName: string;
    sessionLifetimeMinutes: number;
};

type StorageItem = {
    name: string;
    kind: 'Cookie' | 'Local storage';
    purpose: string;
    duration: string;
};

export default function Cookies({
    companyName,
    contactEmail,
    lastUpdated,
    sessionCookieName,
    sessionLifetimeMinutes,
}: Props) {
    const essential: StorageItem[] = [
        {
            name: sessionCookieName,
            kind: 'Cookie',
            purpose:
                'Keeps you signed in as you move between pages and remembers which organization you are working in.',
            duration: `${sessionLifetimeMinutes} minutes of inactivity`,
        },
        {
            name: 'XSRF-TOKEN',
            kind: 'Cookie',
            purpose:
                'Protects forms against cross-site request forgery by proving each request came from Shiftora.',
            duration: `${sessionLifetimeMinutes} minutes`,
        },
        {
            name: 'remember_web_*',
            kind: 'Cookie',
            purpose:
                'Only set if you tick “Remember me” when logging in, so you stay signed in on that device.',
            duration: 'Up to 400 days, or until you log out',
        },
    ];

    const preferences: StorageItem[] = [
        {
            name: 'appearance',
            kind: 'Cookie',
            purpose:
                'Remembers whether you chose the light, dark or system theme so pages load in the right colors.',
            duration: '1 year',
        },
        {
            name: 'appearance',
            kind: 'Local storage',
            purpose: 'A copy of your theme choice, read by the browser.',
            duration: 'Until you clear it',
        },
        {
            name: 'sidebar_state',
            kind: 'Cookie',
            purpose:
                'Remembers whether you collapsed the navigation sidebar in the app.',
            duration: '7 days',
        },
        {
            name: COOKIE_NOTICE_STORAGE_KEY,
            kind: 'Local storage',
            purpose:
                'Remembers that you dismissed the cookie notice so we do not show it again.',
            duration: 'Until you clear it',
        },
    ];

    return (
        <>
            <Head title="Cookie policy" />
            <LegalDocument
                title="Cookie policy"
                lastUpdated={lastUpdated}
                summary={
                    <p>
                        Shiftora only uses cookies that are needed to run the
                        service and remember your settings. There are no
                        advertising, analytics or tracking cookies.
                    </p>
                }
            >
                <LegalSection id="what-are-cookies" title="What cookies are">
                    <p>
                        Cookies are small text files a website stores in your
                        browser. Local storage works in a similar way but is
                        only read by the browser, never sent to our servers.
                        This policy covers both, and explains how {companyName}{' '}
                        uses them on Shiftora.
                    </p>
                </LegalSection>

                <LegalSection id="essential" title="Strictly necessary">
                    <p>
                        These keep you signed in and keep your account secure.
                        Shiftora cannot work without them, so they do not need
                        your consent and cannot be turned off.
                    </p>
                    <StorageTable items={essential} />
                </LegalSection>

                <LegalSection id="preferences" title="Preferences">
                    <p>
                        These remember display settings, like your theme and
                        sidebar, so pages look the way you left them. They
                        contain no personal information and are never used for
                        tracking.
                    </p>
                    <StorageTable items={preferences} />
                </LegalSection>

                <LegalSection id="third-parties" title="Third parties">
                    <p>
                        Shiftora pages do not load third-party trackers, ad
                        networks, analytics scripts or social media widgets. Our
                        fonts are served from our own servers.
                    </p>
                    <p>
                        When an account owner starts a subscription or manages
                        billing, they are sent to a payment page hosted by
                        Stripe. Stripe sets its own cookies there to process the
                        payment and prevent fraud, as described in{' '}
                        <a
                            href="https://stripe.com/cookies-policy/legal"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Stripe’s cookie policy
                        </a>
                        .
                    </p>
                </LegalSection>

                <LegalSection id="managing" title="Managing cookies">
                    <p>
                        You can block or delete cookies in your browser
                        settings. If you block the strictly necessary cookies
                        you will not be able to log in. Clearing preference
                        cookies just resets your theme and sidebar to their
                        defaults.
                    </p>
                </LegalSection>

                <LegalSection id="more" title="More information">
                    <p>
                        Read our <Link href={privacy()}>privacy policy</Link> to
                        learn how we handle personal information, or email{' '}
                        <a href={`mailto:${contactEmail}`}>{contactEmail}</a>{' '}
                        with any questions. If we start using a new kind of
                        cookie, we will update this page first, and ask for your
                        consent where the law requires it.
                    </p>
                </LegalSection>
            </LegalDocument>
        </>
    );
}

function StorageTable({ items }: { items: StorageItem[] }) {
    return (
        <div className="overflow-hidden rounded-lg border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Purpose</TableHead>
                        <TableHead>Duration</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {items.map((item) => (
                        <TableRow key={`${item.kind}-${item.name}`}>
                            <TableCell className="align-top">
                                <code className="font-mono text-xs">
                                    {item.name}
                                </code>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {item.kind}
                                </p>
                            </TableCell>
                            <TableCell className="min-w-56 align-top whitespace-normal">
                                {item.purpose}
                            </TableCell>
                            <TableCell className="min-w-32 align-top whitespace-normal text-muted-foreground">
                                {item.duration}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
