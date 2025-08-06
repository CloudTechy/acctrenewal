'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Phone, 
  User, 
  CreditCard,
  ArrowLeft,
  ArrowRight,
  Check,
  AlertCircle,
  Loader2,
  Wifi,
  MapPin,
  MessageCircle,
  Copy,
  CheckCircle
} from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSearchParams } from 'next/navigation';
import { generateHotspotPassword } from '@/lib/password-utils';
import { generateWelcomeSMS, sendWelcomeSMS } from '@/lib/sms-utils';

interface ServicePlan {
  srvid: string;
  srvname: string;
  descr: string;
  downrate: string;
  uprate: string;
  limitdl: string;
  limituptime: string;
  unitprice: string;
  timebaseexp: string;
  timeunitexp: string;
  enableservice: string;
  unitpriceadd?: string; // Added for combined pricing
  unitpricetax?: string; // Added for combined pricing
  unitpriceaddtax?: string; // Added for combined pricing
}

interface LocationDetails {
  id: string;
  name: string;
  display_name: string;
  city?: string;
  state?: string;
  group_id?: number;
  default_owner_id?: string;
  registration_enabled?: boolean;
  show_pin_display?: boolean;
  owner?: {
    id: string;
    name: string;
    owner_username: string;
  };
}

interface RegistrationData {
  phone: string;
  firstName: string;
  lastName: string;
  email: string;
  address: string;
  city: string;
  state: string;
  serviceId: string;
  password: string;
  locationId: string;
  // NEW: Payment-related fields
  paymentReference?: string;
  selectedServicePlan?: ServicePlan;
  accountCreationFee?: number;
  servicePlanPrice?: number;
  totalAmount?: number;
}

const steps = [
  { id: 1, title: 'Phone Number', icon: Phone, description: 'Enter your phone number' },
  { id: 2, title: 'Personal Info', icon: User, description: 'Tell us about yourself' },
  { id: 3, title: 'Service Plan', icon: CreditCard, description: 'Choose your internet plan' },
  { id: 4, title: 'Confirmation', icon: Check, description: 'Review and confirm' }
];

