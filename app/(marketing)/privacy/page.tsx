import Link from "next/link";
import { APP_NAME } from "@/lib/constants/branding";

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16 sm:px-8">
      <p className="font-mono text-xs text-muted">[PRIVACY_TODO]</p>
      <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight">
        Privacy Policy
      </h1>
      <p className="mt-4 text-base leading-relaxed text-muted">
        Placeholder page for {APP_NAME}. Re-generate the full Privacy Policy via
        your generator with Matomari entity/brand details before public launch —
        do not treat a find-replace of an older draft as sufficient.
      </p>
      <Link href="/" className="mt-8 inline-block text-sm text-foreground underline underline-offset-2">
        Back to home
      </Link>
    </main>
  );
}
