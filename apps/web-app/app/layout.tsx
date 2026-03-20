import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/auth-context";
import PwaInstallButton from "@/components/pwa-install-button";
import ServiceWorkerRegistrar from "@/components/service-worker-registrar";
import ClarityInit from "@/components/clarity-init";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#1B998B",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://split-it.xyz"),
  title: {
    default: "Split-It — Free Bill Splitter App for Friends & Groups",
    template: "%s | Split-It",
  },
  description:
    "Split-It is the free bill splitter app for friends, roommates, and groups. Track shared expenses, split bills instantly, and settle up easily. The best free Splitwise alternative.",
  keywords: [
    "bill splitter app",
    "split bills with friends",
    "free Splitwise alternative",
    "Tricount alternative",
    "group expense tracker",
    "split expenses app",
    "expense splitter",
    "shared expense tracker",
    "split bills app free",
    "roommate expense tracker",
    "trip expense splitter",
    "bill splitting app",
    "split bill calculator",
    "expense sharing app",
    "split costs between friends",
  ],
  authors: [{ name: "Split-It" }],
  creator: "Split-It",
  icons: {
    icon: "/favicon.png",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://split-it.xyz",
    siteName: "Split-It",
    title: "Split-It — Free Bill Splitter App for Friends & Groups",
    description:
      "The simplest free bill splitter app. Track shared expenses, split bills with friends, and settle up — no subscriptions, no ads, forever free.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Split-It — Free Bill Splitter App for Friends & Groups",
    description:
      "The simplest free bill splitter app. Track shared expenses, split bills with friends, and settle up — no subscriptions, no ads, forever free.",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Split-It",
  },
  formatDetection: { telephone: false },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} antialiased bg-gray-50 text-gray-900`}>
        <AuthProvider>
          {children}
          <PwaInstallButton />
        </AuthProvider>
        <ServiceWorkerRegistrar />
        <ClarityInit />
      </body>
    </html>
  );
}
