import { useState, useEffect } from 'react';

export type Breakpoint = 'xxs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

const breakpoints = {
  xxs: 0,    // Extra extra small (small phones - iPhone SE, etc)
  xs: 375,   // Extra small (phones - iPhone 6/7/8, etc)
  sm: 640,   // Small (large phones, small tablets)
  md: 768,   // Medium (tablets)
  lg: 1024,  // Large (laptops/desktops)
  xl: 1280,  // Extra large (large desktops)
  '2xl': 1536, // 2XL (very large desktops)
};

/**
 * Hook that returns true if the viewport width is below 768px (mobile)
 * This hook includes a debounce mechanism to avoid excessive updates
 * 
 * @returns boolean - true if the viewport is mobile-sized
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < breakpoints.md : false
  );
  
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    let debounceTimer: ReturnType<typeof setTimeout>;
    
    const handleResize = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        setIsMobile(window.innerWidth < breakpoints.md);
      }, 100);
    };
    
    window.addEventListener('resize', handleResize);
    
    // Clean up
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(debounceTimer);
    };
  }, []);
  
  return isMobile;
}

/**
 * Hook that returns the current active breakpoint based on window width
 * 
 * @returns Breakpoint - current active breakpoint (xs, sm, md, lg, xl)
 */
export function useBreakpoint() {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>(
    typeof window !== 'undefined' ? getCurrentBreakpoint() : 'md'
  );
  
  function getCurrentBreakpoint(): Breakpoint {
    if (typeof window === 'undefined') return 'md';
    
    const width = window.innerWidth;
    if (width < breakpoints.sm) return 'xs';
    if (width < breakpoints.md) return 'sm';
    if (width < breakpoints.lg) return 'md';
    if (width < breakpoints.xl) return 'lg';
    return 'xl';
  }
  
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    let debounceTimer: ReturnType<typeof setTimeout>;
    
    const handleResize = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        setBreakpoint(getCurrentBreakpoint());
      }, 100);
    };
    
    window.addEventListener('resize', handleResize);
    
    // Clean up
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(debounceTimer);
    };
  }, []);
  
  return breakpoint;
}