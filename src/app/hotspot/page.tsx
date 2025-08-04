'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, 
  Users, 
  Activity, 
  Settings, 
  Plus,
  Edit3,
  Trash2,
  Copy,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  Wrench,
  XCircle,
  Clock,
  Wifi,
  WifiOff,
  Router,
  TestTube,
  Save,
  X,
  Eye,
  EyeOff,
  Power,
  PowerOff,
  CreditCard
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toggleHotspot, HotspotControlResponse } from '@/lib/hotspot-control';

// Location management interface
interface HotspotLocation {
  id: string;
  name: string;
  display_name: string;
  status: 'active' | 'inactive' | 'maintenance';
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  is_active: boolean;
  // New fields for hotspot registration
  group_id?: number;
  default_owner_id?: string;
  registration_enabled?: boolean;
  // New customization fields for landing page
  welcome_message?: string;
  brand_color_primary?: string;
  brand_color_secondary?: string;
  contact_phone?: string;
  contact_email?: string;
  features?: string[];
  created_at: string;
  updated_at: string;
}

// Add AccountOwner interface
interface AccountOwner {
  id: string;
  owner_username: string;
  name: string;
  first_name?: string;
  last_name?: string;
  email: string;
  phone?: string;
  commission_rate: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface RouterConfig {
  id: string;
  location_id: string;
  host: string;
  username: string;
  password: string; // Plain text password
  port: number;
  api_port: number;
  connection_type: 'api' | 'ssh' | 'winbox';
  is_active: boolean;
  connection_status: 'connected' | 'disconnected' | 'error' | 'unknown';
  last_connected_at?: string;
  last_error?: string;
}

interface LocationWithStats extends HotspotLocation {
  activeUsers: number;
  registeredCustomers: number;
  lastActivity: string;
  loginUrl: string;
  routerConfig?: RouterConfig;
  connectionDetails?: {
    uptime: string;
    version: string;
    cpuLoad: number;
    memoryUsage: number;
  };
}

interface HotspotStatsResponse {
  locations: Record<string, {
    stats?: {
      activeUsers: number;
      hotspotCustomers: number;
      lastActivity: string;
    };
    routerStatus?: {
      isOnline: boolean;
      uptime: string;
      version: string;
      cpuLoad: number;
      freeMemory: number;
      totalMemory: number;
    };
    error?: string;
  }>;
  timestamp: string;
  totalActiveUsers: number;
  totalHotspotCustomers: number;
  totalLocations: number;
  activeLocations: number;
}

export default function HotspotManagementPage() {
  const [locations, setLocations] = useState<LocationWithStats[]>([]);
  const [accountOwners, setAccountOwners] = useState<AccountOwner[]>([]);
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [showEditLocation, setShowEditLocation] = useState<string | null>(null);
  const [showRouterConfig, setShowRouterConfig] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isTestingConnection, setIsTestingConnection] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connectionTest, setConnectionTest] = useState<{[key: string]: 'testing' | 'success' | 'failed'}>({});
  const [showPassword, setShowPassword] = useState(false);
  
  // New state for MikroTik hotspot control
  const [hotspotToggling, setHotspotToggling] = useState<{[key: string]: boolean}>({});
  const [hotspotStatus, setHotspotStatus] = useState<{[key: string]: boolean | null}>({});

  const [newLocation, setNewLocation] = useState({
    id: '',
    name: '',
    display_name: '',
    description: '',
    address: '',
    city: '',
    state: '',
    group_id: 1,
    default_owner_id: '',
    registration_enabled: true,
    // New customization fields
    welcome_message: '',
    brand_color_primary: 'from-blue-600 to-purple-600',
    brand_color_secondary: 'from-blue-50 to-purple-50',
    contact_phone: '',
    contact_email: '',
    features: ['High-Speed Internet', '24/7 Support', 'Secure Connection']
  });

  const [editLocation, setEditLocation] = useState({
    id: '',
    name: '',
    display_name: '',
    description: '',
    address: '',
    city: '',
    state: '',
    group_id: 1,
    default_owner_id: '',
    registration_enabled: true,
    // New customization fields
    welcome_message: '',
    brand_color_primary: 'from-blue-600 to-purple-600',
    brand_color_secondary: 'from-blue-50 to-purple-50',
    contact_phone: '',
    contact_email: '',
    features: ['High-Speed Internet', '24/7 Support', 'Secure Connection']
  });
  
  const [routerConfig, setRouterConfig] = useState({
    host: '',
    username: '',
    password: '',
    port: 8728,
    api_port: 80,
    connection_type: 'api' as 'api' | 'ssh' | 'winbox'
  });

  // Fetch account owners from database
  const fetchAccountOwners = async () => {
    try {
      const response = await fetch('/api/owners');
      const data = await response.json();
      
      if (data.success) {
        setAccountOwners(data.data);
      } else {
        console.error('Failed to fetch account owners:', data.error);
      }
    } catch (err) {
      console.error('Error fetching account owners:', err);
    }
  };

  // Fetch locations from database
  const fetchLocations = async () => {
    try {
      const response = await fetch('/api/locations');
      const data = await response.json();
      
      if (data.success) {
        const locationsWithDefaults = data.data.map((location: HotspotLocation) => ({
          ...location,
          activeUsers: 0,
          registeredCustomers: 0,
          lastActivity: 'Loading...',
          loginUrl: `${typeof window !== 'undefined' ? window.location.origin : ''}/hotspot/${location.id}`
        }));
        setLocations(locationsWithDefaults);

        // Fetch router configs for each location
        await Promise.all(locationsWithDefaults.map((location: LocationWithStats) => 
          fetchRouterConfigForLocation(location.id)
        ));

        // Fetch hotspot customer counts for each location
        await fetchHotspotCustomerCounts();
      } else {
        throw new Error(data.error || 'Failed to fetch locations');
      }
    } catch (err) {
      console.error('Error fetching locations:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch locations');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch router config for a specific location
  const fetchRouterConfigForLocation = async (locationId: string) => {
    try {
      const response = await fetch(`/api/locations/${locationId}/router`);
      const data = await response.json();
      
      if (data.success) {
        setLocations(prev => prev.map(loc => 
          loc.id === locationId 
            ? { ...loc, routerConfig: data.data }
            : loc
        ));
      }
    } catch (err) {
      console.error(`Error fetching router config for ${locationId}:`, err);
    }
  };

  // Fetch hotspot customer counts from database
  const fetchHotspotCustomerCounts = async () => {
    try {
      const response = await fetch('/api/hotspot/customer-counts');
      const data = await response.json();
      
      if (data.success) {
        setLocations(prev => prev.map(location => ({
          ...location,
          registeredCustomers: data.counts[location.id]?.hotspot || 0
        })));
      }
    } catch (err) {
      console.error('Error fetching hotspot customer counts:', err);
    }
  };

  // Fetch real-time data from API
  const fetchHotspotStats = async () => {
    try {
      setError(null);
      setIsFetching(true);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      const response = await fetch('/api/hotspot/stats', {
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: HotspotStatsResponse = await response.json();
      
      // Update locations with real data
      setLocations(prevLocations => 
        prevLocations.map(location => {
          const locationData = data.locations[location.id];
          if (locationData) {
            return {
              ...location,
              activeUsers: locationData.stats?.activeUsers || 0,
              registeredCustomers: locationData.stats?.hotspotCustomers || 0,
              lastActivity: locationData.stats?.lastActivity || 'No data',
              connectionDetails: locationData.routerStatus ? {
                uptime: locationData.routerStatus.uptime,
                version: locationData.routerStatus.version,
                cpuLoad: locationData.routerStatus.cpuLoad,
                memoryUsage: locationData.routerStatus.totalMemory > 0 ? 
                  ((locationData.routerStatus.totalMemory - locationData.routerStatus.freeMemory) / locationData.routerStatus.totalMemory) * 100 : 0
              } : undefined
            };
          }
          return location;
        })
      );
    } catch (err) {
      console.error('Error fetching hotspot stats:', err);
      
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          setError('Request timeout - API is taking too long to respond');
        } else {
          setError(err.message);
        }
      } else {
        setError('Failed to fetch stats');
      }
    } finally {
      setIsFetching(false);
    }
  };

  // Test router connection
  const testConnection = async (locationId: string, config: RouterConfig) => {
    setIsTestingConnection(locationId);
    setConnectionTest(prev => ({ ...prev, [locationId]: 'testing' }));
    
    try {
      const response = await fetch('/api/hotspot/stats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          host: config.host,
          user: config.username,
          password: config.password || routerConfig.password, // Use config password or form password
          port: config.api_port || 80 // Use HTTP port for REST API
        }),
      });
      
      const data = await response.json();
      console.log('Test connection response:', data);
      
      setConnectionTest(prev => ({ 
        ...prev, 
        [locationId]: data.connected ? 'success' : 'failed' 
      }));
      
      // Update router config status
      if (data.connected) {
        await fetchRouterConfigForLocation(locationId);
      }
      
    } catch (err) {
      console.error('Connection test failed:', err);
      setConnectionTest(prev => ({ ...prev, [locationId]: 'failed' }));
    } finally {
      setIsTestingConnection(null);
    }
  };

  // Load existing router config when opening modal
  const openRouterConfig = async (locationId: string) => {
    const location = locations.find(l => l.id === locationId);
    if (location?.routerConfig) {
      setRouterConfig({
        host: location.routerConfig.host,
        username: location.routerConfig.username,
        password: '', // Don't pre-fill password for security
        port: location.routerConfig.port,
        api_port: location.routerConfig.api_port,
        connection_type: location.routerConfig.connection_type
      });
    } else {
      // Reset to defaults for new config
      setRouterConfig({
        host: '',
        username: 'admin',
        password: '',
        port: 8728,
        api_port: 80,
        connection_type: 'api'
      });
    }
    setShowRouterConfig(locationId);
  };

  // Initial load and periodic updates
  useEffect(() => {
    fetchAccountOwners();
    fetchLocations().then(() => {
    fetchHotspotStats();
    });
    
    const interval = setInterval(fetchHotspotStats, 300000); // 5 minutes
    
    return () => {
      clearInterval(interval);
    };
  }, []);

  const getConnectionStatusBadge = (config?: RouterConfig) => {
    if (!config) {
      return <Badge variant="secondary" className="bg-gray-600 text-gray-300">Not Configured</Badge>;
    }
    
    switch (config.connection_status) {
      case 'connected':
        return <Badge className="bg-green-900/50 text-green-400 border-green-700">Connected</Badge>;
      case 'disconnected':
        return <Badge variant="outline" className="border-yellow-600 text-yellow-400">Disconnected</Badge>;
      case 'error':
        return <Badge variant="destructive" className="bg-red-900/50 text-red-400 border-red-700">Error</Badge>;
      default:
        return <Badge variant="secondary" className="bg-gray-600 text-gray-300">Unknown</Badge>;
    }
  };

  const getConnectionIcon = (config?: RouterConfig) => {
    if (!config) return <Router className="h-4 w-4 text-gray-400" />;
    
    switch (config.connection_status) {
      case 'connected':
        return <Wifi className="h-4 w-4 text-green-400" />;
      case 'disconnected':
        return <WifiOff className="h-4 w-4 text-yellow-400" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-400" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/locations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newLocation),
      });

      const data = await response.json();

      if (data.success) {
        await fetchLocations();
        setNewLocation({ id: '', name: '', display_name: '', description: '', address: '', city: '', state: '', group_id: 1, default_owner_id: '', registration_enabled: true, welcome_message: '', brand_color_primary: 'from-blue-600 to-purple-600', brand_color_secondary: 'from-blue-50 to-purple-50', contact_phone: '', contact_email: '', features: ['High-Speed Internet', '24/7 Support', 'Secure Connection'] });
        setShowAddLocation(false);
      } else {
        setError(data.error || 'Failed to create location');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create location');
    }
  };

  const handleEditLocation = (locationId: string) => {
    const location = locations.find(l => l.id === locationId);
    if (location) {
      setEditLocation({
        id: location.id,
        name: location.name,
        display_name: location.display_name,
        description: location.description || '',
        address: location.address || '',
        city: location.city || '',
        state: location.state || '',
        group_id: location.group_id || 1,
        default_owner_id: location.default_owner_id || '',
        registration_enabled: location.registration_enabled ?? true,
        welcome_message: location.welcome_message || '',
        brand_color_primary: location.brand_color_primary || 'from-blue-600 to-purple-600',
        brand_color_secondary: location.brand_color_secondary || 'from-blue-50 to-purple-50',
        contact_phone: location.contact_phone || '',
        contact_email: location.contact_email || '',
        features: location.features || ['High-Speed Internet', '24/7 Support', 'Secure Connection']
      });
      setShowEditLocation(locationId);
    }
  };

  const handleSaveEditLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditLocation) return;

    try {
      const response = await fetch(`/api/locations/${showEditLocation}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editLocation.name,
          display_name: editLocation.display_name,
          description: editLocation.description,
          address: editLocation.address,
          city: editLocation.city,
          state: editLocation.state,
          group_id: editLocation.group_id,
          default_owner_id: editLocation.default_owner_id,
          registration_enabled: editLocation.registration_enabled,
          welcome_message: editLocation.welcome_message,
          brand_color_primary: editLocation.brand_color_primary,
          brand_color_secondary: editLocation.brand_color_secondary,
          contact_phone: editLocation.contact_phone,
          contact_email: editLocation.contact_email,
          features: editLocation.features
        }),
      });

      const data = await response.json();

      if (data.success) {
        await fetchLocations();
        setShowEditLocation(null);
        setEditLocation({
          id: '',
          name: '',
          display_name: '',
          description: '',
          address: '',
          city: '',
          state: '',
          group_id: 1,
          default_owner_id: '',
          registration_enabled: true,
          welcome_message: '',
          brand_color_primary: 'from-blue-600 to-purple-600',
          brand_color_secondary: 'from-blue-50 to-purple-50',
          contact_phone: '',
          contact_email: '',
          features: ['High-Speed Internet', '24/7 Support', 'Secure Connection']
        });
      } else {
        setError(data.error || 'Failed to update location');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update location');
    }
  };

  const handleSaveRouterConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showRouterConfig) return;

    try {
      const location = locations.find(l => l.id === showRouterConfig);
      const method = location?.routerConfig ? 'PUT' : 'POST';
      
      const response = await fetch(`/api/locations/${showRouterConfig}/router`, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(routerConfig),
      });

      const data = await response.json();

      if (data.success) {
        await fetchRouterConfigForLocation(showRouterConfig);
        setShowRouterConfig(null);
        setRouterConfig({
          host: '',
          username: '',
          password: '',
          port: 8728,
          api_port: 80,
          connection_type: 'api'
        });
        
        // Refresh stats to test new connection
        fetchHotspotStats();
      } else {
        setError(data.error || 'Failed to save router configuration');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save router configuration');
      }
    };
    
  const handleDeleteLocation = async (locationId: string) => {
    if (!confirm('Are you sure you want to delete this location? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/locations/${locationId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        await fetchLocations();
      } else {
        setError(data.error || 'Failed to delete location');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete location');
    }
  };

  const handleRefresh = () => {
    fetchHotspotStats();
  };

  // MikroTik Hotspot Control Functions
  const handleHotspotToggle = async (locationId: string, enable: boolean) => {
    setHotspotToggling(prev => ({ ...prev, [locationId]: true }));
    
    try {
      const result: HotspotControlResponse = await toggleHotspot(locationId, enable);
      
      if (result.success) {
        setHotspotStatus(prev => ({ ...prev, [locationId]: enable }));
        setError(null);
        
        // Show success message
        console.log(`✅ ${result.message}`);
        
        // Refresh stats to see updated router status
        fetchHotspotStats();
      } else {
        setError(result.error || `Failed to ${enable ? 'enable' : 'disable'} hotspot`);
        console.error(`❌ Hotspot control failed:`, result.error);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Failed to control hotspot: ${errorMessage}`);
      console.error('❌ Hotspot control error:', err);
    } finally {
      setHotspotToggling(prev => ({ ...prev, [locationId]: false }));
    }
  };

  const enableHotspot = (locationId: string) => handleHotspotToggle(locationId, true);
  const disableHotspot = (locationId: string) => handleHotspotToggle(locationId, false);

  const totalActiveUsers = locations.reduce((sum, loc) => sum + loc.activeUsers, 0);
  const totalRegisteredCustomers = locations.reduce((sum, loc) => sum + loc.registeredCustomers, 0);
  const activeLocations = locations.filter(loc => loc.routerConfig?.connection_status === 'connected').length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-blue-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400 text-lg">Loading hotspot locations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-blue-950">
      <div className="container mx-auto px-4 py-8">
      {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-4"
          >
            <div className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg">
              <Activity className="h-8 w-8 text-white" />
              </div>
              <div>
              <h1 className="text-4xl font-bold text-white">Hotspot Locations</h1>
              <p className="text-gray-400">Monitor and manage your hotspot network</p>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <Link href="/configure-router">
              <Button className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white">
                <Wrench className="h-4 w-4 mr-2" />
                Configure Router
              </Button>
            </Link>
              <Button 
                onClick={handleRefresh}
                disabled={isFetching}
                variant="outline" 
              className="border-gray-600 text-white hover:bg-gray-800"
              >
              {isFetching ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
                Refresh
              </Button>
              <Button 
                onClick={() => setShowAddLocation(true)}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Location
              </Button>
          </motion.div>
      </div>

        {/* Error Alert */}
        <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-6 p-4 bg-red-900/50 border border-red-800 rounded-lg"
          >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="h-5 w-5" />
                    <p className="font-medium">Error</p>
                  </div>
                  <p className="text-red-300 mt-1 text-sm">{error}</p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setError(null)}
                  className="text-red-400 hover:text-red-300"
                >
                  <X className="h-4 w-4" />
                </Button>
            </div>
          </motion.div>
        )}
        </AnimatePresence>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-gray-900/80 border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Active Users</p>
                    <p className="text-3xl font-bold text-white">{totalActiveUsers}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-400" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-gray-900/80 border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Total Registered Customers</p>
                    <p className="text-3xl font-bold text-white">{totalRegisteredCustomers}</p>
                  </div>
                  <Wifi className="h-8 w-8 text-purple-400" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="bg-gray-900/80 border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Connected Locations</p>
                    <p className="text-3xl font-bold text-white">{activeLocations}</p>
                  </div>
                  <MapPin className="h-8 w-8 text-orange-400" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="bg-gray-900/80 border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Total Locations</p>
                    <p className="text-3xl font-bold text-white">{locations.length}</p>
                  </div>
                  <Settings className="h-8 w-8 text-gray-400" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Locations List */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-white">Hotspot Locations</h2>
          
          <div className="grid gap-6">
            {locations.map((location, index) => (
              <motion.div
                key={location.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
              >
                <Card className="bg-gray-900/80 border-gray-700 hover:bg-gray-900/90 transition-all duration-200">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg">
                            <MapPin className="h-5 w-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-white">{location.display_name}</h3>
                            <p className="text-sm text-gray-400">ID: {location.id}</p>
                            {location.city && location.state && (
                              <p className="text-sm text-gray-500">{location.city}, {location.state}</p>
                            )}
                            {/* New fields display */}
                            <div className="flex items-center gap-4 mt-1">
                              {location.group_id && (
                                <p className="text-xs text-gray-500">
                                  <span className="text-gray-400">Group:</span> {location.group_id}
                                </p>
                              )}
                              {location.registration_enabled !== undefined && (
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-gray-400">Hotspot:</span>
                                  <Badge 
                                    variant={location.registration_enabled ? "default" : "secondary"}
                                    className={`text-xs ${location.registration_enabled 
                                      ? 'bg-green-900/50 text-green-400 border-green-700' 
                                      : 'bg-gray-600 text-gray-300'}`}
                                  >
                                    {location.registration_enabled ? 'Enabled' : 'Disabled'}
                                  </Badge>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {getConnectionIcon(location.routerConfig)}
                            {getConnectionStatusBadge(location.routerConfig)}
                          </div>
                        </div>

                        {/* Connection Details */}
                        {location.routerConfig && (
                          <div className="bg-gray-800/50 rounded-lg p-3 mb-4">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-sm font-medium text-white flex items-center gap-2">
                                <Router className="h-4 w-4" />
                                Router Connection
                              </h4>
                              <div className="flex items-center gap-2">
                                {connectionTest[location.id] && (
                                  <Badge variant={connectionTest[location.id] === 'success' ? 'default' : 'destructive'} className="text-xs">
                                    {connectionTest[location.id] === 'testing' && 'Testing...'}
                                    {connectionTest[location.id] === 'success' && 'Test Passed'}
                                    {connectionTest[location.id] === 'failed' && 'Test Failed'}
                                  </Badge>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => testConnection(location.id, location.routerConfig!)}
                                  disabled={isTestingConnection === location.id}
                                  className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600 h-6 px-2"
                                >
                                  <TestTube className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div className="text-gray-400">
                                <span>Host: </span>
                                <span className="text-gray-300">{location.routerConfig.host}:{location.routerConfig.port}</span>
                              </div>
                              <div className="text-gray-400">
                                <span>Type: </span>
                                <span className="text-gray-300 capitalize">{location.routerConfig.connection_type}</span>
                              </div>
                              {location.routerConfig.last_connected_at && (
                                <div className="text-gray-400 col-span-2">
                                  <span>Last Connected: </span>
                                  <span className="text-gray-300">
                                    {new Date(location.routerConfig.last_connected_at).toLocaleString()}
                                  </span>
                                </div>
                              )}
                              {location.routerConfig.last_error && (
                                <div className="text-red-400 col-span-2">
                                  <span>Error: </span>
                                  <span className="text-red-300">{location.routerConfig.last_error}</span>
                                </div>
                              )}
                            </div>

                            {/* Connection Stats */}
                            {location.connectionDetails && (
                              <div className="mt-3 pt-3 border-t border-gray-700">
                                <div className="grid grid-cols-2 gap-3 text-xs">
                                  <div className="text-gray-400">
                                    <span>Uptime: </span>
                                    <span className="text-green-400">{location.connectionDetails.uptime}</span>
                                  </div>
                                  <div className="text-gray-400">
                                    <span>Version: </span>
                                    <span className="text-gray-300">{location.connectionDetails.version}</span>
                                  </div>
                                  <div className="text-gray-400">
                                    <span>CPU: </span>
                                    <span className="text-blue-400">{location.connectionDetails.cpuLoad}%</span>
                                  </div>
                                  <div className="text-gray-400">
                                    <span>Memory: </span>
                                    <span className="text-purple-400">{location.connectionDetails.memoryUsage.toFixed(1)}%</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-gray-400">Active Users</p>
                            <p className="text-xl font-semibold text-blue-400">{location.activeUsers}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-400">Registered Customers</p>
                            <p className="text-xl font-semibold text-purple-400">{location.registeredCustomers}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-400">Last Activity</p>
                            <p className="text-sm text-gray-300">{location.lastActivity}</p>
                          </div>
                        </div>

                        {/* Owner Information */}
                        {location.default_owner_id && (
                          <div className="bg-gray-800/50 rounded-lg p-3 mb-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Users className="h-4 w-4 text-purple-400" />
                              <h4 className="text-sm font-medium text-white">Account Owner</h4>
                            </div>
                            <div className="text-xs text-gray-400">
                              {(() => {
                                const owner = accountOwners.find(o => o.id === location.default_owner_id);
                                return owner ? (
                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <span>Name: </span>
                                      <span className="text-gray-300">{owner.name}</span>
                                    </div>
                                    <div>
                                      <span>Commission: </span>
                                      <span className="text-purple-400">{owner.commission_rate}%</span>
                                    </div>
                                    {owner.email && (
                                      <div className="col-span-2">
                                        <span>Email: </span>
                                        <span className="text-gray-300">{owner.email}</span>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-red-400">Owner not found</span>
                                );
                              })()}
                            </div>
                          </div>
                        )}

                        <div className="bg-gray-800/50 rounded-lg p-3">
                          <p className="text-xs text-gray-400 mb-1">Hotspot Login URL:</p>
                          <div className="flex items-center gap-2">
                            <code className="text-xs bg-gray-700 px-2 py-1 rounded border border-gray-600 flex-1 text-gray-300">
                              {location.loginUrl}
                            </code>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyToClipboard(location.loginUrl)}
                              className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700 h-6 px-2"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Link href={location.loginUrl} target="_blank">
                              <Button size="sm" variant="outline" className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700 h-6 px-2">
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 ml-4">
                        {/* MikroTik Hotspot Control Buttons */}
                        {location.routerConfig && location.routerConfig.connection_status === 'connected' && (
                          <div className="flex flex-col gap-1 mb-2">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className={`bg-gray-800 border-gray-600 text-white hover:bg-green-700 ${
                                hotspotStatus[location.id] === true ? 'border-green-500 bg-green-900/50' : ''
                              }`}
                              onClick={() => enableHotspot(location.id)}
                              disabled={hotspotToggling[location.id]}
                            >
                              {hotspotToggling[location.id] ? (
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
                              ) : (
                                <Power className="h-3 w-3" />
                              )}
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className={`bg-gray-800 border-gray-600 text-white hover:bg-red-700 ${
                                hotspotStatus[location.id] === false ? 'border-red-500 bg-red-900/50' : ''
                              }`}
                              onClick={() => disableHotspot(location.id)}
                              disabled={hotspotToggling[location.id]}
                            >
                              {hotspotToggling[location.id] ? (
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
                              ) : (
                                <PowerOff className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        )}
                        
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
                          onClick={() => openRouterConfig(location.id)}
                        >
                          <Wrench className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
                          onClick={() => handleEditLocation(location.id)}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="bg-gray-800 border-gray-600 text-white hover:bg-red-700"
                          onClick={() => handleDeleteLocation(location.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Link href={`/admin/locations/${location.id}/plans`}>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="bg-gray-800 border-gray-600 text-white hover:bg-blue-700"
                            title="Manage Service Plans"
                          >
                            <CreditCard className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Add Location Modal */}
        <AnimatePresence>
        {showAddLocation && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-gray-900 rounded-lg w-full max-w-md border border-gray-700"
            >
              <div className="p-6">
                  <h3 className="text-lg font-semibold mb-4 text-white">Add New Hotspot Location</h3>
                <form onSubmit={handleAddLocation} className="space-y-4">
                  <div>
                      <Label htmlFor="locationId" className="text-gray-300">Location ID</Label>
                    <Input
                      id="locationId"
                      value={newLocation.id}
                      onChange={(e) => setNewLocation({...newLocation, id: e.target.value.toLowerCase().replace(/\s+/g, '-')})}
                      placeholder="e.g., kano, port-harcourt"
                      required
                        className="bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                    />
                  </div>
                  <div>
                      <Label htmlFor="locationName" className="text-gray-300">Location Name</Label>
                    <Input
                      id="locationName"
                      value={newLocation.name}
                      onChange={(e) => setNewLocation({...newLocation, name: e.target.value})}
                      placeholder="e.g., Kano"
                      required
                        className="bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                    />
                  </div>
                  <div>
                      <Label htmlFor="displayName" className="text-gray-300">Display Name</Label>
                    <Input
                      id="displayName"
                        value={newLocation.display_name}
                        onChange={(e) => setNewLocation({...newLocation, display_name: e.target.value})}
                      placeholder="e.g., PHSWEB Kano Branch"
                      required
                        className="bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                      />
                    </div>
                    <div>
                      <Label htmlFor="city" className="text-gray-300">City</Label>
                      <Input
                        id="city"
                        value={newLocation.city}
                        onChange={(e) => setNewLocation({...newLocation, city: e.target.value})}
                        placeholder="e.g., Kano"
                        className="bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                    />
                  </div>
                  <div>
                      <Label htmlFor="state" className="text-gray-300">State</Label>
                    <Input
                        id="state"
                        value={newLocation.state}
                        onChange={(e) => setNewLocation({...newLocation, state: e.target.value})}
                        placeholder="e.g., Kano"
                        className="bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                    />
                  </div>
                  
                  {/* New fields for hotspot registration */}
                  <div>
                    <Label htmlFor="groupId" className="text-gray-300">Group ID</Label>
                    <Input
                      id="groupId"
                      type="number"
                      value={newLocation.group_id}
                      onChange={(e) => setNewLocation({...newLocation, group_id: parseInt(e.target.value) || 1})}
                      placeholder="1"
                      min="1"
                      required
                      className="bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                    />
                    <p className="text-xs text-gray-500 mt-1">Radius Manager group ID for users registered at this location</p>
                  </div>
                  
                  <div>
                    <Label htmlFor="defaultOwner" className="text-gray-300">Default Owner</Label>
                    <select
                      id="defaultOwner"
                      value={newLocation.default_owner_id}
                      onChange={(e) => setNewLocation({...newLocation, default_owner_id: e.target.value})}
                      className="flex h-10 w-full rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select an owner...</option>
                      {accountOwners.map(owner => (
                        <option key={owner.id} value={owner.id}>
                          {owner.name} ({owner.commission_rate}%)
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Account owner for commission tracking</p>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="hotspotEnabled" className="text-gray-300">Hotspot Server Enabled</Label>
                      <p className="text-xs text-gray-500 mt-1">Enable/disable hotspot system on MikroTik router</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        id="hotspotEnabled"
                        type="checkbox"
                        checked={newLocation.registration_enabled}
                        onChange={(e) => setNewLocation({...newLocation, registration_enabled: e.target.checked})}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {/* Landing Page Customization Section */}
                  <div className="border-t border-gray-700 pt-4">
                    <h4 className="text-md font-medium text-white mb-3">Landing Page Customization</h4>
                    
                    <div>
                      <Label htmlFor="welcomeMessage" className="text-gray-300">Welcome Message</Label>
                      <Input
                        id="welcomeMessage"
                        value={newLocation.welcome_message}
                        onChange={(e) => setNewLocation({...newLocation, welcome_message: e.target.value})}
                        placeholder="e.g., Welcome to PHSWEB Awka!"
                        className="bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                      />
                      <p className="text-xs text-gray-500 mt-1">Custom welcome message shown on hotspot login page</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="brandColorPrimary" className="text-gray-300">Primary Color</Label>
                        <select
                          id="brandColorPrimary"
                          value={newLocation.brand_color_primary}
                          onChange={(e) => setNewLocation({...newLocation, brand_color_primary: e.target.value})}
                          className="flex h-10 w-full rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="from-blue-600 to-purple-600">Blue to Purple</option>
                          <option value="from-green-600 to-teal-600">Green to Teal</option>
                          <option value="from-orange-600 to-red-600">Orange to Red</option>
                          <option value="from-purple-600 to-pink-600">Purple to Pink</option>
                          <option value="from-indigo-600 to-blue-600">Indigo to Blue</option>
                          <option value="from-gray-600 to-slate-600">Gray to Slate</option>
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="brandColorSecondary" className="text-gray-300">Background Color</Label>
                        <select
                          id="brandColorSecondary"
                          value={newLocation.brand_color_secondary}
                          onChange={(e) => setNewLocation({...newLocation, brand_color_secondary: e.target.value})}
                          className="flex h-10 w-full rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="from-blue-50 to-purple-50">Light Blue to Purple</option>
                          <option value="from-green-50 to-teal-50">Light Green to Teal</option>
                          <option value="from-orange-50 to-red-50">Light Orange to Red</option>
                          <option value="from-purple-50 to-pink-50">Light Purple to Pink</option>
                          <option value="from-indigo-50 to-blue-50">Light Indigo to Blue</option>
                          <option value="from-gray-50 to-slate-50">Light Gray to Slate</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="contactPhone" className="text-gray-300">Contact Phone</Label>
                        <Input
                          id="contactPhone"
                          value={newLocation.contact_phone}
                          onChange={(e) => setNewLocation({...newLocation, contact_phone: e.target.value})}
                          placeholder="e.g., +234-XXX-XXX-XXXX"
                          className="bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                        />
                      </div>
                      <div>
                        <Label htmlFor="contactEmail" className="text-gray-300">Contact Email</Label>
                        <Input
                          id="contactEmail"
                          type="email"
                          value={newLocation.contact_email}
                          onChange={(e) => setNewLocation({...newLocation, contact_email: e.target.value})}
                          placeholder="e.g., awka@phsweb.com"
                          className="bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="features" className="text-gray-300">Features</Label>
                      <Input
                        id="features"
                        value={newLocation.features.join(', ')}
                        onChange={(e) => setNewLocation({...newLocation, features: e.target.value.split(', ').filter(f => f.trim())})}
                        placeholder="e.g., High-Speed Internet, 24/7 Support, Secure Connection"
                        className="bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                      />
                      <p className="text-xs text-gray-500 mt-1">Comma-separated list of features to display</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                      <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">Add Location</Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setShowAddLocation(false)}
                        className="flex-1 bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
        </AnimatePresence>

        {/* Edit Location Modal */}
        <AnimatePresence>
        {showEditLocation && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-gray-900 rounded-lg w-full max-w-md border border-gray-700"
            >
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-4 text-white">Edit Hotspot Location</h3>
                <form onSubmit={handleSaveEditLocation} className="space-y-4">
                  <div>
                    <Label htmlFor="editLocationName" className="text-gray-300">Location Name</Label>
                    <Input
                      id="editLocationName"
                      value={editLocation.name}
                      onChange={(e) => setEditLocation({...editLocation, name: e.target.value})}
                      placeholder="e.g., Kano"
                      required
                      className="bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                    />
                  </div>
                  <div>
                    <Label htmlFor="editDisplayName" className="text-gray-300">Display Name</Label>
                    <Input
                      id="editDisplayName"
                      value={editLocation.display_name}
                      onChange={(e) => setEditLocation({...editLocation, display_name: e.target.value})}
                      placeholder="e.g., PHSWEB Kano Branch"
                      required
                      className="bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                    />
                  </div>
                  <div>
                    <Label htmlFor="editDescription" className="text-gray-300">Description</Label>
                    <Input
                      id="editDescription"
                      value={editLocation.description}
                      onChange={(e) => setEditLocation({...editLocation, description: e.target.value})}
                      placeholder="Optional description"
                      className="bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                    />
                  </div>
                  <div>
                    <Label htmlFor="editCity" className="text-gray-300">City</Label>
                    <Input
                      id="editCity"
                      value={editLocation.city}
                      onChange={(e) => setEditLocation({...editLocation, city: e.target.value})}
                      placeholder="e.g., Kano"
                      className="bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                    />
                  </div>
                  <div>
                    <Label htmlFor="editState" className="text-gray-300">State</Label>
                    <Input
                      id="editState"
                      value={editLocation.state}
                      onChange={(e) => setEditLocation({...editLocation, state: e.target.value})}
                      placeholder="e.g., Kano"
                      className="bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                    />
                  </div>
                  
                  {/* Hotspot-specific fields */}
                  <div>
                    <Label htmlFor="editGroupId" className="text-gray-300">Group ID</Label>
                    <Input
                      id="editGroupId"
                      type="number"
                      value={editLocation.group_id}
                      onChange={(e) => setEditLocation({...editLocation, group_id: parseInt(e.target.value) || 1})}
                      placeholder="1"
                      min="1"
                      required
                      className="bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                    />
                    <p className="text-xs text-gray-500 mt-1">Radius Manager group ID for users registered at this location</p>
                  </div>
                  
                  <div>
                    <Label htmlFor="editDefaultOwner" className="text-gray-300">Default Owner</Label>
                    <select
                      id="editDefaultOwner"
                      value={editLocation.default_owner_id}
                      onChange={(e) => setEditLocation({...editLocation, default_owner_id: e.target.value})}
                      className="flex h-10 w-full rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select an owner...</option>
                      {accountOwners.map(owner => (
                        <option key={owner.id} value={owner.id}>
                          {owner.name} ({owner.commission_rate}%)
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Account owner for commission tracking</p>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="editHotspotEnabled" className="text-gray-300">Hotspot Server Enabled</Label>
                      <p className="text-xs text-gray-500 mt-1">Enable/disable hotspot system on MikroTik router</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        id="editHotspotEnabled"
                        type="checkbox"
                        checked={editLocation.registration_enabled}
                        onChange={(e) => setEditLocation({...editLocation, registration_enabled: e.target.checked})}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {/* Landing Page Customization Section */}
                  <div className="border-t border-gray-700 pt-4">
                    <h4 className="text-md font-medium text-white mb-3">Landing Page Customization</h4>
                    
                    <div>
                      <Label htmlFor="editWelcomeMessage" className="text-gray-300">Welcome Message</Label>
                      <Input
                        id="editWelcomeMessage"
                        value={editLocation.welcome_message}
                        onChange={(e) => setEditLocation({...editLocation, welcome_message: e.target.value})}
                        placeholder="e.g., Welcome to PHSWEB Awka!"
                        className="bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                      />
                      <p className="text-xs text-gray-500 mt-1">Custom welcome message shown on hotspot login page</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="editBrandColorPrimary" className="text-gray-300">Primary Color</Label>
                        <select
                          id="editBrandColorPrimary"
                          value={editLocation.brand_color_primary}
                          onChange={(e) => setEditLocation({...editLocation, brand_color_primary: e.target.value})}
                          className="flex h-10 w-full rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="from-blue-600 to-purple-600">Blue to Purple</option>
                          <option value="from-green-600 to-teal-600">Green to Teal</option>
                          <option value="from-orange-600 to-red-600">Orange to Red</option>
                          <option value="from-purple-600 to-pink-600">Purple to Pink</option>
                          <option value="from-indigo-600 to-blue-600">Indigo to Blue</option>
                          <option value="from-gray-600 to-slate-600">Gray to Slate</option>
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="editBrandColorSecondary" className="text-gray-300">Background Color</Label>
                        <select
                          id="editBrandColorSecondary"
                          value={editLocation.brand_color_secondary}
                          onChange={(e) => setEditLocation({...editLocation, brand_color_secondary: e.target.value})}
                          className="flex h-10 w-full rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="from-blue-50 to-purple-50">Light Blue to Purple</option>
                          <option value="from-green-50 to-teal-50">Light Green to Teal</option>
                          <option value="from-orange-50 to-red-50">Light Orange to Red</option>
                          <option value="from-purple-50 to-pink-50">Light Purple to Pink</option>
                          <option value="from-indigo-50 to-blue-50">Light Indigo to Blue</option>
                          <option value="from-gray-50 to-slate-50">Light Gray to Slate</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="editContactPhone" className="text-gray-300">Contact Phone</Label>
                        <Input
                          id="editContactPhone"
                          value={editLocation.contact_phone}
                          onChange={(e) => setEditLocation({...editLocation, contact_phone: e.target.value})}
                          placeholder="e.g., +234-XXX-XXX-XXXX"
                          className="bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                        />
                      </div>
                      <div>
                        <Label htmlFor="editContactEmail" className="text-gray-300">Contact Email</Label>
                        <Input
                          id="editContactEmail"
                          type="email"
                          value={editLocation.contact_email}
                          onChange={(e) => setEditLocation({...editLocation, contact_email: e.target.value})}
                          placeholder="e.g., awka@phsweb.com"
                          className="bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="editFeatures" className="text-gray-300">Features</Label>
                      <Input
                        id="editFeatures"
                        value={editLocation.features.join(', ')}
                        onChange={(e) => setEditLocation({...editLocation, features: e.target.value.split(', ').filter(f => f.trim())})}
                        placeholder="e.g., High-Speed Internet, 24/7 Support, Secure Connection"
                        className="bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                      />
                      <p className="text-xs text-gray-500 mt-1">Comma-separated list of features to display</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                    <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setShowEditLocation(null)}
                      className="flex-1 bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
        </AnimatePresence>

        {/* Router Configuration Modal */}
        <AnimatePresence>
          {showRouterConfig && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-gray-900 rounded-lg w-full max-w-lg border border-gray-700"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Router Configuration</h3>
                    <div className="flex items-center gap-2">
                      {locations.find(l => l.id === showRouterConfig)?.routerConfig && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => testConnection(
                            showRouterConfig!, 
                            locations.find(l => l.id === showRouterConfig)!.routerConfig!
                          )}
                          disabled={isTestingConnection === showRouterConfig}
                          className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                        >
                          <TestTube className="h-4 w-4 mr-1" />
                          Test Connection
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-400 mb-4">
                    Configure MikroTik router for location: {locations.find(l => l.id === showRouterConfig)?.display_name}
                  </p>
                  <form onSubmit={handleSaveRouterConfig} className="space-y-4">
                    <div>
                      <Label htmlFor="routerHost" className="text-gray-300">Router IP/Host</Label>
                      <Input
                        id="routerHost"
                        value={routerConfig.host}
                        onChange={(e) => setRouterConfig({...routerConfig, host: e.target.value})}
                        placeholder="e.g., 192.168.1.1"
                        required
                        className="bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                      />
                    </div>
                    <div>
                      <Label htmlFor="routerUsername" className="text-gray-300">Username</Label>
                      <Input
                        id="routerUsername"
                        value={routerConfig.username}
                        onChange={(e) => setRouterConfig({...routerConfig, username: e.target.value})}
                        placeholder="e.g., admin"
                        required
                        className="bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                      />
                    </div>
                    <div>
                      <Label htmlFor="routerPassword" className="text-gray-300">Password</Label>
                      <div className="relative">
                        <Input
                          id="routerPassword"
                          type={showPassword ? "text" : "password"}
                          value={routerConfig.password}
                          onChange={(e) => setRouterConfig({...routerConfig, password: e.target.value})}
                          placeholder="Enter router password"
                          required
                          className="bg-gray-800 border-gray-600 text-white placeholder-gray-400 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="connectionType" className="text-gray-300">Connection Type</Label>
                      <select 
                        id="connectionType"
                        value={routerConfig.connection_type} 
                        onChange={(e) => setRouterConfig({...routerConfig, connection_type: e.target.value as 'api' | 'ssh' | 'winbox'})}
                        className="flex h-10 w-full rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="api">API (Recommended)</option>
                        <option value="ssh">SSH</option>
                        <option value="winbox">Winbox</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="routerPort" className="text-gray-300">API Port</Label>
                        <Input
                          id="routerPort"
                          type="number"
                          value={routerConfig.port}
                          onChange={(e) => setRouterConfig({...routerConfig, port: parseInt(e.target.value)})}
                          placeholder="8728"
                          className="bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                        />
                      </div>
                      <div>
                        <Label htmlFor="routerApiPort" className="text-gray-300">HTTP Port</Label>
                        <Input
                          id="routerApiPort"
                          type="number"
                          value={routerConfig.api_port}
                          onChange={(e) => setRouterConfig({...routerConfig, api_port: parseInt(e.target.value)})}
                          placeholder="80"
                          className="bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                        />
                      </div>
                    </div>
                    <div className="flex gap-3 pt-4">
                      <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
                        <Save className="h-4 w-4 mr-2" />
                        Save Configuration
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setShowRouterConfig(null)}
                        className="flex-1 bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Integration Instructions */}
        <div className="mt-12">
          <Card className="bg-gray-900/80 border-gray-700">
            <CardHeader>
              <h3 className="text-lg font-semibold text-white">MikroTik Integration Instructions</h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-sm">
                <div>
                  <h4 className="font-medium text-white mb-2">1. Configure Walled Garden</h4>
                  <p className="text-gray-300 mb-2">Add your domain to MikroTik&apos;s walled garden:</p>
                  <code className="bg-gray-800 px-2 py-1 rounded text-xs block text-gray-300">
                    /ip hotspot walled-garden add dst-host=yourdomain.com action=allow
                  </code>
                </div>
                
                <div>
                  <h4 className="font-medium text-white mb-2">2. Update login.html</h4>
                  <p className="text-gray-300 mb-2">Replace the content of your MikroTik&apos;s login.html file:</p>
                  <code className="bg-gray-800 px-2 py-1 rounded text-xs block whitespace-pre-wrap text-gray-300">
{`<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="refresh" content="0; url=https://yourdomain.com/hotspot/LOCATION_ID?$(query-string)">
</head>
<body>
    <p>Redirecting to login page...</p>
</body>
</html>`}
                  </code>
                </div>

                <div>
                  <h4 className="font-medium text-white mb-2">3. Replace LOCATION_ID</h4>
                  <p className="text-gray-300">Replace LOCATION_ID with the actual location ID (e.g., awka, lagos, abuja) for each router.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 