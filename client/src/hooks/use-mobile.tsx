import { useState, useEffect } from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile(): boolean {
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setMounted(true);

    const handleResize = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    // Set initial value
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []); // Empty dependency array

  // Return false during initialization/SSR
  return mounted ? isMobile : false;
}