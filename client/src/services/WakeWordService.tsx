import { useState, useEffect, useCallback, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { SpeechRecognition } from "@capacitor-community/speech-recognition";

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

const WAKE_WORD = "luna";
const CONFIDENCE_THRESHOLD = 0.001; // Extremely low threshold for better detection
const RECOGNITION_INTERVAL = 300; // Shorter interval for faster response
const WAKE_WORD_TIMEOUT = 20000; // Extended timeout for better chance of detection
const RETRY_DELAY = 3000; // Increased delay between retries
const MAX_RETRIES = 10; // Increased retries
const LISTENING_DURATION = 15000; // 15 seconds listening duration

const useWakeWordDetection = () => {
  const [isListening, setIsListening] = useState(false);
  const [isWakeWordDetected, setIsWakeWordDetected] = useState(false);
  const [wakeWordConfidence, setWakeWordConfidence] = useState(0);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isListeningRef = useRef(isListening);
  const retryCountRef = useRef(0);

  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  const cleanupRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.warn("Recognition cleanup error:", e);
      }
      recognitionRef.current = null;
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const resetDetection = useCallback(() => {
    setIsWakeWordDetected(false);
    setWakeWordConfidence(0);
    retryCountRef.current = 0;
  }, []);

  const stopListening = useCallback(() => {
    console.log("Stopping wake word detection");
    cleanupRecognition();
    setIsListening(false);
    resetDetection();
  }, [cleanupRecognition, resetDetection]);

  const initializeRecognition = useCallback(async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        await SpeechRecognition.available();
        await SpeechRecognition.requestPermission();
        return true;
      } catch (e) {
        console.error("Mobile speech recognition init error:", e);
        return false;
      }
    } else {
      const SpeechRecognitionAPI =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognitionAPI) {
        console.error("Web SpeechRecognition not available");
        return false;
      }
      return true;
    }
  }, []);

  const startRecognition = useCallback(async () => {
    if (!isListeningRef.current) return;

    try {
      if (Capacitor.isNativePlatform()) {
        await SpeechRecognition.start({
          language: "en-US",
          maxResults: 2,
          prompt: "Listening for wake word...",
          partialResults: true,
          popup: false,
        });
      } else {
        const SpeechRecognitionAPI =
          window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognitionAPI) {
          const recognition = new SpeechRecognitionAPI();
          recognitionRef.current = recognition;

          recognition.continuous = false;
          recognition.interimResults = true;
          recognition.lang = "en-US";

          recognition.onresult = (event) => {
            const results = Array.from(event.results).map((result) => ({
              transcript: result[0].transcript.toLowerCase(),
              confidence: result[0].confidence,
            }));

            const wakeWordResult = results.find((r) =>
              r.transcript.includes(WAKE_WORD)
            );
            if (wakeWordResult) {
              setWakeWordConfidence(wakeWordResult.confidence);
              if (wakeWordResult.confidence > CONFIDENCE_THRESHOLD) {
                setIsWakeWordDetected(true);
                stopListening();
              }
            }
          };

          recognition.onend = () => {
            if (isListeningRef.current) {
              // Only restart if we're still meant to be listening
              setTimeout(() => {
                if (isListeningRef.current && !recognitionRef.current) {
                  retryCountRef.current = 0; // Reset retries on clean restart
                  startRecognition();
                }
              }, RECOGNITION_INTERVAL);
            }
          };

          recognition.onerror = (event: any) => {
            console.error("Recognition error:", event.error);
            if (isListeningRef.current) {
              // Only increment retries for non-aborted errors
              if (event.error !== "aborted") {
                retryCountRef.current++;
              }

              if (retryCountRef.current <= MAX_RETRIES) {
                // Exponential backoff for retry delay
                const backoffDelay =
                  RETRY_DELAY * Math.pow(1.5, retryCountRef.current - 1);
                setTimeout(() => {
                  if (isListeningRef.current) {
                    console.log(
                      `Retrying recognition (attempt ${retryCountRef.current})`
                    );
                    startRecognition();
                  }
                }, backoffDelay);
              } else {
                console.error("Max retries exceeded, restarting recognition");
                retryCountRef.current = 0;
                stopListening();
                // Attempt to restart after a longer delay
                setTimeout(() => {
                  if (isListeningRef.current) {
                    startRecognition();
                  }
                }, RETRY_DELAY * 2);
              }
            }
          };

          recognition.start();
        }
      }
    } catch (error) {
      console.error("Error starting recognition:", error);
      if (isListeningRef.current) {
        retryCountRef.current++;
        if (retryCountRef.current <= MAX_RETRIES) {
          setTimeout(() => {
            if (isListeningRef.current) {
              startRecognition();
            }
          }, RETRY_DELAY);
        } else {
          console.error("Max retries exceeded, stopping recognition");
          stopListening();
        }
      }
    }
  }, [stopListening]);

  const startListening = useCallback(async () => {
    if (isListeningRef.current) return;

    const isAvailable = await initializeRecognition();
    if (!isAvailable) {
      console.error("Speech recognition not available");
      return;
    }

    console.log("Starting wake word detection");
    setIsListening(true);
    retryCountRef.current = 0;

    // Start recognition after a short delay
    setTimeout(() => {
      startRecognition();
    }, 100);
  }, [initializeRecognition, startRecognition]);

  useEffect(() => {
    return () => {
      cleanupRecognition();
    };
  }, [cleanupRecognition]);

  return {
    isListening,
    isWakeWordDetected,
    wakeWordConfidence,
    startListening,
    stopListening,
    resetDetection,
  };
};

export default useWakeWordDetection;
