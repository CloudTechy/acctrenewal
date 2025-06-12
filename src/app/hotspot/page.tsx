'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Wifi, 
  MapPin, 
  Users, 
  Activity, 
  Settings, 
  Plus,
  Edit3,
  Trash2,
  Eye,
  Copy,
  ExternalLink
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Location management interface
interface HotspotLocation {
  id: string;
  name: string;
  displayName: string;
  status: 'active' | 'inactive' | 'maintenance';
  activeUsers: number;
  totalUsers: number;
  lastActivity: string;
  loginUrl: string;
  mikrotikConfig?: {
    routerIp: string;
    hotspotProfile: string;
  };
}

// Mock data for demonstration
const mockLocations: HotspotLocation[] = [
  {
    id: 'awka',
    name: 'Awka',
    displayName: 'PHSWEB Awka Branch',
    status: 'active',
    activeUsers: 23,
    totalUsers: 150,
    lastActivity: '2 minutes ago',
    loginUrl: `${typeof window !== 'undefined' ? window.location.origin : ''}/hotspot/awka`,
    mikrotikConfig: {
      routerIp: '192.168.1.1',
      hotspotProfile: 'hsprof1'
    }
  },
  {
    id: 'lagos',
    name: 'Lagos',
    displayName: 'PHSWEB Lagos Island',
    status: 'active',
    activeUsers: 45,
    totalUsers: 300,
    lastActivity: '1 minute ago',
    loginUrl: `${typeof window !== 'undefined' ? window.location.origin : ''}/hotspot/lagos`,
    mikrotikConfig: {
      routerIp: '192.168.2.1',
      hotspotProfile: 'hsprof2'
    }
  },
  {
    id: 'abuja',
    name: 'Abuja',
    displayName: 'PHSWEB Abuja Central',
    status: 'maintenance',
    activeUsers: 0,
    totalUsers: 200,
    lastActivity: '1 hour ago',
    loginUrl: `${typeof window !== 'undefined' ? window.location.origin : ''}/hotspot/abuja`,
    mikrotikConfig: {
      routerIp: '192.168.3.1',
      hotspotProfile: 'hsprof3'
    }
  }
];

