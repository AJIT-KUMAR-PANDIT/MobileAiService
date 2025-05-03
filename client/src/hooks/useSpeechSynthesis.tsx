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
            rate: 0.9, // Slightly slower for better clarity
            pitch: 1.1, // Slightly higher pitch for more natural sound
            volume: 1.0,
          });
          setSpeaking(false);
        } catch (error) {
          console.error("Mobile TTS error:", error);
          setSpeaking(false);
        }
      } else if (supported && window.speechSynthesis) {
        const synth = window.speechSynthesis;
        const utterance = new SpeechSynthesisUtterance(text);

        // Get available voices
        const voices = synth.getVoices();
        // Try to find a natural sounding female voice
        const preferredVoice =
          voices.find(
            (voice) =>
              voice.name.includes("Natural") ||
              voice.name.includes("Female") ||
              voice.name.includes("Samantha")
          ) || voices[0];

        utterance.voice = preferredVoice;
        utterance.rate = 0.9; // Slightly slower
        utterance.pitch = 1.1; // Slightly higher pitch
        utterance.volume = 1.0;

        // Add natural pauses at punctuation
        const sentences = text.split(/[.!?]+/);
        sentences.forEach((sentence, index) => {
          if (index < sentences.length - 1) {
            sentence += ".";
          }
          const sentenceUtterance = new SpeechSynthesisUtterance(
            sentence.trim()
          );
          sentenceUtterance.voice = preferredVoice;
          sentenceUtterance.rate = 0.9;
          sentenceUtterance.pitch = 1.1;
          synth.speak(sentenceUtterance);
        });
        utterance.onstart = () => setSpeaking(true);
        utterance.onend = () => setSpeaking(false);
        utterance.onerror = (event) => {
          console.error("Web TTS error:", event);
          setSpeaking(false);
        };
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
