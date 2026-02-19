import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { Toaster } from "sonner";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import Image from "next/image";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CONNEKT Broadband Solutions",
  description: "Renew your internet subscription easily. Experience ultra-fast speeds and zero downtime with CONNEKT broadband solutions.",
  keywords: "CONNEKT, Internet, Broadband, Subscription, Renewal, High-speed Internet, Nigeria, ISP",
  authors: [{ name: "CONNEKT Broadband" }],
  icons: {
    icon: [
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon.ico', type: 'image/x-icon' },
    ],
    apple: '/apple-touch-icon.png',
    shortcut: '/favicon.ico',
  },
  manifest: '/site.webmanifest',
  openGraph: {
    title: "CONNEKT Broadband Solutions",
    description: "Renew your internet subscription easily. Experience ultra-fast speeds and zero downtime with CONNEKT broadband solutions.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "CONNEKT Broadband Solutions",
    description: "Renew your internet subscription easily. Experience ultra-fast speeds and zero downtime with CONNEKT broadband solutions.",
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
        className={`${outfit.variable} antialiased`}
      >
        <div className="relative min-h-screen w-full bg-[#0d0d0d] text-white selection:bg-[#efab18] selection:text-black font-['Outfit'] overflow-x-hidden">
          {/* Background Layer */}
          <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
            <div className="absolute inset-0 bg-radial-gradient from-transparent to-[#0d0d0d]/90 z-1" />
            <Image 
              src="/assets/9c8972844f0e811c448d184ca2d7dc97cbe073a5.png"
              alt="" 
              fill
              className="object-cover opacity-40 scale-105 animate-pulse-slow"
              style={{ 
                animationDuration: '10s'
              }}
              priority
              unoptimized
            />
            <div className="absolute inset-0 bg-[#0d0d0d]/40 mix-blend-multiply" />
          </div>

          <div className="relative z-10 flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-grow flex flex-col">
              {children}
            </main>
            <Footer />
          </div>

          <Toaster 
            position="bottom-center" 
            richColors 
            toastOptions={{
              style: {
                background: 'rgba(26, 26, 26, 0.9)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#fff',
                borderRadius: '16px'
              }
            }}
          />
        </div>
        <Analytics />
      </body>
    </html>
  );
}
