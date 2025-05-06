import { useState, useEffect, useCallback, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { TextToSpeech } from "@capacitor-community/text-to-speech";

// Use the global SpeechSynthesisVoice type if available, otherwise define a basic one
type Voice = SpeechSynthesisVoice | { name: string; lang: string };

interface SpeechOptions {
  voice?: SpeechSynthesisVoice | null;
  rate?: number;
  volume?: number;
  lang?: string; // Added lang for mobile
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
    async (text: string, options: SpeechOptions = {}) => {
      // Added speaker parameter
      if (!text?.trim()) return;

      try {
        setSpeaking(true);
        const { voice = null, rate = 1, volume = 1, lang = "en-US" } = options;

        if (Capacitor.isNativePlatform()) {
          // Mobile TTS
          await TextToSpeech.speak({
            text,
            lang: voice?.lang || lang, // Use voice lang if available, else default
            rate: rate,
            pitch: 1.0, // Pitch adjustment might not be universally supported
            volume: volume,
            // category: 'ambient', // Optional: Adjust audio category if needed
          });
          // Mobile TTS might not have a reliable end event, set speaking false immediately
          // Or use a timer if duration estimation is possible
          setSpeaking(false);
        } else if (supported && window.speechSynthesis) {
          // Web Speech API
          window.speechSynthesis.cancel(); // Cancel any ongoing speech

          const utterance = new SpeechSynthesisUtterance(text);
          utterance.voice = voice;
          utterance.lang = voice?.lang || lang; // Ensure lang is set
          utterance.rate = rate;
          utterance.volume = volume;
          utterance.pitch = 1.0; // Default pitch

          utterance.onend = () => {
            console.log("Speech synthesis finished.");
            setSpeaking(false);
          };
          utterance.onerror = (event) => {
            console.error("Speech synthesis error:", event);
            setSpeaking(false);
          };

          window.speechSynthesis.speak(utterance);
        } else {
          console.warn("Speech synthesis not supported or not initialized.");
          setSpeaking(false); // Ensure state is reset if not supported
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
