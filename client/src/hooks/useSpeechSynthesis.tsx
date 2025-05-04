import { useState, useEffect, useCallback } from "react";
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
      }
    };
    checkSupport();
  }, []);

  const speak = useCallback(
    async (text: string) => {
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
          window.speechSynthesis.cancel(); // Cancel any ongoing speech

          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = 1.0;
          utterance.pitch = 1.0;
          utterance.volume = 1.0;
          utterance.lang = "en-US";

          const availableVoices = window.speechSynthesis.getVoices();
          console.log("Available voices:", availableVoices.map(v => v.name));
          
          // First try to find a female voice
          let preferredVoice = availableVoices.find(
            (voice) =>
              (voice.name.includes("Female") || 
               voice.name.includes("Zira") ||
               voice.name.includes("Samantha") ||
               voice.name.includes("Victoria") ||
               voice.name.includes("Karen")) &&
              (voice.lang.startsWith("en-") || voice.name.includes("English"))
          );
          
          // If no specific female voice found, fall back to any English voice
          if (!preferredVoice) {
            preferredVoice = availableVoices.find(
              (voice) =>
                voice.name.includes("Google") ||
                voice.name.includes("English") ||
                voice.lang.startsWith("en-")
            );
          }

          if (preferredVoice) {
            console.log("Selected voice:", preferredVoice.name);
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
