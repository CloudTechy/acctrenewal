'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Router, 
  Network, 
  Wifi, 
  Users, 
  Settings, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  ArrowLeft,
  Eye,
  EyeOff,
  Shield,
  Zap,
  MapPin,
  TestTube
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NetworkConfig, generateDefaultConfig, ConfigurationStep } from '@/lib/router-config';

interface HotspotLocation {
  id: string;
  name: string;
  display_name: string;
  status: string;
}

interface ConfigurationProgress {
  currentStep: number;
  totalSteps: number;
  isRunning: boolean;
  isPaused: boolean;
  completedSteps: ConfigurationStep[];
  error?: string;
}

const WIZARD_STEPS = [
  {
    id: 'location',
    title: 'Select Location',
    description: 'Choose the location to configure',
    icon: MapPin
  },
  {
    id: 'network',
    title: 'Network Settings',
    description: 'Configure IP addressing and DHCP',
    icon: Network
  },
  {
    id: 'wifi',
    title: 'WiFi Configuration',
    description: 'Set up wireless access point',
    icon: Wifi
  },
  {
    id: 'hotspot',
    title: 'Hotspot Setup',
    description: 'Configure captive portal',
    icon: Shield
  },
  {
    id: 'users',
    title: 'User Management',
    description: 'Create default users',
    icon: Users
  },
  {
    id: 'review',
    title: 'Review & Deploy',
    description: 'Review configuration and deploy',
    icon: Settings
  }
];

