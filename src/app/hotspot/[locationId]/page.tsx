'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Wifi, MapPin, AlertCircle, Users, RefreshCw, KeyRound } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
// Import MD5 library for CHAP authentication
import { computeChapResponse } from '@/lib/md5';

// Location-specific configuration from database
interface LocationInfo {
  name: string;
  displayName: string;
  welcomeMessage: string;
  description: string;
  features: string[];
  brandColor: string;
  backgroundGradient: string;
  contactInfo?: {
    phone?: string;
    email?: string;
    address?: string;
  };
  registration_enabled?: boolean;
  // Display toggle settings
  showLogo?: boolean;
  showLocationBadge?: boolean;
  showDisplayName?: boolean;
  showWelcomeMessage?: boolean;
  showDescription?: boolean;
  showGuestAccess?: boolean;
}

// Default fallback configuration
const defaultLocationInfo: LocationInfo = {
  name: "Guest",
  displayName: "PHSWEB Guest Network",
  welcomeMessage: "Welcome to PHSWEB!",
  description: "Connect to our guest network for internet access.",
  features: ["Free Internet", "Easy Access", "Secure Connection"],
  brandColor: "from-gray-600 to-slate-600",
  backgroundGradient: "from-gray-50 to-slate-50",
  registration_enabled: true,
  // Default all display elements to visible
  showLogo: true,
  showLocationBadge: true,
  showDisplayName: true,
  showWelcomeMessage: true,
  showDescription: true,
  showGuestAccess: true
};

interface HotspotLoginPageProps {
  params: Promise<{ locationId: string }>;
}

