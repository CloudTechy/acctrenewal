'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Wifi, MapPin, AlertCircle, CheckCircle2 } from 'lucide-react';
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
  params: { locationId: string };
}

export default function HotspotLoginPage({ params }: HotspotLoginPageProps) {
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Essential MikroTik parameters
  const linkLogin = searchParams.get('link-login');
  const linkOrig = searchParams.get('link-orig');
  const errorParam = searchParams.get('error');
  const mac = searchParams.get('mac');
  const ip = searchParams.get('ip');

  // Get location info
  const locationInfo = locations[params.locationId.toLowerCase()] || locations.default;

  // Set error from URL parameter
  useEffect(() => {
    if (errorParam) {
      setError(decodeURIComponent(errorParam));
    }
  }, [errorParam]);

  // Check if this is a valid MikroTik hotspot request
  if (!linkLogin) {
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
              <p>Location: {params.locationId}</p>
              <p>Missing: link-login parameter</p>
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
    <div className={`min-h-screen bg-gradient-to-br ${locationInfo.backgroundGradient}`}>
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          <Card className="backdrop-blur-sm bg-white/95 border-white/20 shadow-2xl">
            <CardHeader className="text-center pb-6">
              {/* Logo */}
              <div className="mx-auto mb-4">
                <Image
                  src="/phsweblogo.png"
                  alt="PHSWEB Logo"
                  width={80}
                  height={80}
                  className="mx-auto"
                />
              </div>

              {/* Location info */}
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r ${locationInfo.brandColor} text-white text-sm font-medium mb-4`}>
                <MapPin className="h-4 w-4" />
                {locationInfo.name}
              </div>

              <h1 className="text-2xl font-bold text-gray-900">{locationInfo.displayName}</h1>
              <p className="text-gray-600 mt-2">{locationInfo.welcomeMessage}</p>
              <p className="text-sm text-gray-500">{locationInfo.description}</p>
            </CardHeader>

            <CardContent>
              {/* Features */}
              <div className="grid grid-cols-1 gap-2 mb-6">
                {locationInfo.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    {feature}
                  </div>
                ))}
              </div>

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-sm font-medium">Username</Label>
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    required
                    autoFocus
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="h-11"
                  />
                </div>

                {/* Error display */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2"
                  >
                    <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-red-600">{error}</p>
                  </motion.div>
                )}

                {/* Submit button */}
                <Button
                  type="submit"
                  disabled={isLoading || !username || !password}
                  className={`w-full h-11 bg-gradient-to-r ${locationInfo.brandColor} hover:opacity-90 transition-all duration-200`}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Connecting...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Wifi className="h-4 w-4" />
                      Connect to Internet
                    </div>
                  )}
                </Button>
              </form>

              {/* Connection info */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
                  {mac && (
                    <div>
                      <strong>Device:</strong> {mac.slice(-6)}
                    </div>
                  )}
                  {ip && (
                    <div>
                      <strong>IP:</strong> {ip}
                    </div>
                  )}
                </div>
              </div>

              {/* Terms */}
              <p className="text-xs text-gray-500 text-center mt-4">
                By connecting, you agree to our{' '}
                <a href="/terms" target="_blank" className="text-blue-600 hover:underline">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="/privacy" target="_blank" className="text-blue-600 hover:underline">
                  Privacy Policy
                </a>
              </p>

              {/* Contact info */}
              {locationInfo.contactInfo && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-600 text-center">
                    Need help? Contact us:
                  </p>
                  <div className="text-xs text-gray-500 text-center mt-1 space-y-1">
                    {locationInfo.contactInfo.phone && (
                      <div>{locationInfo.contactInfo.phone}</div>
                    )}
                    {locationInfo.contactInfo.email && (
                      <div>{locationInfo.contactInfo.email}</div>
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