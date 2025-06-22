// Hotspot Control Utilities for Frontend Components

export interface HotspotControlResponse {
  success: boolean;
  message?: string;
  error?: string;
  locationId?: string;
  hotspotName?: string;
  action?: string;
  routerHost?: string;
  verification?: {
    disabled: boolean;
    name: string;
  };
}

/**
 * Toggle MikroTik hotspot server on/off
 * @param locationId - The location ID where the router is configured
 * @param enable - true to enable, false to disable
 * @param hotspotName - Optional hotspot server name (defaults to 'hotspot1')
 * @returns Promise with operation result
 */
export async function toggleHotspot(
  locationId: string, 
  enable: boolean, 
  hotspotName?: string
): Promise<HotspotControlResponse> {
  try {
    const action = enable ? 'enable' : 'disable';
    
    const response = await fetch(`/api/hotspot/${action}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        locationId,
        hotspotName: hotspotName || 'hotspot1'
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `Failed to ${action} hotspot`,
        locationId,
      };
    }

    return {
      success: true,
      message: data.message,
      locationId: data.locationId,
      hotspotName: data.hotspotName,
      action: data.action,
      routerHost: data.routerHost,
      verification: data.verification,
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error occurred',
      locationId,
    };
  }
}

/**
 * Enable MikroTik hotspot server
 * @param locationId - The location ID where the router is configured
 * @param hotspotName - Optional hotspot server name (defaults to 'hotspot1')
 * @returns Promise with operation result
 */
export async function enableHotspot(
  locationId: string, 
  hotspotName?: string
): Promise<HotspotControlResponse> {
  return toggleHotspot(locationId, true, hotspotName);
}

/**
 * Disable MikroTik hotspot server
 * @param locationId - The location ID where the router is configured
 * @param hotspotName - Optional hotspot server name (defaults to 'hotspot1')
 * @returns Promise with operation result
 */
export async function disableHotspot(
  locationId: string, 
  hotspotName?: string
): Promise<HotspotControlResponse> {
  return toggleHotspot(locationId, false, hotspotName);
}

/**
 * React hook-style function for hotspot control with loading state
 * Usage in React components:
 * 
 * const [isToggling, setIsToggling] = useState(false);
 * const handleToggle = useHotspotToggle(locationId, setIsToggling);
 * 
 * <button onClick={() => handleToggle(true)} disabled={isToggling}>
 *   {isToggling ? 'Enabling...' : 'Enable Hotspot'}
 * </button>
 */
export function useHotspotToggle(
  locationId: string,
  setLoading: (loading: boolean) => void,
  onSuccess?: (result: HotspotControlResponse) => void,
  onError?: (error: string) => void
) {
  return async (enable: boolean, hotspotName?: string) => {
    setLoading(true);
    
    try {
      const result = await toggleHotspot(locationId, enable, hotspotName);
      
      if (result.success) {
        onSuccess?.(result);
      } else {
        onError?.(result.error || 'Operation failed');
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      onError?.(errorMessage);
      return {
        success: false,
        error: errorMessage,
        locationId,
      };
    } finally {
      setLoading(false);
    }
  };
} 