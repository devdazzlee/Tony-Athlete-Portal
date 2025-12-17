import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TC Nutrition Athletes - Athlete Portal",
  description: "TC Nutrition Athlete Portal - Manage your deliverables, track performance, and earn commissions",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Get configuration from environment variables
  const apiUrl =
    process.env.NEXT_PUBLIC_TRACKDESK_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:3003/api";
  const websiteId = process.env.NEXT_PUBLIC_TRACKDESK_WEBSITE_ID || "";
  const debugMode =
    process.env.NEXT_PUBLIC_TRACKDESK_DEBUG === "true" ||
    process.env.NODE_ENV !== "production";

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Force light theme only */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  // Force light theme - remove dark class
                  document.documentElement.classList.remove('dark');
                  localStorage.setItem('theme', 'light');
                } catch (e) {}
              })();
            `,
          }}
        />
        {/* TC Nutrition Athlete Portal Tracking Script */}
        <Script
          id="trackdesk-script"
          src="/trackdesk.js"
          strategy="afterInteractive"
          data-website-id={websiteId}
          data-auto-init="false"
        />
        {/* Initialize TC Nutrition Athlete Portal tracking with configuration */}
        <Script id="trackdesk-init" strategy="afterInteractive">
          {`
            (function() {
              if (typeof window !== 'undefined' && window.Trackdesk && window.Trackdesk.init) {
                window.Trackdesk.init({
                  apiUrl: '${apiUrl}',
                  websiteId: '${websiteId}',
                  debug: ${debugMode},
                  batchSize: 10,
                  flushInterval: 5000
                });
              }
            })();
          `}
        </Script>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased overflow-x-hidden`}
      >
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
        <Toaster position="top-right" richColors closeButton expand={false} />
      </body>
    </html>
  );
}
