'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Shield } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 py-20 relative overflow-hidden">
      {/* Background Decorative Element */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[600px] bg-[#efab18]/5 blur-[120px] rounded-full pointer-events-none -z-10" />

      <motion.h1 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-4xl md:text-5xl font-black mb-12 tracking-tight font-['Outfit'] text-center"
      >
        TERMS OF SERVICE
      </motion.h1>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="w-full max-w-5xl bg-[#0d0d0d]/40 backdrop-blur-2xl border border-white/10 rounded-[40px] p-8 md:p-12 shadow-2xl flex flex-col gap-12"
      >
        <div className="flex flex-col gap-8">
          {/* Main Terms Section */}
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <div className="size-10 rounded-lg bg-[#ffd534] flex items-center justify-center text-black shadow-[0_0_15px_rgba(255,213,52,0.3)]">
                <FileText size={20} />
              </div>
              <h2 className="text-xl md:text-2xl font-bold font-['Outfit']">Agreement to Terms</h2>
            </div>
            
            <div className="text-white/70 text-sm md:text-base leading-relaxed font-['Outfit'] space-y-6">
              <p>
                By accessing and using PHSWEB Internet services, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
              </p>

              <div className="space-y-4">
                <h3 className="text-white font-bold text-lg">Internet Service</h3>
                <p>PHSWEB Internet provides residential and business internet connectivity services including:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>High-speed broadband internet access</li>
                  <li>Wi-Fi connectivity solutions</li>
                  <li>Technical support and maintenance</li>
                  <li>Account management and billing services</li>
                </ul>
              </div>

              <div className="space-y-4">
                <h3 className="text-white font-bold text-lg">Payment Terms</h3>
                <p>
                  Subscription fees are payable in advance. Payment can be made through our online portal using authorized payment methods. Service will be suspended if payment is not received by the due date.
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="text-white font-bold text-lg">Service Usage</h3>
                <p>
                  You agree to use our services in compliance with all applicable laws and regulations. Prohibited activities include but are not limited to illegal file sharing, network attacks, and activities that may harm our infrastructure or other users.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6 pt-6 border-t border-white/10">
            <div className="flex items-center gap-4">
              <div className="size-10 rounded-lg bg-[#ffd534] flex items-center justify-center text-black">
                <Shield size={20} />
              </div>
              <h2 className="text-xl md:text-2xl font-bold font-['Outfit']">Limitation of Liability</h2>
            </div>
            <p className="text-white/70 text-sm md:text-base leading-relaxed font-['Outfit']">
              PHSWEB Internet&apos;s liability is limited to the monthly service fee. We are not responsible for indirect damages, data loss, or business interruption resulting from service use or outages. We strive to maintain 99.9% uptime but cannot guarantee uninterrupted service.
            </p>
          </div>

        </div>
      </motion.div>
    </div>
  );
} 