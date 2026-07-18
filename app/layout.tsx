import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata, Viewport } from "next";
import "@fontsource/red-hat-display/400.css";
import "@fontsource/red-hat-display/500.css";
import "@fontsource/red-hat-display/600.css";
import "@fontsource/red-hat-display/700.css";
import "@fontsource/bitter/300.css";
import "@fontsource/bitter/400.css";
import "@fontsource/bitter/500.css";
import "@fontsource/bitter/600.css";
import "@fontsource/noto-serif-jp/400.css";
import "@fontsource/noto-serif-jp/500.css";
import "@fontsource/noto-serif-jp/600.css";
import "@fontsource/yuji-boku/400.css";
import "./globals.css";
import { ServiceWorkerProvider } from "@/components/pwa/service-worker-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import {
  APP_DESCRIPTION,
  APP_FULL_TITLE,
  APP_SHORT_TITLE,
} from "@/lib/constants/branding";
import { buildAppleStartupImages } from "@/lib/constants/apple-splash-screens";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  interactiveWidget: "overlays-content",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#d2c5a4" },
    { media: "(prefers-color-scheme: dark)", color: "#211d16" },
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
        alt: "Kotoshima — 言島",
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
    startupImage: buildAppleStartupImages(),
  },
  other: {
    // iOS still requires this deprecated tag for apple-touch-startup-image to apply.
    // https://github.com/vercel/next.js/issues/74524
    "apple-mobile-web-app-capable": "yes",
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
    <html lang="en" className="antialiased" data-ui-font="bitter" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var m=localStorage.getItem("kotoshima-theme-mode");m=m==="light"||m==="paper-dark"||m==="true-light"||m==="dark"||m==="system"?m:"system";var sd=window.matchMedia("(prefers-color-scheme: dark)").matches;var t=m==="system"?(sd?"paper-dark":"light"):m;var f=t==="light"||t==="paper-dark"?"washi":"normal";var p=t==="light"||t==="true-light"?"light":"dark";document.documentElement.dataset.theme=t;document.documentElement.dataset.themeMode=m;document.documentElement.dataset.themeFamily=f;document.documentElement.dataset.themePolarity=p;document.documentElement.style.colorScheme=p;}catch(e){}})();`,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if("scrollRestoration" in history)history.scrollRestoration="manual";var n=performance.getEntriesByType&&performance.getEntriesByType("navigation")[0];var reload=(n&&n.type==="reload")||(performance.navigation&&performance.navigation.type===1);if(!reload)return;if(location.hash)history.replaceState(null,"",location.pathname+location.search);try{sessionStorage.removeItem("marketing-pending-section")}catch(e){}window.scrollTo(0,0);document.documentElement.scrollTop=0;document.body&&(document.body.scrollTop=0);}catch(e){}})();`,
          }}
        />
      </head>
      <body className="bg-background text-foreground">
        <ServiceWorkerProvider />
        <ThemeProvider>{children}</ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
