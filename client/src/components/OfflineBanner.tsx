import React from 'react';
import { useOfflineStatus } from '@/hooks/useOfflineStatus';
import { Wifi, WifiOff } from 'lucide-react';

export const OfflineBanner: React.FC = () => {
  const { isOffline, hadConnectivityChanges } = useOfflineStatus();
  
  // If never had connectivity changes and online, don't show anything
  if (!hadConnectivityChanges && !isOffline) {
    return null;
  }

  return (
    <div 
      className={`p-2 transition-all duration-300 ${
        isOffline 
          ? 'bg-red-900/40 border-b border-red-800' 
          : 'bg-green-900/40 border-b border-green-800'
      }`}
    >
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center text-xs">
          {isOffline ? (
            <>
              <WifiOff size={14} className="mr-2 text-red-400" />
              <span>
                <span className="font-medium">Offline Mode:</span> You're using Luna offline. Some features may be limited.
              </span>
            </>
          ) : (
            <>
              <Wifi size={14} className="mr-2 text-green-400" />
              <span>
                <span className="font-medium">Back Online:</span> Connected to the network.
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};