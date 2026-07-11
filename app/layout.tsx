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
import { TutorProvider } from "@/components/ai/tutor-provider";
import { MobileShell } from "@/components/layout/mobile-shell";
import { Toaster } from "@/components/ui/sonner";
import { UploadProgressBar } from "@/components/layout/upload-progress-bar";

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

export const metadata: Metadata = {
  title: "Shima — Japanese Learning",
  description: "Personalized Japanese learning through language islands",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Shima",
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
    icon: "/icons/icon-192.png",
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
          <AppProvider>
            <UploadProgressBar />
            <TutorProvider>
              <MobileShell>{children}</MobileShell>
            </TutorProvider>
            <Toaster />
          </AppProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