export default function HotspotManagementPage() {
  const [locations, setLocations] = useState<HotspotLocation[]>(mockLocations);
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [newLocation, setNewLocation] = useState({
    id: '',
    name: '',
    displayName: '',
    routerIp: ''
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  const handleAddLocation = (e: React.FormEvent) => {
    e.preventDefault();
    const location: HotspotLocation = {
      ...newLocation,
      status: 'inactive',
      activeUsers: 0,
      totalUsers: 0,
      lastActivity: 'Never',
      loginUrl: `${typeof window !== 'undefined' ? window.location.origin : ''}/hotspot/${newLocation.id}`,
      mikrotikConfig: {
        routerIp: newLocation.routerIp,
        hotspotProfile: 'default'
      }
    };
    
    setLocations([...locations, location]);
    setNewLocation({ id: '', name: '', displayName: '', routerIp: '' });
    setShowAddLocation(false);
  };

  const totalActiveUsers = locations.reduce((sum, loc) => sum + loc.activeUsers, 0);
  const totalUsers = locations.reduce((sum, loc) => sum + loc.totalUsers, 0);
  const activeLocations = locations.filter(loc => loc.status === 'active').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-white/20 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg">
                <Wifi className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Hotspot Management</h1>
                <p className="text-sm text-gray-600">Manage your MikroTik hotspot locations</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/">
                <Button variant="outline" size="sm">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Main Site
                </Button>
              </Link>
              <Button 
                onClick={() => setShowAddLocation(true)}
                size="sm"
                className="bg-gradient-to-r from-blue-600 to-purple-600"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Location
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm">Active Users</p>
                    <p className="text-3xl font-bold">{totalActiveUsers}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-200" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm">Total Users</p>
                    <p className="text-3xl font-bold">{totalUsers}</p>
                  </div>
                  <Activity className="h-8 w-8 text-green-200" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm">Active Locations</p>
                    <p className="text-3xl font-bold">{activeLocations}</p>
                  </div>
                  <MapPin className="h-8 w-8 text-purple-200" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-100 text-sm">Total Locations</p>
                    <p className="text-3xl font-bold">{locations.length}</p>
                  </div>
                  <Settings className="h-8 w-8 text-orange-200" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Locations List */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">Hotspot Locations</h2>
          
          <div className="grid gap-6">
            {locations.map((location, index) => (
              <motion.div
                key={location.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
              >
                <Card className="hover:shadow-lg transition-all duration-200">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg">
                            <MapPin className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">{location.displayName}</h3>
                            <p className="text-sm text-gray-600">ID: {location.id}</p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(location.status)}`}>
                            {location.status.toUpperCase()}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-gray-600">Active Users</p>
                            <p className="text-xl font-semibold text-blue-600">{location.activeUsers}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Total Users</p>
                            <p className="text-xl font-semibold text-green-600">{location.totalUsers}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Router IP</p>
                            <p className="text-sm font-mono text-gray-800">{location.mikrotikConfig?.routerIp}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Last Activity</p>
                            <p className="text-sm text-gray-800">{location.lastActivity}</p>
                          </div>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-3 mb-4">
                          <p className="text-xs text-gray-600 mb-1">Hotspot Login URL:</p>
                          <div className="flex items-center gap-2">
                            <code className="text-xs bg-white px-2 py-1 rounded border flex-1 text-gray-800">
                              {location.loginUrl}
                            </code>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyToClipboard(location.loginUrl)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Link href={location.loginUrl} target="_blank">
                              <Button size="sm" variant="outline">
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 ml-4">
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Add Location Modal */}
        {showAddLocation && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-lg w-full max-w-md"
            >
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-4">Add New Hotspot Location</h3>
                <form onSubmit={handleAddLocation} className="space-y-4">
                  <div>
                    <Label htmlFor="locationId">Location ID</Label>
                    <Input
                      id="locationId"
                      value={newLocation.id}
                      onChange={(e) => setNewLocation({...newLocation, id: e.target.value.toLowerCase().replace(/\s+/g, '-')})}
                      placeholder="e.g., kano, port-harcourt"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="locationName">Location Name</Label>
                    <Input
                      id="locationName"
                      value={newLocation.name}
                      onChange={(e) => setNewLocation({...newLocation, name: e.target.value})}
                      placeholder="e.g., Kano"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input
                      id="displayName"
                      value={newLocation.displayName}
                      onChange={(e) => setNewLocation({...newLocation, displayName: e.target.value})}
                      placeholder="e.g., PHSWEB Kano Branch"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="routerIp">MikroTik Router IP</Label>
                    <Input
                      id="routerIp"
                      value={newLocation.routerIp}
                      onChange={(e) => setNewLocation({...newLocation, routerIp: e.target.value})}
                      placeholder="e.g., 192.168.1.1"
                      required
                    />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <Button type="submit" className="flex-1">Add Location</Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setShowAddLocation(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}

        {/* Integration Instructions */}
        <div className="mt-12">
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">MikroTik Integration Instructions</h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-sm">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">1. Configure Walled Garden</h4>
                  <p className="text-gray-600 mb-2">Add your domain to MikroTik's walled garden:</p>
                  <code className="bg-gray-100 px-2 py-1 rounded text-xs block">
                    /ip hotspot walled-garden add dst-host=yourdomain.com action=allow
                  </code>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">2. Update login.html</h4>
                  <p className="text-gray-600 mb-2">Replace the content of your MikroTik's login.html file:</p>
                  <code className="bg-gray-100 px-2 py-1 rounded text-xs block whitespace-pre-wrap">
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
                  <h4 className="font-medium text-gray-900 mb-2">3. Replace LOCATION_ID</h4>
                  <p className="text-gray-600">Replace LOCATION_ID with the actual location ID (e.g., awka, lagos, abuja) for each router.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 