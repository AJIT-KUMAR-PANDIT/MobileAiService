/**
 * Platform Detection Utility
 * 
 * This utility provides functions to detect the runtime environment
 * (web browser vs. Capacitor mobile app) and initialize platform-specific
 * configurations.
 */

import { isCapacitorApp } from '@/config/iotDomainConfig';
import logger, { LogCategory } from './logger';

/**
 * Detect the platform and return information about the environment
 */
export function detectPlatform() {
  // Check if running in Capacitor
  const isMobileApp = isCapacitorApp();
  
  // Check for various browser environments
  const isChromeBrowser = typeof window !== 'undefined' && 
                        window.navigator.userAgent.includes('Chrome') &&
                        !window.navigator.userAgent.includes('Edg');
  
  const isFirefoxBrowser = typeof window !== 'undefined' && 
                          window.navigator.userAgent.includes('Firefox');
  
  const isSafariBrowser = typeof window !== 'undefined' && 
                         window.navigator.userAgent.includes('Safari') &&
                         !window.navigator.userAgent.includes('Chrome');
  
  const isEdgeBrowser = typeof window !== 'undefined' && 
                       window.navigator.userAgent.includes('Edg');
  
  // Check for mobile browsers (not Capacitor)
  const isMobileBrowser = typeof window !== 'undefined' && 
                         (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
                          .test(window.navigator.userAgent)) &&
                         !isMobileApp;
  
  return {
    isMobileApp,
    isWebBrowser: !isMobileApp,
    isChromeBrowser,
    isFirefoxBrowser,
    isSafariBrowser,
    isEdgeBrowser,
    isMobileBrowser,
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'Unknown'
  };
}

/**
 * Initialize platform-specific configurations
 */
export function initializePlatform() {
  const platform = detectPlatform();
  const appType = platform.isMobileApp ? 'Capacitor Mobile App' : 'Web Browser';
  const specificType = platform.isMobileApp 
    ? 'Mobile' 
    : (platform.isMobileBrowser 
      ? 'Mobile Browser' 
      : (platform.isChromeBrowser 
        ? 'Chrome' 
        : (platform.isFirefoxBrowser 
          ? 'Firefox' 
          : (platform.isSafariBrowser 
            ? 'Safari' 
            : (platform.isEdgeBrowser 
              ? 'Edge' 
              : 'Unknown Browser')))));
  
  // Log platform detection results
  logger.info(LogCategory.SYSTEM, `Application initialized as: ${appType} (${specificType})`);
  
  if (platform.isMobileApp) {
    // Special initialization for Capacitor environment
    logger.info(LogCategory.SYSTEM, 'Initializing Capacitor-specific settings...');
    
    // Let's make sure IoT requests to iotsystemslabs.local are prominently logged in mobile
    console.log('======================================');
    console.log('MOBILE APP ENVIRONMENT DETECTED');
    console.log('IoT requests to nakprciotsystemslabs.local will be logged');
    console.log('======================================');
    
    return 'mobile';
  } else {
    // Web browser initialization
    logger.info(LogCategory.SYSTEM, 'Initializing web browser-specific settings...');
    
    // Add special console message for IoT in web environment
    console.log(
      '%c Luna AI Assistant %c IoT-enabled Mode %c',
      'background: #2c3e50; color: white; padding: 2px 4px; border-radius: 3px 0 0 3px;',
      'background: #27ae60; color: white; padding: 2px 4px; border-radius: 0 3px 3px 0;',
      'background: transparent;'
    );
    console.log(
      '%c IoT System Integration %c nakprciotsystemslabs.local %c',
      'background: #e74c3c; color: white; padding: 2px 4px; border-radius: 3px 0 0 3px;',
      'background: #3498db; color: white; padding: 2px 4px; border-radius: 0 3px 3px 0;',
      'background: transparent;'
    );
    
    return 'web';
  }
}

export default {
  detectPlatform,
  initializePlatform
};