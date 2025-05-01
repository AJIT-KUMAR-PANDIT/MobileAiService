/**
 * Generate a wakeup sound using Web Audio API
 * This creates a pleasant "ding" sound for the Luna wake word
 */
export function generateWakeupSound(): string {
  // Create an offline audio context to generate the sound
  const audioContext = new OfflineAudioContext({
    numberOfChannels: 2,
    length: 44100 * 1.5, // 1.5 seconds
    sampleRate: 44100,
  });

  // Create oscillator for the main tone
  const oscillator = audioContext.createOscillator();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(880, 0); // A5
  oscillator.frequency.exponentialRampToValueAtTime(1760, 0.1); // A6
  oscillator.frequency.exponentialRampToValueAtTime(1320, 0.5); // E6

  // Create a gain node for volume control
  const gainNode = audioContext.createGain();
  gainNode.gain.setValueAtTime(0, 0);
  gainNode.gain.linearRampToValueAtTime(0.7, 0.05);
  gainNode.gain.exponentialRampToValueAtTime(0.001, 1.5);

  // Connect nodes
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  // Start the oscillator
  oscillator.start(0);
  oscillator.stop(1.5);

  // Start rendering
  return audioContext.startRendering()
    .then(renderedBuffer => {
      // Convert the audio buffer to a WAV file as a data URL
      const wavBytes = bufferToWav(renderedBuffer);
      const blob = new Blob([wavBytes], { type: 'audio/wav' });
      return URL.createObjectURL(blob);
    })
    .catch(err => {
      console.error('Error generating wakeup sound:', err);
      return '';
    });
}

/**
 * Convert an AudioBuffer to a WAV file
 */
function bufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const numOfChannels = buffer.numberOfChannels;
  const length = buffer.length * numOfChannels * 2;
  const sampleRate = buffer.sampleRate;
  
  // Create the buffer for the WAV file
  const wavBytes = new ArrayBuffer(44 + length);
  const view = new DataView(wavBytes);
  
  // Write the WAV file header
  writeString(view, 0, 'RIFF');                    // RIFF identifier
  view.setUint32(4, 36 + length, true);            // file length - 8
  writeString(view, 8, 'WAVE');                    // WAVE identifier
  writeString(view, 12, 'fmt ');                   // format chunk identifier
  view.setUint32(16, 16, true);                    // format chunk length
  view.setUint16(20, 1, true);                     // sample format (1 = PCM)
  view.setUint16(22, numOfChannels, true);         // number of channels
  view.setUint32(24, sampleRate, true);            // sample rate
  view.setUint32(28, sampleRate * 2 * numOfChannels, true); // byte rate
  view.setUint16(32, numOfChannels * 2, true);     // block align
  view.setUint16(34, 16, true);                    // bits per sample
  writeString(view, 36, 'data');                   // data chunk identifier
  view.setUint32(40, length, true);                // data chunk length
  
  // Write the audio data
  const channels = [];
  for (let i = 0; i < numOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }
  
  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let channel = 0; channel < numOfChannels; channel++) {
      // Convert float audio data (-1 to 1) to 16-bit PCM
      const sample = Math.max(-1, Math.min(1, channels[channel][i]));
      const value = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset, value, true);
      offset += 2;
    }
  }
  
  return wavBytes;
}

/**
 * Write a string to a DataView at a specified offset
 */
function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}