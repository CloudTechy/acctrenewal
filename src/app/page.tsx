'use client';

import React, { useState, useEffect } from 'react';
import { motion, Variants } from 'framer-motion';
import { Search, Menu, X, User, Calendar, CreditCard, Globe } from 'lucide-react';
import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';
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
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
  onPaymentSuccess: (reference: PaystackReference) => void;
  onPaymentClose: () => void;
  paystackConfig: PaystackConfig | null;
  isProcessingPayment: boolean;
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
  isProcessingPayment 
}) => {
  const accountStatus = getAccountStatus(userData);
  
  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        {/* User Information Card */}
        <Card className="border-gray-700/50 bg-gray-900/70 backdrop-blur-sm shadow-2xl">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-500/20 p-3 text-blue-400">
                <User className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold text-gray-100">Account Details</h3>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 text-sm">
              <div className="flex justify-between items-center py-2 border-b border-gray-700/30">
                <span className="text-gray-400 font-medium">Name</span>
                <span className="text-gray-100 font-semibold text-right">
                  {userData.firstname} {userData.lastname}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-700/30">
                <span className="text-gray-400 font-medium">Email</span>
                <span className="text-gray-100 font-medium text-right break-all">
                  {userData.email || 'Not provided'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-700/30">
                <span className="text-gray-400 font-medium">Company</span>
                <span className="text-gray-100 font-medium text-right">
                  {userData.company || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-700/30">
                <span className="text-gray-400 font-medium">Phone</span>
                <span className="text-gray-100 font-medium text-right">
                  {formatPhoneNumber(userData.phone || userData.mobile || '')}
                </span>
              </div>
              {(userData.address || userData.city || userData.state || userData.country) && (
                <div className="py-2">
                  <span className="text-gray-400 font-medium block mb-1">Address</span>
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

        {/* Service Plan Card */}
        <Card className="border-gray-700/50 bg-gray-900/70 backdrop-blur-sm shadow-2xl">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-green-500/20 p-3 text-green-400">
                <Globe className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold text-gray-100">Current Plan</h3>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 text-sm">
              <div className="text-center py-3 bg-gradient-to-r from-green-600/20 to-blue-600/20 rounded-lg border border-green-500/30">
                <span className="text-gray-400 text-xs block mb-1">Plan Name</span>
                <span className="text-gray-100 font-bold text-lg">
                  {servicePlan.srvname || 'Loading...'}
                </span>
              </div>
              
              <div className="text-center py-3 bg-gradient-to-r from-yellow-600/20 to-orange-600/20 rounded-lg border border-yellow-500/30">
                <span className="text-gray-400 text-xs block mb-1">Monthly Price</span>
                <span className="text-yellow-400 font-bold text-xl">
                  {formatCurrency(servicePlan.totalPrice || 0)}
                </span>
                {(servicePlan.unitpricetax && servicePlan.unitpricetax > 0) && (
                  <div className="text-xs text-gray-400 mt-1">
                    Base: {formatCurrency(servicePlan.unitprice || 0)} + Tax: {formatCurrency(servicePlan.unitpricetax || 0)}
                  </div>
                )}
              </div>
              
              {servicePlan.timeunitexp && (
                <div className="text-center py-2 bg-blue-600/10 rounded-lg border border-blue-500/20">
                  <span className="text-gray-400 text-xs block mb-1">Validity Period</span>
                  <span className="text-blue-300 font-medium text-sm">
                    {servicePlan.timeunitexp} days
                  </span>
                </div>
              )}

              {servicePlan.poolname && (
                <div className="text-center py-2 bg-gray-600/10 rounded-lg border border-gray-500/20">
                  <span className="text-gray-400 text-xs block mb-1">IP Pool</span>
                  <span className="text-gray-300 font-medium text-sm">
                    {servicePlan.poolname}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Account Status Card */}
        <Card className="border-gray-700/50 bg-gray-900/70 backdrop-blur-sm shadow-2xl">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-yellow-500/20 p-3 text-yellow-400">
                <Calendar className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold text-gray-100">Account Status</h3>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center py-2 border-b border-gray-700/30">
                <span className="text-gray-400 font-medium">Status</span>
                <span className={`font-bold px-3 py-1 rounded-full text-xs ${accountStatus.color} ${accountStatus.bgColor} border ${accountStatus.borderColor}`}>
                  {accountStatus.status}
                </span>
              </div>
              
              <div className="flex justify-between items-center py-2 border-b border-gray-700/30">
                <span className="text-gray-400 font-medium">Credits</span>
                <span className="text-gray-100 font-bold">
                  {formatCurrency(userData.credits || 0)}
                </span>
              </div>
              
              <div className="py-2">
                <span className="text-gray-400 font-medium block mb-1">Expiry Date</span>
                <span className={`font-semibold ${accountStatus.status === 'EXPIRED' ? 'text-red-400' : 'text-green-400'}`}>
                  {formatDate(userData.expiry || '')}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Usage Information Card */}
        <Card className="border-gray-700/50 bg-gray-900/70 backdrop-blur-sm shadow-2xl">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-purple-500/20 p-3 text-purple-400">
                <CreditCard className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold text-gray-100">Usage Details</h3>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 text-sm">
              <div className="text-center p-3 bg-blue-600/10 rounded-lg border border-blue-500/20">
                <span className="text-gray-400 text-xs block mb-1">Download Remaining</span>
                <span className="text-blue-400 font-bold text-base">
                  {formatBytes(userData.dlbytes || 0)}
                </span>
              </div>
              
              <div className="text-center p-3 bg-purple-600/10 rounded-lg border border-purple-500/20">
                <span className="text-gray-400 text-xs block mb-1">Upload Remaining</span>
                <span className="text-purple-400 font-bold text-base">
                  {formatBytes(userData.ulbytes || 0)}
                </span>
              </div>
              
              <div className="text-center p-3 bg-green-600/10 rounded-lg border border-green-500/20">
                <span className="text-gray-400 text-xs block mb-1">Total Remaining</span>
                <span className="text-green-400 font-bold text-base">
                  {formatBytes(userData.totalbytes || 0)}
                </span>
              </div>
              
              {userData.onlinetime && userData.onlinetime > 0 && (
                <div className="text-center p-3 bg-orange-600/10 rounded-lg border border-orange-500/20">
                  <span className="text-gray-400 text-xs block mb-1">Online Time Remaining</span>
                  <span className="text-orange-400 font-bold text-base">
                    {Math.floor(userData.onlinetime / 3600)}h {Math.floor((userData.onlinetime % 3600) / 60)}m
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Renewal Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-center"
      >
        <PaymentButton
          paystackConfig={paystackConfig}
          onPaymentSuccess={onPaymentSuccess}
          onPaymentClose={onPaymentClose}
          isProcessingPayment={isProcessingPayment}
          servicePlan={servicePlan}
        />
        
        <p className="text-gray-400 text-sm mt-3">
          Secure payment powered by Paystack • Renew {servicePlan.srvname || 'your plan'} for {servicePlan.timeunitexp || 30} days
        </p>
      </motion.div>
    </div>
  );
};

// Navbar Component
const Navbar: React.FC = () => {
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
    { name: 'Home', href: '#' },
    { name: 'Plans', href: '#plans' },
    { name: 'Features', href: '#features' },
    { name: 'Support', href: '#support' },
  ];

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
              <a href="#" className="flex items-center space-x-2">
                <span className="text-blue-400 font-bold text-2xl">PHS Web ISP</span>
              </a>
            </div>

            <div className="hidden md:block">
              <div className="ml-10 flex items-center space-x-4">
                {menuItems.map((item, index) => (
                  <a
                    key={index}
                    href={item.href}
                    className="text-gray-300 hover:text-blue-400 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    {item.name}
                  </a>
                ))}
              </div>
            </div>

            <div className="hidden md:block">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">Login</Button>
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
                <a
                  key={index}
                  href={item.href}
                  className="text-gray-300 hover:text-blue-400 block px-3 py-2 rounded-md text-base font-medium"
                >
                  {item.name}
                </a>
              ))}
              <div className="pt-4">
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">Login</Button>
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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [renewalSuccess, setRenewalSuccess] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [originalUsername, setOriginalUsername] = useState<string>('');

  // Paystack configuration
  const generatePaystackConfig = () => {
    if (!userData || !servicePlan) return null;

    return {
      reference: `PHS_${Date.now()}_${userData.firstname}_${userData.lastname}`.replace(/\s+/g, '_'),
      email: userData.email || `${userData.firstname?.toLowerCase()}.${userData.lastname?.toLowerCase()}@phsweb.com`,
      amount: Math.round((servicePlan.totalPrice || 0) * 100), // Convert to kobo
      publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || 'pk_test_your_public_key_here',
      metadata: {
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
            display_name: 'Validity Period',
            variable_name: 'validity_days',
            value: `${servicePlan.timeunitexp || 0} days`
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
        }),
      });

      const renewalResult = await renewalResponse.json();

      if (renewalResult.success) {
        setRenewalSuccess(true);
        // Update user data with new expiry
        if (userData) {
          setUserData({
            ...userData,
            expiry: renewalResult.newExpiry
          });
        }
        
        setTimeout(() => {
          setRenewalSuccess(false);
          // Reset to initial state after showing success
          setUserData(null);
          setServicePlan(null);
          setOriginalUsername('');
        }, 5000);
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
      
      <Navbar />
      
      <main className="relative z-10">
        {/* Hero Section */}
        <section className="relative pt-24 pb-20 md:pt-40 md:pb-32">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
              <AnimatedGroup>
                <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl md:text-7xl mb-8">
                  <span className="block text-white mb-2">Renew Your</span>
                  <span className="block bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                    PHS Web ISP Subscription
                  </span>
                </h1>
                
                <p className="mt-8 max-w-3xl text-xl sm:text-2xl text-gray-300 leading-relaxed text-center">
                  Stay connected with our premium internet services. Renew your subscription today for uninterrupted access to high-speed internet.
                </p>
                
                <div className="mt-12 w-full max-w-6xl">
                  {renewalSuccess ? (
                    <div className="rounded-2xl bg-gradient-to-r from-green-600/90 to-emerald-600/90 backdrop-blur-sm p-6 text-white animate-fadeIn shadow-2xl border border-green-500/30 max-w-lg mx-auto">
                      <p className="font-semibold text-lg text-center">Renewal successful!</p>
                      <p className="text-green-100 mt-2 text-center">Your subscription has been renewed. Thank you for choosing PHS Web ISP.</p>
                    </div>
                  ) : userData && servicePlan ? (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-bold text-white">Account Information</h2>
                        <Button 
                          onClick={resetForm}
                          className="bg-gray-700/80 hover:bg-gray-600/80 text-gray-100 hover:text-white border border-gray-500/50 hover:border-gray-400 px-6 py-2 rounded-lg font-semibold text-sm shadow-lg backdrop-blur-sm transition-all duration-200 transform hover:scale-105 hover:shadow-xl"
                        >
                          <Search className="mr-2 h-4 w-4" />
                          Search Another Account
                        </Button>
                      </div>
                      <UserDetails 
                        userData={userData} 
                        servicePlan={servicePlan} 
                        onPaymentSuccess={handlePaymentSuccess}
                        onPaymentClose={handlePaymentClose}
                        paystackConfig={generatePaystackConfig()}
                        isProcessingPayment={isProcessingPayment}
                      />
                    </div>
                  ) : (
                    <div className="max-w-lg mx-auto">
                      <RenewalForm onSubmit={handleAccountLookup} isLoading={isLoading} />
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
              <span className="text-blue-400 font-bold text-2xl">PHS Web ISP</span>
              <p className="mt-3 text-gray-400 text-justify max-w-xs">
                Providing reliable internet services since 2010
              </p>
            </div>
            <div className="flex space-x-8">
              <a href="#" className="text-gray-400 hover:text-blue-400 transition-colors">
                Terms
              </a>
              <a href="#" className="text-gray-400 hover:text-blue-400 transition-colors">
                Privacy
              </a>
              <a href="#" className="text-gray-400 hover:text-blue-400 transition-colors">
                Contact
              </a>
            </div>
          </div>
          <div className="mt-12 border-t border-gray-700/50 pt-8 text-center text-gray-400">
            &copy; {new Date().getFullYear()} PHS Web ISP. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ISPLandingPage;

