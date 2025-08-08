'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useEffect } from 'react';
import { motion, Variants } from 'framer-motion';
import { Search, Menu, X, User, Calendar, CreditCard, Globe, RefreshCw } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import ChangePlanButton from '@/components/ChangePlanButton';
import { ServicePlan, UserData, PaystackConfig } from '@/lib/types';

// Dynamically import Paystack to avoid SSR issues
const PaystackButton = dynamic(
  () => import('react-paystack').then(mod => mod.PaystackButton),
  { ssr: false }
);

// PaystackPop is loaded dynamically
declare global {
  interface Window {
    PaystackPop: {
      setup: (config: PaystackConfig) => {
        openIframe: () => void;
      };
    };
  }
}

// Keep only the PaystackReference interface that's not in the unified types
interface PaystackReference {
  reference: string;
  status: string;
  trans: string;
  transaction: string;
  trxref: string;
}

// Secure API Functions - No credentials exposed to frontend
const getUserData = async (username: string): Promise<UserData> => {
  try {
    console.log('Frontend: Making API call to /api/user with username:', username);
    
    const response = await fetch('/api/user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username }),
    });
    
    console.log('Frontend: API response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Frontend: API error response:', errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Frontend: API response data:', data);
    
    // Handle server error responses
    if (data.error) {
      console.error('Frontend: Server returned error:', data.error);
      return { code: 1, str: data.error };
    }
    
    // Parse RADIUS Manager response object (not array!)
    // Response format: { "0": 0, "1": {...userdata...}, "simuse": "1", "dlbytes": 0, ... }
    if (typeof data === 'object' && data !== null) {
      console.log('Frontend: Parsing RADIUS Manager response object');
      
      const resultCode = data["0"];
      const userData = data["1"];
      
      if (resultCode === 0 && userData) {
        // Success response
        return {
          code: 0,
          enableuser: parseInt(userData.enableuser) || 0,
          srvid: parseInt(userData.srvid) || 0,
          firstname: userData.firstname || '',
          lastname: userData.lastname || '',
          email: userData.email || '',
          company: userData.company || '',
          phone: userData.phone || '',
          mobile: userData.mobile || '',
          address: userData.address || '',
          city: userData.city || '',
          state: userData.state || '',
          country: userData.country || '',
          credits: parseFloat(userData.credits) || 0,
          expiry: data.expiry || '',
          dlbytes: data.dlbytes || 0,
          ulbytes: data.ulbytes || 0,
          totalbytes: data.totalbytes || 0,
          onlinetime: data.onlinetime || 0,
        };
      } else {
        // Error response
        return { code: 1, str: userData || 'Unknown error from RADIUS API' };
      }
    }
    
    console.error('Frontend: Invalid response format - not an object:', data);
    return { code: 1, str: 'Invalid response format' };
  } catch (error) {
    console.error('Frontend: Error fetching user data:', error);
    return { code: 1, str: 'Network error occurred' };
  }
};

const getServicePlan = async (srvid: number): Promise<ServicePlan> => {
  try {
    console.log('Frontend: Making service plan API call for srvid:', srvid);
    
    const response = await fetch('/api/service', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ srvid }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Frontend: Service API response data:', data);
    
    // Handle server error responses
    if (data.error) {
      return { code: 1, str: data.error };
    }
    
    // Parse RADIUS Manager response for service plans
    // Response format: [0, [{"srvid":"33","srvname":"30 Days Unlimited Internet",...}]]
    if (Array.isArray(data) && data.length >= 2) {
      console.log('Frontend: Parsing service plan response array');
      
      const resultCode = data[0];
      const serviceDataArray = data[1];
      
      if (resultCode === 0 && Array.isArray(serviceDataArray) && serviceDataArray.length > 0) {
        // Success response - extract service plan data from nested array
        const serviceData = serviceDataArray[0];
        console.log('Frontend: Extracted service plan data:', serviceData);
        
        return {
          code: 0,
          srvid: parseInt(serviceData.srvid) || srvid,
          srvname: serviceData.srvname || serviceData.descr || 'Unknown Plan',
          downrate: parseInt(serviceData.downrate) || 0,
          uprate: parseInt(serviceData.uprate) || 0,
          limitdl: parseInt(serviceData.limitdl) || 0,
          limitul: parseInt(serviceData.limitul) || 0,
          limitcomb: parseInt(serviceData.limitcomb) || 0,
          limitexpiration: parseInt(serviceData.limitexpiration) || 0,
          poolname: serviceData.poolname || '',
          unitprice: parseFloat(serviceData.unitprice) || 0,
          unitpriceadd: parseFloat(serviceData.unitpriceadd) || 0,
          unitpricetax: parseFloat(serviceData.unitpricetax) || 0,
          unitpriceaddtax: parseFloat(serviceData.unitpriceaddtax) || 0,
          totalPrice: (parseFloat(serviceData.unitprice) || 0) + (parseFloat(serviceData.unitpricetax) || 0),
          timeunitexp: parseInt(serviceData.timeunitexp) || 0,
          trafficunitdl: parseInt(serviceData.trafficunitdl) || 0,
          trafficunitul: parseInt(serviceData.trafficunitul) || 0,
          trafficunitcomb: parseInt(serviceData.trafficunitcomb) || 0,
        };
      } else {
        // Error response
        return { code: 1, str: serviceDataArray || 'Unknown error from RADIUS API' };
      }
    }
    
    return { code: 1, str: 'Invalid service plan response format' };
  } catch (error) {
    console.error('Error fetching service plan:', error);
    return { code: 1, str: 'Network error occurred' };
  }
};

