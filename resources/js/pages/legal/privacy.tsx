import { Head, Link } from '@inertiajs/react';
import { LegalDocument, LegalSection } from '@/components/legal-document';
import { cookies } from '@/routes/legal';

type Props = {
    companyName: string;
    contactEmail: string;
    lastUpdated: string;
};

export default function Privacy({
    companyName,
    contactEmail,
    lastUpdated,
}: Props) {
    const contactLink = <a href={`mailto:${contactEmail}`}>{contactEmail}</a>;

    return (
        <>
            <Head title="Privacy policy" />
            <LegalDocument
                title="Privacy policy"
                lastUpdated={lastUpdated}
                summary={
                    <p>
                        This policy explains what information {companyName}{' '}
                        collects when you use Shiftora, why we collect it, who
                        we share it with, and the choices you have.
                    </p>
                }
            >
                <LegalSection id="who-we-are" title="1. Who we are">
                    <p>
                        Shiftora is a time clock, timesheet and shift scheduling
                        service for businesses with hourly teams. In this
                        policy, “{companyName}”, “we”, “us” and “our” mean the
                        company that operates Shiftora. “Customer” means the
                        business that signs up for Shiftora, and “you” means
                        anyone who visits our website or uses the service,
                        including a Customer’s employees.
                    </p>
                </LegalSection>

                <LegalSection id="our-role" title="2. Our role with your data">
                    <p>
                        <strong>Account and billing information.</strong> We
                        decide how information about Customer accounts,
                        subscriptions and our website is used, so for that
                        information we act as the controller.
                    </p>
                    <p>
                        <strong>Workforce information.</strong> When a Customer
                        adds employees, records time or builds schedules, we
                        process that information on the Customer’s behalf and
                        under its instructions. For that information the
                        Customer (your employer) is the controller and we are
                        its processor. If you are an employee, questions about
                        how your employer uses your work records should go to
                        your employer first. We will help them answer.
                    </p>
                </LegalSection>

                <LegalSection
                    id="information-we-collect"
                    title="3. Information we collect"
                >
                    <p>Depending on how you use Shiftora, we collect:</p>
                    <ul>
                        <li>
                            <strong>Account details:</strong> your name, email
                            address and password (stored only as a one-way
                            hash), plus two-factor authentication and passkey
                            credentials if you turn them on.
                        </li>
                        <li>
                            <strong>Organization details:</strong> business
                            name, time zone, logo, work locations and settings
                            such as overtime rules.
                        </li>
                        <li>
                            <strong>Employee records:</strong> names, email
                            addresses, phone numbers, job titles, roles, hourly
                            pay rates and assigned locations, as entered by the
                            Customer.
                        </li>
                        <li>
                            <strong>Work records:</strong> clock-in and
                            clock-out times, breaks, shifts, timesheets,
                            approval decisions and notes.
                        </li>
                        <li>
                            <strong>Location at clock-in and clock-out:</strong>{' '}
                            only when the Customer has turned on geofencing, and
                            only with your browser’s permission. We record your
                            device’s position at the moment you clock in or out
                            to confirm you are on site. We do not track your
                            location at any other time.
                        </li>
                        <li>
                            <strong>Billing information:</strong> payments are
                            handled by Stripe. We never see or store full card
                            numbers. We keep the Stripe customer reference, the
                            card brand and its last four digits so we can show
                            them on the billing page.
                        </li>
                        <li>
                            <strong>Technical information:</strong> IP address
                            and browser details for signed-in sessions, and the
                            IP address attached to entries in the audit log.
                        </li>
                        <li>
                            <strong>Communications:</strong> messages you send
                            us, and the in-app and email notifications we send
                            you (for example shift reminders and timesheet
                            decisions).
                        </li>
                    </ul>
                </LegalSection>

                <LegalSection id="how-we-use" title="4. How we use information">
                    <ul>
                        <li>
                            To provide Shiftora: recording time, building and
                            publishing schedules, calculating hours and
                            overtime, and producing reports and exports.
                        </li>
                        <li>
                            To keep accounts secure: signing you in, detecting
                            misuse, and keeping an audit trail of changes.
                        </li>
                        <li>
                            To bill Customers and manage trials and
                            subscriptions.
                        </li>
                        <li>
                            To send service messages such as invitations,
                            reminders, password resets and billing notices.
                        </li>
                        <li>To answer support requests.</li>
                        <li>To meet legal, tax and accounting obligations.</li>
                    </ul>
                    <p>
                        We do not sell personal information, we do not share it
                        for cross-context behavioral advertising, and we do not
                        use workforce information for our own marketing.
                    </p>
                </LegalSection>

                <LegalSection id="legal-bases" title="5. Legal bases">
                    <p>
                        Where data protection law such as the GDPR or UK GDPR
                        applies, we rely on: <strong>contract</strong>, to
                        provide the service a Customer signed up for;{' '}
                        <strong>legitimate interests</strong>, to keep the
                        service secure and improve it;{' '}
                        <strong>legal obligation</strong>, for tax and
                        accounting records; and <strong>consent</strong>, for
                        device location, which you can withdraw at any time in
                        your browser settings.
                    </p>
                </LegalSection>

                <LegalSection id="sharing" title="6. Who we share it with">
                    <ul>
                        <li>
                            <strong>Your organization:</strong> owners, admins
                            and managers in your organization can see the work
                            records Shiftora keeps for their team, according to
                            their role.
                        </li>
                        <li>
                            <strong>Service providers</strong> that help us run
                            Shiftora, under contracts that limit how they use
                            the information: our hosting and cloud
                            infrastructure providers, Stripe for payments, and
                            our email delivery provider.
                        </li>
                        <li>
                            <strong>Legal requirements:</strong> when we must
                            respond to a valid legal request, or to protect the
                            rights, property or safety of our users or others.
                        </li>
                        <li>
                            <strong>Business transfers:</strong> if we are
                            involved in a merger, acquisition or sale of assets,
                            subject to this policy.
                        </li>
                    </ul>
                </LegalSection>

                <LegalSection id="cookies" title="7. Cookies">
                    <p>
                        Shiftora uses only the cookies it needs to sign you in,
                        protect forms and remember your display preferences. We
                        do not use advertising or analytics cookies. See our{' '}
                        <Link href={cookies()}>cookie policy</Link> for the full
                        list.
                    </p>
                </LegalSection>

                <LegalSection id="retention" title="8. How long we keep it">
                    <p>
                        We keep information for as long as the Customer’s
                        account is active. Payroll and time records often have
                        legal retention periods, so Customers decide how long
                        their workforce records are kept and can ask us to
                        delete them. When an account is closed we delete or
                        anonymize its data within 90 days, except where we must
                        keep billing records longer for tax and accounting
                        purposes. Backups roll off on their normal schedule.
                    </p>
                </LegalSection>

                <LegalSection id="security" title="9. Security">
                    <p>
                        All traffic is encrypted in transit, passwords are
                        hashed, and two-factor authentication and passkeys are
                        available to every user. Each organization’s data is
                        isolated from every other organization, and changes to
                        time and schedules are written to an append-only audit
                        log. No system is perfectly secure, but we work to
                        protect your information and will notify affected
                        Customers of a breach as the law requires.
                    </p>
                </LegalSection>

                <LegalSection id="your-rights" title="10. Your rights">
                    <p>
                        Depending on where you live, you may have the right to
                        access, correct, delete or export your personal
                        information, to object to or restrict certain
                        processing, and to withdraw consent. You can update your
                        profile or delete your account at any time from your
                        account settings.
                    </p>
                    <p>
                        For anything else, email {contactLink}. If you are an
                        employee and your request concerns your work records, we
                        may pass it to your employer, who controls that
                        information. We will not treat you differently for
                        exercising your rights. You may also complain to your
                        local data protection authority.
                    </p>
                </LegalSection>

                <LegalSection
                    id="international-transfers"
                    title="11. International transfers"
                >
                    <p>
                        Our service providers may process information in
                        countries other than your own. When we transfer personal
                        information out of the EEA, UK or Switzerland, we use
                        safeguards such as the European Commission’s Standard
                        Contractual Clauses.
                    </p>
                </LegalSection>

                <LegalSection id="children" title="12. Children">
                    <p>
                        Shiftora is a workplace tool and is not directed to
                        children under 16. We do not knowingly collect
                        information from them.
                    </p>
                </LegalSection>

                <LegalSection id="changes" title="13. Changes to this policy">
                    <p>
                        We will update this page when our practices change and
                        revise the date at the top. If a change is significant,
                        we will tell account owners by email or in the app
                        before it takes effect.
                    </p>
                </LegalSection>

                <LegalSection id="contact" title="14. Contact us">
                    <p>
                        Questions about this policy or your information? Email{' '}
                        {contactLink}.
                    </p>
                </LegalSection>
            </LegalDocument>
        </>
    );
}
