'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Info } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 py-20 relative overflow-hidden">
      {/* Background Decorative Element */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[600px] bg-[#efab18]/5 blur-[120px] rounded-full pointer-events-none -z-10" />

      <motion.h1 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-4xl md:text-5xl font-black mb-12 tracking-tight font-['Outfit']"
      >
        PRIVACY POLICY
      </motion.h1>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="w-full max-w-5xl bg-[#0d0d0d]/40 backdrop-blur-2xl border border-white/10 rounded-[40px] p-8 md:p-12 shadow-2xl flex flex-col gap-12"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Commitment Section */}
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <div className="size-10 rounded-lg bg-[#ffd534] flex items-center justify-center text-black">
                <Shield size={20} />
              </div>
              <h2 className="text-xl md:text-2xl font-bold font-['Outfit']">Our Commitment to Privacy</h2>
            </div>
            <p className="text-white/60 text-sm md:text-base leading-relaxed font-['Outfit']">
              At PHSWEB Internet, we are committed to protecting your privacy and personal information. This Privacy Policy explains how we collect, use, and safeguard your data when you use our services.
            </p>
          </div>

          {/* Collection Section */}
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <div className="size-10 rounded-lg bg-[#ffd534] flex items-center justify-center text-black">
                <Info size={20} />
              </div>
              <h2 className="text-xl md:text-2xl font-bold font-['Outfit']">Information We Collect</h2>
            </div>
            <div className="flex flex-col gap-4">
              <p className="text-white/80 font-medium text-sm md:text-base font-['Outfit']">Personal Information:</p>
              <ul className="flex flex-col gap-2">
                {["Name, email address, and phone number", "Billing address and payment information", "Service installation address", "Usage and network data"].map((item, i) => (
                  <li key={i} className="text-white/60 text-sm flex items-center gap-2 font-['Outfit']">
                    <span className="size-1 bg-[#ffd534] rounded-full" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6 pt-6 border-t border-white/10">
          <h2 className="text-xl md:text-2xl font-bold font-['Outfit']">How We Use Your Information</h2>
          <p className="text-white/60 text-sm md:text-base leading-relaxed font-['Outfit']">
            We use your information to provide and improve our internet services, process payments, communicate with you about your account, and ensure network security. We do not sell your personal information to third parties.
          </p>
        </div>

        <div className="flex flex-col gap-6 pt-6 border-t border-white/10">
          <h2 className="text-xl md:text-2xl font-bold font-['Outfit']">Data Security</h2>
          <p className="text-white/60 text-sm md:text-base leading-relaxed font-['Outfit']">
            We implement industry-standard security measures to protect your data. However, no method of transmission over the internet is 100% secure. We continuously work to improve our security practices.
          </p>
        </div>

      </motion.div>
    </div>
  );
}