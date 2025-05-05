import { useState } from "react";
import { Capacitor } from "@capacitor/core";
import { TextToSpeech } from "@capacitor-community/text-to-speech";

// Accept voicePreference as a parameter
export function useIndianVoice(voicePreference: string = "indian-female") {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const speak = async (text: string) => {
    if (!text) return;
    setIsSpeaking(true);

    if (Capacitor.isNativePlatform()) {
      // Use Capacitor TTS plugin for native
      let lang = "en-IN";
      if (voicePreference === "british-male") lang = "en-GB";
      if (voicePreference === "american-female") lang = "en-US";
      await TextToSpeech.speak({
        text,
        lang,
        rate: 1.0,
        pitch: 1.0,
        volume: 1.0,
        category: "ambient",
      });
      setIsSpeaking(false);
    } else {
      // Use browser TTS for web
      const synth = window.speechSynthesis;
      const utter = new SpeechSynthesisUtterance(text);

      let voices = synth.getVoices();
      let selectedVoice: SpeechSynthesisVoice | undefined;

      if (voicePreference === "indian-female") {
        // Prefer Hindi female, then Indian English female
        selectedVoice =
          voices.find(
            (v) => v.lang === "hi-IN" && v.name.toLowerCase().includes("female")
          ) ||
          voices.find(
            (v) =>
              (v.lang === "en-IN" || v.name.toLowerCase().includes("indian")) &&
              v.name.toLowerCase().includes("female")
          );
      } else if (voicePreference === "british-male") {
        selectedVoice = voices.find(
          (v) => v.lang === "en-GB" && v.name.toLowerCase().includes("male")
        );
      } else if (voicePreference === "american-female") {
        selectedVoice = voices.find(
          (v) => v.lang === "en-US" && v.name.toLowerCase().includes("female")
        );
      }

      // Fallbacks
      if (!selectedVoice) {
        selectedVoice = voices.find((v) => v.name.toLowerCase().includes("female"));
      }
      if (!selectedVoice && voices.length > 0) {
        selectedVoice = voices[0];
      }

      if (selectedVoice) {
        utter.voice = selectedVoice;
        utter.lang = selectedVoice.lang;
      }

      utter.onend = () => setIsSpeaking(false);
      synth.speak(utter);
    }
  };

  const cancel = async () => {
    setIsSpeaking(false);
    if (Capacitor.isNativePlatform()) {
      await TextToSpeech.stop();
    } else {
      window.speechSynthesis.cancel();
    }
  };

  return {
    speak,
    cancel,
    isSpeaking,
    selectedVoice: voicePreference,
  };
}