import { useState, useEffect, useCallback, useRef } from "react";
import { Capacitor } from "@capacitor/core";
// Add this line back, but alias it to avoid confusion:
import { SpeechRecognition as CapacitorSpeechRecognition } from "@capacitor-community/speech-recognition";

const WAKE_WORD = "luna";
const CONFIDENCE_THRESHOLD = 0.001; // Extremely low threshold for better detection
const RECOGNITION_INTERVAL = 300; // Shorter interval for faster response
const WAKE_WORD_TIMEOUT = 20000; // Extended timeout for better chance of detection
const RETRY_DELAY = 3000; // Increased delay between retries
const MAX_RETRIES = 10; // Increased retries
const LISTENING_DURATION = 15000; // 15 seconds listening duration

// Ensure the global types for SpeechRecognition are correctly augmented
declare global {
  interface Window {
    SpeechRecognition?: typeof window.SpeechRecognition;
    webkitSpeechRecognition?: typeof window.webkitSpeechRecognition;
  }
}

// Add this workaround if TypeScript cannot find the type
type SpeechRecognition = typeof window.SpeechRecognition extends {
  new (): infer R;
}
  ? R
  : any;

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
        // Request permissions before checking availability
        const permissionResult = await CapacitorSpeechRecognition.requestPermissions();
        if (
          !permissionResult ||
          !permissionResult.speechRecognition ||
          permissionResult.speechRecognition !== "granted"
        ) {
          console.error("Microphone permission not granted:", permissionResult);
          setIsListening(false);
          return false;
        }
        const { available } = await CapacitorSpeechRecognition.available();
        if (!available) {
          console.error("Mobile speech recognition not available");
          setIsListening(false);
          return false;
        }
        return true;
      } catch (e) {
        console.error("Mobile speech recognition init error:", e);
        setIsListening(false);
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
        await CapacitorSpeechRecognition.start({
          language: "en-US",
          maxResults: 2,
          prompt: "Listening for wake word...",
          partialResults: true,
          popup: false,
        });
        // Optionally, add a timeout to auto-stop listening after a duration
        setTimeout(() => {
          if (isListeningRef.current) {
            console.warn("Listening timed out, stopping recognition.");
            stopListening();
          }
        }, LISTENING_DURATION);
      } else {
        const SpeechRecognitionAPI =
          window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognitionAPI) {
          const recognition = new SpeechRecognitionAPI();
          recognitionRef.current = recognition;

          recognition.continuous = false;
          recognition.interimResults = true;
          recognition.lang = "en-US";

          recognition.onresult = (event: any) => {
            const results = Array.from(event.results).map((result) => {
              // Fix: Cast result to any so you can safely access [0] or item(0)
              const alternative = (result as any)[0] || (result as any).item(0);
              return {
                transcript: alternative.transcript.toLowerCase(),
                confidence: alternative.confidence,
              };
            });

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
            recognitionRef.current = null;
            if (isListeningRef.current) {
              setTimeout(() => {
                if (isListeningRef.current && !recognitionRef.current) {
                  retryCountRef.current = 0;
                  startRecognition();
                }
              }, RECOGNITION_INTERVAL);
            }
          };

          recognition.onerror = (event: any) => {
            console.error("Recognition error:", event.error);
            if (isListeningRef.current) {
              if (event.error !== "aborted") {
                retryCountRef.current++;
              }

              if (retryCountRef.current <= MAX_RETRIES) {
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
      setIsListening(false);
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
