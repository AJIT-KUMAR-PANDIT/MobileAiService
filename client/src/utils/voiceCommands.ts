/**
 * Voice Command Processor
 * 
 * This utility handles all voice commands, routing them to the appropriate
 * handler based on the command type (smart home, timer, weather, etc.)
 */

import { isSmartHomeCommand, processSmartHomeCommand } from './smartHomeCommands';
import { isCapacitorApp } from '@/config/iotDomainConfig';

// Command types supported by the assistant
export enum CommandType {
  SMART_HOME = 'smart_home',
  WEATHER = 'weather',
  TIME = 'time',
  TIMER = 'timer',
  REMINDER = 'reminder',
  GENERAL = 'general'
}

// Result structure for voice command processing
export interface CommandResult {
  type: CommandType;
  success: boolean;
  message: string;
  data?: any;
  needsApiCall?: boolean;
}

/**
 * Identify the type of command from the text
 * @param command User's voice command text
 * @returns The command type
 */
export function identifyCommandType(command: string): CommandType {
  const lowerCommand = command.toLowerCase();
  
  // Smart home device control
  if (isSmartHomeCommand(command)) {
    return CommandType.SMART_HOME;
  }
  
  // Weather-related queries
  if (lowerCommand.includes('weather') || 
      lowerCommand.includes('temperature outside') ||
      lowerCommand.includes('forecast') ||
      (lowerCommand.includes('how') && lowerCommand.includes('hot')) ||
      (lowerCommand.includes('how') && lowerCommand.includes('cold'))) {
    return CommandType.WEATHER;
  }
  
  // Time-related queries
  if (lowerCommand.includes('what time') ||
      lowerCommand.includes('current time') ||
      lowerCommand.includes('what is the time')) {
    return CommandType.TIME;
  }
  
  // Timer-related commands
  if (lowerCommand.includes('timer') ||
      lowerCommand.includes('countdown') ||
      (lowerCommand.includes('set') && lowerCommand.includes('minutes')) ||
      (lowerCommand.includes('set') && lowerCommand.includes('seconds')) ||
      lowerCommand.includes('remind me in')) {
    return CommandType.TIMER;
  }
  
  // Reminder-related commands
  if (lowerCommand.includes('remind me to') ||
      lowerCommand.includes('set a reminder') ||
      lowerCommand.includes('create a reminder')) {
    return CommandType.REMINDER;
  }
  
  // Default to general query for AI model
  return CommandType.GENERAL;
}

/**
 * Process a timer command and extract the duration
 * @param command Timer command text
 * @returns Command result with timer information
 */
function processTimerCommand(command: string): CommandResult {
  const lowerCommand = command.toLowerCase();
  
  // Extract duration units (minutes, seconds, hours)
  let minutes = 0;
  let seconds = 0;
  let hours = 0;
  
  // Extract numbers with their units
  const minutesMatch = lowerCommand.match(/(\d+)(?:\s*)(?:minute|minutes|min|mins)/);
  const secondsMatch = lowerCommand.match(/(\d+)(?:\s*)(?:second|seconds|sec|secs)/);
  const hoursMatch = lowerCommand.match(/(\d+)(?:\s*)(?:hour|hours|hr|hrs)/);
  
  if (minutesMatch) minutes = parseInt(minutesMatch[1]);
  if (secondsMatch) seconds = parseInt(secondsMatch[1]);
  if (hoursMatch) hours = parseInt(hoursMatch[1]);
  
  // If no specific time found, look for generic numbers
  if (minutes === 0 && seconds === 0 && hours === 0) {
    const numberMatch = lowerCommand.match(/(\d+)/);
    
    if (numberMatch) {
      const number = parseInt(numberMatch[1]);
      
      // Default to minutes if unit not specified
      if (lowerCommand.includes('hour') || lowerCommand.includes('hr')) {
        hours = number;
      } else if (lowerCommand.includes('second') || lowerCommand.includes('sec')) {
        seconds = number;
      } else {
        minutes = number;
      }
    }
  }
  
  // Calculate total milliseconds
  const totalMilliseconds = (hours * 60 * 60 * 1000) + (minutes * 60 * 1000) + (seconds * 1000);
  
  if (totalMilliseconds <= 0) {
    return {
      type: CommandType.TIMER,
      success: false,
      message: "I couldn't figure out how long you want the timer for. Please specify a duration like '5 minutes'."
    };
  }
  
  // Create human-readable display time
  let displayText = '';
  if (hours > 0) displayText += `${hours} hour${hours > 1 ? 's' : ''} `;
  if (minutes > 0) displayText += `${minutes} minute${minutes > 1 ? 's' : ''} `;
  if (seconds > 0) displayText += `${seconds} second${seconds > 1 ? 's' : ''} `;
  
  return {
    type: CommandType.TIMER,
    success: true,
    message: `I've set a timer for ${displayText.trim()}.`,
    data: {
      durationMs: totalMilliseconds,
      display: displayText.trim()
    }
  };
}

