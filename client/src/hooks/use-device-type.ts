import { useState, useEffect } from 'react';

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

/**
 * Hook that detects the current device type based on screen size and user agent
 * This is more precise than just checking viewport width, as it considers both
 * screen dimensions and potentially user agent information
 * 
 * @returns DeviceType - 'mobile', 'tablet', or 'desktop'
 */
export function useDeviceType(): DeviceType {
  const [deviceType, setDeviceType] = useState<DeviceType>(getInitialDeviceType());
  
  function getInitialDeviceType(): DeviceType {
    // Server-side rendering check
    if (typeof window === 'undefined') return 'desktop';
    
    // First check based on screen width
    const width = window.innerWidth;
    
    // Common device breakpoints
    if (width < 480) return 'mobile';
    if (width < 768) return 'tablet';
    
    // Add user agent detection as fallback/additional check
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|windows phone/i.test(userAgent);
    const isTabletDevice = /ipad|android(?!.*mobile)/i.test(userAgent) || 
                          (isMobileDevice && width >= 640);
    
    if (isTabletDevice) return 'tablet';
    if (isMobileDevice) return 'mobile';
    
    return 'desktop';
  }
  
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    let debounceTimer: ReturnType<typeof setTimeout>;
    
    const handleResize = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        setDeviceType(getInitialDeviceType());
      }, 200); // Slightly longer debounce for this calculation
    };
    
    window.addEventListener('resize', handleResize);
    
    // Clean up
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(debounceTimer);
    };
  }, []);
  
  return deviceType;
}

/**
 * Hook that provides information about device orientation
 * 
 * @returns boolean - true if the device is in landscape orientation
 */
export function useIsLandscape(): boolean {
  const [isLandscape, setIsLandscape] = useState<boolean>(
    typeof window !== 'undefined' ? window.innerWidth > window.innerHeight : false
  );
  
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    let debounceTimer: ReturnType<typeof setTimeout>;
    
    const handleResize = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        setIsLandscape(window.innerWidth > window.innerHeight);
      }, 100);
    };
    
    const handleOrientationChange = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);
    
    // Clean up
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
      clearTimeout(debounceTimer);
    };
  }, []);
  
  return isLandscape;
}

/**
 * Combined hook that provides comprehensive device information
 * 
 * @returns Object with deviceType and orientation information
 */
export function useDeviceInfo() {
  const deviceType = useDeviceType();
  const isLandscape = useIsLandscape();
  
  return {
    deviceType,
    isLandscape,
    isMobile: deviceType === 'mobile',
    isTablet: deviceType === 'tablet',
    isDesktop: deviceType === 'desktop',
    isPortrait: !isLandscape
  };
}