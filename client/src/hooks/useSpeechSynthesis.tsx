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
  const [selectedVoice, setSelectedVoice] = useState<Voice | null>(null);

  useEffect(() => {
    if (window.speechSynthesis) {
      setSupported(true);
      // Load available voices
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
  }, []);

  const speak = useCallback(
    async (text: string) => {
      if (Capacitor.isNativePlatform()) {
        try {
          setSpeaking(true);
          await TextToSpeech.speak({
            text,
            lang: selectedVoice?.lang || "en-US",
            rate: 1.0,
            pitch: 1.0,
            volume: 1.0,
          });
          setSpeaking(false);
        } catch (error) {
          console.error("Mobile TTS error:", error);
          setSpeaking(false);
        }
      } else if (supported && window.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance(text);
        if (selectedVoice) {
          const systemVoice = window.speechSynthesis
            .getVoices()
            .find((v) => v.name === selectedVoice.name);
          if (systemVoice) utterance.voice = systemVoice;
        }
        utterance.onstart = () => setSpeaking(true);
        utterance.onend = () => setSpeaking(false);
        utterance.onerror = (event) => {
          console.error("Web TTS error:", event);
          setSpeaking(false);
        };
        window.speechSynthesis.speak(utterance);
      }
    },
    [supported, selectedVoice]
  );

  return {
    speak,
    supported,
    speaking,
    voices,
    setVoice: setSelectedVoice,
  };
};

export default useSpeechSynthesis;
