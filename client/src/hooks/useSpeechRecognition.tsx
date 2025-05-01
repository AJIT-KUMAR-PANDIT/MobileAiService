import { useState, useEffect, useCallback, useRef } from 'react';

// Define types to handle browser-specific SpeechRecognition
type SpeechRecognitionEvent = {
  resultIndex: number;
  results: {
    [index: number]: {
      isFinal?: boolean;
      [index: number]: {
        transcript: string;
      };
    };
  };
};

type SpeechRecognitionErrorEvent = {
  error: string;
};

type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

// Extend the Window interface to include SpeechRecognition
declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

interface UseSpeechRecognitionReturn {
  transcript: string;
  listening: boolean;
  browserSupportsSpeechRecognition: boolean;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

const useSpeechRecognition = (): UseSpeechRecognitionReturn => {
  const [transcript, setTranscript] = useState('');
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const [browserSupportsSpeechRecognition, setBrowserSupport] = useState(false);

  // Initialize speech recognition on component mount
  useEffect(() => {
    // Check for browser support
    const SpeechRecognitionConstructor = 
      window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognitionConstructor) {
      try {
        // Create the recognition instance
        recognitionRef.current = new SpeechRecognitionConstructor();
        
        // Configure recognition
        if (recognitionRef.current) {
          recognitionRef.current.continuous = false;
          recognitionRef.current.interimResults = true;
          recognitionRef.current.lang = 'en-US';
          
          // Set up event handlers
          recognitionRef.current.onstart = () => {
            setListening(true);
          };
          
          recognitionRef.current.onend = () => {
            setListening(false);
          };
          
          recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
            const current = event.resultIndex;
            let newTranscript = '';
            
            for (let i = current; i < event.results.length; i++) {
              if (event.results[i].isFinal) {
                newTranscript += event.results[i][0].transcript;
              }
            }
            
            setTranscript(newTranscript);
          };
          
          recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
            console.error('Speech recognition error:', event.error);
            setListening(false);
          };
          
          setBrowserSupport(true);
        }
      } catch (error) {
        console.error('Error initializing speech recognition:', error);
        setBrowserSupport(false);
      }
    } else {
      console.warn('Speech recognition not supported in this browser');
      setBrowserSupport(false);
    }
    
    // Cleanup function
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onstart = null;
          recognitionRef.current.onend = null;
          recognitionRef.current.onresult = null;
          recognitionRef.current.onerror = null;
          
          if (listening) {
            recognitionRef.current.stop();
          }
        } catch (error) {
          console.error('Error cleaning up speech recognition:', error);
        }
      }
    };
  }, [listening]);
  
  // Start listening for speech
  const startListening = useCallback(() => {
    setTranscript('');
    
    if (!recognitionRef.current) {
      console.error('Speech recognition not initialized');
      return;
    }
    
    try {
      // First try to stop any existing recognition
      if (listening) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore errors from stopping recognition
          console.log('Error stopping existing recognition session:', e);
        }
      }
      
      // Short timeout before starting a new recognition session
      setTimeout(() => {
        if (recognitionRef.current) {
          try {
            recognitionRef.current.start();
            console.log("Speech recognition started successfully");
          } catch (error) {
            console.error('Error starting speech recognition:', error);
            
            // Try to reset the recognition engine
            const SpeechRecognitionConstructor = 
              window.SpeechRecognition || window.webkitSpeechRecognition;
            
            if (SpeechRecognitionConstructor) {
              try {
                recognitionRef.current = new SpeechRecognitionConstructor();
                
                if (recognitionRef.current) {
                  recognitionRef.current.continuous = false;
                  recognitionRef.current.interimResults = true;
                  recognitionRef.current.lang = 'en-US';
                  
                  recognitionRef.current.onstart = () => {
                    setListening(true);
                  };
                  
                  recognitionRef.current.onend = () => {
                    setListening(false);
                  };
                  
                  recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
                    const current = event.resultIndex;
                    let newTranscript = '';
                    
                    for (let i = current; i < event.results.length; i++) {
                      if (event.results[i].isFinal) {
                        newTranscript += event.results[i][0].transcript;
                      }
                    }
                    
                    setTranscript(newTranscript);
                  };
                  
                  recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
                    console.error('Speech recognition error:', event.error);
                    setListening(false);
                  };
                  
                  // Try to start the new recognition
                  recognitionRef.current.start();
                  console.log("Speech recognition restarted after error");
                }
              } catch (error) {
                console.error("Failed to recreate speech recognition:", error);
              }
            }
          }
        }
      }, 300);
    } catch (error) {
      console.error('Error in speech recognition setup:', error);
    }
  }, [listening]);
  
  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current && listening) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error('Error stopping speech recognition:', error);
      }
    }
  }, [listening]);
  
  // Reset transcript
  const resetTranscript = useCallback(() => {
    setTranscript('');
  }, []);
  
  return {
    transcript,
    listening,
    browserSupportsSpeechRecognition,
    startListening,
    stopListening,
    resetTranscript
  };
};

export default useSpeechRecognition;