export default function HotspotLoginPage({ params }: HotspotLoginPageProps) {
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [locationId, setLocationId] = useState<string>('');
  const [locationInfo, setLocationInfo] = useState<LocationInfo>(defaultLocationInfo);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);

  // Essential MikroTik parameters
  const linkLogin = searchParams.get('link-login');
  const linkOrig = searchParams.get('link-orig');
  const errorParam = searchParams.get('error');
  
  // CHAP authentication parameters
  const chapChallenge = searchParams.get('chap-challenge');
  const chapId = searchParams.get('chap-id');
  
  // Test mode - allows bypassing MikroTik parameter check
  const testMode = searchParams.get('test') === 'true';

  // Resolve params Promise and extract locationId
  useEffect(() => {
    const resolveParams = async () => {
      const resolvedParams = await params;
      setLocationId(resolvedParams.locationId);
    };
    resolveParams();
  }, [params]);

  // Fetch location data from database
  useEffect(() => {
    const fetchLocationData = async () => {
      if (!locationId) return;
      
      setIsLoadingLocation(true);
      try {
        const response = await fetch(`/api/locations/${locationId}`);
        const data = await response.json();
        
        if (data.success && data.data) {
          const dbLocation = data.data;
          setLocationInfo({
            name: dbLocation.name,
            displayName: dbLocation.display_name,
            welcomeMessage: dbLocation.welcome_message || `Welcome to ${dbLocation.display_name}!`,
            description: dbLocation.description || `Connect to our high-speed internet at our ${dbLocation.name} location.`,
            features: dbLocation.features || ["High-Speed Internet", "24/7 Support", "Secure Connection"],
            brandColor: dbLocation.brand_color_primary || "from-blue-600 to-purple-600",
            backgroundGradient: dbLocation.brand_color_secondary || "from-blue-50 to-purple-50",
            contactInfo: {
              phone: dbLocation.contact_phone,
              email: dbLocation.contact_email,
              address: dbLocation.address
            },
            registration_enabled: dbLocation.registration_enabled !== false,
            showLogo: dbLocation.show_logo,
            showLocationBadge: dbLocation.show_location_badge,
            showDisplayName: dbLocation.show_display_name,
            showWelcomeMessage: dbLocation.show_welcome_message,
            showDescription: dbLocation.show_description,
            showGuestAccess: dbLocation.show_guest_access !== false
          });
        } else {
          console.warn(`Location ${locationId} not found in database, using default config`);
          // Update default with locationId for fallback
          setLocationInfo({
            ...defaultLocationInfo,
            name: locationId.charAt(0).toUpperCase() + locationId.slice(1),
            displayName: `PHSWEB ${locationId.charAt(0).toUpperCase() + locationId.slice(1)} Branch`,
            welcomeMessage: `Welcome to PHSWEB ${locationId.charAt(0).toUpperCase() + locationId.slice(1)}!`
          });
        }
      } catch (err) {
        console.error('Error fetching location data:', err);
        setLocationInfo({
          ...defaultLocationInfo,
          name: locationId.charAt(0).toUpperCase() + locationId.slice(1),
          displayName: `PHSWEB ${locationId.charAt(0).toUpperCase() + locationId.slice(1)} Branch`,
          welcomeMessage: `Welcome to PHSWEB ${locationId.charAt(0).toUpperCase() + locationId.slice(1)}!`
        });
      } finally {
        setIsLoadingLocation(false);
      }
    };

    fetchLocationData();
  }, [locationId]);

  // Set error from URL parameter
  useEffect(() => {
    if (errorParam) {
      setError(decodeURIComponent(errorParam));
    }
  }, [errorParam]);

  // Check if this is a valid MikroTik hotspot request (unless in test mode)
  if (!linkLogin && !testMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Wifi className="mx-auto h-12 w-12 text-blue-500 mb-4" />
            <h1 className="text-2xl font-bold text-gray-900">Connect to WiFi First</h1>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600 text-center">
              To access the hotspot login, you need to be connected to the WiFi network.
            </p>
            
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">📶 How to Connect:</h3>
              <ol className="text-sm text-blue-800 space-y-1">
                <li>1. Connect to the <strong>{locationInfo.name}</strong> WiFi network</li>
                <li>2. Open any website in your browser</li>
                <li>3. You'll be automatically redirected to the login page</li>
                <li>4. Enter your username and PIN to connect</li>
              </ol>
            </div>

            {locationInfo.contactInfo?.phone && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-600">
                  <strong>Need help?</strong> Contact support: {locationInfo.contactInfo.phone}
                </p>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-3 mt-6">
              <Button 
                variant="outline"
                onClick={() => window.location.href = `${window.location.pathname}?test=true`}
                className="text-sm"
              >
                Test Mode
              </Button>
              
              <Button 
                onClick={() => window.location.reload()}
                className="bg-blue-600 hover:bg-blue-700 text-sm"
              >
                Refresh Page
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (testMode && !linkLogin) {
        // Test mode - simulate successful login
        setTimeout(() => {
          setIsLoading(false);
          alert('Test mode: Login would be successful in real MikroTik environment');
        }, 2000);
        return;
      }

      // Ensure linkLogin exists before proceeding
      if (!linkLogin) {
        setError('Missing login URL from MikroTik router');
        setIsLoading(false);
        return;
      }

      // Determine authentication method and prepare password
      let passwordToSend = password;
      
      // CHAP Authentication Logic
      if (chapChallenge && chapId) {
        // Compute CHAP response: MD5(chap-id + password + chap-challenge)
        passwordToSend = computeChapResponse(chapId, password, chapChallenge);
        console.log('🔒 CHAP authentication - password encrypted with MD5');
      } else {
        console.log('⚠️ Fallback to plain text authentication');
      }

      // Submit directly to MikroTik's link-login URL
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = linkLogin;
      form.style.display = 'none';

      // Add all form fields
      const fields = {
        username,
        password: passwordToSend, // Either plain text or CHAP hash
        dst: linkOrig || '',
        popup: 'true'
      };

      Object.entries(fields).forEach(([key, value]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = value;
        form.appendChild(input);
      });

      document.body.appendChild(form);
      form.submit();
    } catch (error) {
      console.error('Authentication error:', error);
      setError('Failed to connect. Please try again.');
      setIsLoading(false);
    }
  };

  // Show loading state while fetching location data
  if (isLoadingLocation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-300 text-lg">Loading location information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      {/* Test mode indicator */}
      {testMode && (
        <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-black text-center p-2 text-sm font-medium z-50">
          🧪 TEST MODE - This page is running in test mode without MikroTik integration
        </div>
      )}

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
          className="w-full max-w-md"
        >
          <Card className="backdrop-blur-sm bg-gray-800/90 border-gray-700/50 shadow-2xl">
            <CardHeader className="text-center pb-6">
              {/* Logo */}
              {locationInfo.showLogo && (
                <div className="mx-auto mb-6">
                  <Image
                    src="/phsweblogo.png"
                    alt="PHSWEB Logo"
                    width={80}
                    height={80}
                    className="mx-auto"
                  />
                </div>
              )}

              {/* Location info */}
              {locationInfo.showLocationBadge && (
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r ${locationInfo.brandColor} text-white text-sm font-medium mb-6`}>
                  <MapPin className="h-4 w-4" />
                  {locationInfo.name}
                </div>
              )}

              {locationInfo.showDisplayName && (
                <h1 className="text-3xl font-bold text-white mb-3">{locationInfo.displayName}</h1>
              )}
              {locationInfo.showWelcomeMessage && (
                <p className="text-gray-300 text-lg mb-2">{locationInfo.welcomeMessage}</p>
              )}
              {locationInfo.showDescription && (
                <p className="text-gray-400">{locationInfo.description}</p>
              )}
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Login Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white text-center">Connect to Internet</h3>
                
                {/* Login Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-sm font-medium text-gray-300">Phone Number</Label>
                    <Input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter your phone number"
                      required
                      autoFocus
                      className="h-12 bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-400 focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium text-gray-300">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                      className="h-12 bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-400 focus:border-blue-500"
                    />
                  </div>

                  {/* Error display */}
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

                  {/* Login Button */}
                  <Button
                    type="submit"
                    disabled={isLoading || !username || !password}
                    className={`w-full h-12 bg-gradient-to-r ${locationInfo.brandColor} hover:opacity-90 transition-all duration-200 text-white font-semibold shadow-lg`}
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Connecting...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Wifi className="h-5 w-5" />
                        Connect to Internet
                      </div>
                    )}
                  </Button>
                </form>

                {/* Divider */}
                <div className="flex items-center gap-4 my-6">
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent"></div>
                  <span className="text-gray-400 text-sm">or</span>
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent"></div>
                </div>

                {/* Create Account Section */}
                <div className="space-y-3">
                  <h4 className="text-center text-gray-300 font-medium">Need an account?</h4>
                  
                  <div className="grid grid-cols-1 gap-3">
                    {/* Create Hotspot Account Button - only show if registration is enabled */}
                    {locationInfo.registration_enabled !== false && (
                      <Button
                        type="button"
                        variant="outline"
                        className="h-12 bg-transparent border-2 border-purple-500/50 text-purple-300 hover:bg-purple-500/10 hover:border-purple-400 transition-all duration-200"
                        onClick={() => {
                          // Build registration URL with all MikroTik parameters preserved
                          const params = new URLSearchParams();
                          params.set('location', locationId);
                          
                          // Preserve MikroTik parameters when going to registration
                          const mikrotikParams = [
                            'link-login', 'link-orig', 'mac', 'ip', 'username', 'error',
                            'chap-challenge', 'chap-id'
                          ];
                          
                          mikrotikParams.forEach(param => {
                            const value = searchParams.get(param);
                            if (value) {
                              params.set(param, value);
                            }
                          });
                          
                          window.open(`/hotspot/register?${params.toString()}`, '_blank');
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Create Hotspot Account
                        </div>
                      </Button>
                    )}

                    {/* Guest Access Button */}
                    {locationInfo.showGuestAccess && (
                      <Button
                        type="button"
                        variant="outline"
                        className="h-12 bg-transparent border-2 border-gray-500/50 text-gray-300 hover:bg-gray-500/10 hover:border-gray-400 transition-all duration-200"
                        onClick={() => {
                          setUsername('guest');
                          setPassword('guest123');
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <Wifi className="h-4 w-4" />
                          Use Guest Access
                        </div>
                      </Button>
                    )}

                    {/* Subscription Renewal Button */}
                    <Button
                      type="button"
                      variant="outline"
                      className="h-12 bg-transparent border-2 border-green-500/50 text-green-300 hover:bg-green-500/10 hover:border-green-400 transition-all duration-200"
                      onClick={() => window.open('/', '_blank')}
                    >
                      <div className="flex items-center gap-2">
                        <RefreshCw className="h-4 w-4" />
                        Buy Credit & Renew Subscription
                      </div>
                    </Button>

                    {/* Password Reset Button */}
                    <Button
                      type="button"
                      variant="outline"
                      className="h-12 bg-transparent border-2 border-orange-500/50 text-orange-300 hover:bg-orange-500/10 hover:border-orange-400 transition-all duration-200"
                      onClick={() => {
                        // TODO: Implement password reset functionality
                        alert('Password reset functionality will be implemented soon. Please contact support for assistance.');
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <KeyRound className="h-4 w-4" />
                        Reset Password
                      </div>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Features Section */}
              {locationInfo.features && locationInfo.features.length > 0 && (
                <div className="pt-4 border-t border-gray-700/50">
                  <h4 className="text-sm font-medium text-gray-300 mb-3">Features</h4>
                  <div className="grid grid-cols-1 gap-2">
                    {locationInfo.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2 text-xs text-gray-400">
                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                        {feature}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Terms */}
              <div className="pt-4 border-t border-gray-700/50">
                <p className="text-xs text-gray-500 text-center">
                  By connecting, you agree to our{' '}
                  <a href="/terms" target="_blank" className="text-blue-400 hover:text-blue-300 underline transition-colors">
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a href="/privacy" target="_blank" className="text-blue-400 hover:text-blue-300 underline transition-colors">
                    Privacy Policy
                  </a>
                </p>
              </div>

              {/* Contact info */}
              {locationInfo.contactInfo && (
                <div className="pt-3 border-t border-gray-700/50">
                  <p className="text-xs text-gray-400 text-center mb-2">
                    Need help? Contact us:
                  </p>
                  <div className="text-xs text-gray-500 text-center space-y-1">
                    {locationInfo.contactInfo.phone && (
                      <div className="text-gray-400">{locationInfo.contactInfo.phone}</div>
                    )}
                    {locationInfo.contactInfo.email && (
                      <div className="text-gray-400">{locationInfo.contactInfo.email}</div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
} 