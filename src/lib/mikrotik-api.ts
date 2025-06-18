/* eslint-disable @typescript-eslint/no-explicit-any */
// MikroTik API integration service - Server-side only
// This module should only be used in API routes or server components
// TypeScript strict checking disabled due to third-party library limitations

// Global error handler for RouterOS API uncaught exceptions
if (typeof process !== 'undefined') {
  process.on('uncaughtException', (error: any) => {
    if (error.errno === 'UNKNOWNREPLY' || error.message?.includes('!empty')) {
      console.log('Caught RouterOS empty reply - this is normal for unconfigured hotspots');
      return; // Don't crash the process
    }
    // For other uncaught exceptions, log but don't crash in development
    console.error('Uncaught Exception:', error);
  });

  process.on('unhandledRejection', (reason: any) => {
    if (reason?.errno === 'UNKNOWNREPLY' || reason?.message?.includes('!empty')) {
      console.log('Caught RouterOS empty reply rejection - this is normal for unconfigured hotspots');
      return;
    }
    console.error('Unhandled Rejection:', reason);
  });
}

interface MikroTikConnection {
  host: string;
  user: string;
  password: string;
  port?: number;
  useRestApi?: boolean; // New option to use REST API instead of RouterOS API
}

interface HotspotActiveUser {
  id: string;
  server: string;
  user: string;
  address: string;
  mac: string;
  loginTime: string;
  uptime: string;
  bytesIn: number;
  bytesOut: number;
}

interface HotspotUser {
  name: string;
  password: string;
  profile: string;
  disabled: boolean;
}

interface HotspotStats {
  activeUsers: number;
  totalUsers: number;
  totalActiveTime: number;
  totalBytesIn: number;
  totalBytesOut: number;
  lastActivity: string;
}

interface RouterStatus {
  isOnline: boolean;
  uptime: string;
  version: string;
  cpuLoad: number;
  freeMemory: number;
  totalMemory: number;
}

// Type for RouterOS API instance - using unknown for flexibility with the actual library
type RouterOSAPIInstance = unknown;

// Dynamic import function to load RouterOS API only when needed
async function getRouterOSAPI() {
  if (typeof window !== 'undefined') {
    throw new Error('MikroTik API can only be used on the server side');
  }
  
  try {
    const { RouterOSAPI } = await import('node-routeros');
    return RouterOSAPI;
  } catch (error) {
    console.error('Failed to import node-routeros:', error);
    throw new Error('RouterOS API not available');
  }
}

/**
 * REST API implementation for MikroTik routers
 * Optimized for 5-minute interval data collection
 */
class MikroTikRestAPI {
  private baseUrl: string;
  private auth: string;
  private timeout: number;
  private maxRetries: number;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheDuration: number;

  constructor(config: MikroTikConnection) {
    // MikroTik REST API runs on port 80 (HTTP) or 443 (HTTPS)
    // If no port specified, default to 80 for REST API
    const port = config.port || 80;
    const protocol = port === 443 ? 'https' : 'http';
    const portSuffix = (port !== 80 && port !== 443) ? `:${port}` : '';
    this.baseUrl = `${protocol}://${config.host}${portSuffix}/rest`;
    this.auth = 'Basic ' + Buffer.from(`${config.user}:${config.password}`).toString('base64');
    
    // Optimization settings
    this.timeout = parseInt(process.env.MIKROTIK_REQUEST_TIMEOUT || '10000');
    this.maxRetries = parseInt(process.env.MIKROTIK_MAX_RETRIES || '2');
    this.cacheDuration = parseInt(process.env.MIKROTIK_CACHE_DURATION || '300000'); // 5 minutes
  }

  private getCacheKey(endpoint: string): string {
    return `${this.baseUrl}${endpoint}`;
  }

  private isValidCache(cacheKey: string): boolean {
    const cached = this.cache.get(cacheKey);
    if (!cached) return false;
    
    const now = Date.now();
    return (now - cached.timestamp) < this.cacheDuration;
  }

  private setCache(cacheKey: string, data: any): void {
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
  }

