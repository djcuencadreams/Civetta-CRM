import React, { useEffect } from 'react';
import { create } from 'zustand';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { api } from '@/lib/queryClient';
import { logError, logWarning } from '@/lib/errorHandler';

// Server health states
export enum ServerHealthStatus {
  UNKNOWN = 'unknown',
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
}

// Server health state store using Zustand
interface ServerHealthState {
  status: ServerHealthStatus;
  lastChecked: Date | null;
  message: string | null;
  details: Record<string, any> | null;
  isCheckingNow: boolean;
  checkCount: number;
  checkServer: () => Promise<void>;
}

// Create a Zustand store for server health
export const useServerHealth = create<ServerHealthState>((set, get) => ({
  status: ServerHealthStatus.UNKNOWN,
  lastChecked: null,
  message: null,
  details: null,
  isCheckingNow: false,
  checkCount: 0,
  
  // Function to check server health
  checkServer: async () => {
    const state = get();
    if (state.isCheckingNow) return;
    
    set({ isCheckingNow: true });
    
    try {
      // Request the health endpoint with a timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      type HealthResponse = {
        status: string;
        message?: string;
        details?: Record<string, any>;
      };
      
      const healthData = await api<HealthResponse>('/api/health', { 
        signal: controller.signal 
      });
      
      clearTimeout(timeoutId);
      
      // Update the store with health data
      set({
        status: healthData.status === 'healthy' 
          ? ServerHealthStatus.HEALTHY 
          : healthData.status === 'degraded'
            ? ServerHealthStatus.DEGRADED
            : ServerHealthStatus.UNHEALTHY,
        lastChecked: new Date(),
        message: healthData.message || null,
        details: healthData.details || null,
        isCheckingNow: false,
        checkCount: state.checkCount + 1,
      });
    } catch (error) {
      // Handle connectivity errors
      logWarning('Server health check failed', { error });
      
      set({
        status: ServerHealthStatus.UNHEALTHY,
        lastChecked: new Date(),
        message: error instanceof Error ? error.message : 'Failed to connect to server',
        details: { error: String(error) },
        isCheckingNow: false,
        checkCount: state.checkCount + 1,
      });
    }
  }
}));

// Function to start monitoring server health at an interval
export function startHealthChecking(intervalMs: number = 60000): () => void {
  // Do an initial check immediately
  const { checkServer } = useServerHealth.getState();
  checkServer();
  
  // Set up interval for regular checking
  const intervalId = setInterval(() => {
    const { checkServer } = useServerHealth.getState();
    checkServer();
  }, intervalMs);
  
  // Return a cleanup function to stop checking
  return () => {
    clearInterval(intervalId);
  };
}

// Server health indicator component
export function ServerStatusIndicator(): JSX.Element {
  const { status, lastChecked, message, checkServer } = useServerHealth();
  
  // Set up automatic health checking
  useEffect(() => {
    const cleanup = startHealthChecking(60000); // Check every minute
    return cleanup;
  }, []);
  
  // Format the last checked time
  const lastCheckedText = lastChecked 
    ? new Intl.DateTimeFormat('default', {
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric'
      }).format(lastChecked)
    : 'Never';
  
  // Get badge variant based on health status
  let badgeVariant: 'default' | 'outline' | 'secondary' | 'destructive' = 'outline';
  if (status === ServerHealthStatus.HEALTHY) {
    badgeVariant = 'default';
  } else if (status === ServerHealthStatus.DEGRADED) {
    badgeVariant = 'secondary';
  } else if (status === ServerHealthStatus.UNHEALTHY) {
    badgeVariant = 'destructive';
  }
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant={badgeVariant} 
            className="cursor-pointer" 
            onClick={() => checkServer()}
          >
            {status === ServerHealthStatus.UNKNOWN ? 'Status: Checking...' : `Server: ${status}`}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <div className="text-xs">
            <div className="font-bold">Server Status: {status}</div>
            {message && <div className="mt-1">{message}</div>}
            <div className="mt-1 opacity-70">Last checked: {lastCheckedText}</div>
            <div className="mt-1 text-[10px] italic">Click to check again</div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}