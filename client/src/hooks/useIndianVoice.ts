import { useState } from "react";
import { Capacitor } from "@capacitor/core";
import { TextToSpeech } from "@capacitor-community/text-to-speech";

export function useIndianVoice() {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const speak = async (text: string) => {
    if (!text) return;
    setIsSpeaking(true);

    if (Capacitor.isNativePlatform()) {
      // Use Capacitor TTS plugin for native
      await TextToSpeech.speak({
        text,
        lang: "en-IN", // Use Indian English
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
      utter.lang = "en-IN";
      // Try to select a female Indian English voice
      const voices = synth.getVoices();
      const femaleIndianVoice =
        voices.find(
          (v) =>
            v.lang === "en-IN" &&
            (v.name.toLowerCase().includes("female") ||
              v.name.toLowerCase().includes("woman") ||
              v.name.toLowerCase().includes("girl"))
        ) ||
        voices.find((v) => v.lang === "en-IN" && v.name.toLowerCase().includes("india")) ||
        voices.find((v) => v.lang === "en-IN");
      if (femaleIndianVoice) {
        utter.voice = femaleIndianVoice;
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
    selectedVoice: "en-IN",
  };
}