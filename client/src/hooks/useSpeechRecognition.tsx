import { useState, useEffect, useCallback, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { SpeechRecognition } from "@capacitor-community/speech-recognition";

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
  const recognitionRef = useRef<any>(null);

  const stopListening = useCallback(async () => {
    if (Capacitor.isNativePlatform()) {
      try {
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
    clearTimeout(silenceTimer);
  }, [silenceTimer]);

  const processRequest = useCallback(() => {
    if (transcript.trim() !== "") {
      console.log("Processing request:", transcript);
      stopListening();
    }
  }, [transcript, stopListening]);

  const resetSilenceTimer = useCallback(() => {
    clearTimeout(silenceTimer);
    setSilenceTimer(setTimeout(processRequest, 3000));
  }, [silenceTimer, processRequest]);

  const startListening = useCallback(async () => {
    setTranscript("");
    setSilenceTimer(null);
    if (Capacitor.isNativePlatform()) {
      try {
        await SpeechRecognition.requestPermissions();
        await SpeechRecognition.start({
          language: "en-US",
          maxResults: 1,
          prompt: "Speak now",
        });
        setListening(true);
        SpeechRecognition.addListener("speechRecognitionResult", (result) => {
          setTranscript(result.matches[0] || "");
          resetSilenceTimer();
        });
      } catch (error) {
        console.error("Mobile speech recognition error:", error);
        setListening(false);
      }
    } else if (browserSupportsSpeechRecognition) {
      try {
        const SpeechRecognitionConstructor =
          window.SpeechRecognition || window.webkitSpeechRecognition;
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
        recognition.onresult = (event: any) => {
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
  }, []);

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
