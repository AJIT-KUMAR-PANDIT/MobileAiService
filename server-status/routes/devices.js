/**
 * Device routes for IoT Systems Labs Mock Server
 */
const express = require('express');
const router = express.Router();

// Import the device state from a separate file
const { deviceState } = require('../data/deviceState');

// Status endpoint
router.get('/status', (req, res) => {
  res.json({
    status: 'online',
    online: true,
    timestamp: new Date().toISOString(),
    devices: deviceState
  });
});

// List all devices
router.get('/', (req, res) => {
  const devices = [];
  
  // Flatten the device state into a list
  Object.keys(deviceState).forEach(room => {
    Object.keys(deviceState[room]).forEach(deviceName => {
      devices.push({
        id: `${room}-${deviceName}`,
        name: deviceName,
        room: room,
        type: deviceName,
        status: deviceState[room][deviceName].status,
        properties: { ...deviceState[room][deviceName] }
      });
    });
  });
  
  res.json({
    success: true,
    count: devices.length,
    devices
  });
});

// Device control endpoint
router.post('/control', (req, res) => {
  const { room, device, action, value } = req.body;
  
  // Log the control request
  console.log(`Device control request: ${room}/${device}/${action}${value !== undefined ? `/${value}` : ''}`);
  
  // Validate request
  if (!room || !device || !action) {
    return res.status(400).json({
      success: false,
      message: 'Missing required parameters: room, device, and action are required'
    });
  }
  
  // Check if room exists
  if (!deviceState[room]) {
    return res.status(404).json({
      success: false,
      message: `Room "${room}" not found`
    });
  }
  
  // Check if device exists in room
  if (!deviceState[room][device]) {
    return res.status(404).json({
      success: false,
      message: `Device "${device}" not found in room "${room}"`
    });
  }
  
  // Process action
  switch (action) {
    case 'on':
      deviceState[room][device].status = 'on';
      break;
    case 'off':
      deviceState[room][device].status = 'off';
      break;
    case 'increase':
      // Handle different properties based on device type
      if (device === 'light' && deviceState[room][device].brightness < 100) {
        deviceState[room][device].brightness += 10;
        if (deviceState[room][device].brightness > 100) {
          deviceState[room][device].brightness = 100;
        }
      } else if (device === 'fan' && deviceState[room][device].speed < 5) {
        deviceState[room][device].speed += 1;
      } else if (device === 'ac' && deviceState[room][device].temperature < 30) {
        deviceState[room][device].temperature += 1;
      } else if ((device === 'tv' || device === 'speaker') && deviceState[room][device].volume < 100) {
        deviceState[room][device].volume += 10;
        if (deviceState[room][device].volume > 100) {
          deviceState[room][device].volume = 100;
        }
      }
      break;
    case 'decrease':
      // Handle different properties based on device type
      if (device === 'light' && deviceState[room][device].brightness > 0) {
        deviceState[room][device].brightness -= 10;
        if (deviceState[room][device].brightness < 0) {
          deviceState[room][device].brightness = 0;
        }
      } else if (device === 'fan' && deviceState[room][device].speed > 1) {
        deviceState[room][device].speed -= 1;
      } else if (device === 'ac' && deviceState[room][device].temperature > 16) {
        deviceState[room][device].temperature -= 1;
      } else if ((device === 'tv' || device === 'speaker') && deviceState[room][device].volume > 0) {
        deviceState[room][device].volume -= 10;
        if (deviceState[room][device].volume < 0) {
          deviceState[room][device].volume = 0;
        }
      }
      break;
    case 'set':
      // Set specific value
      if (device === 'light' && value !== undefined) {
        deviceState[room][device].brightness = Math.min(100, Math.max(0, parseInt(value)));
      } else if (device === 'fan' && value !== undefined) {
        deviceState[room][device].speed = Math.min(5, Math.max(1, parseInt(value)));
      } else if (device === 'ac' && value !== undefined) {
        deviceState[room][device].temperature = Math.min(30, Math.max(16, parseInt(value)));
      } else if (device === 'tv' && value !== undefined) {
        if (req.body.property === 'channel') {
          deviceState[room][device].channel = Math.max(1, parseInt(value));
        } else if (req.body.property === 'volume') {
          deviceState[room][device].volume = Math.min(100, Math.max(0, parseInt(value)));
        }
      } else if (device === 'speaker' && value !== undefined) {
        deviceState[room][device].volume = Math.min(100, Math.max(0, parseInt(value)));
      } else if (device === 'curtain' && value !== undefined) {
        deviceState[room][device].position = Math.min(100, Math.max(0, parseInt(value)));
        deviceState[room][device].status = parseInt(value) > 0 ? 'open' : 'closed';
      }
      break;
    default:
      return res.status(400).json({
        success: false,
        message: `Unknown action "${action}". Supported actions are: on, off, increase, decrease, set`
      });
  }
  
  // Return success response
  res.json({
    success: true,
    message: `Successfully ${action} the ${device} in ${room}`,
    status: 'OK',
    timestamp: new Date().toISOString(),
    data: {
      room,
      device,
      action,
      value,
      currentState: deviceState[room][device]
    }
  });
});

// Register a new device
router.post('/register', (req, res) => {
  const { room, device, type, properties } = req.body;
  
  if (!room || !device || !type) {
    return res.status(400).json({
      success: false,
      message: 'Missing required parameters: room, device, and type are required'
    });
  }
  
  // Create room if it doesn't exist
  if (!deviceState[room]) {
    deviceState[room] = {};
  }
  
  // Add or update device
  deviceState[room][device] = {
    status: 'off',
    ...properties
  };
  
  res.json({
    success: true,
    message: `Device "${device}" registered in room "${room}"`,
    data: {
      room,
      device,
      type,
      properties: deviceState[room][device]
    }
  });
});

module.exports = router;