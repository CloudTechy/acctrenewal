'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Calendar, CreditCard, Globe, User } from 'lucide-react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';

// Dynamically import Paystack to avoid SSR issues
const PaystackButton = dynamic(
  () => import('react-paystack').then(mod => mod.PaystackButton),
  { ssr: false }
);

// Types for API responses
interface UserData {
  code: number;
  enableuser?: number;
  srvid?: number;
  firstname?: string;
  lastname?: string;
  email?: string;
  company?: string;
  phone?: string;
  mobile?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  credits?: number;
  expiry?: string;
  dlbytes?: number;
  ulbytes?: number;
  totalbytes?: number;
  onlinetime?: number;
  str?: string;
}

interface ServicePlan {
  code: number;
  srvid?: number;
  srvname?: string;
  downrate?: number;
  uprate?: number;
  unitprice?: number;
  unitpriceadd?: number;
  unitpricetax?: number;
  unitpriceaddtax?: number;
  totalPrice?: number; // Calculated total price
  timeunitexp?: number;
  trafficunitdl?: number;
  trafficunitul?: number;
  trafficunitcomb?: number;
  limitdl?: number;
  limitul?: number;
  limitcomb?: number;
  limitexpiration?: number;
  poolname?: string;
  str?: string;
}

// Paystack types
interface PaystackConfig {
  reference: string;
  email: string;
  amount: number;
  publicKey: string;
  metadata?: {
    custom_fields: Array<{
      display_name: string;
      variable_name: string;
      value: string;
    }>;
  };
}

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
          totalPrice: (parseFloat(serviceData.unitprice) || 0) + 
                     (parseFloat(serviceData.unitpriceadd) || 0) + 
                     (parseFloat(serviceData.unitpricetax) || 0) + 
                     (parseFloat(serviceData.unitpriceaddtax) || 0),
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


// User Details Display Component
interface UserDetailsProps {
  userData: UserData;
  servicePlan: ServicePlan;
  onPaymentSuccess: (reference: PaystackReference) => void;
  onPaymentClose: () => void;
  paystackConfig: PaystackConfig | null;
  isProcessingPayment: boolean;
  originalUsername: string;
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
      <Button 
        disabled={true}
        className="h-16 px-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all transform hover:scale-105 shadow-lg hover:shadow-blue-500/25 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
          <span>Processing...</span>
        </div>
      </Button>
    );
  }

  return <PaystackButton {...componentProps} />;
};

const UserDetails: React.FC<UserDetailsProps> = ({ 
  userData, 
  servicePlan, 
  onPaymentSuccess, 
  onPaymentClose,
  paystackConfig,
  isProcessingPayment,
  originalUsername
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

            {/* Payment Button */}
            <div className="pt-4 space-y-3 border-t border-gray-700/30">
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
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
      <input
        type="text"
        value={accountName}
        onChange={(e) => setAccountName(e.target.value)}
        placeholder="Account name or email"
        className="flex-grow bg-white/10 text-white rounded-2xl px-6 py-4 outline-none border border-white/10 font-['Outfit'] transition-all focus:bg-white focus:text-[#2e2e2e] focus:ring-4 focus:ring-[#efab18]/20 placeholder:text-white/40"
        required
        disabled={isLoading}
      />
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        type="submit"
        disabled={isLoading}
        className="whitespace-nowrap bg-[#efab18] text-black rounded-2xl px-8 py-4 font-bold font-['Outfit'] shadow-[0_10px_30px_rgba(239,171,24,0.3)] hover:bg-[#ffba26] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
      >
        {isLoading ? (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-black border-t-transparent"></div>
        ) : (
          'View Details'
        )}
      </motion.button>
    </form>
  );
};

