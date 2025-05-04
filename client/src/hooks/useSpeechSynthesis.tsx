import { useState, useEffect, useCallback, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { TextToSpeech } from "@capacitor-community/text-to-speech";

interface Voice {
  name: string;
  lang: string;
}

const useSpeechSynthesis = () => {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voices, setVoices] = useState<Voice[]>([]);
  const synthesisRef = useRef<SpeechSynthesis | null>(null); // Added useRef for potential future use

  useEffect(() => {
    const checkSupport = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          await TextToSpeech.speak({ text: "" });
          setSupported(true);
        } catch (error) {
          console.error("Mobile TTS initialization error:", error);
        }
      } else if (window.speechSynthesis) {
        setSupported(true);
        const loadVoices = () => {
          const availableVoices = window.speechSynthesis.getVoices();
          setVoices(
            availableVoices.map((voice) => ({
              name: voice.name,
              lang: voice.lang,
            }))
          );
        };
        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;
        synthesisRef.current = window.speechSynthesis; // Assign to ref
      }
    };
    checkSupport();
  }, []);

  const speak = useCallback(
    async (text: string, speaker: string) => {
      // Added speaker parameter
      if (!text?.trim()) return;

      try {
        setSpeaking(true);

        if (Capacitor.isNativePlatform()) {
          await TextToSpeech.speak({
            text,
            lang: "en-US",
            rate: 1.0,
            pitch: 1.0,
            volume: 1.0,
          });
          setSpeaking(false);
        } else if (supported && window.speechSynthesis) {
          window.speechSynthesis.cancel();

          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = 1.0;
          utterance.pitch = 1.0;
          utterance.volume = 1.0;
          utterance.lang = "en-US";

          const availableVoices = window.speechSynthesis.getVoices();
          const preferredVoice = availableVoices.find(
            (voice) =>
              voice.name.includes("Google") ||
              voice.name.includes("English") ||
              voice.lang.startsWith("en-")
          );

          if (preferredVoice) {
            utterance.voice = preferredVoice;
          }

          utterance.onend = () => setSpeaking(false);
          utterance.onerror = (event) => {
            console.error("Speech synthesis error:", event);
            setSpeaking(false);
          };

          window.speechSynthesis.speak(utterance);
        }
      } catch (error) {
        console.error("TTS error:", error);
        setSpeaking(false);
      }
    },
    [supported]
  );

  return {
    speak,
    supported,
    speaking,
    voices,
  };
};

export default useSpeechSynthesis;
