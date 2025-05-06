import { useState, useEffect, useCallback, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { SpeechRecognition } from "@capacitor-community/speech-recognition";
import type { PluginListenerHandle } from "@capacitor/core";

// Define the web speech recognition types
interface SpeechRecognitionEvent {
  resultIndex: number;
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
        isFinal: boolean; // Add isFinal property
      };
    };
  };
}

interface WebSpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  lang: string;
  start: () => void;
  stop: () => void;
  onstart: () => void;
  onend: () => void;
  onerror: (event: any) => void;
  onresult: (event: SpeechRecognitionEvent) => void;
}

interface SpeechRecognitionConstructor {
  new (): WebSpeechRecognition;
}

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
  startListening: () => Promise<void>;
  stopListening: () => Promise<void>;
  resetTranscript: () => void;
  processRequest: () => void;
}

const useSpeechRecognition = (): UseSpeechRecognitionReturn => {
  const [transcript, setTranscript] = useState("");
  const [listening, setListening] = useState(false);
  const [browserSupportsSpeechRecognition, setBrowserSupport] = useState(false);
  const [silenceTimer, setSilenceTimer] = useState<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<WebSpeechRecognition | null>(null);
  const partialListenerRef = useRef<PluginListenerHandle | null>(null);
  const finalListenerRef = useRef<PluginListenerHandle | null>(null);
  const isStoppingRef = useRef(false); // Ref to track manual stop

  // Define processRequest first to avoid circular reference
  const processRequest = useCallback(() => {
    if (transcript.trim() !== "") {
      console.log("Processing request:", transcript);
      // Stop listening immediately when processing
      stopListeningInternal(true); // Pass true to indicate processing
    }
  }, [transcript]); // Removed silenceTimer dependency

  // Internal stop function to handle cleanup
  const stopListeningInternal = useCallback(
    async (isProcessing = false) => {
      isStoppingRef.current = true; // Mark as manually stopping
      if (silenceTimer) {
        clearTimeout(silenceTimer);
        setSilenceTimer(null);
      }

      if (Capacitor.isNativePlatform()) {
        try {
          // Remove listeners before stopping
          if (partialListenerRef.current) {
            await partialListenerRef.current.remove();
            partialListenerRef.current = null;
          }
          if (finalListenerRef.current) {
            await finalListenerRef.current.remove();
            finalListenerRef.current = null;
          }
          await SpeechRecognition.stop();
          console.log("Mobile speech recognition stopped.");
        } catch (error) {
          console.error("Error stopping mobile speech recognition:", error);
        }
      } else if (recognitionRef.current) {
        try {
          recognitionRef.current.onresult = null as unknown as (
            event: SpeechRecognitionEvent
          ) => void; // Prevent further results
          recognitionRef.current.onerror = null as unknown as (
            event: any
          ) => void; // Prevent errors after stop
          recognitionRef.current.onend = null as unknown as () => void; // Prevent onend loop
          recognitionRef.current.stop();
          console.log("Web speech recognition stopped.");
        } catch (error) {
          console.error("Error stopping web speech recognition:", error);
        }
      }

      setListening(false);
      // Only reset transcript if not processing a result
      if (!isProcessing) {
        // setTranscript(""); // Optionally reset transcript on manual stop
      }
      isStoppingRef.current = false; // Reset stopping flag
    },
    [silenceTimer]
  );

  // Public stop function
  const stopListening = useCallback(async () => {
    await stopListeningInternal(false);
  }, [stopListeningInternal]);

  const resetSilenceTimer = useCallback(() => {
    if (silenceTimer) {
      clearTimeout(silenceTimer);
    }
    // Only set timer if still listening and not manually stopping
    if (listening && !isStoppingRef.current) {
      // Update timeout to 15 seconds (15000 ms)
      setSilenceTimer(setTimeout(processRequest, 15000));
    }
  }, [silenceTimer, processRequest, listening]);

  // Duplicate definition removed, keeping the one above

  const startListening = useCallback(async () => {
    setTranscript("");
    if (silenceTimer) clearTimeout(silenceTimer);
    setSilenceTimer(null);
    isStoppingRef.current = false; // Ensure we are not in stopping state

    if (Capacitor.isNativePlatform()) {
      try {
        const permissionStatus = await SpeechRecognition.requestPermissions();
        if (permissionStatus?.speechRecognition !== "granted") {
          console.error("Speech recognition permission denied on mobile");
          return;
        }

        // Remove any existing listeners first
        if (partialListenerRef.current)
          await partialListenerRef.current.remove();
        if (finalListenerRef.current) await finalListenerRef.current.remove();

        partialListenerRef.current = await SpeechRecognition.addListener(
          "partialResults",
          (result: { matches: string[] }) => {
            const partialTranscript = result.matches[0] || "";
            setTranscript(partialTranscript);
            console.log("Partial mobile result:", partialTranscript);
            resetSilenceTimer();
          }
        );

        // Add listener for final results (if supported by plugin version)
        // Note: Some versions might only provide final results via stop()
        // or might include 'isFinal' in partialResults.
        // Adjust based on the specific plugin behavior.

        finalListenerRef.current = await SpeechRecognition.addListener(
          "listeningState",
          (result: { status: "started" | "stopped" }) => {
            if (result.status === "stopped") {
              console.log("Listening stopped.");
              stopListeningInternal(false);
            } else {
              console.log("Listening started.");
            }
          }
        );

        await SpeechRecognition.start({
          language: "en-US",
          maxResults: 1,
          prompt: "Speak now",
          partialResults: true, // Request partial results
        });
        setListening(true);
        resetSilenceTimer(); // Start silence timer immediately
      } catch (error) {
        console.error("Mobile speech recognition start error:", error);
        setListening(false);
        await stopListeningInternal(false); // Ensure cleanup on error
      }
    } else if (browserSupportsSpeechRecognition) {
      try {
        const SpeechRecognitionConstructor =
          window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognitionConstructor) {
          console.error("Speech recognition not supported in this browser");
          return;
        }

        // Ensure any previous instance is stopped
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }

        recognitionRef.current = new SpeechRecognitionConstructor();
        const recognition = recognitionRef.current;

        recognition.continuous = true; // Keep listening until stopped
        recognition.interimResults = true; // Get results as they come
        recognition.maxAlternatives = 1; // Usually only need the best
        recognition.lang = "en-US";

        recognition.onstart = () => {
          console.log("Web speech recognition started.");
          setListening(true);
          resetSilenceTimer(); // Start silence timer
        };

        recognition.onend = () => {
          console.log("Web speech recognition ended.");
          // Only set listening to false if not manually stopped
          // This handles cases where recognition stops unexpectedly (e.g., network error, silence timeout by browser)
          if (!isStoppingRef.current) {
            setListening(false);
            if (silenceTimer) clearTimeout(silenceTimer);
            setSilenceTimer(null);
          }
        };

        recognition.onerror = (event: any) => {
          console.error(`Web speech recognition error: ${event.error}`, event);
          setListening(false);
          if (silenceTimer) clearTimeout(silenceTimer);
          setSilenceTimer(null);
          // Don't stop here, let onend handle cleanup
        };

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          let interimTranscript = "";
          let finalTranscript = "";

          for (
            let i = event.resultIndex;
            i < Object.keys(event.results).length;
            ++i
          ) {
            const transcriptPart = event.results[i][0].transcript;
            if (event.results[i][0].isFinal) {
              finalTranscript += transcriptPart + " ";
            } else {
              interimTranscript += transcriptPart;
            }
          }

          const currentTranscript = finalTranscript.trim() || interimTranscript;
          setTranscript(currentTranscript);
          console.log(
            "Web result:",
            currentTranscript,
            "Final:",
            !!finalTranscript.trim()
          );

          // Reset silence timer on any result (interim or final)
          resetSilenceTimer();

          // If we received a final part, process it
          if (finalTranscript.trim()) {
            console.log("Final web segment received, processing...");
            processRequest();
          }
        };

        recognition.start();
      } catch (error) {
        console.error("Web speech recognition start error:", error);
        setListening(false);
        if (recognitionRef.current) {
          recognitionRef.current.stop(); // Ensure cleanup
        }
      }
    }
  }, [
    browserSupportsSpeechRecognition,
    resetSilenceTimer,
    processRequest,
    stopListeningInternal,
  ]);

  const resetTranscript = useCallback(() => {
    setTranscript("");
  }, []);

  useEffect(() => {
    const SpeechRecognitionConstructor =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    setBrowserSupport(!!SpeechRecognitionConstructor);

    // Cleanup function on unmount
    return () => {
      console.log("Cleaning up speech recognition hook...");
      if (silenceTimer) {
        clearTimeout(silenceTimer);
      }
      // Ensure listeners are removed
      if (partialListenerRef.current) {
        partialListenerRef.current
          .remove()
          .catch((e) => console.error("Error removing partial listener:", e));
      }
      if (finalListenerRef.current) {
        finalListenerRef.current
          .remove()
          .catch((e) => console.error("Error removing final listener:", e));
      }
      // Ensure recognition is stopped
      if (Capacitor.isNativePlatform()) {
        SpeechRecognition.stop().catch((e) =>
          console.error("Error stopping mobile recognition on cleanup:", e)
        );
      } else if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [silenceTimer]); // Keep dependency minimal for cleanup

  return {
    transcript,
    listening,
    browserSupportsSpeechRecognition,
    startListening,
    stopListening,
    resetTranscript,
    processRequest,
  };
};

export default useSpeechRecognition;