// Main Landing Page Component
const ISPLandingPage: React.FC = () => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [servicePlan, setServicePlan] = useState<ServicePlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [originalUsername, setOriginalUsername] = useState<string>('');
  const [showAccountUpdated, setShowAccountUpdated] = useState(false);

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
      // Fetch user data
      const userResult = await getUserData(accountName);
      
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
        setError(userResult.str || 'User account not found');
      }
    } catch (err) {
      console.error('API Error:', err);
      setError('An error occurred while fetching account details');
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
    <>
      <style jsx global>{`
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
      
      {/* Hero Section - Connekt-main design */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-4 pt-32 pb-16 overflow-hidden">
        {/* Decorative Blur Backgrounds */}
        <div className="absolute top-1/4 -left-20 w-64 h-64 bg-[#efab18] opacity-10 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute bottom-1/4 -right-20 w-64 h-64 bg-[#efab18] opacity-10 blur-[100px] rounded-full pointer-events-none" />

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex flex-col items-center gap-8 md:gap-12 w-full max-w-5xl"
        >
          {/* Avatars */}
          <div className="flex -space-x-3 items-center">
            {[
              "/assets/390c7306f2c93935729cecc6ffdd75f4cd164298.png",
              "/assets/c243849c271a30f13bcc8fb2aa85a7003566f6ad.png",
              "/assets/584c8acc10113a33d0172bf0b2ff0f78d06064eb.png",
              "/assets/8d77d6c350f61f0e7dc54d409639faa1dc364cd7.png",
              "/assets/eef663647d360bea89a9d3bd53968efd3ff16f42.png"
            ].map((avatar, idx) => (
              <motion.div
                key={idx}
                initial={{ scale: 0, x: -20 }}
                animate={{ scale: 1, x: 0 }}
                transition={{ delay: 0.3 + idx * 0.1, type: "spring", stiffness: 200 }}
                className="relative size-10 md:size-12 rounded-full border-2 border-[#efab18] overflow-hidden shadow-xl"
              >
                <Image
                  src={avatar}
                  alt={`User ${idx + 1}`}
                  fill
                  sizes="(min-width: 768px) 48px, 40px"
                  className="object-cover"
                />
              </motion.div>
            ))}
            <motion.div 
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.8 }}
              className="ml-4 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 text-[10px] md:text-xs font-medium"
            >
              10k+ Happy Users
            </motion.div>
          </div>

          {/* Content based on state */}
          {userData && servicePlan ? (
            <div className="w-full space-y-8">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h1 className="text-4xl md:text-5xl font-black font-['Outfit'] text-white">
                  Account Information
                </h1>
                <Button 
                  onClick={resetForm}
                  className="bg-white/10 hover:bg-white/20 text-white border border-white/20 hover:border-[#efab18] px-6 py-3 rounded-2xl font-semibold text-sm shadow-lg backdrop-blur-md transition-all duration-200 transform hover:scale-105"
                >
                  <Search className="mr-2 h-4 w-4" />
                  Search Another Account
                </Button>
              </div>
              
              {/* Account Updated Success Indicator */}
              {showAccountUpdated && (
                <div className="rounded-2xl bg-gradient-to-r from-green-600/90 to-emerald-600/90 backdrop-blur-sm p-4 text-white animate-fadeIn shadow-xl border border-green-500/30">
                  <p className="font-semibold text-center">✓ Account Updated Successfully!</p>
                  <p className="text-green-100 text-sm text-center mt-1">Your subscription has been renewed and account information refreshed.</p>
                </div>
              )}
              
              <UserDetails 
                userData={userData} 
                servicePlan={servicePlan} 
                onPaymentSuccess={handlePaymentSuccess}
                onPaymentClose={handlePaymentClose}
                paystackConfig={generatePaystackConfig()}
                isProcessingPayment={isProcessingPayment}
                originalUsername={originalUsername}
              />
            </div>
          ) : (
            <>
              {/* Heading */}
              <div className="flex flex-col gap-2">
                <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black leading-[1.1] font-['Outfit'] tracking-tight">
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-white font-normal text-[40px] md:text-[70px]">Renew Your</span>
                    <span className="bg-gradient-to-r from-[#ffba26] via-[#fffdfa] to-[#ffba26] bg-clip-text text-transparent font-normal text-[45px] md:text-[80px]">Internet Subscription</span>
                  </div>
                </h1>
              </div>

              {/* Form Container */}
              <div className="w-full max-w-lg mx-auto">
                <div className="flex flex-col gap-4 sm:gap-6 bg-white/5 backdrop-blur-md p-2 sm:p-3 rounded-[32px] border border-white/10 shadow-2xl">
                  <RenewalForm onSubmit={handleAccountLookup} isLoading={isLoading} />
                </div>
                
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                  className="mt-4 flex items-center justify-center gap-4 text-xs text-white/40"
                >
                  <span className="flex items-center gap-1">✓ Instant Activation</span>
                  <span className="flex items-center gap-1">✓ 24/7 Support</span>
                </motion.div>

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 rounded-2xl bg-red-600/90 backdrop-blur-sm p-4 text-white shadow-2xl border border-red-500/30"
                  >
                    <p className="text-center font-medium">{error}</p>
                  </motion.div>
                )}
              </div>

              {/* Description */}
              <p className="text-[#979797] text-sm md:text-lg max-w-2xl font-['Outfit'] leading-relaxed mx-auto px-4">
                Stay connected with our premium internet services. Experience ultra-fast speeds and zero downtime. Renew your subscription today for uninterrupted access.
              </p>
            </>
          )}
        </motion.div>
      </section>
    </>
  );
};

export default ISPLandingPage;

