'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { User, Globe } from 'lucide-react';
import { toast } from 'sonner';

export default function AccountDetailsPage() {
  const handleRenew = () => {
    toast.info('Redirecting to Paystack securely...', {
      description: 'You are being redirected to our payment gateway.',
    });
  };

  const accountStatusItems = [
    { label: 'status', value: 'Active', valueClass: 'text-[#19b76f] bg-[#12423a] border border-[#28504f] px-3 py-1 rounded-lg' },
    { label: 'Username', value: 'Adebowalelipede@yahoo.com', valueClass: 'text-white/90' },
    { label: 'Expiry Date', value: 'Feb 16, 2026, 12:00AM', valueClass: 'text-[#19b76f]' },
    { label: 'Days to Expiry', value: '12 days', valueClass: 'text-[#eb5345]' },
  ];

  const currentPlanItems = [
    { label: 'Plan Name', value: '15Mbps Connekt residental Plus', valueClass: 'text-[#19b76f] bg-[#12423a] border border-[#28504f] px-3 py-1 rounded-lg' },
    { label: 'Monthly Price', value: '₦20,399', valueClass: 'text-white/90' },
    { label: 'Validity', value: '1 days', valueClass: 'text-[#19b76f]' },
  ];

  const personalDetailsItems = [
    { label: 'Name', value: 'Adebowale lipede', valueClass: 'text-white/90' },
    { label: 'Email', value: 'Adebowalelipede@yahoo.com', valueClass: 'text-white/90' },
    { label: 'Phone', value: 'N/A', valueClass: 'text-[#19b76f]' },
  ];

  const usageDetailsItems = [
    { label: 'Download Used', value: '251.05 GB', valueClass: 'text-[#19b76f]' },
    { label: 'Upload used', value: '251.05 GB', valueClass: 'text-[#19b76f]' },
    { label: 'Total used', value: '251.05 GB', valueClass: 'text-[#19b76f]' },
  ];

  return (
    <div className="flex flex-col items-center justify-start min-h-[80vh] px-4 py-12 md:px-28">
      <div className="w-full max-w-7xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-12">
          <motion.h1
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-3xl md:text-[32px] font-bold font-['Outfit']"
          >
            Account Details
          </motion.h1>

          {/* search box removed (duplicate) */}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AccountCard title="Account status" icon={<User size={18} />}>
            <div className="flex flex-col gap-2 mb-8">
              {accountStatusItems.map((item, idx) => (
                <DataRow key={idx} label={item.label} value={item.value} valueClass={item.valueClass} />
              ))}
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleRenew}
              className="w-full bg-[#dcb400] text-white py-4 rounded-2xl font-semibold text-base shadow-[0_10px_20px_rgba(220,180,0,0.2)] border border-[#6f5d0a] hover:bg-[#efab18] transition-colors"
            >
              Pay ₦20,000 Renew Plan
            </motion.button>
            <div className="mt-4 text-center">
              <p className="text-[10px] text-white/40 mb-1">Secure payment powered by paystack</p>
              <p className="text-[10px] text-white/60">
                Renew <span className="font-bold text-[#ffd534]">15Mbps Connekt Residential Plus</span> for 1 days
              </p>
            </div>
          </AccountCard>

          <AccountCard title="Current Plan" icon={<Globe size={18} />} showGradient>
            <div className="flex flex-col gap-2">
              {currentPlanItems.map((item, idx) => (
                <DataRow key={idx} label={item.label} value={item.value} valueClass={item.valueClass} />
              ))}
            </div>
          </AccountCard>

          <AccountCard title="Account Details" icon={<User size={18} />}>
            <div className="flex flex-col gap-2">
              {personalDetailsItems.map((item, idx) => (
                <DataRow key={idx} label={item.label} value={item.value} valueClass={item.valueClass} />
              ))}
            </div>
          </AccountCard>

          <AccountCard title="Usage Details" icon={<Globe size={18} />} showGradient>
            <div className="flex flex-col gap-2">
              {usageDetailsItems.map((item, idx) => (
                <DataRow key={idx} label={item.label} value={item.value} valueClass={item.valueClass} />
              ))}
            </div>
          </AccountCard>
        </div>
      </div>
    </div>
  );
}

function AccountCard({
  title,
  icon,
  children,
  showGradient = false,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  showGradient?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#0d0d0d]/64 backdrop-blur-2xl border border-white/10 rounded-2xl p-7 md:p-8 flex flex-col gap-7 relative overflow-hidden"
    >
      <div className="flex items-center gap-4">
        <div className="size-[34px] rounded-lg bg-[#ffd534] flex items-center justify-center text-black border border-black shadow-[0_0_15px_rgba(255,213,52,0.3)]">
          {icon}
        </div>
        <h2 className="text-[21px] font-medium font-['Outfit'] text-white">{title}</h2>
      </div>

      <div className="relative z-10 flex flex-col h-full">{children}</div>

      {showGradient && (
        <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-[#d7ab04]/20 blur-[80px] rounded-full pointer-events-none" />
      )}
    </motion.div>
  );
}

function DataRow({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="bg-[#17181a] border border-[#303030] rounded-xl h-[48px] px-4 flex items-center justify-between group hover:border-white/20 transition-colors">
      <span className="text-[#8c93a5] text-sm font-medium font-['Outfit'] capitalize">{label}</span>
      <span className={`text-sm font-semibold font-['Outfit'] ${valueClass || ''}`}>{value}</span>
    </div>
  );
}
