import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageShell, LegalSection } from "@/components/legal/legal-page-shell";
import { APP_NAME } from "@/lib/constants/branding";
import {
  formatLegalDate,
  LEGAL_EFFECTIVE_DATE,
  LEGAL_OPERATOR,
  LEGAL_OPERATOR_DBA,
  LEGAL_SITE_URL,
  LEGAL_SUPPORT_PATH,
} from "@/lib/constants/legal";

export const metadata: Metadata = {
  title: `Privacy Policy — ${APP_NAME}`,
  description: `Privacy Policy for ${APP_NAME}.`,
};

export default function PrivacyPage() {
  const effectiveDate = formatLegalDate(LEGAL_EFFECTIVE_DATE);

  return (
    <LegalPageShell title="Privacy Policy" effectiveDate={effectiveDate}>
      <LegalSection title="1. Introduction">
        <p>
          This Privacy Policy explains how {LEGAL_OPERATOR} (&quot;we,&quot;
          &quot;us,&quot; or &quot;our&quot;) collects, uses, and shares information
          when you use {LEGAL_OPERATOR_DBA} at{" "}
          <a href={LEGAL_SITE_URL}>{LEGAL_SITE_URL}</a> (the &quot;Service&quot;).
        </p>
        <p>
          By using the Service, you agree to this Privacy Policy. If you do not
          agree, please do not use the Service. This policy should be read together
          with our <Link href="/terms">Terms of Service</Link>.
        </p>
      </LegalSection>

      <LegalSection title="2. Information We Collect">
        <p>
          <strong>Account information.</strong> When you sign in with Google, we
          receive your email address, name, and profile photo. We store a profile
          record linked to your account.
        </p>
        <p>
          <strong>Study and usage data.</strong> We store the content you create or
          import (scenes, sentences, progress, preferences, and related learning
          data) so the Service can function across devices.
        </p>
        <p>
          <strong>Support messages.</strong> If you contact us through our{" "}
          <Link href={LEGAL_SUPPORT_PATH}>support page</Link>, we collect the
          information you submit (such as your name, email, subject, and message).
        </p>
        <p>
          <strong>Billing information.</strong> If you subscribe to a paid plan,
          payments are processed by Paddle. We receive subscription status, plan
          tier, and billing metadata from Paddle. We do not store your full payment
          card number on our servers.
        </p>
        <p>
          <strong>Technical and analytics data.</strong> We use Vercel Analytics and
          Speed Insights to measure traffic and performance. This may include
          page views, referrers, device/browser type, and general usage patterns.
          We do not use Google Analytics, advertising pixels, or retargeting tools.
        </p>
        <p>
          <strong>Local device data.</strong> Your browser may store preferences
          (such as theme and UI settings) in local storage. Authentication sessions
          use cookies managed by our auth provider.
        </p>
        <p>
          <strong>Optional permissions.</strong> If you enable shadowing or study
          reminders, your browser may request microphone or notification access. We
          do not request access to your contacts, photo gallery, camera, or precise
          geolocation.
        </p>
      </LegalSection>

      <LegalSection title="3. How We Use Information">
        <p>We use information to:</p>
        <ul>
          <li>Provide, maintain, and improve the Service</li>
          <li>Authenticate you and manage your account</li>
          <li>Process subscriptions and enforce plan entitlements</li>
          <li>Generate AI-assisted study content, translations, audio, and tutoring features you request</li>
          <li>Respond to support requests</li>
          <li>Monitor performance, fix bugs, and prevent abuse</li>
          <li>Comply with legal obligations</li>
        </ul>
        <p>We do not sell your personal information.</p>
      </LegalSection>

      <LegalSection title="4. AI Processing">
        <p>
          Parts of the Service send text you provide (and related study context) to
          third-party AI and audio providers to generate translations, explanations,
          scenes, and speech. Do not submit sensitive personal information you do not
          want processed for these features.
        </p>
      </LegalSection>

      <LegalSection title="5. How We Share Information">
        <p>We share information only as needed to operate the Service, including with:</p>
        <ul>
          <li>
            <strong>Google</strong> — authentication (Google sign-in)
          </li>
          <li>
            <strong>Supabase</strong> — database, authentication infrastructure, and
            data storage
          </li>
          <li>
            <strong>Paddle</strong> — subscription billing and customer portal
          </li>
          <li>
            <strong>Vercel</strong> — hosting, analytics, and performance monitoring
          </li>
          <li>
            <strong>AI and audio providers</strong> — to deliver features you request
          </li>
        </ul>
        <p>
          We may also disclose information if required by law, to protect rights and
          safety, or in connection with a merger, acquisition, or asset sale.
        </p>
      </LegalSection>

      <LegalSection title="6. Cookies and Similar Technologies">
        <p>We use:</p>
        <ul>
          <li>
            <strong>Session and authentication cookies</strong> — to keep you signed
            in
          </li>
          <li>
            <strong>Local storage</strong> — to remember preferences such as theme,
            onboarding state, and UI settings
          </li>
          <li>
            <strong>Session storage</strong> — for short-lived UI state (for example,
            marketing page scroll position)
          </li>
          <li>
            <strong>Analytics</strong> — Vercel Analytics/Speed Insights for
            aggregated traffic and performance measurement
          </li>
        </ul>
        <p>
          We do not use the Facebook pixel or advertising retargeting cookies. You
          can control cookies and local storage through your browser settings, though
          some features may not work if you disable them.
        </p>
      </LegalSection>

      <LegalSection title="7. Data Retention">
        <p>
          We retain account and study data while your account is active. If you delete
          your account or ask us to delete your data, we will delete or anonymize
          information within a reasonable period, except where we must retain it for
          legal, security, or billing purposes.
        </p>
        <p>
          Support messages are retained so we can respond and maintain a record of
          inquiries. Billing records may be retained as required for tax and
          compliance.
        </p>
      </LegalSection>

      <LegalSection title="8. Security">
        <p>
          We use reasonable technical and organizational measures to protect your
          information, including encrypted connections (HTTPS), access controls, and
          server-side enforcement of subscription entitlements. No method of
          transmission or storage is completely secure.
        </p>
      </LegalSection>

      <LegalSection title="9. Children&apos;s Privacy">
        <p>
          The Service is not directed to children under 13, and we do not knowingly
          collect personal information from children under 13. If you believe a child
          under 13 has provided us personal information, contact us through our{" "}
          <Link href={LEGAL_SUPPORT_PATH}>support page</Link> and we will take
          appropriate steps to delete it.
        </p>
      </LegalSection>

      <LegalSection title="10. International Users">
        <p>
          Your information may be processed in countries other than your own,
          including where our service providers operate. By using the Service, you
          consent to this transfer and processing.
        </p>
      </LegalSection>

      <LegalSection title="11. Your Choices and Rights">
        <p>Depending on where you live, you may have rights to:</p>
        <ul>
          <li>Access, correct, or delete personal information we hold about you</li>
          <li>Object to or restrict certain processing</li>
          <li>Withdraw consent where processing is based on consent</li>
          <li>Request a copy of your data in a portable format</li>
        </ul>
        <p>
          To make a request, contact us through our{" "}
          <Link href={LEGAL_SUPPORT_PATH}>support page</Link>. We may need to verify
          your identity before responding.
        </p>
        <p>
          You can manage notification and microphone permissions in your browser or
          device settings at any time.
        </p>
      </LegalSection>

      <LegalSection title="12. Changes to This Policy">
        <p>
          We may update this Privacy Policy from time to time. When we do, we will
          revise the &quot;Effective&quot; date at the top of this page. Material
          changes may also be communicated through the Service. Continued use after
          changes take effect means you accept the updated policy.
        </p>
      </LegalSection>

      <LegalSection title="13. Contact">
        <p>Questions about this Privacy Policy or your data?</p>
        <ul>
          <li>
            Support: <Link href={LEGAL_SUPPORT_PATH}>matomari.com/support</Link>
          </li>
          <li>
            Website: <a href={LEGAL_SITE_URL}>{LEGAL_SITE_URL}</a>
          </li>
        </ul>
      </LegalSection>
    </LegalPageShell>
  );
}
