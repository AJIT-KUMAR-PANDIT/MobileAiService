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
}

const useSpeechRecognition = (): UseSpeechRecognitionReturn => {
  const [transcript, setTranscript] = useState("");
  const [listening, setListening] = useState(false);
  const [browserSupportsSpeechRecognition, setBrowserSupport] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognitionConstructor =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    setBrowserSupport(!!SpeechRecognitionConstructor);
  }, []);

  const startListening = useCallback(async () => {
    setTranscript("");
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
          setListening(false);
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

        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onstart = () => setListening(true);
        recognition.onend = () => setListening(false);
        recognition.onerror = (event: any) => {
          console.error("Web speech recognition error:", event);
          setListening(false);
        };
        recognition.onresult = (event: any) => {
          const current = event.resultIndex;
          const transcript = event.results[current][0].transcript;
          setTranscript(transcript);
        };

        recognition.start();
      } catch (error) {
        console.error("Web speech recognition error:", error);
        setListening(false);
      }
    }
  }, [browserSupportsSpeechRecognition]);

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
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript("");
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
