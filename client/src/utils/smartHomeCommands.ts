/**
 * Smart Home Command Processor
 * 
 * This utility file processes natural language commands related to smart home control
 * and translates them into API calls to the IoT system.
 * It works in both web browser and Capacitor mobile environments.
 */

import { controlSmartHomeDevice, checkIoTSystemStatus, isCapacitorApp } from '@/config/iotDomainConfig';
import logger, { LogCategory } from './logger';

// Define structure for command processing result
export interface SmartHomeCommandResult {
  success: boolean;
  message: string;
  data?: any;
}

// Common device types that can be controlled
const DEVICE_TYPES = [
  'light', 'lights', 'lamp', 'bulb',
  'thermostat', 'temperature', 'ac', 'air conditioner', 'heat', 'cooling',
  'fan', 'ceiling fan',
  'blind', 'blinds', 'shade', 'shades', 'curtain', 'curtains',
  'door', 'lock', 'door lock',
  'tv', 'television',
  'speaker', 'music', 'audio', 'volume',
  'camera', 'security camera',
  'vacuum', 'robot vacuum',
  'outlet', 'plug', 'switch'
];

// Common actions for smart home devices
const DEVICE_ACTIONS = [
  'on', 'off', 'toggle',
  'open', 'close',
  'up', 'down',
  'lock', 'unlock',
  'arm', 'disarm',
  'increase', 'decrease',
  'set', 'adjust',
  'start', 'stop', 'pause'
];

// Common room names in a house
const ROOM_NAMES = [
  'living room', 'bedroom', 'kitchen', 'bathroom', 'office', 
  'dining room', 'family room', 'hallway', 'basement',
  'master bedroom', 'guest room', 'entryway', 'foyer',
  'garage', 'attic', 'porch', 'patio', 'balcony'
];

/**
 * Extract the device type from the command
 * @param command User's natural language command
 * @returns The device type found, or null if none detected
 */
function extractDeviceType(command: string): string | null {
  const lowerCommand = command.toLowerCase();
  
  for (const device of DEVICE_TYPES) {
    if (lowerCommand.includes(device)) {
      return device;
    }
  }
  
  return null;
}

/**
 * Extract the room name from the command
 * @param command User's natural language command
 * @returns The room name found, or 'default' if none detected
 */
function extractRoom(command: string): string {
  const lowerCommand = command.toLowerCase();
  
  for (const room of ROOM_NAMES) {
    if (lowerCommand.includes(room)) {
      return room;
    }
  }
  
  // Check for some common room indicators
  if (lowerCommand.includes('upstairs')) {
    return 'upstairs';
  } else if (lowerCommand.includes('downstairs')) {
    return 'downstairs';
  } else if (lowerCommand.includes('outside')) {
    return 'outside';
  }
  
  // Default room if none specified
  return 'living room';
}

/**
 * Extract the action to perform from the command
 * @param command User's natural language command
 * @returns The action found, or null if none detected
 */
function extractAction(command: string): string | null {
  const lowerCommand = command.toLowerCase();
  
  // Direct action matching
  for (const action of DEVICE_ACTIONS) {
    if (lowerCommand.includes(` ${action} `) || 
        lowerCommand.startsWith(`${action} `) || 
        lowerCommand.endsWith(` ${action}`)) {
      return action;
    }
  }
  
  // Special case handling for common phrases
  if (lowerCommand.includes('turn on') || lowerCommand.includes('switch on')) {
    return 'on';
  } else if (lowerCommand.includes('turn off') || lowerCommand.includes('switch off')) {
    return 'off';
  } else if (lowerCommand.includes('dim') || lowerCommand.includes('lower')) {
    return 'decrease';
  } else if (lowerCommand.includes('brighten') || lowerCommand.includes('raise')) {
    return 'increase';
  }
  
  return null;
}

/**
 * Extract a value from the command if present (e.g., temperature, brightness level)
 * @param command User's natural language command
 * @returns The value found, or null if none detected
 */
function extractValue(command: string): number | null {
  const lowerCommand = command.toLowerCase();
  
  // Look for numbers in the command
  const numberMatches = lowerCommand.match(/\b(\d+)(\.\d+)?\b/g);
  if (numberMatches && numberMatches.length > 0) {
    return parseFloat(numberMatches[0]);
  }
  
  // Look for percentage values
  const percentMatches = lowerCommand.match(/(\d+)(\.\d+)?%/g);
  if (percentMatches && percentMatches.length > 0) {
    return parseFloat(percentMatches[0]);
  }
  
  // Check for common value words
  if (lowerCommand.includes('halfway') || lowerCommand.includes('half way')) {
    return 50;
  } else if (lowerCommand.includes('full') || lowerCommand.includes('maximum')) {
    return 100;
  } else if (lowerCommand.includes('minimum') || lowerCommand.includes('lowest')) {
    return 0;
  }
  
  return null;
}

/**
 * Process a smart home command to control devices via the IoT API
 * @param command User's natural language command
 * @returns Result of the command execution
 */
