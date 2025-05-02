import { controlSmartHomeDevice } from '@/config/iotDomainConfig';

// Supported rooms
export const SUPPORTED_ROOMS = [
  'living_room',
  'bedroom',
  'kitchen',
  'bathroom',
  'office',
  'hallway',
  'garage',
  'dining_room'
];

// Supported devices by room type
export const SUPPORTED_DEVICES: Record<string, string[]> = {
  living_room: ['lights', 'tv', 'thermostat', 'blinds', 'fan', 'speaker'],
  bedroom: ['lights', 'fan', 'thermostat', 'blinds', 'speaker', 'alarm'],
  kitchen: ['lights', 'fridge', 'oven', 'microwave', 'coffee_maker', 'dishwasher'],
  bathroom: ['lights', 'fan', 'heater', 'mirror'],
  office: ['lights', 'computer', 'printer', 'thermostat', 'blinds'],
  hallway: ['lights', 'thermostat'],
  garage: ['lights', 'door', 'car_charger'],
  dining_room: ['lights', 'thermostat', 'blinds']
};

// Supported actions by device type
export const SUPPORTED_ACTIONS: Record<string, string[]> = {
  lights: ['on', 'off', 'dim', 'bright', 'color'],
  tv: ['on', 'off', 'volume', 'channel', 'mute', 'unmute'],
  thermostat: ['on', 'off', 'set', 'increase', 'decrease'],
  fan: ['on', 'off', 'speed', 'oscillate'],
  blinds: ['open', 'close', 'halfway'],
  speaker: ['on', 'off', 'volume', 'play', 'pause', 'next', 'previous'],
  fridge: ['on', 'off', 'set_temperature'],
  oven: ['on', 'off', 'preheat', 'set_temperature'],
  microwave: ['on', 'off', 'start', 'stop'],
  coffee_maker: ['on', 'off', 'brew'],
  dishwasher: ['on', 'off', 'start', 'stop'],
  heater: ['on', 'off', 'set_temperature'],
  mirror: ['on', 'off', 'defog'],
  computer: ['on', 'off', 'sleep', 'wake'],
  printer: ['on', 'off', 'print', 'scan'],
  door: ['open', 'close', 'lock', 'unlock'],
  car_charger: ['on', 'off', 'fast_charge'],
  alarm: ['on', 'off', 'snooze', 'set']
};

// Check if a room is supported
export function isRoomSupported(room: string): boolean {
  return SUPPORTED_ROOMS.includes(room.toLowerCase().replace(' ', '_'));
}

// Check if a device is supported in a room
export function isDeviceSupported(room: string, device: string): boolean {
  const normalizedRoom = room.toLowerCase().replace(' ', '_');
  const normalizedDevice = device.toLowerCase().replace(' ', '_');
  
  return (
    SUPPORTED_ROOMS.includes(normalizedRoom) &&
    SUPPORTED_DEVICES[normalizedRoom].includes(normalizedDevice)
  );
}

// Check if an action is supported for a device
export function isActionSupported(device: string, action: string): boolean {
  const normalizedDevice = device.toLowerCase().replace(' ', '_');
  const normalizedAction = action.toLowerCase().replace(' ', '_');
  
  return (
    normalizedDevice in SUPPORTED_ACTIONS &&
    SUPPORTED_ACTIONS[normalizedDevice].includes(normalizedAction)
  );
}

