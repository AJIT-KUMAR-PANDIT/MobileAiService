import { useState, useEffect } from 'react';

export function useOfflineStatus() {
  // State to track online/offline status
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);
  // State to track if connectivity changes occurred during session
  const [hadConnectivityChanges, setHadConnectivityChanges] = useState<boolean>(false);

  useEffect(() => {
    // Handle going offline
    const handleOffline = () => {
      setIsOffline(true);
      setHadConnectivityChanges(true);
    };

    // Handle coming back online
    const handleOnline = () => {
      setIsOffline(false);
      setHadConnectivityChanges(true);
    };

    // Register event listeners
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    // Clean up event listeners
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  return { isOffline, hadConnectivityChanges };
}