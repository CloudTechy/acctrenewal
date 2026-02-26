'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { User, Globe } from 'lucide-react';
import { toast } from 'sonner';

export default function AccountDetailsPage() {
  const handleRenew = () => {
    toast.info('Redirecting to Paystack securely...', {
      description: 'You are being redirected to our payment gateway.',
    });
  };

  const [loading, setLoading] = useState(true);
  const [accountStatusItems, setAccountStatusItems] = useState<any[]>([]);
  const [currentPlanItems, setCurrentPlanItems] = useState<any[]>([]);
  const [personalDetailsItems, setPersonalDetailsItems] = useState<any[]>([]);
  const [usageDetailsItems, setUsageDetailsItems] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const res = await fetch('/api/account');
        if (!res.ok) throw new Error('Failed to fetch account');
        const data = await res.json();

        if (!mounted) return;

        // Map API response to UI-friendly rows. Adjust keys as your API returns them.
        const statusRows = [
          { label: 'status', value: data.status || 'Active', valueClass: 'text-[#19b76f] bg-[#12423a] border border-[#28504f] px-3 py-1 rounded-lg' },
          { label: 'Username', value: data.username || data.email || '-', valueClass: 'text-white/90' },
          { label: 'Expiry Date', value: data.expiry_date || '-', valueClass: 'text-[#19b76f]' },
          { label: 'Days to Expiry', value: data.days_to_expiry ? `${data.days_to_expiry} days` : '-', valueClass: 'text-[#eb5345]' },
        ];

        const plan = data.plan || {};
        const planRows = [
          { label: 'Plan Name', value: plan.name || '-', valueClass: 'text-[#19b76f] bg-[#12423a] border border-[#28504f] px-3 py-1 rounded-lg' },
          { label: 'Monthly Price', value: plan.price || '-', valueClass: 'text-white/90' },
          { label: 'Validity', value: plan.validity || '-', valueClass: 'text-[#19b76f]' },
        ];

        const personal = data.personal || {};
        const personalRows = [
          { label: 'Name', value: personal.name || '-', valueClass: 'text-white/90' },
          { label: 'Email', value: personal.email || '-', valueClass: 'text-white/90' },
          { label: 'Phone', value: personal.phone || 'N/A', valueClass: 'text-[#19b76f]' },
        ];

        const usage = data.usage || {};
        const usageRows = [
          { label: 'Download Used', value: usage.download || '-', valueClass: 'text-[#19b76f]' },
          { label: 'Upload used', value: usage.upload || '-', valueClass: 'text-[#19b76f]' },
          { label: 'Total used', value: usage.total || '-', valueClass: 'text-[#19b76f]' },
        ];

        setAccountStatusItems(statusRows);
        setCurrentPlanItems(planRows);
        setPersonalDetailsItems(personalRows);
        setUsageDetailsItems(usageRows);
      } catch (err) {
        console.error('Failed to load account:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-start min-h-[80vh] px-4 py-12 md:px-28">
      <div className="w-full max-w-8xl">
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                Renew <span className="font-bold text-[#ffd534] md:whitespace-nowrap">15Mbps Connekt Residential Plus</span> for 1 days
              </p>
            </div>
          </AccountCard>

          <div className="md:col-span-2">
            <AccountCard title="Current Plan" icon={<Globe size={18} />} showGradient>
              <div className="flex flex-col gap-2">
                {currentPlanItems.map((item, idx) => (
                  <DataRow key={idx} label={item.label} value={item.value} valueClass={item.valueClass} />
                ))}
              </div>
            </AccountCard>
          </div>

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
      className="bg-[#0d0d0d]/64 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 md:p-4 flex flex-col gap-8 relative overflow-visible"
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
    <div className="bg-[#17181a] border border-[#303030] rounded-xl h-[52px] px-2 flex items-center gap-4 group hover:border-white/20 transition-colors min-w-0">
      <span className="text-[#8c93a5] text-sm font-medium font-['Outfit'] capitalize flex-none md:w-32">{label}</span>
      <div className="flex-1 flex justify-end min-w-0 md:w-[920px]">
        <span className={`text-sm font-semibold font-['Outfit'] ${valueClass || ''} md:whitespace-nowrap md:overflow-visible text-right`} title={value}>{value}</span>
      </div>
    </div>
  );
}
