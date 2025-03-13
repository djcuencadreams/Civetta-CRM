/**
 * Focused fix for the Vite runtime error plugin abort errors
 * 
 * This module specifically targets the Vite runtime error handling for AbortController errors
 * using a minimal and focused approach that doesn't rely on complex workarounds
 */

/**
 * Comprehensive check for any type of abort error
 * @param error The error to check
 * @returns true if this is an abort-related error that should be ignored
 */
function isAbortError(error: unknown): boolean {
  if (!error) return false;
  
  // Check for error name
  if ((error as Error).name === 'AbortError') return true;
  
  // Check for DOMException type
  if (error instanceof DOMException && error.name === 'AbortError') return true;
  
  // Check message content
  if (typeof (error as Error).message === 'string') {
    const msg = (error as Error).message.toLowerCase();
    return (
      msg.includes('abort') || 
      msg.includes('aborted') || 
      msg.includes('signal is aborted') ||
      msg.includes('user aborted') ||
      msg.includes('operation canceled') ||
      msg.includes('operation was aborted')
    );
  }
  
  // Check for type property (sometimes set)
  if ((error as any).type === 'aborted') return true;
  
  // Check for code (DOMException AbortError code is 20)
  if ((error as any).code === 20) return true;
  
  // Check for signal.aborted property
  if ((error as any).signal && (error as any).signal.aborted) return true;
  
  // String error might be a message about abortion
  if (typeof error === 'string') {
    const errorStr = error.toLowerCase();
    return (
      errorStr.includes('abort') || 
      errorStr.includes('aborted') || 
      errorStr.includes('signal is aborted')
    );
  }
  
  return false;
}

/**
 * Install a focused error filter that specifically targets the Vite runtime error plugin
 * This prevents AbortErrors from being displayed in the Vite error overlay
 */
export function installAbortErrorFilter(): void {
  if (typeof window === 'undefined' || !import.meta.env.DEV) {
    return; // Only needed in browser during development
  }

  console.debug('Installing focused abort error filter for Vite runtime error plugin');

  // 1. Install a capturing phase listener for the error event
  window.addEventListener('error', (event) => {
    if (isAbortError(event.error)) {
      // Prevent the error from propagating to Vite's error handler
      event.preventDefault();
      console.debug('Filtered abort error:', event.error?.message || 'Unknown abort error');
      return false;
    }
  }, true); // true = capturing phase, runs before Vite's handler
  
  // 2. Install a capturing phase listener for unhandledrejection
  window.addEventListener('unhandledrejection', (event) => {
    if (isAbortError(event.reason)) {
      // Prevent the rejection from propagating to Vite's handler
      event.preventDefault();
      console.debug('Filtered unhandled promise rejection (abort):', 
        event.reason?.message || 'Unknown abort error');
      return false;
    }
  }, true); // true = capturing phase, runs before Vite's handler
  
  // 3. Add a small CSS snippet to hide any error overlays that might slip through
  // This is minimal and only targets abortion-specific errors
  const style = document.createElement('style');
  style.textContent = `
    /* Hide only abort-related error overlays */
    div[role="dialog"][aria-modal="true"]:has(div:contains("signal is aborted")),
    div[role="dialog"][aria-modal="true"]:has(div:contains("AbortError")) {
      display: none !important;
    }
  `;
  document.head.appendChild(style);
  
  console.debug('Abort error filter installed successfully');
}