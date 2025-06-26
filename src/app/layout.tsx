import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
  // Only load Analytics on Vercel
  const isVercel = process.env.VERCEL === '1';
  
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        {isVercel && <Analytics />}
      </body>
    </html>
  );
}
