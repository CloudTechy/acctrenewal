"use client";

import React from "react";
import { Logo } from "./Logo";
import { Facebook } from "lucide-react";
import { FaXTwitter  as SiTwitterX } from 'react-icons/fa6';
// import { SiTwitterX } from "react-icons/si";
import { useRouter } from "next/navigation";

export function Footer() {
  const currentYear = new Date().getFullYear();
  const router = useRouter();

  return (
    <footer className="bg-black/40 backdrop-blur-xl border-t border-white/5 w-full pt-20 pb-10 relative overflow-hidden">
      {/* Yellow bottom line as per design */}
      <div className="absolute bottom-8 left-6 right-6 h-0.5 bg-[#ffd534]" />
      
      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-1 md:col-span-2 flex flex-col items-start gap-6">
            <Logo />
            <p className="text-white/50 text-sm max-w-sm leading-relaxed font-['Outfit']">
              Empowering homes and businesses with reliable, lightning-fast broadband solutions. Experience the future of connectivity with CONNEKT.
            </p>
            <div className="flex items-center gap-4">
              <a
                href="https://www.facebook.com/share/14XeryKkcLQ/"
                target="_blank"
                rel="noopener noreferrer"
                className="size-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-[#ffd534] hover:border-[#ffd534]/50 hover:bg-[#ffd534]/5 transition-all"
              >
                <Facebook size={18} />
              </a>

              <a
                href="https://x.com/ConnektOnline"
                target="_blank"
                rel="noopener noreferrer"
                className="size-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-[#ffd534] hover:border-[#ffd534]/50 hover:bg-[#ffd534]/5 transition-all"
              >
                <SiTwitterX fontSize={18} />
              </a>

              

              
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 md:col-span-2">
            <div className="flex flex-col gap-4">
              <h4 className="text-white font-bold text-sm uppercase tracking-wider font-['Outfit']">Company</h4>
              <button onClick={() => router.push("/")} className="text-white/50 hover:text-white transition-colors text-sm text-left">About Us</button>
              <button onClick={() => router.push("/")} className="text-white/50 hover:text-white transition-colors text-sm text-left">Careers</button>
              <button onClick={() => router.push("/contact")} className="text-white/50 hover:text-white transition-colors text-sm text-left font-medium">Contact</button>
            </div>
            <div className="flex flex-col gap-4">
              <h4 className="text-white font-bold text-sm uppercase tracking-wider font-['Outfit']">Legal</h4>
              <button onClick={() => router.push("/terms")} className="text-white/50 hover:text-white transition-colors text-sm text-left">Terms of Service</button>
              <button onClick={() => router.push("/privacy")} className="text-white/50 hover:text-white transition-colors text-sm text-left">Privacy Policy</button>
              <button onClick={() => router.push("/")} className="text-white/50 hover:text-white transition-colors text-sm text-left">Cookies</button>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-10">
          <p className="text-white/30 text-[10px] md:text-xs font-['Outfit'] text-center md:text-left">
            © {currentYear} CONNEKT Internet. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <p className="text-white/30 text-[10px] md:text-xs font-['Outfit']">
              Broadband Solutions for the Future
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
