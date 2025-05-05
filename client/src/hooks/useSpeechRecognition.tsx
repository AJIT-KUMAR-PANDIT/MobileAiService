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
  const listenerRef = useRef<PluginListenerHandle | null>(null);

  // Define processRequest first to avoid circular reference
  const processRequest = useCallback(() => {
    if (transcript.trim() !== "") {
      console.log("Processing request:", transcript);
      // Call stopListening directly here to avoid circular dependency
      if (Capacitor.isNativePlatform()) {
        try {
          SpeechRecognition.stop();
        } catch (error) {
          console.error("Error stopping mobile speech recognition:", error);
        }
      } else if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (error) {
          console.error("Error stopping web speech recognition:", error);
        }
      }
      setListening(false);
      if (silenceTimer) {
        clearTimeout(silenceTimer);
      }
    }
  }, [transcript, silenceTimer]);

  const stopListening = useCallback(async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        // Remove the event listener
        if (listenerRef.current) {
          listenerRef.current.remove();
        }
        await SpeechRecognition.stop();
      } catch (error) {
        console.error("Error stopping mobile speech recognition:", error);
      }
    } else if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error("Error stopping web speech recognition:", error);
      }
    }
    setListening(false);
    if (silenceTimer) {
      clearTimeout(silenceTimer);
    }
  }, [silenceTimer]);

  const resetSilenceTimer = useCallback(() => {
    if (silenceTimer) {
      clearTimeout(silenceTimer);
    }
    setSilenceTimer(setTimeout(processRequest, 3000));
  }, [silenceTimer, processRequest]);

  const startListening = useCallback(async () => {
    setTranscript("");
    setSilenceTimer(null);
    if (Capacitor.isNativePlatform()) {
      try {
        const permissionStatus = await SpeechRecognition.requestPermissions();
        if (!permissionStatus || permissionStatus.speechRecognition !== 'granted') {
          console.error("Speech recognition permission denied");
          return;
        }
        // Remove any existing listeners
        if (listenerRef.current) {
          listenerRef.current.remove();
        }
        listenerRef.current = await SpeechRecognition.addListener(
          "partialResults",
          (result: { matches: string[] }) => {
            setTranscript(result.matches[0] || "");
            resetSilenceTimer();
          }
        );
        // Remove this block (not supported):
        // await SpeechRecognition.addListener(
        //   "result",
        //   (result: { matches: string[] }) => {
        //     setTranscript(result.matches[0] || "");
        //     resetSilenceTimer();
        //   }
        // );
        await SpeechRecognition.start({
          language: "en-US",
          maxResults: 1,
          prompt: "Speak now",
          partialResults: true,
        });
        setListening(true);
      } catch (error) {
        console.error("Mobile speech recognition error:", error);
        setListening(false);
      }
    } else if (browserSupportsSpeechRecognition) {
      try {
        const SpeechRecognitionConstructor =
          window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognitionConstructor) {
          console.error("Speech recognition not supported in this browser");
          return;
        }

        recognitionRef.current = new SpeechRecognitionConstructor();
        const recognition = recognitionRef.current;

        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 5;
        recognition.lang = "en-US";

        recognition.onstart = () => setListening(true);
        recognition.onend = () => setListening(false);
        recognition.onerror = (event: any) => {
          if (event.error === "not-allowed") {
            console.error("Speech recognition permission denied");
          } else if (event.error === "aborted") {
            return;
          } else {
            console.error("Web speech recognition error:", event.error);
          }
          setListening(false);
          recognition.stop();
        };
        recognition.onresult = (event: SpeechRecognitionEvent) => {
          const current = event.resultIndex;
          const transcript = event.results[current][0].transcript;
          setTranscript(transcript);
          resetSilenceTimer();
        };

        recognition.start();
      } catch (error) {
        console.error("Web speech recognition error:", error);
        setListening(false);
      }
    }
  }, [browserSupportsSpeechRecognition, resetSilenceTimer]);

  const resetTranscript = useCallback(() => {
    setTranscript("");
  }, []);

  useEffect(() => {
    const SpeechRecognitionConstructor =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    setBrowserSupport(!!SpeechRecognitionConstructor);

    // Cleanup function
    return () => {
      if (listenerRef.current) {
        listenerRef.current.remove();
      }
      if (silenceTimer) {
        clearTimeout(silenceTimer);
      }
    };
  }, [silenceTimer]);

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