// Helper functions
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
  return parseFloat((Math.abs(bytes) / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// New function to handle usage data (negative = used, positive = remaining)
const formatUsageData = (bytes: number): { used: string; remaining: string; isNegative: boolean } => {
  if (bytes === 0) {
    return { used: '0 Bytes', remaining: '0 Bytes', isNegative: false };
  }
  
  const isNegative = bytes < 0;
  const absBytes = Math.abs(bytes);
  const formatted = formatBytes(absBytes);
  
  if (isNegative) {
    // Negative value = data used
    return { used: formatted, remaining: '0 Bytes', isNegative: true };
  } else {
    // Positive value = data remaining
    return { used: '0 Bytes', remaining: formatted, isNegative: false };
  }
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (dateString: string): string => {
  if (!dateString || dateString === '0000-00-00' || dateString === '0000-00-00 00:00:00') {
    return 'Not set';
  }
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateString;
  }
};

const formatPhoneNumber = (phone: string): string => {
  if (!phone) return 'N/A';
  
  // Format Nigerian phone numbers
  if (phone.startsWith('234') && phone.length === 13) {
    return `+${phone.slice(0, 3)} ${phone.slice(3, 6)} ${phone.slice(6, 9)} ${phone.slice(9)}`;
  }
  
  return phone;
};

const calculateDaysToExpiry = (expiryDate: string): number | null => {
  if (!expiryDate || expiryDate === '0000-00-00' || expiryDate === '0000-00-00 00:00:00') {
    return null;
  }
  
  try {
    const expiry = new Date(expiryDate);
    const now = new Date();
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  } catch {
    return null;
  }
};

// Account status helper function
const getAccountStatus = (userData: UserData): {
  status: 'ACTIVE' | 'EXPIRED' | 'INACTIVE';
  color: string;
  bgColor: string;
  borderColor: string;
} => {
  const isUserEnabled = userData.enableuser === 1;
  const expiryDate = userData.expiry;
  
  // Check if expiry date is valid and parse it
  let isExpired = false;
  if (expiryDate && expiryDate !== '0000-00-00' && expiryDate !== '0000-00-00 00:00:00') {
    try {
      const expiry = new Date(expiryDate);
      const now = new Date();
      isExpired = expiry < now;
    } catch {
      // If date parsing fails, assume not expired
      isExpired = false;
    }
  }
  
  // Determine status based on both flags
  if (!isUserEnabled) {
    return {
      status: 'INACTIVE',
      color: 'text-gray-400',
      bgColor: 'bg-gray-500/20',
      borderColor: 'border-gray-500/30'
    };
  } else if (isExpired) {
    return {
      status: 'EXPIRED',
      color: 'text-red-400',
      bgColor: 'bg-red-500/20',
      borderColor: 'border-red-500/30'
    };
  } else {
    return {
      status: 'ACTIVE',
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
      borderColor: 'border-green-500/30'
    };
  }
};

// AnimatedGroup Component
type AnimatedGroupProps = {
  children: React.ReactNode;
  className?: string;
  variants?: {
    container?: Variants;
    item?: Variants;
  };
};

const defaultContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const defaultItemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: 'spring',
      bounce: 0.3,
      duration: 0.8,
    }
  },
};

