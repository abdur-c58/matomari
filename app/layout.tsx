import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata, Viewport } from "next";
import "@fontsource/red-hat-display/400.css";
import "@fontsource/red-hat-display/500.css";
import "@fontsource/red-hat-display/600.css";
import "@fontsource/red-hat-display/700.css";
import "@fontsource/noto-serif-jp/400.css";
import "@fontsource/noto-serif-jp/500.css";
import "@fontsource/noto-serif-jp/600.css";
import "./globals.css";
import { AppProvider } from "@/components/providers/app-provider";
import { AuthProvider } from "@/components/providers/auth-provider";
import { AuthGate } from "@/components/auth/auth-gate";
import { TutorProvider } from "@/components/ai/tutor-provider";
import { MobileShell } from "@/components/layout/mobile-shell";
import { Toaster } from "@/components/ui/sonner";
import { UploadProgressBar } from "@/components/layout/upload-progress-bar";
import { NotificationProvider } from "@/components/notifications/notification-provider";
import {
  APP_DESCRIPTION,
  APP_FULL_TITLE,
  APP_SHORT_TITLE,
} from "@/lib/constants/branding";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  interactiveWidget: "overlays-content",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: APP_FULL_TITLE,
  description: APP_DESCRIPTION,
  manifest: "/manifest.json",
  openGraph: {
    title: APP_FULL_TITLE,
    description: APP_DESCRIPTION,
    siteName: APP_SHORT_TITLE,
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Kotoshima — 言島 · Japanese Learning",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: APP_FULL_TITLE,
    description: APP_DESCRIPTION,
    images: ["/og.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: APP_SHORT_TITLE,
  },
  icons: {
    icon: [
      { url: "/icons/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: "/icons/icon-192.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="antialiased">
      <body className="bg-background text-foreground">
        <AuthProvider>
          <AuthGate>
            <AppProvider>
              <NotificationProvider>
                <UploadProgressBar />
                <TutorProvider>
                  <MobileShell>{children}</MobileShell>
                </TutorProvider>
                <Toaster />
              </NotificationProvider>
            </AppProvider>
          </AuthGate>
        </AuthProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
