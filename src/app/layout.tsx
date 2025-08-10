import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
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
  title: "Sabi-WiFi by PHSWEB - Renew Your Internet Subscription",
  description: "Renew your Sabi-WiFi by PHSWEB subscription easily. Stay connected with our premium internet services for uninterrupted access to high-speed internet.",
  keywords: ["internet", "subscription", "renewal", "wifi", "broadband", "nigeria"],
  authors: [{ name: "Sabi-WiFi by PHSWEB" }],
  creator: "Sabi-WiFi by PHSWEB",
  publisher: "Sabi-WiFi by PHSWEB",
  robots: "index, follow",
  viewport: "width=device-width, initial-scale=1",
  themeColor: "#1f2937",
  openGraph: {
    title: "Sabi-WiFi by PHSWEB - Renew Your Internet Subscription",
    description: "Renew your Sabi-WiFi by PHSWEB subscription easily. Stay connected with our premium internet services for uninterrupted access to high-speed internet.",
    type: "website",
    locale: "en_US",
    siteName: "Sabi-WiFi by PHSWEB",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sabi-WiFi by PHSWEB - Renew Your Internet Subscription",
    description: "Renew your Sabi-WiFi by PHSWEB subscription easily. Stay connected with our premium internet services for uninterrupted access to high-speed internet.",
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Load PayStack script globally for better reliability */}
        <Script
          src="https://js.paystack.co/v1/inline.js"
          strategy="beforeInteractive"
          onLoad={() => {
            console.log('PayStack script loaded globally');
          }}
          onError={(error) => {
            console.error('PayStack script failed to load globally:', error);
          }}
        />
        {children}
      </body>
    </html>
  );
}
