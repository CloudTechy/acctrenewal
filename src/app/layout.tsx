import type { Metadata } from "next";
import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

// Use local font files to avoid remote fetch issues during build (turbopack resolver)
// Place the font files at: /public/fonts/geist-sans.woff2 and /public/fonts/geist-mono.woff2
const geistSans = localFont({
  // relative path from this file to the public folder
  src: "../../public/fonts/geist-sans.woff2",
  variable: "--font-geist-sans",
  display: "swap",
});

const geistMono = localFont({
  // relative path from this file to the public folder
  src: "../../public/fonts/geist-mono.woff2",
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PHSWEB unlimited Internet",
  description: "Renew your PHSWEB Internet subscription easily. Stay connected with our premium internet services for uninterrupted access to high-speed internet.",
  keywords: "PHSWEB, Internet, Subscription, Renewal, High-speed Internet, Nigeria, ISP",
  authors: [{ name: "PHSWEB Internet" }],
  icons: {
    icon: [
      { url: '/favicon.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: '/favicon.png',
    shortcut: '/favicon.png',
  },
  openGraph: {
    title: "PHSWEB unlimited Internet",
    description: "Renew your PHSWEB Internet subscription easily. Stay connected with our premium internet services for uninterrupted access to high-speed internet.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "PHSWEB unlimited Internet",
    description: "Renew your PHSWEB Internet subscription easily. Stay connected with our premium internet services for uninterrupted access to high-speed internet.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
