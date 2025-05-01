import { useState, useEffect, useCallback, useRef } from 'react';

// Define types for browser speech recognition API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal?: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: ((event: Event) => void) | null;
  onerror: ((event: Event) => void) | null;
  onnomatch: ((event: Event) => void) | null;
  onstart: ((event: Event) => void) | null;
  onaudiostart: ((event: Event) => void) | null;
  onaudioend: ((event: Event) => void) | null;
  onsoundstart: ((event: Event) => void) | null;
  onsoundend: ((event: Event) => void) | null;
  onspeechstart: ((event: Event) => void) | null;
  onspeechend: ((event: Event) => void) | null;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

// Augment the window object to include speech recognition
declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

// Configuration for wake word detection
const WAKE_WORD = 'luna';
const CONFIDENCE_THRESHOLD = 0.6;
const RECOGNITION_INTERVAL = 3000; // Recognition interval in ms
const WAKE_WORD_TIMEOUT = 5000; // Reset detection after this many ms

/**
 * Custom hook for wake word detection
 * Listens for the wake word "Luna" and triggers a callback when detected
 */
const useWakeWordDetection = () => {
  const [isListening, setIsListening] = useState(false);
  const [isWakeWordDetected, setIsWakeWordDetected] = useState(false);
  const [wakeWordConfidence, setWakeWordConfidence] = useState(0);
  
  // References for cleanup and state access in callbacks
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isListeningRef = useRef(isListening);
  
  // Update ref when state changes
  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);
  
  // Reset detection state
  const resetDetection = useCallback(() => {
    setIsWakeWordDetected(false);
    setWakeWordConfidence(0);
  }, []);
  
  // Stop listening for wake word
  const stopListening = useCallback(() => {
    console.log('Stopping wake word detection');
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore errors from stopping recognition that wasn't running
      }
      recognitionRef.current = null;
    }
    
    // Clear any pending timeouts/intervals
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    setIsListening(false);
  }, []);
  
  // Start listening for wake word
  const startListening = useCallback(() => {
    // Already listening, don't start again
    if (isListeningRef.current) return;
    
    // Check if browser supports speech recognition
    if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
      console.warn('Wake word detection not supported in this browser');
      return;
    }
    
    // Stop any existing recognition first
    stopListening();
    
    console.log('Wake word detection started');
    setIsListening(true);
    
    // Create Speech Recognition
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      console.error('SpeechRecognition API not available');
      setIsListening(false);
      return;
    }
    
    const recognition = new SpeechRecognitionAPI();
    recognitionRef.current = recognition;
    
    // Configure recognition
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    
    // Handle recognition results
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      try {
        const results = Array.from({ length: event.results.length }, (_, i) => event.results[i]);
        const transcript = results
          .map(result => result[0]?.transcript?.toLowerCase() || '')
          .join(' ');
        
        // Check if transcript contains wake word
        if (transcript.includes(WAKE_WORD)) {
          // Get confidence from first result
          const confidence = event.results[0]?.[0]?.confidence || 0;
          console.log(`Wake word detected with confidence: ${confidence}`);
          setWakeWordConfidence(confidence);
          
          // Only trigger if confidence is above threshold
          if (confidence > CONFIDENCE_THRESHOLD) {
            setIsWakeWordDetected(true);
            
            // Set timeout to reset detection automatically
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
            }
            
            timeoutRef.current = setTimeout(() => {
              resetDetection();
            }, WAKE_WORD_TIMEOUT);
          }
        }
      } catch (error) {
        console.error('Error processing speech recognition results:', error);
      }
    };
    
    // Handle recognition errors
    recognition.onerror = (event: Event) => {
      console.error('Speech recognition error:', (event as any).error);
    };
    
    // Handle recognition end
    recognition.onend = () => {
      // If we're still supposed to be listening, restart recognition
      if (isListeningRef.current && recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          // Handle potential errors when starting recognition
          console.error('Error restarting wake word detection:', e);
          
          // If we hit an error, try again after a short delay
          setTimeout(() => {
            if (isListeningRef.current && recognitionRef.current) {
              try {
                recognitionRef.current.start();
              } catch (e) {
                console.error('Failed to restart wake word detection after error');
                setIsListening(false);
              }
            }
          }, 1000);
        }
      }
    };
    
    // Start recognition with error handling
    try {
      recognition.start();
      console.log("Wake word detection started successfully");
    } catch (e) {
      console.error('Error starting wake word detection:', e);
      
      // In case of error, try to recreate the recognition object
      try {
        if (recognitionRef.current) {
          recognitionRef.current = null;
        }
        
        const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognitionAPI) {
          const newRecognition = new SpeechRecognitionAPI();
          recognitionRef.current = newRecognition;
          
          // Configure recognition
          newRecognition.continuous = false;
          newRecognition.interimResults = true;
          newRecognition.lang = 'en-US';
          
          // Set up event handlers (simplified)
          newRecognition.onresult = recognition.onresult;
          newRecognition.onend = recognition.onend;
          newRecognition.onerror = recognition.onerror;
          
          // Try starting again after a short delay
          setTimeout(() => {
            try {
              newRecognition.start();
              console.log("Wake word detection restarted after error");
            } catch (retryError) {
              console.error("Failed final attempt to start wake word detection:", retryError);
              setIsListening(false);
            }
          }, 1000);
        } else {
          setIsListening(false);
        }
      } catch (recoveryError) {
        console.error("Error during recovery attempt:", recoveryError);
        setIsListening(false);
      }
    }
  }, [stopListening, resetDetection]);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);
  
  return {
    isListening,
    isWakeWordDetected,
    wakeWordConfidence,
    startListening,
    stopListening,
    resetDetection
  };
};

export default useWakeWordDetection;