import { useState, useEffect, useCallback, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { SpeechRecognition as CapacitorSpeechRecognition } from "@capacitor-community/speech-recognition";

const WAKE_WORD = "luna";
const CONFIDENCE_THRESHOLD = 0.001; // Low threshold for initial detection
const RETRY_DELAY = 5000; // Delay between retries
const MAX_RETRIES = 5;

declare global {
  interface Window {
    SpeechRecognition?: typeof window.SpeechRecognition;
    webkitSpeechRecognition?: typeof window.webkitSpeechRecognition;
  }
}

type SpeechRecognition = typeof window.SpeechRecognition extends {
  new (): infer R;
}
  ? R
  : any;

interface UseGlobalWakeWordOptions {
  onWakeWordDetected: () => void;
}

const useGlobalWakeWord = ({
  onWakeWordDetected,
}: UseGlobalWakeWordOptions) => {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isListeningRef = useRef(isListening);
  const retryCountRef = useRef(0);
  const onWakeWordDetectedRef = useRef(onWakeWordDetected);

  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  useEffect(() => {
    onWakeWordDetectedRef.current = onWakeWordDetected;
  }, [onWakeWordDetected]);

  const cleanupRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch (e) {
        console.warn("Global Recognition cleanup error:", e);
      }
      recognitionRef.current = null;
    }
    // Don't clear timeouts here as we want continuous listening
  }, []);

  const stopListening = useCallback(() => {
    console.log("Stopping global wake word detection");
    cleanupRecognition();
    setIsListening(false);
    retryCountRef.current = 0;
  }, [cleanupRecognition]);

  const initializeAndStartRecognition = useCallback(async () => {
    if (isListeningRef.current) return; // Already listening

    let permissionGranted = false;
    if (Capacitor.isNativePlatform()) {
      try {
        const permissionResult =
          await CapacitorSpeechRecognition.requestPermissions();
        permissionGranted = permissionResult?.speechRecognition === "granted";
        if (!permissionGranted) {
          console.error("Global WW: Microphone permission not granted.");
          return;
        }
        const { available } = await CapacitorSpeechRecognition.available();
        if (!available) {
          console.error("Global WW: Mobile speech recognition not available");
          return;
        }
      } catch (e) {
        console.error("Global WW: Mobile speech recognition init error:", e);
        return;
      }
    } else {
      const SpeechRecognitionAPI =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognitionAPI) {
        console.error("Global WW: Web SpeechRecognition not available");
        return;
      }
      // Web permissions are usually handled implicitly by the browser
      permissionGranted = true;
    }

    if (!permissionGranted) return;

    setIsListening(true);
    console.log("Starting global wake word detection...");

    const startRecognitionLogic = () => {
      if (!isListeningRef.current) return; // Stop if listening state changed

      if (Capacitor.isNativePlatform()) {
        // Native implementation needs careful handling of continuous listening
        // For simplicity, we'll focus on the web version first.
        // A more robust native solution might involve a background service.
        console.warn(
          "Global wake word detection on native platform is experimental."
        );
        // Placeholder: Stop for now on native to avoid complexity
        stopListening();
        return;
      } else {
        const SpeechRecognitionAPI =
          window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognitionAPI || recognitionRef.current) return;

        const recognition = new SpeechRecognitionAPI();
        recognitionRef.current = recognition;

        recognition.continuous = false; // Restart on end
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onresult = (event: any) => {
          const results = Array.from(event.results).map((result) => {
            const alternative = (result as any)[0] || (result as any).item(0);
            return {
              transcript: alternative.transcript.toLowerCase(),
              confidence: alternative.confidence,
            };
          });

          const wakeWordResult = results.find((r) =>
            r.transcript.includes(WAKE_WORD)
          );

          if (
            wakeWordResult &&
            wakeWordResult.confidence > CONFIDENCE_THRESHOLD
          ) {
            console.log("Global Wake Word Detected!");
            onWakeWordDetectedRef.current();
            // Stop listening globally once detected, let the overlay take over
            stopListening();
          }
        };

        recognition.onend = () => {
          recognitionRef.current = null;
          if (isListeningRef.current) {
            // Automatically restart recognition after a short delay
            setTimeout(() => {
              if (isListeningRef.current && !recognitionRef.current) {
                startRecognitionLogic();
              }
            }, 500); // Short delay before restart
          }
        };

        recognition.onerror = (event: any) => {
          console.error("Global Recognition error:", event.error);
          recognitionRef.current = null; // Ensure ref is cleared on error
          if (
            isListeningRef.current &&
            event.error !== "aborted" &&
            event.error !== "no-speech"
          ) {
            retryCountRef.current++;
            if (retryCountRef.current <= MAX_RETRIES) {
              const backoffDelay =
                RETRY_DELAY * Math.pow(1.5, retryCountRef.current - 1);
              console.log(
                `Global WW: Retrying in ${backoffDelay}ms (attempt ${retryCountRef.current})`
              );
              setTimeout(() => {
                if (isListeningRef.current) {
                  startRecognitionLogic();
                }
              }, backoffDelay);
            } else {
              console.error("Global WW: Max retries exceeded. Stopping.");
              stopListening();
            }
          } else if (isListeningRef.current) {
            // Restart immediately for 'no-speech' or 'aborted' if still listening
            setTimeout(() => {
              if (isListeningRef.current && !recognitionRef.current) {
                startRecognitionLogic();
              }
            }, 500);
          }
        };

        try {
          recognition.start();
        } catch (e) {
          console.error("Error starting global recognition:", e);
          recognitionRef.current = null;
          stopListening();
        }
      }
    };

    startRecognitionLogic();
  }, [stopListening]);

  // Start listening on mount
  useEffect(() => {
    initializeAndStartRecognition();
    // Cleanup on unmount
    return () => {
      stopListening();
    };
  }, [initializeAndStartRecognition, stopListening]);

  return {
    isListening,
    stopListening,
    startListening: initializeAndStartRecognition,
  };
};

export default useGlobalWakeWord;
