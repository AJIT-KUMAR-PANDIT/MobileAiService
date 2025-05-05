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