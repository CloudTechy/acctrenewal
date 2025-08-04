'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Save, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  MapPin,
  Eye,
  EyeOff,
  Settings
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Types
interface ServicePlan {
  srvid: string;
  srvname: string;
  descr: string;
  unitprice: string;
  timebaseexp: string;
  timeunitexp: string;
  enableservice: string;
}

interface Location {
  id: string;
  name: string;
  display_name: string;
  city?: string;
  state?: string;
}

interface LocationPlanConfig {
  hasConfiguration: boolean;
  allowedPlanIds: string[];
  defaultPlanId?: string;
  allowedPlans: ServicePlan[];
}

interface APIResponse {
  success: boolean;
  location: Location;
  allPlans: ServicePlan[];
  currentConfiguration: LocationPlanConfig;
  error?: string;
}

export default function LocationPlanManagementPage() {
  const params = useParams();
  const locationId = params.locationId as string;

  // State
  const [location, setLocation] = useState<Location | null>(null);
  const [allPlans, setAllPlans] = useState<ServicePlan[]>([]);
  const [selectedPlanIds, setSelectedPlanIds] = useState<string[]>([]);
  const [defaultPlanId, setDefaultPlanId] = useState<string>('');
  const [originalConfig, setOriginalConfig] = useState<LocationPlanConfig | null>(null);
  
  // UI State
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Load current configuration
  useEffect(() => {
    if (locationId) {
      loadLocationConfig();
    }
  }, [locationId]);

  const loadLocationConfig = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/admin/locations/${locationId}/plans`);
      const data: APIResponse = await response.json();

      if (data.success) {
        setLocation(data.location);
        setAllPlans(data.allPlans);
        setSelectedPlanIds(data.currentConfiguration.allowedPlanIds);
        setDefaultPlanId(data.currentConfiguration.defaultPlanId || '');
        setOriginalConfig(data.currentConfiguration);
      } else {
        setError(data.error || 'Failed to load location configuration');
      }
    } catch (err) {
      console.error('Error loading location config:', err);
      setError('Failed to load location configuration');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle plan selection
  const handlePlanToggle = (planId: string, checked: boolean) => {
    if (checked) {
      setSelectedPlanIds(prev => [...prev, planId]);
    } else {
      setSelectedPlanIds(prev => prev.filter(id => id !== planId));
      // If we unchecked the default plan, clear the default
      if (planId === defaultPlanId) {
        setDefaultPlanId('');
      }
    }
  };

  // Handle default plan selection
  const handleDefaultPlanChange = (planId: string) => {
    // Use 'none' to represent no default plan instead of empty string
    const actualPlanId = planId === 'none' ? '' : planId;
    setDefaultPlanId(actualPlanId);
    // Ensure the default plan is also selected
    if (actualPlanId && !selectedPlanIds.includes(actualPlanId)) {
      setSelectedPlanIds(prev => [...prev, actualPlanId]);
    }
  };

  // Save configuration
  const saveConfiguration = async () => {
    try {
      setIsSaving(true);
      setError(null);
      setSuccessMessage(null);

      const response = await fetch(`/api/admin/locations/${locationId}/plans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          allowedPlanIds: selectedPlanIds,
          defaultPlanId: defaultPlanId || undefined
        })
      });

      const data = await response.json();

      if (data.success) {
        setSuccessMessage('Plan configuration saved successfully!');
        // Reload to get updated state
        await loadLocationConfig();
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(data.error || 'Failed to save configuration');
      }
    } catch (err) {
      console.error('Error saving configuration:', err);
      setError('Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  // Check if configuration has changed
  const hasChanges = () => {
    if (!originalConfig) return false;
    
    const originalIds = originalConfig.allowedPlanIds.sort();
    const currentIds = selectedPlanIds.sort();
    
    return (
      JSON.stringify(originalIds) !== JSON.stringify(currentIds) ||
      (originalConfig.defaultPlanId || '') !== defaultPlanId
    );
  };

  // Get filtered plans for preview
  const getFilteredPlans = () => {
    if (selectedPlanIds.length === 0) {
      return allPlans; // Show all plans if none selected
    }
    return allPlans.filter(plan => selectedPlanIds.includes(plan.srvid));
  };

  // Format currency
  const formatCurrency = (amount: string) => {
    const num = parseFloat(amount);
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(num);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-blue-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">Loading location configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-blue-950">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative min-h-screen p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Link href="/hotspot">
                <Button variant="outline" size="sm" className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Locations
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-white">Manage Service Plans</h1>
                {location && (
                  <div className="flex items-center gap-2 mt-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-300">{location.display_name}</span>
                    {location.city && location.state && (
                      <span className="text-gray-500">• {location.city}, {location.state}</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
                className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
              >
                {showPreview ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                {showPreview ? 'Hide Preview' : 'Show Preview'}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={loadLocationConfig}
                disabled={isLoading}
                className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Status Messages */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mb-6"
              >
                <div className="p-4 bg-red-900/50 border border-red-700/50 rounded-lg flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                  <div className="text-red-300">{error}</div>
                </div>
              </motion.div>
            )}

            {successMessage && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mb-6"
              >
                <div className="p-4 bg-green-900/50 border border-green-700/50 rounded-lg flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <div className="text-green-300">{successMessage}</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Configuration Panel */}
            <div className="space-y-6">
              {/* Current Status */}
              <Card className="bg-gray-900/80 border-gray-700">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Settings className="h-5 w-5 text-blue-400" />
                    <h2 className="text-xl font-semibold text-white">Current Configuration</h2>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Plan Filtering:</span>
                    <Badge 
                      variant={originalConfig?.hasConfiguration ? "default" : "secondary"}
                      className={originalConfig?.hasConfiguration 
                        ? 'bg-blue-900/50 text-blue-400 border-blue-700' 
                        : 'bg-gray-600 text-gray-300'}
                    >
                      {originalConfig?.hasConfiguration ? 'Enabled' : 'Disabled (All Plans)'}
                    </Badge>
                  </div>
                  {originalConfig?.hasConfiguration && (
                    <>
                      <div>
                        <span className="text-gray-300">Allowed Plans:</span>
                        <div className="text-sm text-gray-400 mt-1">
                          {originalConfig.allowedPlanIds.length} of {allPlans.length} plans
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-300">Default Plan:</span>
                        <div className="text-sm text-gray-400 mt-1">
                          {originalConfig.defaultPlanId 
                            ? allPlans.find(p => p.srvid === originalConfig.defaultPlanId)?.srvname || 'Unknown Plan'
                            : 'Auto-selected'
                          }
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Default Plan Selection */}
              <Card className="bg-gray-900/80 border-gray-700">
                <CardHeader>
                  <h3 className="text-lg font-semibold text-white">Default Plan</h3>
                  <p className="text-sm text-gray-400">
                    Auto-selected plan for new registrations at this location
                  </p>
                </CardHeader>
                <CardContent>
                  <Select 
                    value={defaultPlanId || 'none'} 
                    onValueChange={handleDefaultPlanChange}
                    disabled={selectedPlanIds.length === 0}
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                      <SelectValue placeholder="Auto-select (no default)" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      <SelectItem value="none">Auto-select (no default)</SelectItem>
                      {selectedPlanIds.map(planId => {
                        const plan = allPlans.find(p => p.srvid === planId);
                        return plan ? (
                          <SelectItem key={planId} value={planId}>
                            {plan.srvname} - {formatCurrency(plan.unitprice)}
                          </SelectItem>
                        ) : null;
                      })}
                    </SelectContent>
                  </Select>
                  {selectedPlanIds.length === 0 && (
                    <p className="text-xs text-gray-500 mt-2">
                      Select allowed plans first to set a default plan
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Service Plans Selection */}
              <Card className="bg-gray-900/80 border-gray-700">
                <CardHeader>
                  <h3 className="text-lg font-semibold text-white">Available Service Plans</h3>
                  <p className="text-sm text-gray-400">
                    Select which plans should be available for this location. Leave all unchecked to show all plans.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4 max-h-96 overflow-y-auto">
                  {allPlans.map((plan) => (
                    <div key={plan.srvid} className="flex items-start space-x-3 p-3 rounded-lg bg-gray-800/50 border border-gray-700">
                      <Checkbox
                        id={plan.srvid}
                        checked={selectedPlanIds.includes(plan.srvid)}
                        onCheckedChange={(checked: boolean) => handlePlanToggle(plan.srvid, checked)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <Label htmlFor={plan.srvid} className="cursor-pointer">
                          <div className="font-medium text-white">{plan.srvname}</div>
                          <div className="text-sm text-gray-400 mt-1">{plan.descr}</div>
                          <div className="flex items-center gap-4 mt-2">
                            <div className="text-lg font-bold text-blue-400">
                              {formatCurrency(plan.unitprice)}
                            </div>
                            {defaultPlanId === plan.srvid && (
                              <Badge className="bg-yellow-900/50 text-yellow-400 border-yellow-700">
                                Default
                              </Badge>
                            )}
                          </div>
                        </Label>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <Button
                  onClick={saveConfiguration}
                  disabled={!hasChanges() || isSaving}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 transition-all duration-200"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {isSaving ? 'Saving...' : 'Save Configuration'}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={loadLocationConfig}
                  disabled={!hasChanges() || isSaving}
                  className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
                >
                  Reset
                </Button>
              </div>

              {hasChanges() && (
                <div className="text-sm text-yellow-400 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  You have unsaved changes
                </div>
              )}
            </div>

            {/* Preview Panel */}
            {showPreview && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <Card className="bg-gray-900/80 border-gray-700">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <Eye className="h-5 w-5 text-green-400" />
                      <h3 className="text-lg font-semibold text-white">User Preview</h3>
                    </div>
                    <p className="text-sm text-gray-400">
                      This is what users will see during registration
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="text-center p-4 bg-gray-800/50 rounded-lg">
                        <h4 className="text-white font-medium">Choose Your Plan</h4>
                        <p className="text-gray-400 text-sm mt-1">
                          {getFilteredPlans().length} plan(s) available
                        </p>
                      </div>
                      
                      <div className="grid gap-3 max-h-64 overflow-y-auto">
                        {getFilteredPlans().map((plan) => (
                          <div
                            key={plan.srvid}
                            className={`p-3 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                              defaultPlanId === plan.srvid
                                ? 'border-blue-500 bg-blue-500/10'
                                : 'border-gray-600 bg-gray-700/30'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="font-semibold text-white text-sm">{plan.srvname}</h5>
                              {defaultPlanId === plan.srvid && (
                                <Badge className="bg-blue-600 text-white text-xs">
                                  Pre-selected
                                </Badge>
                              )}
                            </div>
                            <p className="text-gray-400 text-xs mb-2">{plan.descr}</p>
                            <div className="font-bold text-white text-sm">
                              {formatCurrency(plan.unitprice)}
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {getFilteredPlans().length === 0 && (
                        <div className="text-center p-4 text-gray-500">
                          No plans selected - all plans will be shown
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 