/**
 * Device state data for IoT Systems Labs Mock Server
 */

// Store device states in memory
const deviceState = {
  'living-room': {
    'light': { status: 'off', brightness: 50 },
    'fan': { status: 'off', speed: 1 },
    'ac': { status: 'off', temperature: 24 },
    'tv': { status: 'off', channel: 1, volume: 20 },
    'speaker': { status: 'off', volume: 50 },
    'curtain': { status: 'closed', position: 0 }
  },
  'bedroom': {
    'light': { status: 'off', brightness: 30 },
    'fan': { status: 'off', speed: 1 },
    'ac': { status: 'off', temperature: 22 },
    'tv': { status: 'off', channel: 1, volume: 15 },
    'speaker': { status: 'off', volume: 40 },
    'curtain': { status: 'closed', position: 0 }
  },
  'kitchen': {
    'light': { status: 'off', brightness: 80 },
    'fan': { status: 'off', speed: 1 }
  },
  'bathroom': {
    'light': { status: 'off', brightness: 70 }
  },
  'office': {
    'light': { status: 'off', brightness: 60 },
    'fan': { status: 'off', speed: 1 },
    'ac': { status: 'off', temperature: 23 }
  }
};

module.exports = { deviceState };