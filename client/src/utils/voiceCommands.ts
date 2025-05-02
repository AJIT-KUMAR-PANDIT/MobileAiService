import { processSmartHomeCommand } from './smartHomeCommands';

// Command types
export enum CommandType {
  SMART_HOME = 'smart_home',
  WEATHER = 'weather',
  TIME = 'time',
  TIMER = 'timer',
  REMINDER = 'reminder',
  GENERAL = 'general'
}

// Keywords to identify command types
const COMMAND_KEYWORDS: Record<CommandType, string[]> = {
  [CommandType.SMART_HOME]: [
    'turn on', 'turn off', 'switch on', 'switch off', 'lights', 'light', 
    'thermostat', 'temperature', 'heat', 'ac', 'air conditioning', 
    'blinds', 'fan', 'tv', 'television', 'open', 'close', 'lock', 'unlock'
  ],
  [CommandType.WEATHER]: [
    'weather', 'temperature', 'forecast', 'rain', 'sunny', 'cloudy', 'humidity'
  ],
  [CommandType.TIME]: [
    'time', 'current time', 'what time', 'date', 'day', 'today', 'tomorrow'
  ],
  [CommandType.TIMER]: [
    'timer', 'set timer', 'countdown', 'minutes', 'seconds', 'hours'
  ],
  [CommandType.REMINDER]: [
    'remind', 'reminder', 'remember', 'don\'t forget', 'appointment'
  ],
  [CommandType.GENERAL]: []  // Default fallback
};

// Command result interface
export interface CommandResult {
  type: CommandType;
  success: boolean;
  message: string;
  data?: any;
  needsApiCall?: boolean;
}

// Identify what type of command was given
export function identifyCommandType(command: string): CommandType {
  const lowerCommand = command.toLowerCase();
  
  // Check each command type for keyword matches
  for (const [type, keywords] of Object.entries(COMMAND_KEYWORDS)) {
    if (type === CommandType.GENERAL) continue; // Skip general fallback
    
    // Check if any keyword is in the command
    if (keywords.some(keyword => lowerCommand.includes(keyword))) {
      return type as CommandType;
    }
  }
  
  // Default to general conversational queries
  return CommandType.GENERAL;
}

// Process a timer command
function processTimerCommand(command: string): CommandResult {
  // Extract time values
  const timeMatches = command.match(/(\d+)\s*(second|seconds|minute|minutes|hour|hours)/gi);
  if (!timeMatches || timeMatches.length === 0) {
    return {
      type: CommandType.TIMER,
      success: false,
      message: "I couldn't understand the timer duration. Please try again with a specific time, like '5 minutes' or '30 seconds'."
    };
  }
  
  // Calculate total seconds
  let totalSeconds = 0;
  timeMatches.forEach(match => {
    const [_, value, unit] = match.match(/(\d+)\s*(second|seconds|minute|minutes|hour|hours)/i) || [];
    
    if (value && unit) {
      const numValue = parseInt(value);
      
      if (unit.toLowerCase().startsWith('hour')) {
        totalSeconds += numValue * 3600;
      } else if (unit.toLowerCase().startsWith('minute')) {
        totalSeconds += numValue * 60;
      } else {
        totalSeconds += numValue;
      }
    }
  });
  
  // Format time for display
  let timeDisplay = '';
  if (totalSeconds >= 3600) {
    const hours = Math.floor(totalSeconds / 3600);
    timeDisplay += `${hours} hour${hours > 1 ? 's' : ''} `;
    totalSeconds %= 3600;
  }
  
  if (totalSeconds >= 60) {
    const minutes = Math.floor(totalSeconds / 60);
    timeDisplay += `${minutes} minute${minutes > 1 ? 's' : ''} `;
    totalSeconds %= 60;
  }
  
  if (totalSeconds > 0 || timeDisplay === '') {
    timeDisplay += `${totalSeconds} second${totalSeconds !== 1 ? 's' : ''}`;
  }
  
  return {
    type: CommandType.TIMER,
    success: true,
    message: `Timer set for ${timeDisplay.trim()}.`,
    data: {
      durationMs: (totalSeconds + (Math.floor(totalSeconds / 60) * 60) + (Math.floor(totalSeconds / 3600) * 3600)) * 1000,
      display: timeDisplay.trim()
    }
  };
}

// Process a time or date command
function processTimeCommand(): CommandResult {
  const now = new Date();
  const timeString = now.toLocaleTimeString(undefined, { 
    hour: 'numeric', 
    minute: 'numeric',
    hour12: true
  });
  const dateString = now.toLocaleDateString(undefined, { 
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

// Process a weather command (will need API)
function processWeatherCommand(): CommandResult {
  return {
    type: CommandType.WEATHER,
    success: true,
    needsApiCall: true,
    message: "I'd be happy to check the weather for you, but I'll need to connect to a weather service for that information."
  };
}

// Process a reminder command
function processReminderCommand(command: string): CommandResult {
  // Extract the thing to remember
  const toRemind = command.replace(/remind me (to|about)|reminder|remember|don't forget/gi, '').trim();
  
  if (!toRemind) {
    return {
      type: CommandType.REMINDER,
      success: false,
      message: "I'm not sure what you want me to remind you about. Could you please be more specific?"
    };
  }
  
  return {
    type: CommandType.REMINDER,
    success: true,
    message: `I've created a reminder${toRemind ? ': ' + toRemind : ''}.`,
    data: { content: toRemind }
  };
}

// Process a voice command
export async function processVoiceCommand(command: string): Promise<CommandResult> {
  const commandType = identifyCommandType(command);
  
  switch (commandType) {
    case CommandType.SMART_HOME:
      const smartHomeResult = await processSmartHomeCommand(command);
      return {
        type: CommandType.SMART_HOME,
        success: smartHomeResult.success,
        message: smartHomeResult.message,
        data: {
          room: smartHomeResult.room,
          device: smartHomeResult.device,
          action: smartHomeResult.action,
          value: smartHomeResult.value
        }
      };
      
    case CommandType.TIMER:
      return processTimerCommand(command);
      
    case CommandType.TIME:
      return processTimeCommand();
      
    case CommandType.WEATHER:
      return processWeatherCommand();
      
    case CommandType.REMINDER:
      return processReminderCommand(command);
      
    default:
      // No special command found, treat as general query
      return {
        type: CommandType.GENERAL,
        success: true,
        message: "I'll help you with that.",
        data: { query: command }
      };
  }
}