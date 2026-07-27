import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageShell, LegalSection } from "@/components/legal/legal-page-shell";
import { APP_NAME } from "@/lib/constants/branding";
import {
  formatLegalDate,
  LEGAL_CONTACT_EMAIL,
  LEGAL_EFFECTIVE_DATE,
  LEGAL_OPERATOR,
  LEGAL_OPERATOR_DBA,
  LEGAL_SITE_URL,
} from "@/lib/constants/legal";
import {
  PLUS_PRICE_ANNUAL_USD,
  PLUS_PRICE_MONTHLY_USD,
  PRO_PRICE_ANNUAL_USD,
  PRO_PRICE_MONTHLY_USD,
} from "@/lib/constants/pricing";

export const metadata: Metadata = {
  title: `Terms of Service — ${APP_NAME}`,
  description: `Terms of Service for ${APP_NAME}.`,
};

export default function TermsPage() {
  const effectiveDate = formatLegalDate(LEGAL_EFFECTIVE_DATE);

  return (
    <LegalPageShell title="Terms of Service" effectiveDate={effectiveDate}>
      <LegalSection title="1. Agreement">
        <p>
          These Terms of Service (&quot;Terms&quot;) govern your access to and use of{" "}
          {LEGAL_OPERATOR_DBA} at{" "}
          <a href={LEGAL_SITE_URL}>{LEGAL_SITE_URL}</a> (the &quot;Service&quot;),
          operated by {LEGAL_OPERATOR} (&quot;we,&quot; &quot;us,&quot; or
          &quot;our&quot;).
        </p>
        <p>
          By creating an account, signing in, or otherwise using the Service, you
          agree to these Terms and our{" "}
          <Link href="/privacy">Privacy Policy</Link>. If you do not agree, do not
          use the Service.
        </p>
      </LegalSection>

      <LegalSection title="2. Eligibility">
        <p>
          The Service is not directed to children under 13, and we do not knowingly
          offer it to anyone under 13. You must be at least 13 years old to use the
          Service. If you are between 13 and the age of majority where you live, you
          may use the Service only with permission from a parent or legal guardian
          who accepts these Terms on your behalf.
        </p>
        <p>
          You must have the legal capacity to enter into a binding agreement and, if
          you subscribe to a paid plan, authority to authorize payment.
        </p>
      </LegalSection>

      <LegalSection title="3. The Service">
        <p>
          {APP_NAME} is a personalized Japanese language learning application. It
          lets you study through scenes, listen and shadow audio, track progress,
          generate AI-assisted study content, and — on paid plans — access additional
          features and higher usage limits.
        </p>
        <p>
          We may add, change, or remove features at any time. We do not guarantee
          uninterrupted availability, error-free operation, or that the Service will
          meet your specific learning goals.
        </p>
      </LegalSection>

      <LegalSection title="4. Accounts">
        <p>
          You sign in using <strong>Google</strong>. By doing so, you authorize us to
          receive basic profile information from Google (such as your email address,
          name, and profile photo) to create and maintain your account.
        </p>
        <p>
          You are responsible for maintaining access to your Google account and for
          all activity that occurs under your {APP_NAME} account. Notify us promptly
          at{" "}
          <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a> if you
          believe your account has been compromised.
        </p>
        <p>
          You may not share, sell, or transfer your account. One person per account
          unless we explicitly approve otherwise.
        </p>
      </LegalSection>

      <LegalSection title="5. Subscriptions and Payments">
        <p>
          {APP_NAME} offers a free tier and paid subscription plans (&quot;Plus&quot;
          and &quot;Pro&quot;). Current published prices are:
        </p>
        <ul>
          <li>
            Plus: ${PLUS_PRICE_MONTHLY_USD.toFixed(2)} per month or $
            {PLUS_PRICE_ANNUAL_USD.toFixed(2)} per year
          </li>
          <li>
            Pro: ${PRO_PRICE_MONTHLY_USD.toFixed(2)} per month or $
            {PRO_PRICE_ANNUAL_USD.toFixed(2)} per year
          </li>
        </ul>
        <p>
          Paid subscriptions are processed by <strong>Paddle</strong>, our payment
          provider. When you subscribe, you also agree to Paddle&apos;s applicable
          terms and policies. We do not store your full payment card details on our
          servers.
        </p>
        <p>
          <strong>Billing.</strong> Subscriptions renew automatically at the end of
          each billing period (monthly or annual) unless you cancel before renewal.
          Upgrading or downgrading between Plus and Pro may result in an immediate
          prorated charge or credit, as shown in the in-app confirmation before you
          confirm a plan change.
        </p>
        <p>
          <strong>Cancellation.</strong> You may cancel at period end from Settings.
          Paid features remain available until the end of the current billing period
          unless we terminate your access sooner under these Terms.
        </p>
        <p>
          <strong>Failed payments, refunds, and disputes.</strong> If a payment
          fails, is refunded, or is disputed or charged back, we may downgrade your
          account immediately. We do not provide a grace period after payment failure.
          Your study data is generally retained, but paid entitlements may be
          revoked until you resubscribe.
        </p>
        <p>
          <strong>Taxes.</strong> Prices may not include applicable taxes, which
          Paddle may calculate and collect where required.
        </p>
        <p>
          Manage payment methods, invoices, and some subscription changes through
          the Paddle customer portal linked from Settings.
        </p>
      </LegalSection>

      <LegalSection title="6. Free Tier">
        <p>
          The free tier is subject to usage limits (such as the number of active
          scenes and sentences per scene). We may change free-tier limits or features
          at any time. Features marked as paid are available only while you have an
          active qualifying subscription.
        </p>
      </LegalSection>

      <LegalSection title="7. Acceptable Use">
        <p>You agree not to:</p>
        <ul>
          <li>Use the Service for any unlawful purpose or in violation of any law</li>
          <li>
            Attempt to gain unauthorized access to the Service, other accounts, or
            our systems
          </li>
          <li>
            Scrape, reverse engineer, decompile, or attempt to extract source code
            except where permitted by law
          </li>
          <li>
            Abuse subscriptions, refunds, chargebacks, trials, or promotional access
          </li>
          <li>
            Upload, generate, or share content that is illegal, harassing, hateful,
            sexually exploitative, or infringes others&apos; rights
          </li>
          <li>
            Resell, white-label, or operate a competing service substantially derived
            from {APP_NAME} without our prior written permission
          </li>
          <li>Interfere with or disrupt the Service or its infrastructure</li>
        </ul>
        <p>
          We may investigate violations and suspend or terminate accounts at our
          discretion.
        </p>
      </LegalSection>

      <LegalSection title="8. Your Content">
        <p>
          You may create, import, and study scenes, sentences, and related learning
          material (&quot;User Content&quot;). You retain ownership of User Content
          you provide. You grant us a worldwide, non-exclusive license to host,
          store, process, display, and use User Content solely to operate and
          improve the Service — including generating audio, translations, and
          AI-assisted study features you request.
        </p>
        <p>
          You represent that you have the rights needed to submit User Content and
          that it does not violate these Terms or third-party rights.
        </p>
      </LegalSection>

      <LegalSection title="9. AI-Generated Content">
        <p>
          Parts of the Service use artificial intelligence to generate or adapt
          study material, translations, explanations, and audio. AI output may be
          inaccurate, incomplete, or inappropriate for every context. It is provided
          for language practice only and is not professional, legal, medical, or
          other expert advice.
        </p>
        <p>
          You are responsible for how you use AI-generated content. Do not rely on it
          for safety-critical, legal, or high-stakes communications without independent
          verification.
        </p>
      </LegalSection>

      <LegalSection title="10. Device Permissions">
        <p>
          Some features request optional access to device capabilities in your
          browser:
        </p>
        <ul>
          <li>
            <strong>Microphone</strong> — used only if you choose shadowing or
            recording features (for example, to compare your pronunciation). Audio is
            processed locally in your browser unless you explicitly use a feature
            that sends audio to our servers.
          </li>
          <li>
            <strong>Notifications</strong> — used only if you enable study reminders
            in Settings. You can revoke notification permission in your browser or
            device settings at any time.
          </li>
          <li>
            <strong>Local storage and cookies</strong> — used to keep you signed in,
            remember preferences (such as theme), and measure site performance. See
            our <Link href="/privacy">Privacy Policy</Link> for details.
          </li>
        </ul>
        <p>
          We do not request access to your contacts, photo gallery, camera, or
          precise geolocation.
        </p>
      </LegalSection>

      <LegalSection title="11. Third-Party Services">
        <p>The Service relies on third parties, including:</p>
        <ul>
          <li>
            <strong>Google</strong> — sign-in and authentication
          </li>
          <li>
            <strong>Paddle</strong> — subscription billing and customer portal
          </li>
          <li>
            <strong>Supabase</strong> — database and backend infrastructure
          </li>
          <li>
            <strong>Vercel</strong> — hosting, analytics, and performance monitoring
          </li>
          <li>
            <strong>AI and audio providers</strong> — to power generation, translation,
            tutoring, and text-to-speech features you request
          </li>
        </ul>
        <p>
          Your use of third-party services may be subject to their own terms and
          privacy policies. We are not responsible for third-party services we do not
          control.
        </p>
      </LegalSection>

      <LegalSection title="12. Intellectual Property">
        <p>
          The Service, including its software, design, branding, premade content, and
          documentation (excluding User Content), is owned by {LEGAL_OPERATOR} and
          protected by intellectual property laws. Except for the limited right to
          use the Service as intended, no rights are granted to you.
        </p>
        <p>
          &quot;{APP_NAME}&quot; and related marks are our trademarks. You may not use
          them without prior written permission.
        </p>
      </LegalSection>

      <LegalSection title="13. Privacy">
        <p>
          Our <Link href="/privacy">Privacy Policy</Link> explains what personal
          information we collect, how we use it, and your choices. By using the
          Service, you consent to our data practices as described there.
        </p>
      </LegalSection>

      <LegalSection title="14. Termination">
        <p>
          You may stop using the Service at any time. We may suspend or terminate your
          access, with or without notice, if you violate these Terms, if required by
          law, if we discontinue the Service, or for other legitimate business
          reasons.
        </p>
        <p>
          Upon termination, your right to use the Service ends. Sections that by their
          nature should survive (including payment obligations incurred, disclaimers,
          limitations of liability, and governing law) will survive termination.
        </p>
      </LegalSection>

      <LegalSection title="15. Disclaimers">
        <p>
          THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot;
          WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY,
          INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
          PURPOSE, TITLE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE
          WILL BE UNINTERRUPTED, SECURE, OR ERROR-FREE, OR THAT LEARNING OUTCOMES WILL
          BE ACHIEVED.
        </p>
      </LegalSection>

      <LegalSection title="16. Limitation of Liability">
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, {LEGAL_OPERATOR.toUpperCase()} AND
          ITS AFFILIATES, OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS WILL NOT BE
          LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE
          DAMAGES, OR ANY LOSS OF PROFITS, DATA, GOODWILL, OR OTHER INTANGIBLE
          LOSSES, ARISING FROM YOUR USE OF THE SERVICE.
        </p>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, OUR TOTAL LIABILITY FOR ANY CLAIM
          ARISING OUT OF OR RELATING TO THE SERVICE OR THESE TERMS WILL NOT EXCEED THE
          GREATER OF (A) THE AMOUNT YOU PAID US IN THE TWELVE (12) MONTHS BEFORE THE
          EVENT GIVING RISE TO THE CLAIM, OR (B) ONE HUNDRED U.S. DOLLARS (US $100).
        </p>
        <p>
          Some jurisdictions do not allow certain limitations, so some of the above may
          not apply to you.
        </p>
      </LegalSection>

      <LegalSection title="17. Changes to These Terms">
        <p>
          We may update these Terms from time to time. When we do, we will revise the
          &quot;Effective&quot; date at the top of this page. Material changes may
          also be communicated through the Service or by email where appropriate.
          Continued use after changes take effect constitutes acceptance of the
          updated Terms.
        </p>
      </LegalSection>

      <LegalSection title="18. Governing Law">
        <p>
          These Terms are governed by the laws of the United Arab Emirates, without
          regard to conflict-of-law principles. You agree that courts located in the
          United Arab Emirates will have exclusive jurisdiction over disputes arising
          from these Terms or the Service, except where mandatory consumer protection
          laws in your country require otherwise.
        </p>
      </LegalSection>

      <LegalSection title="19. Contact">
        <p>
          Questions about these Terms or the Service? Contact us:
        </p>
        <ul>
          <li>
            Email:{" "}
            <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>
          </li>
          <li>
            Website: <a href={LEGAL_SITE_URL}>{LEGAL_SITE_URL}</a>
          </li>
        </ul>
      </LegalSection>
    </LegalPageShell>
  );
}