/**
 * Process a current time request
 * @returns Command result with current time
 */
function processTimeCommand(): CommandResult {
  const now = new Date();
  
  // Format time nicely
  const timeString = now.toLocaleTimeString([], { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
  
  // Get date information
  const dateString = now.toLocaleDateString([], { 
    weekday: 'long',
    month: 'long', 
    day: 'numeric',
    year: 'numeric'
  });
  
  return {
    type: CommandType.TIME,
    success: true,
    message: `The current time is ${timeString} on ${dateString}.`,
    data: { time: timeString, date: dateString }
  };
}

/**
 * Process a weather request
 * @returns Command result with weather info (stub for now)
 */
function processWeatherCommand(): CommandResult {
  // This would typically call a weather API
  return {
    type: CommandType.WEATHER,
    success: true,
    message: "I'm sorry, but I don't have access to current weather information without an internet connection. If you connect me to a weather service, I'll be able to provide real-time weather updates.",
    needsApiCall: true
  };
}

/**
 * Process a reminder command
 * @param command Reminder command text
 * @returns Command result with reminder info
 */
function processReminderCommand(command: string): CommandResult {
  // Extract what the reminder is for
  const reminderMatch = command.toLowerCase().match(/remind me to (.*)/i);
  const reminderText = reminderMatch ? reminderMatch[1] : "do something";
  
  return {
    type: CommandType.REMINDER,
    success: true,
    message: `I'll remind you to ${reminderText}. Note that reminder functionality is limited in offline mode.`,
    data: { reminder: reminderText }
  };
}

/**
 * Process a voice command and route to the appropriate handler
 * @param command User's voice command text
 * @returns Result of processing the command
 */
export async function processVoiceCommand(command: string): Promise<CommandResult> {
  // Log the command in a platform-appropriate way
  console.log(`Processing voice command: "${command}"`);
  
  // Special logging for Capacitor environment
  if (isCapacitorApp()) {
    console.log(`[Capacitor] Voice command received: ${command}`);
  }
  
  // If empty command, return error
  if (!command.trim()) {
    return {
      type: CommandType.GENERAL,
      success: false,
      message: "I didn't hear a command. Please try again."
    };
  }
  
  // Identify command type and route to appropriate handler
  const commandType = identifyCommandType(command);
  
  try {
    switch (commandType) {
      case CommandType.SMART_HOME:
        // Process smart home command with IoT system integration
        const homeResult = await processSmartHomeCommand(command);
        return {
          type: CommandType.SMART_HOME,
          success: homeResult.success,
          message: homeResult.message,
          data: homeResult.data
        };
        
      case CommandType.TIMER:
        // Process timer command
        return processTimerCommand(command);
        
      case CommandType.TIME:
        // Process time command
        return processTimeCommand();
        
      case CommandType.WEATHER:
        // Process weather command
        return processWeatherCommand();
        
      case CommandType.REMINDER:
        // Process reminder command
        return processReminderCommand(command);
        
      case CommandType.GENERAL:
      default:
        // For general queries, pass to the LLM
        return {
          type: CommandType.GENERAL,
          success: true,
          message: "", // Empty message signals to use the AI model response
        };
    }
  } catch (error) {
    console.error('Error processing voice command:', error);
    
    return {
      type: commandType,
      success: false,
      message: "I had trouble processing that command. Please try again.",
      data: error
    };
  }
}