function AnimatedGroup({
  children,
  className,
  variants,
}: AnimatedGroupProps) {
  const containerVariants = variants?.container || defaultContainerVariants;
  const itemVariants = variants?.item || defaultItemVariants;

  return (
    <motion.div
      initial='hidden'
      animate='visible'
      variants={containerVariants}
      className={cn(className)}
    >
      {React.Children.map(children, (child, index) => (
        <motion.div key={index} variants={itemVariants}>
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}

// User Details Display Component
interface UserDetailsProps {
  userData: UserData;
  servicePlan: ServicePlan;
  availablePlans: ServicePlan[];
  onPaymentSuccess: (reference: PaystackReference) => void;
  onPaymentClose: () => void;
  paystackConfig: PaystackConfig | null;
  isProcessingPayment: boolean;
  originalUsername: string;
  onPlanChangeSuccess: (newPlanId?: string) => void;
}

// Client-side payment button component
const PaymentButton: React.FC<{
  paystackConfig: PaystackConfig | null;
  onPaymentSuccess: (reference: PaystackReference) => void;
  onPaymentClose: () => void;
  isProcessingPayment: boolean;
  servicePlan: ServicePlan;
}> = ({ paystackConfig, onPaymentSuccess, onPaymentClose, isProcessingPayment, servicePlan }) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted || !paystackConfig) {
    return (
      <Button 
        disabled={true}
        className="h-16 px-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all transform hover:scale-105 shadow-lg hover:shadow-blue-500/25 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span>Loading Payment...</span>
      </Button>
    );
  }

  const componentProps = {
    ...paystackConfig,
    text: `Pay ${formatCurrency(servicePlan.totalPrice || 0)} - Renew Plan`,
    onSuccess: onPaymentSuccess,
    onClose: onPaymentClose,
    className: "h-16 px-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all transform hover:scale-105 shadow-lg hover:shadow-blue-500/25 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
  };

  if (isProcessingPayment) {
    return (
      <Button disabled={true} className={componentProps.className}>
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent mr-3"></div>
        Processing Payment...
      </Button>
    );
  }

  return <PaystackButton {...componentProps} />;
};

const UserDetails: React.FC<UserDetailsProps> = ({ 
  userData, 
  servicePlan, 
  availablePlans,
  onPaymentSuccess, 
  onPaymentClose,
  paystackConfig,
  isProcessingPayment,
  originalUsername,
  onPlanChangeSuccess
}) => {
  const accountStatus = getAccountStatus(userData);
  const daysToExpiry = calculateDaysToExpiry(userData.expiry || '');
  
  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        {/* Account Status Card */}
        <Card className="border-gray-700/50 bg-gray-900/80 backdrop-blur-sm shadow-2xl hover:shadow-blue-500/10 transition-all duration-300">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-blue-500/20 p-3 text-blue-400 ring-1 ring-blue-500/30">
                <Calendar className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold text-gray-100">Account Status</h3>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 px-3 rounded-lg bg-gray-800/50 border border-gray-700/30">
                <span className="text-gray-400 font-medium text-sm">Status</span>
                <span className={`font-bold px-3 py-1.5 rounded-lg text-xs uppercase tracking-wider ${accountStatus.color} ${accountStatus.bgColor} border ${accountStatus.borderColor}`}>
                  {accountStatus.status}
                </span>
              </div>
              
              <div className="flex justify-between items-center py-2 px-3 rounded-lg bg-gray-800/50 border border-gray-700/30">
                <span className="text-gray-400 font-medium text-sm">Username</span>
                <span className="text-gray-100 font-bold text-lg">
                  {originalUsername || 'N/A'}
                </span>
              </div>
              
              <div className="flex justify-between items-center py-2 px-3 rounded-lg bg-gray-800/50 border border-gray-700/30">
                <span className="text-gray-400 font-medium text-sm">Expiry Date</span>
                <span className={`font-semibold text-right text-sm ${accountStatus.status === 'EXPIRED' ? 'text-red-400' : 'text-green-400'}`}>
                  {formatDate(userData.expiry || '')}
                </span>
              </div>

              {daysToExpiry !== null && (
                <div className="flex justify-between items-center py-2 px-3 rounded-lg bg-gray-800/50 border border-gray-700/30">
                  <span className="text-gray-400 font-medium text-sm">Days to Expiry</span>
                  <span className={`font-bold text-lg ${
                    daysToExpiry <= 0 ? 'text-red-400' : 
                    daysToExpiry <= 7 ? 'text-yellow-400' : 
                    'text-green-400'
                  }`}>
                    {daysToExpiry <= 0 ? 'Expired' : `${daysToExpiry} days`}
                  </span>
                </div>
              )}
            </div>

            {/* Payment and Plan Change Buttons */}
            <div className="pt-4 space-y-3 border-t border-gray-700/30">
              {/* Show Change Plan button for all account types */}
              <ChangePlanButton
                currentPlan={servicePlan}
                accountStatus={accountStatus.status}
                availablePlans={availablePlans}
                username={originalUsername}
                onPlanChangeSuccess={onPlanChangeSuccess}
                isLoading={isProcessingPayment}
              />
              
              <PaymentButton
                paystackConfig={paystackConfig}
                onPaymentSuccess={onPaymentSuccess}
                onPaymentClose={onPaymentClose}
                isProcessingPayment={isProcessingPayment}
                servicePlan={servicePlan}
              />
              
              <p className="text-gray-400 text-xs text-center leading-relaxed">
                Secure payment powered by Paystack<br />
                Renew <span className="text-blue-400 font-medium">{servicePlan.srvname || 'your plan'}</span> for {servicePlan.timeunitexp || 30} days
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Current Plan Card */}
        <Card className="border-gray-700/50 bg-gray-900/80 backdrop-blur-sm shadow-2xl hover:shadow-green-500/10 transition-all duration-300">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-green-500/20 p-3 text-green-400 ring-1 ring-green-500/30">
                <Globe className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold text-gray-100">Current Plan</h3>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="text-center py-4 px-3 bg-gradient-to-r from-green-600/20 to-blue-600/20 rounded-xl border border-green-500/30 ring-1 ring-green-500/10">
                <span className="text-gray-400 text-xs block mb-2 uppercase tracking-wider font-medium">Plan Name</span>
                <span className="text-gray-100 font-bold text-lg leading-tight">
                  {servicePlan.srvname || 'Loading...'}
                </span>
              </div>
              
              <div className="text-center py-4 px-3 bg-gradient-to-r from-yellow-600/20 to-orange-600/20 rounded-xl border border-yellow-500/30 ring-1 ring-yellow-500/10">
                <span className="text-gray-400 text-xs block mb-2 uppercase tracking-wider font-medium">Monthly Price</span>
                <span className="text-yellow-400 font-bold text-2xl">
                  {formatCurrency(servicePlan.totalPrice || 0)}
                </span>
                {(servicePlan.unitpricetax && servicePlan.unitpricetax > 0) && (
                  <div className="text-xs text-gray-400 mt-2 space-x-1">
                    <span>Base: {formatCurrency(servicePlan.unitprice || 0)}</span>
                    <span>•</span>
                    <span>Tax: {formatCurrency(servicePlan.unitpricetax || 0)}</span>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {servicePlan.timeunitexp && (
                  <div className="text-center py-3 px-2 bg-blue-600/10 rounded-lg border border-blue-500/20">
                    <span className="text-gray-400 text-xs block mb-1 uppercase tracking-wider font-medium">Validity</span>
                    <span className="text-blue-300 font-bold text-sm">
                      {servicePlan.timeunitexp} days
                    </span>
                  </div>
                )}

                {servicePlan.poolname && (
                  <div className="text-center py-3 px-2 bg-purple-600/10 rounded-lg border border-purple-500/20">
                    <span className="text-gray-400 text-xs block mb-1 uppercase tracking-wider font-medium">IP Pool</span>
                    <span className="text-purple-300 font-bold text-sm truncate">
                      {servicePlan.poolname}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Details Card */}
        <Card className="border-gray-700/50 bg-gray-900/80 backdrop-blur-sm shadow-2xl hover:shadow-purple-500/10 transition-all duration-300">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-purple-500/20 p-3 text-purple-400 ring-1 ring-purple-500/30">
                <User className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold text-gray-100">Account Details</h3>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 px-3 rounded-lg bg-gray-800/50 border border-gray-700/30">
                <span className="text-gray-400 font-medium text-sm">Name</span>
                <span className="text-gray-100 font-semibold text-right text-sm">
                  {userData.firstname} {userData.lastname}
                </span>
              </div>
              
              <div className="flex justify-between items-center py-2 px-3 rounded-lg bg-gray-800/50 border border-gray-700/30">
                <span className="text-gray-400 font-medium text-sm">Email</span>
                <span className="text-gray-100 font-medium text-right text-sm break-all">
                  {userData.email || 'Not provided'}
                </span>
              </div>
              
              <div className="flex justify-between items-center py-2 px-3 rounded-lg bg-gray-800/50 border border-gray-700/30">
                <span className="text-gray-400 font-medium text-sm">Phone</span>
                <span className="text-gray-100 font-medium text-right text-sm">
                  {formatPhoneNumber(userData.phone || userData.mobile || '')}
                </span>
              </div>
              
              {(userData.address || userData.city || userData.state || userData.country) && (
                <div className="py-3 px-3 rounded-lg bg-gray-800/50 border border-gray-700/30">
                  <span className="text-gray-400 font-medium text-sm block mb-2">Address</span>
                  <span className="text-gray-100 font-medium text-sm leading-relaxed">
                    {[userData.address, userData.city, userData.state, userData.country]
                      .filter(Boolean)
                      .join(', ')}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Usage Details Card */}
        <Card className="border-gray-700/50 bg-gray-900/80 backdrop-blur-sm shadow-2xl hover:shadow-orange-500/10 transition-all duration-300">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-orange-500/20 p-3 text-orange-400 ring-1 ring-orange-500/30">
                <CreditCard className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold text-gray-100">Usage Details</h3>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {/* Download Usage - Only show if used > 0 */}
              {formatUsageData(userData.dlbytes || 0).isNegative && (
                <div className="flex justify-between items-center py-3 px-3 rounded-lg bg-gradient-to-r from-red-600/10 to-red-500/5 border border-red-500/20 ring-1 ring-red-500/10">
                  <span className="text-gray-400 font-medium text-sm">Download Used</span>
                  <span className="text-red-400 font-bold text-lg">
                    {formatUsageData(userData.dlbytes || 0).used}
                  </span>
                </div>
              )}
              
              {/* Upload Usage - Only show if used > 0 */}
              {formatUsageData(userData.ulbytes || 0).isNegative && (
                <div className="flex justify-between items-center py-3 px-3 rounded-lg bg-gradient-to-r from-pink-600/10 to-pink-500/5 border border-pink-500/20 ring-1 ring-pink-500/10">
                  <span className="text-gray-400 font-medium text-sm">Upload Used</span>
                  <span className="text-pink-400 font-bold text-lg">
                    {formatUsageData(userData.ulbytes || 0).used}
                  </span>
                </div>
              )}
              
              {/* Total Used - Show if either download or upload has been used */}
              {(formatUsageData(userData.dlbytes || 0).isNegative || formatUsageData(userData.ulbytes || 0).isNegative) && (
                <div className="flex justify-between items-center py-3 px-3 rounded-lg bg-gradient-to-r from-yellow-600/15 to-orange-600/10 border border-yellow-500/30 ring-1 ring-yellow-500/15">
                  <span className="text-gray-400 font-medium text-sm">Total Used</span>
                  <span className="text-yellow-400 font-bold text-lg">
                    {formatBytes(Math.abs(userData.dlbytes || 0) + Math.abs(userData.ulbytes || 0))}
                  </span>
                </div>
              )}
              
              {/* Total Remaining - Only show if remaining > 0 */}
              {!formatUsageData(userData.totalbytes || 0).isNegative && userData.totalbytes && userData.totalbytes > 0 && (
                <div className="flex justify-between items-center py-3 px-3 rounded-lg bg-gradient-to-r from-green-600/10 to-emerald-600/5 border border-green-500/20 ring-1 ring-green-500/10">
                  <span className="text-gray-400 font-medium text-sm">Total Remaining</span>
                  <span className="text-green-400 font-bold text-lg">
                    {formatUsageData(userData.totalbytes || 0).remaining}
                  </span>
                </div>
              )}
              
              {/* Online Time - Only show if > 0 */}
              {userData.onlinetime && userData.onlinetime > 0 && (
                <div className="flex justify-between items-center py-3 px-3 rounded-lg bg-gradient-to-r from-blue-600/10 to-cyan-600/5 border border-blue-500/20 ring-1 ring-blue-500/10">
                  <span className="text-gray-400 font-medium text-sm">Online Time Remaining</span>
                  <span className="text-blue-400 font-bold text-lg">
                    {Math.floor(userData.onlinetime / 3600)}h {Math.floor((userData.onlinetime % 3600) / 60)}m
                  </span>
                </div>
              )}
              
              {/* Show message if no usage data is available */}
              {!formatUsageData(userData.dlbytes || 0).isNegative && 
               !formatUsageData(userData.ulbytes || 0).isNegative && 
               (!userData.totalbytes || userData.totalbytes <= 0) && 
               (!userData.onlinetime || userData.onlinetime <= 0) && (
                <div className="text-center py-8 px-3 bg-gray-600/10 rounded-lg border border-gray-500/20">
                  <span className="text-gray-400 text-sm">No usage data available</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

// Navbar Component
const Navbar: React.FC<{ onHomeClick?: () => void }> = ({ onHomeClick }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const menuItems = [
    { name: 'Home', href: '/' },
    { name: 'Terms', href: '/terms' },
    { name: 'Privacy', href: '/privacy' },
    { name: 'Contact', href: '/contact' },
  ];

  const handleHomeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onHomeClick) {
      onHomeClick();
    }
  };

  return (
    <header>
      <nav
        data-state={isMenuOpen ? 'active' : 'inactive'}
        className={cn(
          "fixed z-50 w-full transition-all duration-300",
          isScrolled ? "bg-gray-900/90 backdrop-blur-lg border-b border-gray-700/50" : ""
        )}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <Link href="/" onClick={handleHomeClick} className="flex items-center space-x-2">
                <img 
                  src="/phsweblogo.png" 
                  alt="PHSWEB Internet" 
                  className="h-16 w-auto"
                />
              </Link>
            </div>

            <div className="hidden md:block">
              <div className="ml-10 flex items-center space-x-4">
                {menuItems.map((item, index) => (
                  item.name === 'Home' ? (
                    <Link
                      key={index}
                      href={item.href}
                      onClick={handleHomeClick}
                      className="text-gray-300 hover:text-blue-400 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      {item.name}
                    </Link>
                  ) : (
                    <Link
                      key={index}
                      href={item.href}
                      className="text-gray-300 hover:text-blue-400 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      {item.name}
                    </Link>
                  )
                ))}
              </div>
            </div>

            <div className="hidden md:block">
              <Link href="/login">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">Login</Button>
              </Link>
            </div>

            <div className="md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-gray-300"
              >
                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {isMenuOpen && (
          <div className="md:hidden bg-gray-900/95 backdrop-blur-lg border-t border-gray-700/50">
            <div className="space-y-1 px-2 pb-3 pt-2">
              {menuItems.map((item, index) => (
                item.name === 'Home' ? (
                  <Link
                    key={index}
                    href={item.href}
                    onClick={handleHomeClick}
                    className="text-gray-300 hover:text-blue-400 block px-3 py-2 rounded-md text-base font-medium"
                  >
                    {item.name}
                  </Link>
                ) : (
                  <Link
                    key={index}
                    href={item.href}
                    className="text-gray-300 hover:text-blue-400 block px-3 py-2 rounded-md text-base font-medium"
                  >
                    {item.name}
                  </Link>
                )
              ))}
              <div className="pt-4">
                <Link href="/login">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">Login</Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
};

// GradientBars Component
const GradientBars: React.FC = () => {
  const [numBars] = useState(15);

  const calculateHeight = (index: number, total: number) => {
    const position = index / (total - 1);
    const maxHeight = 100;
    const minHeight = 30;
    
    const center = 0.5;
    const distanceFromCenter = Math.abs(position - center);
    const heightPercentage = Math.pow(distanceFromCenter * 2, 1.2);
    
    return minHeight + (maxHeight - minHeight) * heightPercentage;
  };

  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      <div 
        className="flex h-full"
        style={{
          width: '100%',
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
          WebkitFontSmoothing: 'antialiased',
        }}
      >
        {Array.from({ length: numBars }).map((_, index) => {
          const height = calculateHeight(index, numBars);
          return (
            <div
              key={index}
              style={{
                flex: '1 0 calc(100% / 15)',
                maxWidth: 'calc(100% / 15)',
                height: '100%',
                background: 'linear-gradient(to top, rgba(59, 130, 246, 0.4), rgba(147, 51, 234, 0.2), transparent)',
                transform: `scaleY(${height / 100})`,
                transformOrigin: 'bottom',
                transition: 'transform 0.5s ease-in-out',
                animation: 'pulseBar 2s ease-in-out infinite alternate',
                animationDelay: `${index * 0.1}s`,
                outline: '1px solid rgba(0, 0, 0, 0)',
                boxSizing: 'border-box',
              }}
            />
          );
        })}
      </div>
    </div>
  );
};

// RenewalForm Component
interface RenewalFormProps {
  onSubmit: (accountName: string) => void;
  isLoading: boolean;
}

const RenewalForm: React.FC<RenewalFormProps> = ({ onSubmit, isLoading }) => {
  const [accountName, setAccountName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountName) return;
    onSubmit(accountName);
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="w-full">
        <div className="flex flex-col space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="Enter your account name or email"
              className="h-14 w-full rounded-xl border border-gray-600 bg-gray-800/80 backdrop-blur-sm pl-10 pr-4 text-gray-100 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              required
              disabled={isLoading}
            />
          </div>
          <Button 
            type="submit" 
            disabled={isLoading}
            className="h-14 w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all transform hover:scale-105 shadow-lg hover:shadow-blue-500/25"
          >
            {isLoading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            ) : (
              'View Account Details'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

// Main Landing Page Component
const ISPLandingPage: React.FC = () => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [servicePlan, setServicePlan] = useState<ServicePlan | null>(null);
  const [availablePlans, setAvailablePlans] = useState<ServicePlan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [originalUsername, setOriginalUsername] = useState<string>('');
  const [showAccountUpdated, setShowAccountUpdated] = useState(false);

  // Fetch available service plans with deduplication
  const fetchAvailablePlans = async () => {
    try {
      console.time('fetch-available-plans');
      
      const response = await fetch('/api/radius/service-plans');
      const data = await response.json();
      
      let rawPlans: ServicePlan[] = [];
      
      // Handle new API format: { success: true, plans: [...] }
      if (data && data.success && Array.isArray(data.plans)) {
        rawPlans = data.plans;
      } 
      // Fallback: Handle old API format: [0, [...]]
      else if (data && Array.isArray(data) && data.length >= 2 && data[0] === 0) {
        rawPlans = data[1];
      } else {
        console.error('❌ Unexpected API response format:', data);
        setAvailablePlans([]);
        return;
      }
      
      // Process and deduplicate plans
      const processedPlans = rawPlans.map((plan: ServicePlan) => ({
        ...plan,
        code: 0 // Success code for compatibility
      }));
      
      // Deduplicate plans by srvid to prevent duplicate keys
      const uniquePlans = processedPlans.filter((plan: ServicePlan, index: number, self: ServicePlan[]) => 
        index === self.findIndex((p: ServicePlan) => String(p.srvid) === String(plan.srvid))
      );
      
      console.log(`📋 Available plans: ${rawPlans.length} raw → ${processedPlans.length} processed → ${uniquePlans.length} unique`);
      
      setAvailablePlans(uniquePlans);
      console.timeEnd('fetch-available-plans');
      
    } catch (error) {
      console.error('❌ Failed to fetch available plans:', error);
      setAvailablePlans([]);
    }
  };

  // Paystack configuration
  const generatePaystackConfig = () => {
    if (!userData || !servicePlan) return null;

    return {
      reference: `PHS_${Date.now()}_${userData.firstname}_${userData.lastname}`.replace(/\s+/g, '_'),
      email: userData.email || `${userData.firstname?.toLowerCase()}.${userData.lastname?.toLowerCase()}@phsweb.com`,
      amount: Math.round((servicePlan.totalPrice || 0) * 100), // Convert to kobo
      publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || 'pk_test_your_public_key_here',
      metadata: {
        // Direct metadata properties for easier access in webhook
        username: originalUsername,
        srvid: servicePlan.srvid?.toString() || '',
        timeunitexp: servicePlan.timeunitexp || 30,
        trafficunitcomb: servicePlan.trafficunitcomb || 0,
        limitcomb: servicePlan.limitcomb || 0,
        // Custom fields for display/reference
        custom_fields: [
          {
            display_name: 'Service Plan',
            variable_name: 'service_plan',
            value: servicePlan.srvname || 'Unknown Plan'
          },
          {
            display_name: 'Username',
            variable_name: 'username',
            value: originalUsername
          },
          {
            display_name: 'Service Plan ID',
            variable_name: 'srvid',
            value: servicePlan.srvid?.toString() || '0'
          },
          {
            display_name: 'Validity Period',
            variable_name: 'timeunitexp',
            value: (servicePlan.timeunitexp || 30).toString()
          },
          {
            display_name: 'Traffic Allowance',
            variable_name: 'trafficunitcomb',
            value: (servicePlan.trafficunitcomb || 0).toString()
          },
          {
            display_name: 'Traffic Limit',
            variable_name: 'limitcomb',
            value: (servicePlan.limitcomb || 0).toString()
          }
        ]
      }
    };
  };

  const handleAccountLookup = async (accountName: string) => {
    setIsLoading(true);
    setError(null);
    setOriginalUsername(accountName);
    
    try {
      // Fetch user data and available plans in parallel
      const [userResult] = await Promise.all([
        getUserData(accountName),
        fetchAvailablePlans()
      ]);
      
      if (userResult.code === 0 && userResult.srvid) {
        // Fetch service plan details
        const serviceResult = await getServicePlan(userResult.srvid);
        
        if (serviceResult.code === 0) {
          setUserData(userResult);
          setServicePlan(serviceResult);
        } else {
          setError(serviceResult.str || 'Failed to fetch service plan details');
        }
      } else {
        setError(userResult.str || 'User not found or invalid account');
      }
    } catch (err) {
      console.error('Account lookup error:', err);
      setError('Failed to fetch account details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshAccountDataWithRetry = async (username: string, expectedPlanId?: string) => {
    let retries = 3;
    
    // Clear existing data first to prevent rendering conflicts
    console.log('🧹 Clearing existing data before refresh...');
    setError(null);
    
    while (retries > 0) {
      try {
        console.log(`🔄 Attempting to refresh user data for ${username} (Attempt ${4 - retries})...`);
        
        // Fetch fresh user data
        const refreshedUserResult = await getUserData(username);
        
        if (refreshedUserResult.code === 0 && refreshedUserResult.srvid) {
          console.log(`📊 User data retrieved - srvid: ${refreshedUserResult.srvid}`);
          
          // Validate plan change if expected plan ID is provided
          if (expectedPlanId && String(refreshedUserResult.srvid) !== String(expectedPlanId)) {
            console.warn(`⚠️ Plan ID mismatch - Expected: ${expectedPlanId}, Got: ${refreshedUserResult.srvid}`);
            retries--;
            if (retries === 0) {
              throw new Error(`Plan change not reflected in user data. Expected plan ${expectedPlanId}, but user still shows plan ${refreshedUserResult.srvid}`);
            }
            await new Promise(resolve => setTimeout(resolve, 1500)); // Longer wait for plan changes
            continue;
          }
          
          // Update user data
          setUserData(refreshedUserResult);
          console.log('✅ User data updated successfully');
          
          // Fetch and update service plan details
          try {
            console.log(`🔄 Fetching service plan details for srvid: ${refreshedUserResult.srvid}`);
            const refreshedServiceResult = await getServicePlan(refreshedUserResult.srvid);
            
            if (refreshedServiceResult.code === 0) {
              setServicePlan(refreshedServiceResult);
              console.log(`✅ Service plan updated to: ${refreshedServiceResult.srvname}`);
            } else {
              console.error('❌ Failed to fetch updated service plan:', refreshedServiceResult.str);
              // Don't fail the whole process if service plan fetch fails
            }
          } catch (servicePlanError) {
            console.error('❌ Error fetching service plan:', servicePlanError);
            // Don't fail the whole process if service plan fetch fails
          }
          
          // Refresh available plans as well with defensive clearing
          try {
            console.log('🔄 Refreshing available plans...');
            setAvailablePlans([]); // Clear first to prevent duplicate key issues
            await fetchAvailablePlans();
            console.log('✅ Available plans refreshed');
          } catch (plansError) {
            console.error('❌ Error refreshing available plans:', plansError);
            // Don't fail the whole process if plans refresh fails
          }
          
          break; // Exit retry loop on success
          
        } else {
          console.warn(`❌ Failed to refresh user data (Attempt ${4 - retries}): ${refreshedUserResult.str}`);
          retries--;
          if (retries === 0) {
            throw new Error(`Failed to refresh user data after multiple retries: ${refreshedUserResult.str}`);
          }
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
      } catch (refreshError) {
        console.error(`❌ Error refreshing user data (Attempt ${4 - retries}):`, refreshError);
        retries--;
        if (retries === 0) {
          throw refreshError;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  };

  const handlePlanChangeSuccess = async (newPlanId?: string) => {
    console.log('🔄 Plan change successful! Starting data refresh...');
    console.log('📋 Expected new plan ID:', newPlanId);
    
    // Clear any existing error state
    setError(null);
    
    if (!originalUsername) {
      console.error('❌ No username available for refresh');
      return;
    }

    try {
      // Add a delay to ensure DMA Radius Manager has processed the change
      console.log('⏳ Waiting for DMA Radius Manager to process changes...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Show loading state during refresh
      setIsLoading(true);
      
      // Refresh account data with retry logic and plan validation
      await refreshAccountDataWithRetry(originalUsername, newPlanId);
      
      // Show success indicator
      setShowAccountUpdated(true);
      setTimeout(() => setShowAccountUpdated(false), 5000);
      
    } catch (error) {
      console.error('❌ Failed to refresh account data after plan change:', error);
      setError('Plan changed successfully, but failed to refresh display. Please search again to see updated information.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentSuccess = async (reference: PaystackReference) => {
    console.log('Payment successful:', reference);
    setIsProcessingPayment(true);

    try {
      // Call renewal API to process the subscription renewal
      const renewalResponse = await fetch('/api/renew', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reference: reference.reference,
          username: originalUsername,
          srvid: servicePlan?.srvid,
          timeunitexp: servicePlan?.timeunitexp || 30,
          trafficunitcomb: servicePlan?.trafficunitcomb || 0,
          limitcomb: servicePlan?.limitcomb || 0,
          currentExpiry: userData?.expiry
        }),
      });

      const renewalResult = await renewalResponse.json();

      if (renewalResult.success) {
        // Instead of showing success message, refresh the account data
        // so user can see updated expiry date and account status immediately
        console.log('Renewal successful, refreshing account data...');
        
        try {
          // Fetch fresh user data to show updated information
          const refreshedUserResult = await getUserData(originalUsername);
          
          if (refreshedUserResult.code === 0 && refreshedUserResult.srvid) {
            // Update user data with fresh information from server
            setUserData(refreshedUserResult);
            
            // Also refresh service plan data if needed
            const refreshedServiceResult = await getServicePlan(refreshedUserResult.srvid);
            if (refreshedServiceResult.code === 0) {
              setServicePlan(refreshedServiceResult);
            }
            
            console.log('Account data refreshed successfully');
            
            // Show brief success indicator
            setShowAccountUpdated(true);
            setTimeout(() => setShowAccountUpdated(false), 3000);
            
          } else {
            console.error('Failed to refresh user data:', refreshedUserResult.str);
            // Fall back to using the renewal result data
            if (userData) {
              setUserData({
                ...userData,
                expiry: renewalResult.newExpiry
              });
            }
          }
          
        } catch (refreshError) {
          console.error('Error refreshing account data:', refreshError);
          // Fall back to using the renewal result data
          if (userData) {
            setUserData({
              ...userData,
              expiry: renewalResult.newExpiry
            });
          }
        }
        
        // Show brief success indicator for all success cases
        setShowAccountUpdated(true);
        setTimeout(() => setShowAccountUpdated(false), 3000);
        
      } else {
        setError(renewalResult.error || 'Failed to process renewal');
      }
    } catch (err) {
      console.error('Renewal processing error:', err);
      setError('Failed to process renewal. Please contact support.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handlePaymentClose = () => {
    console.log('Payment dialog closed');
    setIsProcessingPayment(false);
  };

  const resetForm = () => {
    setUserData(null);
    setServicePlan(null);
    setError(null);
    setOriginalUsername('');
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <style jsx global>{`
        @keyframes pulseBar {
          0% {
            transform: scaleY(var(--scale-y, 1)) scaleX(0.95);
          }
          100% {
            transform: scaleY(var(--scale-y, 1)) scaleX(1);
          }
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }
      `}</style>
      
      {/* Dark overlay for extra depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-900/20 via-purple-900/10 to-gray-900/30"></div>
      <GradientBars />
      
      <Navbar onHomeClick={resetForm} />
      
      <main className="relative z-10">
        {/* Hero Section */}
        <section className="relative pt-24 pb-20 md:pt-40 md:pb-32">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
              <AnimatedGroup>
                <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl mb-6">
                  <span className="block text-white mb-2">Renew Your</span>
                  <span className="block bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                    Internet Subscription
                  </span>
                </h1>
                
                <div className="mt-12 w-full max-w-6xl">
                  {userData && servicePlan ? (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-bold text-white">Account Information</h2>
                        <div className="flex gap-2">
                          <Button 
                            onClick={() => refreshAccountDataWithRetry(originalUsername)}
                            disabled={isLoading}
                            className="bg-purple-600/80 hover:bg-purple-700/80 text-gray-100 hover:text-white border border-purple-500/50 hover:border-purple-400 px-4 py-2 rounded-lg font-semibold text-sm shadow-lg backdrop-blur-sm transition-all duration-200 transform hover:scale-105 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isLoading ? (
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2"></div>
                            ) : (
                              <RefreshCw className="mr-2 h-4 w-4" />
                            )}
                            Refresh
                          </Button>
                          <Button 
                            onClick={resetForm}
                            disabled={isLoading}
                            className="bg-gray-700/80 hover:bg-gray-600/80 text-gray-100 hover:text-white border border-gray-500/50 hover:border-gray-400 px-4 py-2 rounded-lg font-semibold text-sm shadow-lg backdrop-blur-sm transition-all duration-200 transform hover:scale-105 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Search className="mr-2 h-4 w-4" />
                            Search Another Account
                          </Button>
                        </div>
                      </div>
                      
                      {/* Account Updated Success Indicator */}
                      {showAccountUpdated && (
                        <div className="rounded-xl bg-gradient-to-r from-green-600/90 to-emerald-600/90 backdrop-blur-sm p-4 text-white animate-fadeIn shadow-xl border border-green-500/30">
                          <p className="font-semibold text-center">✓ Account Updated Successfully!</p>
                          <p className="text-green-100 text-sm text-center mt-1">Your subscription has been renewed and account information refreshed.</p>
                        </div>
                      )}
                      
                      <UserDetails 
                        userData={userData} 
                        servicePlan={servicePlan} 
                        availablePlans={availablePlans}
                        onPaymentSuccess={handlePaymentSuccess}
                        onPaymentClose={handlePaymentClose}
                        paystackConfig={generatePaystackConfig()}
                        isProcessingPayment={isProcessingPayment}
                        originalUsername={originalUsername}
                        onPlanChangeSuccess={handlePlanChangeSuccess}
                      />
                    </div>
                  ) : (
                    <div className="max-w-lg mx-auto space-y-6">
                      <RenewalForm onSubmit={handleAccountLookup} isLoading={isLoading} />
                      
                      <p className="max-w-3xl text-xl sm:text-2xl text-gray-300 leading-relaxed text-center">
                        Stay connected with our premium internet services. Renew your subscription today for uninterrupted access to high-speed internet.
                      </p>
                      
                      {error && (
                        <div className="mt-4 rounded-xl bg-red-600/90 backdrop-blur-sm p-4 text-white shadow-2xl border border-red-500/30">
                          <p className="text-center">{error}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </AnimatedGroup>
            </div>
          </div>
        </section>
      </main>
      
      {/* Footer */}
      <footer className="bg-gray-900/80 backdrop-blur-sm border-t border-gray-700/50 py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between md:flex-row max-w-6xl mx-auto">
            <div className="mb-8 md:mb-0 text-center md:text-left">
              <span className="text-blue-400 font-bold text-xl">PHSWEB Internet</span>
              <p className="mt-3 text-gray-400 text-justify max-w-xs">
                Providing reliable internet services since 2022
              </p>
            </div>
            <div className="flex space-x-8">
              <Link href="/terms" className="text-gray-400 hover:text-blue-400 transition-colors">
                Terms
              </Link>
              <Link href="/privacy" className="text-gray-400 hover:text-blue-400 transition-colors">
                Privacy
              </Link>
              <Link href="/contact" className="text-gray-400 hover:text-blue-400 transition-colors">
                Contact
              </Link>
            </div>
          </div>
          <div className="mt-12 border-t border-gray-700/50 pt-8 text-center text-gray-400">
            &copy; {new Date().getFullYear()} PHSWEB Internet. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ISPLandingPage;

