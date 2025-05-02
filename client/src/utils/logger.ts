/**
 * Logger Utility
 * 
 * This utility provides enhanced logging capabilities for both web and Capacitor mobile environments.
 * It includes special formatting for IoT system logs and can handle different log levels.
 */

import { isCapacitorApp } from '@/config/iotDomainConfig';

// Log levels for filtering
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

// Log categories for organization
export enum LogCategory {
  VOICE = 'voice',
  AI = 'ai',
  IOT = 'iot',
  UI = 'ui',
  SYSTEM = 'system',
  NETWORK = 'network'
}

// Configuration for logger
interface LoggerConfig {
  minLevel: LogLevel;
  enabledCategories: LogCategory[];
  showTimestamp: boolean;
  showPlatform: boolean;
}

// Default configuration
const defaultConfig: LoggerConfig = {
  minLevel: LogLevel.DEBUG,
  enabledCategories: Object.values(LogCategory),
  showTimestamp: true,
  showPlatform: true
};

// Current configuration (can be updated at runtime)
let config: LoggerConfig = { ...defaultConfig };

/**
 * Style definitions for different log categories
 */
const logStyles = {
  [LogCategory.VOICE]: { bg: '#9c27b0', fg: '#ffffff' },
  [LogCategory.AI]: { bg: '#2196f3', fg: '#ffffff' },
  [LogCategory.IOT]: { bg: '#ff5722', fg: '#ffffff' },
  [LogCategory.UI]: { bg: '#4caf50', fg: '#ffffff' },
  [LogCategory.SYSTEM]: { bg: '#607d8b', fg: '#ffffff' },
  [LogCategory.NETWORK]: { bg: '#ff9800', fg: '#ffffff' }
};

/**
 * Style definitions for different log levels
 */
const levelStyles = {
  [LogLevel.DEBUG]: { bg: '#eeeeee', fg: '#333333' },
  [LogLevel.INFO]: { bg: '#2196f3', fg: '#ffffff' },
  [LogLevel.WARN]: { bg: '#ff9800', fg: '#ffffff' },
  [LogLevel.ERROR]: { bg: '#f44336', fg: '#ffffff' }
};

/**
 * Platform-specific styling
 */
function getPlatformStyle(): { bg: string, fg: string, name: string } {
  if (isCapacitorApp()) {
    return { bg: '#9c27b0', fg: '#ffffff', name: 'MOBILE' };
  } else {
    return { bg: '#4caf50', fg: '#ffffff', name: 'WEB' };
  }
}

/**
 * Get the current timestamp in a readable format
 */
function getTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Check if the log should be displayed based on level and category
 */
function shouldLog(level: LogLevel, category: LogCategory): boolean {
  // Check if category is enabled
  if (!config.enabledCategories.includes(category)) {
    return false;
  }
  
  // Check if level is high enough
  const levels = Object.values(LogLevel);
  return levels.indexOf(level) >= levels.indexOf(config.minLevel);
}

/**
 * Core logging function
 */
function logWithFormat(
  level: LogLevel, 
  category: LogCategory, 
  message: string,
  data?: any
): void {
  if (!shouldLog(level, category)) {
    return;
  }
  
  const timestamp = config.showTimestamp ? getTimestamp() : '';
  const platform = config.showPlatform ? getPlatformStyle() : null;
  const categoryStyle = logStyles[category];
  const levelStyle = levelStyles[level];
  
  // Build prefix parts
  const prefixParts: string[] = [];
  
  if (config.showTimestamp) {
    prefixParts.push(`[${timestamp}]`);
  }
  
  if (config.showPlatform && platform) {
    prefixParts.push(`[${platform.name}]`);
  }
  
  prefixParts.push(`[${category.toUpperCase()}]`);
  prefixParts.push(`[${level.toUpperCase()}]`);
  
  const prefix = prefixParts.join(' ');
  
  // Use appropriate console method based on level
  let consoleMethod: (...args: any[]) => void;
  switch (level) {
    case LogLevel.ERROR:
      consoleMethod = console.error;
      break;
    case LogLevel.WARN:
      consoleMethod = console.warn;
      break;
    case LogLevel.INFO:
      consoleMethod = console.info;
      break;
    case LogLevel.DEBUG:
    default:
      consoleMethod = console.log;
      break;
  }
  
  // Log with styling
  if (typeof window !== 'undefined' && !isCapacitorApp()) {
    // Browser environment with CSS styling
    consoleMethod(
      `%c${prefix}%c ${message}`,
      `background: ${categoryStyle.bg}; color: ${categoryStyle.fg}; font-weight: bold; padding: 2px 4px; border-radius: 3px;`,
      'background: transparent; color: inherit;'
    );
    
    // Log additional data if provided
    if (data !== undefined) {
      console.log(
        '%c [DATA] %c',
        `background: #555; color: #fff; padding: 2px 4px; border-radius: 2px;`,
        'background: transparent;',
        data
      );
    }
  } else {
    // Mobile or non-browser environment
    consoleMethod(`${prefix} ${message}`);
    if (data !== undefined) {
      consoleMethod('[DATA]', data);
    }
  }
  
  // Special case for IoT logs - always ensure they're visible in both environments
  if (category === LogCategory.IOT && message.includes('nakprciotsystemslabs.local')) {
    // Make IoT logs extra visible, regardless of environment
    if (typeof window !== 'undefined') {
      console.log(
        '%c [IOT SYSTEMS REQUEST] %c',
        'background: #ff5722; color: white; padding: 3px 6px; border-radius: 3px; font-weight: bold;',
        'background: transparent;',
        message
      );
    } else {
      console.log('### IOT SYSTEMS REQUEST ###', message);
    }
    
    if (data) {
      console.log('IoT Request Data:', data);
    }
  }
}

/**
 * Public API for the logger
 */
export const logger = {
  debug: (category: LogCategory, message: string, data?: any) => 
    logWithFormat(LogLevel.DEBUG, category, message, data),
  
  info: (category: LogCategory, message: string, data?: any) => 
    logWithFormat(LogLevel.INFO, category, message, data),
  
  warn: (category: LogCategory, message: string, data?: any) => 
    logWithFormat(LogLevel.WARN, category, message, data),
  
  error: (category: LogCategory, message: string, data?: any) => 
    logWithFormat(LogLevel.ERROR, category, message, data),
  
  // Special method for IoT-related logs
  iot: (message: string, data?: any) => 
    logWithFormat(LogLevel.INFO, LogCategory.IOT, message, data),
  
  // Configure the logger
  configure: (newConfig: Partial<LoggerConfig>) => {
    config = { ...config, ...newConfig };
  },
  
  // Reset to default configuration
  resetConfig: () => {
    config = { ...defaultConfig };
  }
};

export default logger;