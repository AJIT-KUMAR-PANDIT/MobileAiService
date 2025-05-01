import { useState, useEffect, useCallback, useRef } from 'react';

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
  const recognitionRef = useRef<any>(null);
  const [browserSupportsSpeechRecognition, setBrowserSupport] = useState(false);

  useEffect(() => {
    // Check for browser support
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onstart = () => {
        setListening(true);
      };

      recognitionRef.current.onend = () => {
        setListening(false);
      };

      recognitionRef.current.onresult = (event: any) => {
        const current = event.resultIndex;
        let newTranscript = '';
        
        for (let i = current; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            newTranscript += event.results[i][0].transcript;
          }
        }
        
        setTranscript(newTranscript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setListening(false);
      };

      setBrowserSupport(true);
    } else {
      console.warn('Speech recognition not supported in this browser');
      setBrowserSupport(false);
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        
        if (listening) {
          recognitionRef.current.stop();
        }
      }
    };
  }, []);

  const startListening = useCallback(() => {
    setTranscript('');
    if (recognitionRef.current && !listening) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Error starting speech recognition:', error);
      }
    }
  }, [listening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && listening) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error('Error stopping speech recognition:', error);
      }
    }
  }, [listening]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
  }, []);

  return {
    transcript,
    listening,
    browserSupportsSpeechRecognition,
    startListening,
    stopListening,
    resetTranscript,
  };
};

export default useSpeechRecognition;
