
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface InternetConfig {
  isOnlineSearchEnabled: boolean;
  setOnlineSearchEnabled: (enabled: boolean) => void;
}

// Create a persistent store for internet configuration
export const useInternetConfig = create<InternetConfig>()(
  persist(
    (set) => ({
      isOnlineSearchEnabled: true, // Default value
      setOnlineSearchEnabled: (enabled: boolean) => set({ isOnlineSearchEnabled: enabled }),
    }),
    {
      name: 'internet-config', // Storage key
    }
  )
);

// Helper function to check if online search is available
export const isOnlineSearchAvailable = (): boolean => {
  const { isOnlineSearchEnabled } = useInternetConfig.getState();
  const isOnline = navigator.onLine;
  
  return isOnlineSearchEnabled && isOnline;
};