function HotspotRegisterContent() {
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [servicePlans, setServicePlans] = useState<ServicePlan[]>([]);
  const [locationDetails, setLocationDetails] = useState<LocationDetails | null>(null);
  const [copied, setCopied] = useState(false);
  // NEW: Pricing and payment state
  const [pricingConfig, setPricingConfig] = useState<{
    enabled: boolean;
    price: number;
    description: string;
  } | null>(null);
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'selection' | 'payment' | 'verification'>('selection');
  const [registrationData, setRegistrationData] = useState<RegistrationData>({
    phone: '',
    firstName: '',
    lastName: '',
    email: '',
    address: '',
    city: '',
    state: '',
    serviceId: '',
    password: '',
    locationId: searchParams.get('location') || ''
  });

  // Check for payment reference in URL when component mounts
  useEffect(() => {
    const locationId = searchParams.get('location');
    const paymentReference = searchParams.get('payment_reference');
    
    if (locationId) {
      setRegistrationData(prev => ({ 
        ...prev, 
        locationId,
        paymentReference: paymentReference || undefined
      }));
      fetchLocationDetails(locationId);
    }

    // If returning from payment, set appropriate step
    if (paymentReference) {
      setPaymentStep('verification');
      // Auto-populate form if we have the data in sessionStorage
      const savedFormData = sessionStorage.getItem('registrationFormData');
      if (savedFormData) {
        try {
          const formData = JSON.parse(savedFormData);
          setRegistrationData(prev => ({ ...prev, ...formData, paymentReference }));
          setCurrentStep(3); // Go to service plan step to complete registration
        } catch (error) {
          console.error('Error parsing saved form data:', error);
        }
      }
    }
  }, [searchParams]);

  // Fetch location details when component mounts
  useEffect(() => {
    const locationId = searchParams.get('location');
    if (locationId) {
      setRegistrationData(prev => ({ ...prev, locationId }));
      fetchLocationDetails(locationId);
    }
  }, [searchParams]);

  // Fetch location details including owner information
  const fetchLocationDetails = async (locationId: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/locations/${locationId}`);
      const data = await response.json();
      
      if (data.success) {
        setLocationDetails(data.location);
        // NEW: Fetch pricing configuration
        fetchPricingConfiguration(locationId);
      } else {
        setError('Failed to load location details');
      }
    } catch (error) {
      console.error('Error fetching location details:', error);
      setError('Error loading location details');
    } finally {
      setIsLoading(false);
    }
  };

  // NEW: Fetch account creation pricing configuration
  const fetchPricingConfiguration = async (locationId: string) => {
    try {
      const response = await fetch(`/api/locations/${locationId}/pricing`);
      const data = await response.json();
      
      if (data.success && data.data) {
        setPricingConfig({
          enabled: data.data.enabled,
          price: data.data.price,
          description: data.data.description
        });
      } else {
        // If pricing API fails, assume pricing is disabled
        setPricingConfig({
          enabled: false,
          price: 0,
          description: 'Free account creation'
        });
      }
    } catch (error) {
      console.error('Error fetching pricing configuration:', error);
      // Fallback to disabled pricing
      setPricingConfig({
        enabled: false,
        price: 0,
        description: 'Free account creation'
      });
    }
  };

  // Generate random 4-digit password
  useEffect(() => {
    setRegistrationData(prev => ({ ...prev, password: generateHotspotPassword() }));
  }, []);

  // Fetch service plans when reaching step 3
  useEffect(() => {
    if (currentStep === 3 && servicePlans.length === 0) {
      fetchServicePlans();
    }
  }, [currentStep, servicePlans.length]);

  const fetchServicePlans = async () => {
    try {
      setIsLoading(true);
      
      // Use location-specific endpoint if we have a locationId
      const endpoint = registrationData.locationId 
        ? `/api/locations/${registrationData.locationId}/service-plans`
        : '/api/radius/service-plans'; // Fallback for backward compatibility
      
      console.log(`Fetching service plans from: ${endpoint}`);
      
      const response = await fetch(endpoint);
      const data = await response.json();
      
      if (data.success) {
        let enabledPlans;
        
        if (registrationData.locationId && data.metadata) {
          // Location-specific response - plans are already filtered and enabled
          enabledPlans = data.plans;
          
          console.log(
            `Location ${registrationData.locationId}: ` +
            `${data.metadata.filtering.filteredPlans} plans available ` +
            `(${data.metadata.filtering.configurationUsed} configuration)`
          );
        } else {
          // Global response - filter out disabled services
          enabledPlans = data.plans.filter((plan: ServicePlan) => plan.enableservice === "1");
          console.log(`Global plans: ${enabledPlans.length} enabled plans available`);
        }
        
        setServicePlans(enabledPlans);
        
        // Enhanced auto-selection with location awareness
        await handleLocationSpecificAutoSelection(enabledPlans, registrationData.locationId);
        
      } else {
        const errorMessage = registrationData.locationId 
          ? `Failed to load service plans for this location: ${data.error}`
          : 'Failed to load service plans';
        setError(errorMessage);
      }
    } catch (error) {
      console.error('Error fetching service plans:', error);
      const errorMessage = registrationData.locationId
        ? 'Error loading service plans for this location'
        : 'Error loading service plans';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Enhanced auto-selection with location awareness
  const handleLocationSpecificAutoSelection = async (plans: ServicePlan[], locationId?: string) => {
    if (plans.length === 0) return;
    
    try {
      // First priority: Location-specific default plan setting
      if (locationId) {
        const response = await fetch(`/api/locations/${locationId}/service-plans`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.metadata?.defaultPlan) {
            const defaultPlan = plans.find(plan => plan.srvid === data.metadata.defaultPlan);
            if (defaultPlan) {
              setRegistrationData(prev => ({ ...prev, serviceId: defaultPlan.srvid }));
              console.log(`Auto-selected location default plan: ${defaultPlan.srvname}`);
              return;
            }
          }
        }
      }
      
      // Second priority: "SOLUDO SOLUTION FREE WIFI" if available
      const solutionPlan = plans.find((plan: ServicePlan) => 
        plan.srvname === "SOLUDO SOLUTION FREE WIFI"
      );
      if (solutionPlan) {
        setRegistrationData(prev => ({ ...prev, serviceId: solutionPlan.srvid }));
        console.log(`Auto-selected SOLUDO plan: ${solutionPlan.srvname}`);
        return;
      }
      
      // Third priority: Free plan (price = 0)
      const freePlan = plans.find((plan: ServicePlan) => 
        parseFloat(plan.unitprice) === 0
      );
      if (freePlan) {
        setRegistrationData(prev => ({ ...prev, serviceId: freePlan.srvid }));
        console.log(`Auto-selected free plan: ${freePlan.srvname}`);
        return;
      }
      
      // Fourth priority: First available plan
      if (plans.length > 0) {
        setRegistrationData(prev => ({ ...prev, serviceId: plans[0].srvid }));
        console.log(`Auto-selected first plan: ${plans[0].srvname}`);
      }
      
    } catch (error) {
      console.error('Error in auto-selection:', error);
      
      // Fallback to first plan if there's an error
      if (plans.length > 0) {
        setRegistrationData(prev => ({ ...prev, serviceId: plans[0].srvid }));
      }
    }
  };

  const checkPhoneAvailability = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/radius/check-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: registrationData.phone })
      });
      
      const data = await response.json();
      
      if (data.code === 1 && data.message === 'User not found!') {
        // Phone number is available, proceed to next step
        setCurrentStep(2);
      } else {
        setError('This phone number is already registered. Please use a different number.');
      }
    } catch {
      setError('Error checking phone number availability');
    } finally {
      setIsLoading(false);
    }
  };

  const submitRegistration = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/radius/register-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: registrationData.phone,
          password: registrationData.password,
          firstname: registrationData.firstName,
          lastname: registrationData.lastName,
          email: registrationData.email,
          address: registrationData.address,
          city: registrationData.city,
          state: registrationData.state,
          phone: registrationData.phone,
          srvid: registrationData.serviceId,
          locationId: registrationData.locationId,
          paymentReference: registrationData.paymentReference
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Send welcome SMS after successful registration
        try {
          const welcomeMessage = generateWelcomeSMS({
            firstName: registrationData.firstName,
            phone: registrationData.phone,
            password: registrationData.password,
            locationName: locationDetails?.display_name
          });
          
          const smsResponse = await sendWelcomeSMS(registrationData.phone, welcomeMessage);
          const smsData = await smsResponse.json();
          
          if (!smsData.success) {
            console.error('SMS sending failed:', smsData.error);
            setError('Account created successfully, but SMS notification failed. Please save your credentials.');
          }
        } catch (smsError) {
          console.error('SMS error:', smsError);
          setError('Account created successfully, but SMS notification failed. Please save your credentials.');
        }
        
        setCurrentStep(4);
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch {
      setError('Error creating account');
    } finally {
      setIsLoading(false);
    }
  };

  // NEW: Initiate combined payment
  const initiatePayment = async () => {
    if (!registrationData.selectedServicePlan || !pricingConfig?.enabled) {
      setError('Invalid payment configuration');
      return;
    }

    try {
      setIsPaymentProcessing(true);
      setError(null);

      // Save form data to sessionStorage before redirect
      sessionStorage.setItem('registrationFormData', JSON.stringify({
        phone: registrationData.phone,
        firstName: registrationData.firstName,
        lastName: registrationData.lastName,
        email: registrationData.email,
        address: registrationData.address,
        city: registrationData.city,
        state: registrationData.state,
        serviceId: registrationData.serviceId,
        selectedServicePlan: registrationData.selectedServicePlan,
        servicePlanPrice: registrationData.servicePlanPrice,
        accountCreationFee: registrationData.accountCreationFee,
        totalAmount: registrationData.totalAmount
      }));

      const paymentData = {
        locationId: registrationData.locationId,
        userInfo: {
          firstName: registrationData.firstName,
          lastName: registrationData.lastName,
          email: registrationData.email,
          phone: registrationData.phone
        },
        servicePlanId: parseInt(registrationData.serviceId),
        action: 'initiate'
      };

      const response = await fetch('/api/account-creation/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData)
      });

      const data = await response.json();

      if (data.success) {
        // Redirect to Paystack payment page
        window.location.href = data.data.authorization_url;
      } else {
        setError(data.error || 'Failed to initiate payment');
        // Clear saved data on error
        sessionStorage.removeItem('registrationFormData');
      }
    } catch (error) {
      console.error('Payment initiation error:', error);
      setError('Error initiating payment');
      sessionStorage.removeItem('registrationFormData');
    } finally {
      setIsPaymentProcessing(false);
    }
  };

  const handleNext = () => {
    setError(null);
    
    if (currentStep === 1) {
      if (!registrationData.phone) {
        setError('Please enter your phone number');
        return;
      }
      checkPhoneAvailability();
    } else if (currentStep === 2) {
      if (!registrationData.firstName || !registrationData.lastName || !registrationData.email) {
        setError('Please fill in all required fields');
        return;
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      if (!registrationData.serviceId) {
        setError('Please select a service plan');
        return;
      }
      
      // NEW: Check if payment is required
      if (pricingConfig?.enabled) {
        // Initiate payment process
        setPaymentStep('payment');
        initiatePayment();
      } else {
        // Proceed with free registration
        submitRegistration();
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setError(null);
    }
  };

  const formatCurrency = (amount: string) => {
    const num = parseFloat(amount);
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(num);
  };

  // Copy PIN to clipboard function
  const copyPinToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(registrationData.password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
    } catch (err) {
      console.error('Failed to copy PIN:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = registrationData.password;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (fallbackErr) {
        console.error('Fallback copy failed:', fallbackErr);
      }
      document.body.removeChild(textArea);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-2xl"
        >
          <Card className="backdrop-blur-sm bg-gray-800/90 border-gray-700/50 shadow-2xl">
            <CardHeader className="text-center pb-6">
              {/* Logo */}
              <div className="mx-auto mb-6">
                <Image
                  src="/phsweblogo.png"
                  alt="PHSWEB Logo"
                  width={60}
                  height={60}
                  className="mx-auto"
                />
              </div>

              {/* Location-specific branding */}
              {locationDetails && (
                <div className="mb-4">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-medium mb-3">
                    <MapPin className="h-4 w-4" />
                    {locationDetails.name}
                  </div>
                  <h1 className="text-3xl font-bold text-white mb-2">Create Account for {locationDetails.display_name}</h1>
                  <p className="text-gray-300">
                    Join our high-speed internet network
                    {locationDetails.city && locationDetails.state && ` in ${locationDetails.city}, ${locationDetails.state}`}
                  </p>
                </div>
              )}

              {/* Default header when no location */}
              {!locationDetails && (
                <>
                  <h1 className="text-3xl font-bold text-white mb-2">Create Hotspot Account</h1>
                  <p className="text-gray-300">Join our high-speed internet network</p>
                </>
              )}

              {/* Progress Steps */}
              <div className="flex items-center justify-center mt-8 mb-6">
                {steps.map((step, index) => (
                  <React.Fragment key={step.id}>
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                          currentStep >= step.id
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'border-gray-600 text-gray-400'
                        }`}
                      >
                        <step.icon className="h-5 w-5" />
                      </div>
                      <span className="text-xs text-gray-400 mt-2 hidden sm:block">
                        {step.title}
                      </span>
                    </div>
                    {index < steps.length - 1 && (
                      <div
                        className={`w-8 h-0.5 mx-2 transition-all duration-300 ${
                          currentStep > step.id ? 'bg-blue-600' : 'bg-gray-600'
                        }`}
                      />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              <AnimatePresence mode="wait">
                {/* Step 1: Phone Number */}
                {currentStep === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                  >
                    <div className="text-center">
                      <h2 className="text-xl font-semibold text-white mb-2">Enter Your Phone Number</h2>
                      <p className="text-gray-400">This will be your username for login and your 4-digit PIN would be sent to this number</p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="phone" className="text-gray-300">Phone Number</Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={registrationData.phone}
                          onChange={(e) => setRegistrationData(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="080XXXXXXXX"
                          className="h-12 bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-400 focus:border-blue-500"
                          autoFocus
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 2: Personal Information */}
                {currentStep === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                  >
                    <div className="text-center">
                      <h2 className="text-xl font-semibold text-white mb-2">Personal Information</h2>
                      <p className="text-gray-400">Tell us a bit about yourself</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstName" className="text-gray-300">First Name *</Label>
                        <Input
                          id="firstName"
                          value={registrationData.firstName}
                          onChange={(e) => setRegistrationData(prev => ({ ...prev, firstName: e.target.value }))}
                          placeholder="Enter First Name"
                          className="h-12 bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-400 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <Label htmlFor="lastName" className="text-gray-300">Last Name *</Label>
                        <Input
                          id="lastName"
                          value={registrationData.lastName}
                          onChange={(e) => setRegistrationData(prev => ({ ...prev, lastName: e.target.value }))}
                          placeholder="Enter Last Name"
                          className="h-12 bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-400 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="email" className="text-gray-300">Email Address *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={registrationData.email}
                        onChange={(e) => setRegistrationData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="Enter Email Address"
                        className="h-12 bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-400 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <Label htmlFor="address" className="text-gray-300">Address</Label>
                      <Input
                        id="address"
                        value={registrationData.address}
                        onChange={(e) => setRegistrationData(prev => ({ ...prev, address: e.target.value }))}
                        placeholder="Enter Address"
                        className="h-12 bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-400 focus:border-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="city" className="text-gray-300">City</Label>
                        <Input
                          id="city"
                          value={registrationData.city}
                          onChange={(e) => setRegistrationData(prev => ({ ...prev, city: e.target.value }))}
                          placeholder="Enter City"
                          className="h-12 bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-400 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <Label htmlFor="state" className="text-gray-300">State</Label>
                        <Input
                          id="state"
                          value={registrationData.state}
                          onChange={(e) => setRegistrationData(prev => ({ ...prev, state: e.target.value }))}
                          placeholder="Enter State"
                          className="h-12 bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-400 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 3: Service Plan Selection */}
                {currentStep === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                  >
                    <div className="text-center">
                      <h2 className="text-xl font-semibold text-white mb-2">Choose Your Plan</h2>
                      <p className="text-gray-400">Select the perfect internet plan for your needs</p>
                    </div>

                    {isLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                        <span className="ml-2 text-gray-400">Loading plans...</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                        {servicePlans.map((plan) => {
                          const planPrice = parseFloat(plan.unitprice) + parseFloat(plan.unitpriceadd || '0') + 
                                          parseFloat(plan.unitpricetax || '0') + parseFloat(plan.unitpriceaddtax || '0');
                          const totalCost = pricingConfig?.enabled ? pricingConfig.price + planPrice : planPrice;
                          
                          return (
                            <div
                              key={plan.srvid}
                              className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                                registrationData.serviceId === plan.srvid
                                  ? 'border-blue-500 bg-blue-500/10'
                                  : 'border-gray-600 bg-gray-700/30 hover:border-gray-500'
                              }`}
                              onClick={() => {
                                setRegistrationData(prev => ({ 
                                  ...prev, 
                                  serviceId: plan.srvid,
                                  selectedServicePlan: plan,
                                  servicePlanPrice: planPrice,
                                  accountCreationFee: pricingConfig?.enabled ? pricingConfig.price : 0,
                                  totalAmount: totalCost
                                }));
                              }}
                            >
                              <div className="flex items-center justify-between mb-3">
                                <h3 className="font-semibold text-white">{plan.srvname}</h3>
                                <div className={`w-4 h-4 rounded-full border-2 ${
                                  registrationData.serviceId === plan.srvid
                                    ? 'border-blue-500 bg-blue-500'
                                    : 'border-gray-500'
                                }`}>
                                  {registrationData.serviceId === plan.srvid && (
                                    <Check className="h-3 w-3 text-white" />
                                  )}
                                </div>
                              </div>
                              
                              <p className="text-gray-400 text-sm mb-3">{plan.descr}</p>
                              
                              <div className="space-y-2">
                                {/* Service Plan Price */}
                                <div className="flex justify-between items-center text-sm">
                                  <span className="text-gray-300">Service Plan:</span>
                                  <span className="text-white font-medium">
                                    {formatCurrency(planPrice.toString())}
                                  </span>
                                </div>
                                
                                {/* Account Creation Fee (if enabled) */}
                                {pricingConfig?.enabled && (
                                  <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-300">Account Setup:</span>
                                    <span className="text-white font-medium">
                                      {formatCurrency(pricingConfig.price.toString())}
                                    </span>
                                  </div>
                                )}
                                
                                {/* Total Cost */}
                                <div className="pt-2 mt-3 border-t border-gray-600">
                                  <div className="flex justify-between items-center">
                                    <span className="text-lg font-bold text-white">Total:</span>
                                    <span className="text-lg font-bold text-blue-400">
                                      {formatCurrency(totalCost.toString())}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Step 4: Confirmation */}
                {currentStep === 4 && (
                  <motion.div
                    key="step4"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6 text-center"
                  >
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-4">
                        <Check className="h-8 w-8 text-white" />
                      </div>
                      <h2 className="text-2xl font-semibold text-white mb-2">Account Created Successfully!</h2>
                      <p className="text-gray-400 mb-6">Your hotspot account has been created and is ready to use.</p>
                    </div>

                    {/* PIN Display Section */}
                    <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 rounded-lg p-6 border border-blue-500/30">
                      <h3 className="text-lg font-semibold text-white mb-3">Your Login Details</h3>
                      
                      <div className="space-y-4">
                        {/* Phone Number */}
                        <div className="text-left">
                          <label className="text-sm text-gray-300">Phone Number (Username):</label>
                          <div className="text-xl font-bold text-white">{registrationData.phone}</div>
                        </div>
                        
                        {/* PIN with Copy Button - only show if PIN display is enabled for this location */}
                        {locationDetails?.show_pin_display && (
                          <div className="text-left">
                            <label className="text-sm text-gray-300">Your 4-Digit PIN:</label>
                            <div className="flex items-center gap-3 mt-1">
                              <div className="text-3xl font-bold text-yellow-400 bg-gray-800/50 px-4 py-2 rounded-lg border border-yellow-400/30 tracking-wider">
                                {registrationData.password}
                              </div>
                              <Button
                                onClick={copyPinToClipboard}
                                variant="outline"
                                size="sm"
                                className="h-12 px-4 bg-gray-700/50 border-gray-600 text-gray-300 hover:bg-gray-600/50 transition-all duration-200"
                              >
                                {copied ? (
                                  <>
                                    <CheckCircle className="h-4 w-4 mr-2 text-green-400" />
                                    Copied!
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-4 w-4 mr-2" />
                                    Copy PIN
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-4 p-3 bg-yellow-900/20 rounded-lg border border-yellow-600/30">
                        <p className="text-sm text-yellow-200">
                          💡 <strong>Save these details!</strong> Use your phone number as username and this 4-digit PIN as password to connect.
                        </p>
                      </div>
                    </div>

                    <div className="bg-gray-700/50 rounded-lg p-6 space-y-4">
                      <div className="flex items-center justify-center gap-2 text-green-400 mb-3">
                        <MessageCircle className="h-5 w-5" />
                        <span className="font-medium">Welcome SMS Sent!</span>
                      </div>
                      <p className="text-gray-300 text-sm">
                        We&apos;ve also sent your WiFi login credentials to <strong>{registrationData.phone}</strong> via SMS as backup.
                      </p>
                      <p className="text-gray-400 text-xs">
                        The message includes your username, PIN, and a link to add credit to your account.
                      </p>
                    </div>

                    <div className="bg-blue-900/30 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-white mb-2">Next Steps:</h3>
                      <ul className="text-sm text-gray-300 space-y-2 text-left">
                        <li>• Go to Hotspot Portal</li>
                        <li>• Enter Phone Number and PIN</li>
                        <li>• Click connect and be connected</li>
                      </ul>
                    </div>

                    <div className="flex gap-4">
                      <Button
                        onClick={() => window.open('http://hotspot.phsweb.net/login', '_blank')}
                        className="flex-1 h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 transition-all duration-200"
                      >
                        <Wifi className="h-5 w-5 mr-2" />
                        Go to Hotspot Portal
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Error Display */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-3 bg-red-900/50 border border-red-700/50 rounded-lg flex items-start gap-2"
                >
                  <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-300">{error}</p>
                </motion.div>
              )}

              {/* Navigation Buttons */}
              {currentStep < 4 && (
                <div className="flex gap-4 pt-6">
                  <Button
                    onClick={handleBack}
                    variant="outline"
                    disabled={currentStep === 1}
                    className="flex-1 h-12 bg-transparent border-gray-600 text-gray-300 hover:bg-gray-700/50 disabled:opacity-50"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                  
                  <Button
                    onClick={handleNext}
                    disabled={isLoading || isPaymentProcessing}
                    className="flex-1 h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 transition-all duration-200"
                  >
                    {isLoading || isPaymentProcessing ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <>
                        {currentStep === 3 ? (
                          pricingConfig?.enabled && paymentStep === 'selection' ? 
                          `Pay ₦${registrationData.totalAmount?.toLocaleString() || '0'} & Create Account` :
                          'Create Account'
                        ) : 'Continue'}
                        {currentStep < 3 && <ArrowRight className="h-4 w-4 ml-2" />}
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Back to Login */}
              <div className="text-center pt-4 border-t border-gray-700/50">
                <Button
                  variant="ghost"
                  onClick={() => window.open('http://hotspot.phsweb.net/login', '_blank')}
                  className="text-gray-400 hover:text-blue-400 hover:bg-gray-700/50"
                >
                  Already have an account? Go back to login
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

export default function HotspotRegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-blue-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400 text-lg">Loading registration form...</p>
        </div>
      </div>
    }>
      <HotspotRegisterContent />
    </Suspense>
  );
} 