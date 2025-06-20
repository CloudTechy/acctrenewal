'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Wifi, MapPin, AlertCircle, Users } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Location-specific configuration
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
}

// Location configurations for different hotspot locations
const locations: Record<string, LocationInfo> = {
  awka: {
    name: "Awka",
    displayName: "PHSWEB Awka Branch",
    welcomeMessage: "Welcome to PHSWEB Awka!",
    description: "Connect to our high-speed internet at our Awka location.",
    features: ["High-Speed Internet", "24/7 Support", "Secure Connection"],
    brandColor: "from-blue-600 to-purple-600",
    backgroundGradient: "from-blue-50 to-purple-50",
    contactInfo: {
      phone: "+234-XXX-XXX-XXXX",
      email: "awka@phsweb.com",
      address: "123 Main Street, Awka, Anambra State"
    }
  },
  lagos: {
    name: "Lagos",
    displayName: "PHSWEB Lagos Island",
    welcomeMessage: "Welcome to PHSWEB Lagos!",
    description: "Experience premium internet service in the heart of Lagos.",
    features: ["Ultra-Fast Internet", "Premium Support", "Business Grade"],
    brandColor: "from-green-600 to-teal-600",
    backgroundGradient: "from-green-50 to-teal-50",
    contactInfo: {
      phone: "+234-XXX-XXX-XXXX",
      email: "lagos@phsweb.com",
      address: "456 Victoria Island, Lagos State"
    }
  },
  abuja: {
    name: "Abuja",
    displayName: "PHSWEB Abuja Central",
    welcomeMessage: "Welcome to PHSWEB Abuja!",
    description: "Connect to reliable internet in Nigeria's capital city.",
    features: ["Reliable Connection", "Government Grade", "24/7 Monitoring"],
    brandColor: "from-orange-600 to-red-600",
    backgroundGradient: "from-orange-50 to-red-50",
    contactInfo: {
      phone: "+234-XXX-XXX-XXXX",
      email: "abuja@phsweb.com",
      address: "789 Central District, Abuja FCT"
    }
  },
  default: {
    name: "Guest",
    displayName: "PHSWEB Guest Network",
    welcomeMessage: "Welcome to PHSWEB!",
    description: "Connect to our guest network for internet access.",
    features: ["Free Internet", "Easy Access", "Secure Connection"],
    brandColor: "from-gray-600 to-slate-600",
    backgroundGradient: "from-gray-50 to-slate-50"
  }
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

  // Essential MikroTik parameters
  const linkLogin = searchParams.get('link-login');
  const linkOrig = searchParams.get('link-orig');
  const errorParam = searchParams.get('error');
  
  // Test mode - allows bypassing MikroTik parameter check
  const testMode = searchParams.get('test') === 'true';

  // Get location info once we have the locationId
  const locationInfo = locations[locationId.toLowerCase()] || locations.default;

  // Resolve params Promise and extract locationId
  useEffect(() => {
    const resolveParams = async () => {
      const resolvedParams = await params;
      setLocationId(resolvedParams.locationId);
    };
    resolveParams();
  }, [params]);

  // Set error from URL parameter
  useEffect(() => {
    if (errorParam) {
      setError(decodeURIComponent(errorParam));
    }
  }, [errorParam]);

  // Check if this is a valid MikroTik hotspot request (unless in test mode)
  if (!linkLogin && !testMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h1 className="text-2xl font-bold text-red-600">Configuration Error</h1>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 text-center">
              This page must be accessed through a MikroTik hotspot system. 
              The required authentication parameters are missing.
            </p>
            <div className="mt-6 p-4 bg-gray-50 rounded-lg text-sm text-gray-500">
              <p><strong>Debug Info:</strong></p>
              <p>Location: {locationId}</p>
              <p>Missing: link-login parameter</p>
              <p className="mt-2 text-xs">
                <strong>For testing:</strong> Add <code>?test=true</code> to the URL
              </p>
            </div>
            <div className="mt-4">
              <Button 
                onClick={() => window.location.href = `${window.location.pathname}?test=true`}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Enable Test Mode
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

      // Submit directly to MikroTik's link-login URL
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = linkLogin;
      form.style.display = 'none';

      // Add all form fields
      const fields = {
        username,
        password,
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
    } catch {
      setError('Failed to connect. Please try again.');
      setIsLoading(false);
    }
  };

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
              <div className="mx-auto mb-6">
                <Image
                  src="/phsweblogo.png"
                  alt="PHSWEB Logo"
                  width={80}
                  height={80}
                  className="mx-auto"
                />
              </div>

              {/* Location info */}
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r ${locationInfo.brandColor} text-white text-sm font-medium mb-6`}>
                <MapPin className="h-4 w-4" />
                {locationInfo.name}
              </div>

              <h1 className="text-3xl font-bold text-white mb-3">{locationInfo.displayName}</h1>
              <p className="text-gray-300 text-lg mb-2">{locationInfo.welcomeMessage}</p>
              <p className="text-gray-400">{locationInfo.description}</p>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Login Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white text-center">Connect to Internet</h3>
                
                {/* Login Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-sm font-medium text-gray-300">Username</Label>
                    <Input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter your username"
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
                    {/* Create Hotspot Account Button */}
                    <Button
                      type="button"
                      variant="outline"
                      className="h-12 bg-transparent border-2 border-purple-500/50 text-purple-300 hover:bg-purple-500/10 hover:border-purple-400 transition-all duration-200"
                      onClick={() => window.open('/hotspot/register', '_blank')}
                    >
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Create Hotspot Account
                      </div>
                    </Button>

                    {/* Guest Access Button */}
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
                  </div>
                </div>
              </div>

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