export default function ConfigureRouterPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [locations, setLocations] = useState<HotspotLocation[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [config, setConfig] = useState<NetworkConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [configProgress, setConfigProgress] = useState<ConfigurationProgress | null>(null);
  const [isDryRun, setIsDryRun] = useState(true);

  // Fetch locations on component mount
  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const response = await fetch('/api/locations');
      const data = await response.json();
      
      if (data.success) {
        setLocations(data.data);
      } else {
        throw new Error(data.error || 'Failed to fetch locations');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch locations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLocationSelect = (locationId: string) => {
    setSelectedLocationId(locationId);
    const location = locations.find(l => l.id === locationId);
    if (location) {
      const defaultConfig = generateDefaultConfig(locationId, location.name);
      setConfig(defaultConfig);
    }
  };

  const updateConfig = (updates: Partial<NetworkConfig>) => {
    if (config) {
      setConfig({ ...config, ...updates });
    }
  };

  const nextStep = () => {
    if (currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const executeConfiguration = async (dryRun: boolean = false) => {
    if (!config || !selectedLocationId) return;

    setConfigProgress({
      currentStep: 0,
      totalSteps: 0,
      isRunning: true,
      isPaused: false,
      completedSteps: []
    });

    try {
      const response = await fetch(`/api/locations/${selectedLocationId}/configure`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          config,
          dryRun
        }),
      });

      const result = await response.json();

      if (result.success) {
        if (dryRun) {
          setConfigProgress({
            currentStep: 0,
            totalSteps: 0,
            isRunning: false,
            isPaused: false,
            completedSteps: []
          });
          // Show dry run results
          alert(`Configuration validated successfully!\n\nRouter: ${result.configurationPreview.routerName}\nNetwork: ${result.configurationPreview.network}\nWiFi: ${result.configurationPreview.wifiSsid}`);
        } else {
          setConfigProgress({
            currentStep: result.totalSteps,
            totalSteps: result.totalSteps,
            isRunning: false,
            isPaused: false,
            completedSteps: result.steps
          });
        }
      } else {
        setConfigProgress({
          currentStep: 0,
          totalSteps: 0,
          isRunning: false,
          isPaused: false,
          completedSteps: result.completedSteps || [],
          error: result.error
        });
      }
    } catch (err) {
      setConfigProgress({
        currentStep: 0,
        totalSteps: 0,
        isRunning: false,
        isPaused: false,
        completedSteps: [],
        error: err instanceof Error ? err.message : 'Configuration failed'
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-blue-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400 text-lg">Loading locations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-blue-950">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-3 mb-4"
          >
            <div className="p-3 bg-blue-600 rounded-lg">
              <Router className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-white">Router Configuration Wizard</h1>
          </motion.div>
          <p className="text-gray-400 text-lg">Automatically configure MikroTik routers for hotspot functionality</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            {WIZARD_STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;
              
              return (
                <div key={step.id} className="flex items-center">
                  <div className={`flex flex-col items-center ${index < WIZARD_STEPS.length - 1 ? 'flex-1' : ''}`}>
                    <div className={`
                      w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300
                      ${isActive ? 'bg-blue-600 border-blue-600 text-white' : 
                        isCompleted ? 'bg-green-600 border-green-600 text-white' : 
                        'bg-gray-800 border-gray-600 text-gray-400'}
                    `}>
                      {isCompleted ? <CheckCircle2 className="h-6 w-6" /> : <Icon className="h-6 w-6" />}
                    </div>
                    <div className="text-center mt-2">
                      <p className={`text-sm font-medium ${isActive ? 'text-blue-400' : isCompleted ? 'text-green-400' : 'text-gray-400'}`}>
                        {step.title}
                      </p>
                      <p className="text-xs text-gray-500">{step.description}</p>
                    </div>
                  </div>
                  {index < WIZARD_STEPS.length - 1 && (
                    <div className={`h-0.5 flex-1 mx-4 ${isCompleted ? 'bg-green-600' : 'bg-gray-700'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-lg flex items-start gap-3 max-w-4xl mx-auto"
          >
            <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-red-400 font-medium">Configuration Error</p>
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          </motion.div>
        )}

        {/* Configuration Progress */}
        {configProgress && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 max-w-4xl mx-auto"
          >
            <Card className="bg-gray-900/80 border-gray-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Configuration Progress</h3>
                  <Badge variant={configProgress.error ? 'destructive' : configProgress.isRunning ? 'default' : 'secondary'}>
                    {configProgress.error ? 'Failed' : configProgress.isRunning ? 'Running' : 'Completed'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {configProgress.error ? (
                  <div className="text-red-400">
                    <p className="font-medium">Configuration failed:</p>
                    <p className="text-sm">{configProgress.error}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Progress</span>
                      <span className="text-white">{configProgress.currentStep} / {configProgress.totalSteps} steps</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${configProgress.totalSteps > 0 ? (configProgress.currentStep / configProgress.totalSteps) * 100 : 0}%` }}
                      />
                    </div>
                    {configProgress.completedSteps.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm text-gray-400 mb-2">Completed Steps:</p>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {configProgress.completedSteps.map((step, index) => (
                            <div key={index} className="flex items-center gap-2 text-xs">
                              <CheckCircle2 className="h-3 w-3 text-green-400" />
                              <span className="text-gray-300">{step.title}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step Content */}
        <div className="max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Step 0: Location Selection */}
              {currentStep === 0 && (
                <Card className="bg-gray-900/80 border-gray-700">
                  <CardHeader>
                    <h2 className="text-2xl font-bold text-white">Select Location</h2>
                    <p className="text-gray-400">Choose the hotspot location to configure</p>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {locations.map((location) => (
                        <motion.div
                          key={location.id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className={`
                            p-4 rounded-lg border-2 cursor-pointer transition-all duration-200
                            ${selectedLocationId === location.id 
                              ? 'border-blue-500 bg-blue-900/20' 
                              : 'border-gray-600 bg-gray-800/50 hover:border-gray-500'
                            }
                          `}
                          onClick={() => handleLocationSelect(location.id)}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`
                              p-2 rounded-lg
                              ${selectedLocationId === location.id ? 'bg-blue-600' : 'bg-gray-700'}
                            `}>
                              <MapPin className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-white">{location.display_name}</h3>
                              <p className="text-sm text-gray-400">ID: {location.id}</p>
                              <Badge variant={location.status === 'active' ? 'default' : 'secondary'} className="mt-1">
                                {location.status}
                              </Badge>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Step 1: Network Settings */}
              {currentStep === 1 && config && (
                <Card className="bg-gray-900/80 border-gray-700">
                  <CardHeader>
                    <h2 className="text-2xl font-bold text-white">Network Configuration</h2>
                    <p className="text-gray-400">Configure IP addressing and DHCP settings</p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="routerName" className="text-white">Router Name</Label>
                          <Input
                            id="routerName"
                            value={config.routerName}
                            onChange={(e) => updateConfig({ routerName: e.target.value })}
                            className="bg-gray-800 border-gray-600 text-white"
                            placeholder="PHSWEB-Location"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="lanNetwork" className="text-white">LAN Network</Label>
                          <Input
                            id="lanNetwork"
                            value={config.lanNetwork}
                            onChange={(e) => updateConfig({ lanNetwork: e.target.value })}
                            className="bg-gray-800 border-gray-600 text-white"
                            placeholder="192.168.1.0/24"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="lanGateway" className="text-white">Gateway IP</Label>
                          <Input
                            id="lanGateway"
                            value={config.lanGateway}
                            onChange={(e) => updateConfig({ lanGateway: e.target.value })}
                            className="bg-gray-800 border-gray-600 text-white"
                            placeholder="192.168.1.1"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="dhcpStart" className="text-white">DHCP Start</Label>
                          <Input
                            id="dhcpStart"
                            value={config.dhcpStart}
                            onChange={(e) => updateConfig({ dhcpStart: e.target.value })}
                            className="bg-gray-800 border-gray-600 text-white"
                            placeholder="192.168.1.100"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="dhcpEnd" className="text-white">DHCP End</Label>
                          <Input
                            id="dhcpEnd"
                            value={config.dhcpEnd}
                            onChange={(e) => updateConfig({ dhcpEnd: e.target.value })}
                            className="bg-gray-800 border-gray-600 text-white"
                            placeholder="192.168.1.200"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="primaryDns" className="text-white">Primary DNS</Label>
                          <Input
                            id="primaryDns"
                            value={config.primaryDns}
                            onChange={(e) => updateConfig({ primaryDns: e.target.value })}
                            className="bg-gray-800 border-gray-600 text-white"
                            placeholder="8.8.8.8"
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Step 2: WiFi Configuration */}
              {currentStep === 2 && config && (
                <Card className="bg-gray-900/80 border-gray-700">
                  <CardHeader>
                    <h2 className="text-2xl font-bold text-white">WiFi Configuration</h2>
                    <p className="text-gray-400">Set up public wireless access point (open network)</p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="wifiEnabled" className="text-white">Enable WiFi</Label>
                        <p className="text-sm text-gray-400">Enable public wireless access point</p>
                      </div>
                      <Switch
                        id="wifiEnabled"
                        checked={config.wifiEnabled}
                        onCheckedChange={(checked: boolean) => updateConfig({ wifiEnabled: checked })}
                      />
                    </div>
                    
                    {config.wifiEnabled && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="wifiSsid" className="text-white">WiFi SSID</Label>
                            <Input
                              id="wifiSsid"
                              value={config.wifiSsid}
                              onChange={(e) => updateConfig({ wifiSsid: e.target.value })}
                              className="bg-gray-800 border-gray-600 text-white"
                              placeholder="PHSWEB-Guest"
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="wifiSecurity" className="text-white">Security Type</Label>
                            <Select
                              value={config.wifiSecurity}
                              onValueChange={(value: 'none' | 'wpa2-psk' | 'wpa3-psk') => updateConfig({ wifiSecurity: value })}
                            >
                              <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Open (No Security) - Recommended for Public WiFi</SelectItem>
                                <SelectItem value="wpa2-psk">WPA2-PSK (Password Required)</SelectItem>
                                <SelectItem value="wpa3-psk">WPA3-PSK (Password Required)</SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-gray-500 mt-1">
                              Open networks are recommended for public hotspots as users will authenticate through the captive portal
                            </p>
                          </div>
                        </div>
                        
                        <div className="space-y-4">
                          {config.wifiSecurity !== 'none' && (
                            <div>
                              <Label htmlFor="wifiPassword" className="text-white">WiFi Password</Label>
                              <div className="relative">
                                <Input
                                  id="wifiPassword"
                                  type={showPassword ? 'text' : 'password'}
                                  value={config.wifiPassword || ''}
                                  onChange={(e) => updateConfig({ wifiPassword: e.target.value })}
                                  className="bg-gray-800 border-gray-600 text-white pr-10"
                                  placeholder="Enter WiFi password"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="absolute right-0 top-0 h-full px-3 text-gray-400 hover:text-white"
                                  onClick={() => setShowPassword(!showPassword)}
                                >
                                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                              </div>
                              <p className="text-xs text-yellow-400 mt-1">
                                Note: For public hotspots, consider using open networks instead
                              </p>
                            </div>
                          )}
                          
                          <div>
                            <Label htmlFor="wifiChannel" className="text-white">WiFi Channel (Optional)</Label>
                            <Input
                              id="wifiChannel"
                              type="number"
                              value={config.wifiChannel || ''}
                              onChange={(e) => updateConfig({ wifiChannel: e.target.value ? parseInt(e.target.value) : undefined })}
                              className="bg-gray-800 border-gray-600 text-white"
                              placeholder="Auto"
                              min="1"
                              max="13"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Leave empty for automatic channel selection
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Step 3: Hotspot Configuration */}
              {currentStep === 3 && config && (
                <Card className="bg-gray-900/80 border-gray-700">
                  <CardHeader>
                    <h2 className="text-2xl font-bold text-white">Hotspot Configuration</h2>
                    <p className="text-gray-400">Configure captive portal settings</p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="hotspotEnabled" className="text-white">Enable Hotspot</Label>
                        <p className="text-sm text-gray-400">Enable captive portal functionality</p>
                      </div>
                      <Switch
                        id="hotspotEnabled"
                        checked={config.hotspotEnabled}
                        onCheckedChange={(checked: boolean) => updateConfig({ hotspotEnabled: checked })}
                      />
                    </div>
                    
                    {config.hotspotEnabled && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="hotspotName" className="text-white">Hotspot Name</Label>
                            <Input
                              id="hotspotName"
                              value={config.hotspotName}
                              onChange={(e) => updateConfig({ hotspotName: e.target.value })}
                              className="bg-gray-800 border-gray-600 text-white"
                              placeholder="hotspot-location"
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="hotspotProfile" className="text-white">Hotspot Profile</Label>
                            <Input
                              id="hotspotProfile"
                              value={config.hotspotProfile}
                              onChange={(e) => updateConfig({ hotspotProfile: e.target.value })}
                              className="bg-gray-800 border-gray-600 text-white"
                              placeholder="profile-location"
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="loginPageUrl" className="text-white">Login Page URL</Label>
                            <Input
                              id="loginPageUrl"
                              value={config.loginPageUrl}
                              onChange={(e) => updateConfig({ loginPageUrl: e.target.value })}
                              className="bg-gray-800 border-gray-600 text-white"
                              placeholder="https://yourdomain.com/hotspot/location"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Step 4: User Management */}
              {currentStep === 4 && config && (
                <Card className="bg-gray-900/80 border-gray-700">
                  <CardHeader>
                    <h2 className="text-2xl font-bold text-white">User Management</h2>
                    <p className="text-gray-400">Configure default hotspot users</p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      {config.defaultUsers.map((user, index) => (
                        <div key={index} className="p-4 bg-gray-800/50 rounded-lg border border-gray-600">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <Label className="text-white">Username</Label>
                              <Input
                                value={user.username}
                                onChange={(e) => {
                                  const newUsers = [...config.defaultUsers];
                                  newUsers[index].username = e.target.value;
                                  updateConfig({ defaultUsers: newUsers });
                                }}
                                className="bg-gray-700 border-gray-600 text-white"
                              />
                            </div>
                            <div>
                              <Label className="text-white">Password</Label>
                              <Input
                                type="password"
                                value={user.password}
                                onChange={(e) => {
                                  const newUsers = [...config.defaultUsers];
                                  newUsers[index].password = e.target.value;
                                  updateConfig({ defaultUsers: newUsers });
                                }}
                                className="bg-gray-700 border-gray-600 text-white"
                              />
                            </div>
                            <div>
                              <Label className="text-white">Profile</Label>
                              <Input
                                value={user.profile}
                                onChange={(e) => {
                                  const newUsers = [...config.defaultUsers];
                                  newUsers[index].profile = e.target.value;
                                  updateConfig({ defaultUsers: newUsers });
                                }}
                                className="bg-gray-700 border-gray-600 text-white"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <Button
                      onClick={() => {
                        const newUsers = [...config.defaultUsers, {
                          username: `user${config.defaultUsers.length + 1}`,
                          password: 'password123',
                          profile: 'default-user'
                        }];
                        updateConfig({ defaultUsers: newUsers });
                      }}
                      variant="outline"
                      className="border-gray-600 text-white hover:bg-gray-800"
                    >
                      Add User
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Step 5: Review & Deploy */}
              {currentStep === 5 && config && (
                <Card className="bg-gray-900/80 border-gray-700">
                  <CardHeader>
                    <h2 className="text-2xl font-bold text-white">Review & Deploy</h2>
                    <p className="text-gray-400">Review your configuration and deploy to router</p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="p-4 bg-gray-800/50 rounded-lg">
                          <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
                            <Network className="h-4 w-4" />
                            Network Settings
                          </h3>
                          <div className="space-y-1 text-sm">
                            <p className="text-gray-300">Router: <span className="text-white">{config.routerName}</span></p>
                            <p className="text-gray-300">Network: <span className="text-white">{config.lanNetwork}</span></p>
                            <p className="text-gray-300">Gateway: <span className="text-white">{config.lanGateway}</span></p>
                            <p className="text-gray-300">DHCP: <span className="text-white">{config.dhcpStart} - {config.dhcpEnd}</span></p>
                          </div>
                        </div>
                        
                        <div className="p-4 bg-gray-800/50 rounded-lg">
                          <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
                            <Wifi className="h-4 w-4" />
                            WiFi Settings
                          </h3>
                          <div className="space-y-1 text-sm">
                            <p className="text-gray-300">Enabled: <span className="text-white">{config.wifiEnabled ? 'Yes' : 'No'}</span></p>
                            {config.wifiEnabled && (
                              <>
                                <p className="text-gray-300">SSID: <span className="text-white">{config.wifiSsid}</span></p>
                                <p className="text-gray-300">Security: <span className="text-white">{config.wifiSecurity}</span></p>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="p-4 bg-gray-800/50 rounded-lg">
                          <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            Hotspot Settings
                          </h3>
                          <div className="space-y-1 text-sm">
                            <p className="text-gray-300">Enabled: <span className="text-white">{config.hotspotEnabled ? 'Yes' : 'No'}</span></p>
                            {config.hotspotEnabled && (
                              <>
                                <p className="text-gray-300">Name: <span className="text-white">{config.hotspotName}</span></p>
                                <p className="text-gray-300">Profile: <span className="text-white">{config.hotspotProfile}</span></p>
                                <p className="text-gray-300">Login URL: <span className="text-white text-xs break-all">{config.loginPageUrl}</span></p>
                              </>
                            )}
                          </div>
                        </div>
                        
                        <div className="p-4 bg-gray-800/50 rounded-lg">
                          <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Default Users
                          </h3>
                          <div className="space-y-1 text-sm">
                            <p className="text-gray-300">Count: <span className="text-white">{config.defaultUsers.length}</span></p>
                            {config.defaultUsers.slice(0, 3).map((user, index) => (
                              <p key={index} className="text-gray-300">• <span className="text-white">{user.username}</span></p>
                            ))}
                            {config.defaultUsers.length > 3 && (
                              <p className="text-gray-400">... and {config.defaultUsers.length - 3} more</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 pt-4 border-t border-gray-700">
                      <div className="flex items-center gap-2">
                        <Switch
                          id="dryRun"
                          checked={isDryRun}
                          onCheckedChange={setIsDryRun}
                        />
                        <Label htmlFor="dryRun" className="text-white">Dry Run (Test Only)</Label>
                      </div>
                      
                      <div className="flex gap-2 ml-auto">
                        <Button
                          onClick={() => executeConfiguration(true)}
                          variant="outline"
                          className="border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white bg-gray-900"
                          disabled={configProgress?.isRunning}
                        >
                          <TestTube className="h-4 w-4 mr-2" />
                          Test Configuration
                        </Button>
                        
                        <Button
                          onClick={() => executeConfiguration(isDryRun)}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                          disabled={configProgress?.isRunning}
                        >
                          {configProgress?.isRunning ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                              Configuring...
                            </>
                          ) : (
                            <>
                              <Zap className="h-4 w-4 mr-2" />
                              {isDryRun ? 'Validate Configuration' : 'Deploy Configuration'}
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center mt-8 max-w-4xl mx-auto">
          <Button
            onClick={prevStep}
            variant="outline"
            disabled={currentStep === 0}
            className="border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white bg-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          
          <div className="text-center">
            <p className="text-gray-400 text-sm">
              Step {currentStep + 1} of {WIZARD_STEPS.length}
            </p>
          </div>
          
          <Button
            onClick={nextStep}
            disabled={currentStep === WIZARD_STEPS.length - 1 || (currentStep === 0 && !selectedLocationId)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
} 