export async function processSmartHomeCommand(command: string): Promise<SmartHomeCommandResult> {
  if (!command.trim()) {
    return {
      success: false,
      message: "No command specified."
    };
  }
  
  // Check if the system is online
  const isOnline = await checkIoTSystemStatus().catch(() => false);
  
  // Extract command components
  const device = extractDeviceType(command);
  const room = extractRoom(command);
  const action = extractAction(command);
  const value = extractValue(command);
  
  // Validate extracted components
  if (!device) {
    return {
      success: false,
      message: "Sorry, I couldn't identify which device you want to control."
    };
  }
  
  if (!action) {
    return {
      success: false,
      message: `I'm not sure what you want to do with the ${device} in the ${room}.`
    };
  }
  
  // Log the processed command with enhanced visibility
  logger.iot(`Smart home command: ${action} ${device} in ${room}${value !== null ? ` to ${value}` : ''}`);
  
  // Add platform-specific logging
  if (isCapacitorApp()) {
    // Log specially for mobile apps to make IoT requests very visible in native logs
    console.log(`[MOBILE-IOT] Smart home command to nakprciotsystemslabs.local: ${action} ${device} in ${room}`);
  } else {
    // Enhanced web console logging 
    console.log(
      `%c [IOT REQUEST to nakprciotsystemslabs.local] %c ${action} ${device} in ${room}${value !== null ? ` to ${value}` : ''}`,
      'background: #ff5722; color: white; padding: 3px 6px; border-radius: 3px; font-weight: bold;', 
      'color: #ff5722; font-weight: bold;'
    );
  }
  
  try {
    // Special handling for "set" actions that require a value
    if (action === 'set' && value === null) {
      return {
        success: false,
        message: `I need a value to set the ${device} in the ${room}. Please specify a value.`
      };
    }
    
    // Handle "increase" and "decrease" without a specific value
    let finalValue = value;
    if ((action === 'increase' || action === 'decrease') && value === null) {
      finalValue = action === 'increase' ? 10 : -10; // Default adjustment by 10%
    }
    
    // Send the command to the IoT API
    const response = await controlSmartHomeDevice(
      room,
      device,
      action,
      finalValue !== null ? finalValue : undefined
    );
    
    // Format a natural language response
    let successMessage = '';
    
    if (action === 'on' || action === 'start') {
      successMessage = `I've turned on the ${device} in the ${room}.`;
    } else if (action === 'off' || action === 'stop') {
      successMessage = `I've turned off the ${device} in the ${room}.`;
    } else if (action === 'increase') {
      successMessage = `I've increased the ${device} in the ${room}${finalValue ? ` by ${finalValue}%` : ''}.`;
    } else if (action === 'decrease') {
      successMessage = `I've decreased the ${device} in the ${room}${finalValue ? ` by ${Math.abs(Number(finalValue))}%` : ''}.`;
    } else if (action === 'set') {
      successMessage = `I've set the ${device} in the ${room} to ${finalValue}${
        device.includes('thermostat') || device.includes('temperature') ? '°' : '%'
      }.`;
    } else {
      successMessage = `I've ${action}ed the ${device} in the ${room}.`;
    }
    
    // Log successful IoT command completion
    logger.info(LogCategory.IOT, `Successfully executed command: ${action} ${device} in ${room}`, response);
    
    // Platform-specific success logging
    if (isCapacitorApp()) {
      console.log(`[MOBILE-IOT-SUCCESS] Successful request to nakprciotsystemslabs.local: ${action} ${device} in ${room}`);
    } else {
      console.log(
        `%c [IOT SUCCESS from nakprciotsystemslabs.local] %c ${action} ${device} in ${room}`,
        'background: #4caf50; color: white; padding: 3px 6px; border-radius: 3px; font-weight: bold;', 
        'color: #4caf50; font-weight: bold;'
      );
    }
    
    return {
      success: true,
      message: isOnline ? successMessage : `${successMessage} (Note: Running in offline mode)`,
      data: response
    };
    
  } catch (error) {
    // Enhanced error logging
    logger.error(LogCategory.IOT, `Smart home command failed: ${action} ${device} in ${room}`, error);
    
    // Additional platform-specific error logging for better visibility
    if (isCapacitorApp()) {
      console.error(`[MOBILE-IOT-ERROR] Failed request to nakprciotsystemslabs.local: ${action} ${device} in ${room}`);
    } else {
      console.error(
        `%c [IOT ERROR to nakprciotsystemslabs.local] %c ${action} ${device} in ${room}`,
        'background: #d9534f; color: white; padding: 3px 6px; border-radius: 3px; font-weight: bold;', 
        'color: #d9534f; font-weight: bold;'
      );
    }
    
    // Offline fallback response
    if (!isOnline) {
      logger.info(LogCategory.IOT, `Using offline fallback for command: ${action} ${device} in ${room}`);
      return {
        success: true,
        message: `I'll ${action} the ${device} in the ${room} when the system is back online.`,
        data: {
          offline: true,
          pendingCommand: {
            room,
            device,
            action,
            value: value
          }
        }
      };
    }
    
    return {
      success: false,
      message: `Sorry, I couldn't ${action} the ${device} in the ${room} right now. Please try again later.`,
      data: error
    };
  }
}

/**
 * Determine if a command is a smart home control command
 * @param command User's natural language command
 * @returns True if this appears to be a smart home command
 */
export function isSmartHomeCommand(command: string): boolean {
  const device = extractDeviceType(command);
  const action = extractAction(command);
  
  // It's a smart home command if we can identify both a device and an action
  return device !== null && action !== null;
}