  private async makeRequestWithRetry(endpoint: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', body?: any): Promise<any> {
    const cacheKey = this.getCacheKey(endpoint);
    
    // Check cache for GET requests
    if (method === 'GET' && this.isValidCache(cacheKey)) {
      console.log(`Cache hit for ${endpoint}`);
      return this.cache.get(cacheKey)!.data;
    }

    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await this.makeRequest(endpoint, method, body);
        
        // Cache successful GET requests
        if (method === 'GET') {
          this.setCache(cacheKey, result);
        }
        
        return result;
      } catch (error) {
        lastError = error as Error;
        console.log(`Attempt ${attempt}/${this.maxRetries} failed for ${endpoint}: ${lastError.message}`);
        
        if (attempt < this.maxRetries) {
          // Exponential backoff: wait 1s, then 2s, then 4s
          const delay = Math.pow(2, attempt - 1) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError || new Error('All retry attempts failed');
  }

  private async makeRequest(endpoint: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', body?: any): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.auth,
          'Connection': 'keep-alive', // Enable connection reuse
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`Request timeout after ${this.timeout}ms`);
        }
        if (error.message.includes('HeadersTimeoutError')) {
          throw new Error(`Headers timeout - router may be overloaded`);
        }
      }
      
      console.error(`REST API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  async getActiveUsers(): Promise<HotspotActiveUser[]> {
    try {
      const users = await this.makeRequestWithRetry('/ip/hotspot/active');
      return users.map((user: any) => ({
        id: user['.id'] || '',
        server: user.server || '',
        user: user.user || 'unknown',
        address: user.address || '',
        mac: user['mac-address'] || '',
        loginTime: user['login-time'] || '',
        uptime: user.uptime || '',
        bytesIn: parseInt(user['bytes-in'] || '0'),
        bytesOut: parseInt(user['bytes-out'] || '0'),
      }));
    } catch (error) {
      console.error('REST API: Error fetching active users:', error);
      return [];
    }
  }

  async getAllUsers(): Promise<HotspotUser[]> {
    try {
      const users = await this.makeRequestWithRetry('/ip/hotspot/user');
      return users.map((user: any) => ({
        name: user.name || '',
        password: user.password || '',
        profile: user.profile || '',
        disabled: user.disabled === 'true',
      }));
    } catch (error) {
      console.error('REST API: Error fetching all users:', error);
      return [];
    }
  }

  async getSystemResource(): Promise<any> {
    try {
      const resource = await this.makeRequestWithRetry('/system/resource');
      return resource[0] || {};
    } catch (error) {
      console.error('REST API: Error fetching system resource:', error);
      return {};
    }
  }

  async getSystemIdentity(): Promise<any> {
    try {
      const identity = await this.makeRequestWithRetry('/system/identity');
      return identity[0] || {};
    } catch (error) {
      console.error('REST API: Error fetching system identity:', error);
      return {};
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.makeRequestWithRetry('/system/identity');
      return true;
    } catch {
      return false;
    }
  }

  // Clear cache when needed
  clearCache(): void {
    this.cache.clear();
  }

  // Get cache statistics
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

/**
 * Helper function to safely execute RouterOS API commands with proper error handling
 */
async function safeApiCall<T>(
  api: any, 
  command: string, 
  params?: Record<string, string>,
  defaultValue: T = [] as unknown as T
): Promise<T> {
  try {
    const result = params 
      ? await api.write(command, params)
      : await api.write(command);
    
    // Handle empty responses (which are normal for unconfigured hotspots)
    if (!result || (Array.isArray(result) && result.length === 0)) {
      return defaultValue;
    }
    
    return result;
  } catch (error: any) {
    // Handle specific RouterOS errors
    if (error.errno === 'UNKNOWNREPLY' || error.message?.includes('!empty')) {
      console.log(`Empty response for command ${command} - this is normal for unconfigured hotspots`);
      return defaultValue;
    }
    
    // Handle other common RouterOS errors
    if (error.errno === 'ECONNREFUSED') {
      throw new Error('Router connection refused - check if router is accessible');
    }
    
    if (error.errno === 'ETIMEDOUT') {
      throw new Error('Router connection timeout - check network connectivity');
    }
    
    if (error.message?.includes('invalid user name or password')) {
      throw new Error('Authentication failed - check username and password');
    }
    
    // Log and re-throw other errors
    console.error(`RouterOS API error for command ${command}:`, error);
    throw error;
  }
}

export class MikroTikAPIService {
  private connections: Map<string, RouterOSAPIInstance> = new Map();
  private restClients: Map<string, MikroTikRestAPI> = new Map();

  /**
   * Establish connection to a MikroTik router
   */
  async connect(locationId: string, config: MikroTikConnection): Promise<boolean> {
    // If REST API is preferred, create REST client
    if (config.useRestApi) {
      try {
        const restClient = new MikroTikRestAPI(config);
        const isConnected = await restClient.testConnection();
        if (isConnected) {
          this.restClients.set(locationId, restClient);
          console.log(`Connected to MikroTik router via REST API at ${config.host} for location ${locationId}`);
          return true;
        }
        return false;
      } catch (error) {
        console.error(`Failed to connect via REST API to ${config.host}:`, error);
        return false;
      }
    }

    // Fallback to RouterOS API
    try {
      const RouterOSAPI = await getRouterOSAPI();
      
      const api = new RouterOSAPI({
        host: config.host,
        user: config.user || 'admin',
        password: config.password,
        port: config.port || 8728,
        timeout: 10000,
      }) as RouterOSAPIInstance;

      // Add comprehensive error handlers to prevent uncaught exceptions
      (api as any).on('error', (error: any) => {
        if (error.errno === 'UNKNOWNREPLY' || error.message?.includes('!empty')) {
          console.log(`RouterOS empty reply for ${locationId} - this is normal for unconfigured hotspots`);
          return;
        }
        console.error(`RouterOS API error for ${locationId}:`, error);
      });

      // Add additional event handlers
      (api as any).on('close', () => {
        console.log(`RouterOS connection closed for ${locationId}`);
      });

      (api as any).on('timeout', () => {
        console.log(`RouterOS connection timeout for ${locationId}`);
      });

      await (api as any).connect();
      this.connections.set(locationId, api);
      
      console.log(`Connected to MikroTik router via RouterOS API at ${config.host} for location ${locationId}`);
      return true;
    } catch (error) {
      console.error(`Failed to connect to MikroTik router ${config.host}:`, error);
      return false;
    }
  }

  /**
   * Disconnect from a router
   */
  async disconnect(locationId: string): Promise<void> {
    // Disconnect REST client
    this.restClients.delete(locationId);

    // Disconnect RouterOS API
    const api = this.connections.get(locationId);
    if (api) {
      try {
        await (api as any).close();
      } catch (error) {
        console.error(`Error closing connection for ${locationId}:`, error);
      }
      this.connections.delete(locationId);
    }
  }

  /**
   * Get active hotspot users for a location
   */
  async getActiveUsers(locationId: string): Promise<HotspotActiveUser[]> {
    // Try REST API first
    const restClient = this.restClients.get(locationId);
    if (restClient) {
      return await restClient.getActiveUsers();
    }

    // Fallback to RouterOS API
    const api = this.connections.get(locationId);
    if (!api) {
      throw new Error(`No connection established for location ${locationId}`);
    }

    try {
      const result = await safeApiCall<any[]>(
        api, 
        '/ip/hotspot/active/print',
        undefined,
        []
      );
      
      return result.map((user: Record<string, string>) => ({
        id: user['.id'],
        server: user.server || '',
        user: user.user || 'unknown',
        address: user.address || '',
        mac: user['mac-address'] || '',
        loginTime: user['login-time'] || '',
        uptime: user.uptime || '',
        bytesIn: parseInt(user['bytes-in'] || '0'),
        bytesOut: parseInt(user['bytes-out'] || '0'),
      }));
    } catch (error) {
      console.error(`Error fetching active users for ${locationId}:`, error);
      return [];
    }
  }

  /**
   * Get all configured hotspot users
   */
  async getAllUsers(locationId: string): Promise<HotspotUser[]> {
    // Try REST API first
    const restClient = this.restClients.get(locationId);
    if (restClient) {
      return await restClient.getAllUsers();
    }

    // Fallback to RouterOS API
    const api = this.connections.get(locationId);
    if (!api) {
      throw new Error(`No connection established for location ${locationId}`);
    }

    try {
      const result = await safeApiCall<any[]>(
        api,
        '/ip/hotspot/user/print',
        undefined,
        []
      );
      
      return result.map((user: Record<string, string>) => ({
        name: user.name || '',
        password: user.password || '',
        profile: user.profile || '',
        disabled: user.disabled === 'true',
      }));
    } catch (error) {
      console.error(`Error fetching all users for ${locationId}:`, error);
      return [];
    }
  }

  /**
   * Get comprehensive hotspot statistics
   */
  async getHotspotStats(locationId: string): Promise<HotspotStats> {
    try {
      const [activeUsers, allUsers] = await Promise.all([
        this.getActiveUsers(locationId),
        this.getAllUsers(locationId),
      ]);

      // Calculate total bytes
      const totalBytesIn = activeUsers.reduce((sum, user) => sum + user.bytesIn, 0);
      const totalBytesOut = activeUsers.reduce((sum, user) => sum + user.bytesOut, 0);

      // Find most recent activity
      const lastActivity = activeUsers.length > 0 
        ? this.formatLastActivity(Math.max(...activeUsers.map(u => 
            new Date(u.loginTime).getTime() || 0
          )))
        : 'No recent activity';

      return {
        activeUsers: activeUsers.length,
        totalUsers: allUsers.length,
        totalActiveTime: 0, // Could be calculated from uptime
        totalBytesIn,
        totalBytesOut,
        lastActivity,
      };
    } catch (error) {
      console.error(`Error getting stats for ${locationId}:`, error);
      return {
        activeUsers: 0,
        totalUsers: 0,
        totalActiveTime: 0,
        totalBytesIn: 0,
        totalBytesOut: 0,
        lastActivity: 'Connection failed',
      };
    }
  }

  /**
   * Get router system status
   */
  async getRouterStatus(locationId: string): Promise<RouterStatus> {
    // Try REST API first
    const restClient = this.restClients.get(locationId);
    if (restClient) {
      try {
        const resource = await restClient.getSystemResource();

        return {
          isOnline: true,
          uptime: resource.uptime || 'Unknown',
          version: resource.version || 'Unknown',
          cpuLoad: parseInt(resource['cpu-load'] || '0'),
          freeMemory: parseInt(resource['free-memory'] || '0'),
          totalMemory: parseInt(resource['total-memory'] || '0'),
        };
      } catch (error) {
        console.error(`REST API: Error getting router status for ${locationId}:`, error);
        return {
          isOnline: false,
          uptime: 'Unknown',
          version: 'Unknown',
          cpuLoad: 0,
          freeMemory: 0,
          totalMemory: 0,
        };
      }
    }

    // Fallback to RouterOS API
    const api = this.connections.get(locationId);
    if (!api) {
      throw new Error(`No connection established for location ${locationId}`);
    }

    try {
      const [systemResource, systemRouterboard] = await Promise.all([
        safeApiCall<any[]>(api, '/system/resource/print', undefined, [{}]),
        safeApiCall<any[]>(api, '/system/routerboard/print', undefined, [{}])
      ]);

      const resource = systemResource[0] || {};
      const routerboard = systemRouterboard[0] || {};

      return {
        isOnline: true,
        uptime: (resource as any).uptime || 'Unknown',
        version: (resource as any).version || (routerboard as any).version || 'Unknown',
        cpuLoad: parseInt((resource as any)['cpu-load'] || '0'),
        freeMemory: parseInt((resource as any)['free-memory'] || '0'),
        totalMemory: parseInt((resource as any)['total-memory'] || '0'),
      };
    } catch (error) {
      console.error(`Error getting router status for ${locationId}:`, error);
      return {
        isOnline: false,
        uptime: 'Unknown',
        version: 'Unknown',
        cpuLoad: 0,
        freeMemory: 0,
        totalMemory: 0,
      };
    }
  }

  /**
   * Create a new hotspot user
   */
  async createUser(locationId: string, username: string, password: string, profile: string = 'default-user'): Promise<boolean> {
    const api = this.connections.get(locationId);
    if (!api) {
      throw new Error(`No connection established for location ${locationId}`);
    }

    try {
      await safeApiCall(api, '/ip/hotspot/user/add', {
        '=name': username,
        '=password': password,
        '=profile': profile,
      });
      
      console.log(`Created user ${username} for location ${locationId}`);
      return true;
    } catch (error) {
      console.error(`Error creating user ${username} for ${locationId}:`, error);
      return false;
    }
  }

  /**
   * Kick/disconnect a user
   */
  async kickUser(locationId: string, userId: string): Promise<boolean> {
    const api = this.connections.get(locationId);
    if (!api) {
      throw new Error(`No connection established for location ${locationId}`);
    }

    try {
      await safeApiCall(api, '/ip/hotspot/active/remove', {
        '=.id': userId,
      });
      
      console.log(`Kicked user ${userId} from location ${locationId}`);
      return true;
    } catch (error) {
      console.error(`Error kicking user ${userId} from ${locationId}:`, error);
      return false;
    }
  }

  /**
   * Test connection to a router without storing it
   */
  async testConnection(config: MikroTikConnection): Promise<boolean> {
    // Try REST API first if specified
    if (config.useRestApi) {
      try {
        const restClient = new MikroTikRestAPI(config);
        return await restClient.testConnection();
      } catch (error) {
        console.error(`REST API connection test failed for ${config.host}:`, error);
        return false;
      }
    }

    // Fallback to RouterOS API
    try {
      const RouterOSAPI = await getRouterOSAPI();
      
      const api = new RouterOSAPI({
        host: config.host,
        user: config.user || 'admin',
        password: config.password,
        port: config.port || 8728,
        timeout: 5000, // Shorter timeout for testing
      });

      // Add error handler
      (api as any).on('error', (error: any) => {
        if (error.errno === 'UNKNOWNREPLY' || error.message?.includes('!empty')) {
          console.log(`Test connection empty reply for ${config.host} - this is normal`);
          return;
        }
        console.error(`Test connection error for ${config.host}:`, error);
      });

      await (api as any).connect();
      
      // Test a simple command using safe API call
      await safeApiCall(api, '/system/identity/print', undefined, []);
      
      await (api as any).close();
      return true;
    } catch (error) {
      console.error(`Connection test failed for ${config.host}:`, error);
      return false;
    }
  }

  /**
   * Get stats from multiple locations simultaneously
   */
  async getMultiLocationStats(locationConfigs: Array<{locationId: string, config: MikroTikConnection}>): Promise<Map<string, HotspotStats>> {
    const results = new Map<string, HotspotStats>();
    
    // Connect to all routers in parallel with proper error handling
    const connectionPromises = locationConfigs.map(async ({ locationId, config }) => {
      try {
        const connected = await this.connect(locationId, config);
        if (connected) {
          const stats = await this.getHotspotStats(locationId);
          results.set(locationId, stats);
        } else {
          // Set default stats for failed connections
          results.set(locationId, {
            activeUsers: 0,
            totalUsers: 0,
            totalActiveTime: 0,
            totalBytesIn: 0,
            totalBytesOut: 0,
            lastActivity: 'Connection failed',
          });
        }
      } catch (error) {
        console.error(`Error getting stats for ${locationId}:`, error);
        results.set(locationId, {
          activeUsers: 0,
          totalUsers: 0,
          totalActiveTime: 0,
          totalBytesIn: 0,
          totalBytesOut: 0,
          lastActivity: 'Error occurred',
        });
      }
    });

    // Use Promise.allSettled to handle all promises regardless of individual failures
    await Promise.allSettled(connectionPromises);
    return results;
  }

  /**
   * Format timestamp to human-readable string
   */
  private formatLastActivity(timestamp: number): string {
    if (!timestamp || timestamp === 0) {
      return 'No recent activity';
    }

    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (minutes > 0) {
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  }

  /**
   * Disconnect from all routers
   */
  async disconnectAll(): Promise<void> {
    // Clear REST clients
    this.restClients.clear();

    // Disconnect RouterOS API connections
    const disconnectPromises = Array.from(this.connections.keys()).map(locationId => 
      this.disconnect(locationId)
    );
    
    await Promise.allSettled(disconnectPromises);
    this.connections.clear();
  }
}

// Export a singleton instance
export const mikrotikAPI = new MikroTikAPIService();

// Types for export
export type { 
  MikroTikConnection, 
  HotspotActiveUser, 
  HotspotUser, 
  HotspotStats, 
  RouterStatus 
}; 