// Execute a smart home command
export async function executeSmartHomeCommand(
  room: string,
  device: string,
  action: string,
  value?: string | number
): Promise<{ success: boolean; message: string }> {
  const normalizedRoom = room.toLowerCase().replace(' ', '_');
  const normalizedDevice = device.toLowerCase().replace(' ', '_');
  const normalizedAction = action.toLowerCase().replace(' ', '_');
  
  // Validate inputs
  if (!isRoomSupported(normalizedRoom)) {
    return { 
      success: false, 
      message: `Sorry, I don't recognize the room "${room}". Supported rooms are: ${SUPPORTED_ROOMS.join(', ')}` 
    };
  }
  
  if (!isDeviceSupported(normalizedRoom, normalizedDevice)) {
    return { 
      success: false, 
      message: `Sorry, there is no "${device}" in the ${room}. Available devices are: ${SUPPORTED_DEVICES[normalizedRoom].join(', ')}` 
    };
  }
  
  if (!isActionSupported(normalizedDevice, normalizedAction)) {
    return { 
      success: false, 
      message: `Sorry, the "${device}" doesn't support the "${action}" action. Supported actions are: ${SUPPORTED_ACTIONS[normalizedDevice].join(', ')}` 
    };
  }
  
  try {
    // Call the API function from iotDomainConfig
    const response = await controlSmartHomeDevice(
      normalizedRoom,
      normalizedDevice,
      normalizedAction,
      value
    );
    
    console.log(`Smart home command executed: ${normalizedRoom} ${normalizedDevice} ${normalizedAction} ${value || ''}`);
    console.log('Response:', response);
    
    return {
      success: true,
      message: `${action.charAt(0).toUpperCase() + action.slice(1)} the ${device} in the ${room}${value ? ` to ${value}` : ''}`
    };
  } catch (error) {
    console.error('Error executing smart home command:', error);
    return {
      success: false,
      message: `Sorry, I couldn't control the ${device} in the ${room}. Please try again later.`
    };
  }
}

// Parse natural language commands to extract room, device, action, and value
export function parseSmartHomeCommand(command: string): { 
  room?: string; 
  device?: string; 
  action?: string; 
  value?: string | number; 
} {
  const normalizedCommand = command.toLowerCase();
  let result: { room?: string; device?: string; action?: string; value?: string | number } = {};
  
  // Check for rooms
  for (const room of SUPPORTED_ROOMS) {
    const readableRoom = room.replace('_', ' ');
    if (normalizedCommand.includes(readableRoom)) {
      result.room = room;
      break;
    }
  }
  
  // Check for devices
  if (result.room) {
    const devices = SUPPORTED_DEVICES[result.room];
    for (const device of devices) {
      const readableDevice = device.replace('_', ' ');
      if (normalizedCommand.includes(readableDevice)) {
        result.device = device;
        break;
      }
    }
  } else {
    // If room wasn't found, check all possible devices
    const allDevices = Object.values(SUPPORTED_DEVICES).flat();
    for (const device of allDevices) {
      const readableDevice = device.replace('_', ' ');
      if (normalizedCommand.includes(readableDevice)) {
        result.device = device;
        break;
      }
    }
  }
  
  // Check for actions
  if (result.device) {
    const actions = SUPPORTED_ACTIONS[result.device];
    for (const action of actions) {
      const readableAction = action.replace('_', ' ');
      if (normalizedCommand.includes(readableAction)) {
        result.action = action;
        break;
      }
    }
    
    // Extract values for certain actions
    if (result.action === 'set' || result.action === 'volume' || result.action === 'channel' || 
        result.action === 'speed' || result.action === 'set_temperature') {
      // Try to find a number in the command
      const numberMatch = normalizedCommand.match(/\d+/);
      if (numberMatch) {
        result.value = parseInt(numberMatch[0]);
      }
    } else if (result.action === 'color' && result.device === 'lights') {
      // Try to find color names
      const colors = ['red', 'green', 'blue', 'yellow', 'orange', 'purple', 'pink', 'white', 'warm', 'cool'];
      for (const color of colors) {
        if (normalizedCommand.includes(color)) {
          result.value = color;
          break;
        }
      }
    }
  }
  
  return result;
}

// Process a natural language command for smart home control
export async function processSmartHomeCommand(command: string): Promise<{ 
  success: boolean; 
  message: string;
  room?: string;
  device?: string;
  action?: string;
  value?: string | number;
}> {
  const parsed = parseSmartHomeCommand(command);
  
  // If we're missing essential information
  if (!parsed.room || !parsed.device || !parsed.action) {
    return {
      success: false,
      message: "I didn't understand that smart home command completely. Please specify the room, device, and action.",
      ...parsed
    };
  }
  
  const result = await executeSmartHomeCommand(
    parsed.room,
    parsed.device,
    parsed.action,
    parsed.value
  );
  
  return {
    ...result,
    ...parsed
  };
}