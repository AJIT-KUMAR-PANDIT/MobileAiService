import { useState, useEffect, useCallback } from 'react';

// Import wake sound
import wakeupSound from '../assets/sounds/wakeupsound.mp3';

interface UseWakeWordDetectionReturn {
  isListening: boolean;
  isWakeWordDetected: boolean;
  startListening: () => void;
  stopListening: () => void;
  resetDetection: () => void;
  wakeWordConfidence: number;
}

// The wake word we're listening for
const WAKE_WORD = 'luna';

// Create an audio context and buffer for wake sound
let audioContext: AudioContext | null = null;
let wakeBuffer: AudioBuffer | null = null;

// Function to play wake sound
const playWakeSound = async () => {
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Load wake sound if not already loaded
      if (!wakeBuffer) {
        const response = await fetch(wakeupSound);
        const arrayBuffer = await response.arrayBuffer();
        wakeBuffer = await audioContext.decodeAudioData(arrayBuffer);
      }
    }
    
    // Create source and play sound
    const source = audioContext.createBufferSource();
    source.buffer = wakeBuffer;
    source.connect(audioContext.destination);
    source.start(0);
    
    return true;
  } catch (error) {
    console.error('Error playing wake sound:', error);
    return false;
  }
};

const useWakeWordDetection = (): UseWakeWordDetectionReturn => {
  const [isListening, setIsListening] = useState(false);
  const [isWakeWordDetected, setIsWakeWordDetected] = useState(false);
  const [wakeWordConfidence, setWakeWordConfidence] = useState(0);
  const [recognition, setRecognition] = useState<any>(null);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        const recognitionInstance = new SpeechRecognition();
        recognitionInstance.continuous = true;
        recognitionInstance.interimResults = true;
        recognitionInstance.lang = 'en-US';
        
        // Configure for best wake word detection
        recognitionInstance.maxAlternatives = 5;
        
        setRecognition(recognitionInstance);
      }
    }
    
    return () => {
      if (recognition) {
        recognition.stop();
      }
    };
  }, []);

  // Set up event handlers for speech recognition
  useEffect(() => {
    if (!recognition) return;
    
    recognition.onstart = () => {
      setIsListening(true);
      console.log('Wake word detection started');
    };
    
    recognition.onend = () => {
      if (isListening) {
        // Auto restart if we're supposed to be listening
        recognition.start();
      } else {
        setIsListening(false);
        console.log('Wake word detection stopped');
      }
    };
    
    recognition.onerror = (event: any) => {
      console.error('Wake word detection error:', event.error);
      if (event.error === 'no-speech') {
        // This is common and not a critical error
        return;
      }
      
      setIsListening(false);
    };
    
    recognition.onresult = (event: any) => {
      const results = Array.from(event.results);
      
      for (let i = event.resultIndex; i < results.length; i++) {
        const result = results[i];
        const transcript = result[0].transcript.trim().toLowerCase();
        
        // Check if transcript contains wake word
        if (transcript.includes(WAKE_WORD)) {
          // Calculate rough confidence based on position in results
          const position = transcript.indexOf(WAKE_WORD);
          const confidence = position === 0 ? 
            0.9 + (result[0].confidence * 0.1) : 
            0.5 + (result[0].confidence * 0.1) - (position * 0.01);
          
          console.log(`Wake word "${WAKE_WORD}" detected with confidence:`, confidence);
          setWakeWordConfidence(confidence);
          
          if (confidence > 0.6) {
            setIsWakeWordDetected(true);
            playWakeSound();
            
            // Temporarily stop recognition to prevent multiple detections
            recognition.stop();
            setTimeout(() => {
              if (isListening) {
                recognition.start();
              }
            }, 1500);
          }
          
          break;
        }
      }
    };
  }, [recognition, isListening]);

  const startListening = useCallback(() => {
    if (recognition) {
      try {
        recognition.start();
        setIsListening(true);
      } catch (error) {
        console.error('Error starting wake word detection:', error);
      }
    }
  }, [recognition]);

  const stopListening = useCallback(() => {
    if (recognition) {
      recognition.stop();
      setIsListening(false);
    }
  }, [recognition]);

  const resetDetection = useCallback(() => {
    setIsWakeWordDetected(false);
    setWakeWordConfidence(0);
  }, []);

  return {
    isListening,
    isWakeWordDetected,
    startListening,
    stopListening,
    resetDetection,
    wakeWordConfidence
  };
};

export default useWakeWordDetection;