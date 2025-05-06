import { useState } from "react";
import { Capacitor } from "@capacitor/core";
import { TextToSpeech } from "@capacitor-community/text-to-speech";

// Accept voicePreference as a parameter
export function useIndianVoice(voicePreference: string = "luna-ai") {
  // Default to luna-ai
  const [isSpeaking, setIsSpeaking] = useState(false);

  const speak = async (text: string) => {
    console.log(
      "[TTS Hook] Speak called with text:",
      text,
      "Preference:",
      voicePreference
    );
    if (!text) {
      console.log("[TTS Hook] No text provided, exiting speak.");
      return;
    }
    setIsSpeaking(true);

    if (Capacitor.isNativePlatform()) {
      console.log("[TTS Hook] Using Capacitor TextToSpeech");
      // Use Capacitor TTS plugin for native
      // Attempt to map preferences to language codes for Capacitor
      // Note: Capacitor TextToSpeech might not support specific voice names beyond language.
      let lang = "en-US"; // Default to US English for Luna/American
      let voiceNameForLog = "default"; // For logging
      if (voicePreference === "indian-female") {
        lang = "en-IN";
        voiceNameForLog = "indian-female";
      } else if (voicePreference === "british-male") {
        lang = "en-GB";
        voiceNameForLog = "british-male";
      } else if (voicePreference === "american-female") {
        lang = "en-US";
        voiceNameForLog = "american-female";
      } else if (voicePreference === "luna-ai") {
        lang = "en-US"; // Assuming Luna is American English
        voiceNameForLog = "luna-ai";
      }
      console.log(
        `[TTS Hook] Capacitor TTS: Using lang '${lang}' for preference '${voiceNameForLog}'`
      );
      try {
        await TextToSpeech.speak({
          text,
          lang,
          rate: 1.0,
          pitch: 1.0,
          volume: 1.0,
          category: "ambient",
        });
        console.log("[TTS Hook] Capacitor TextToSpeech.speak successful");
      } catch (error) {
        console.error("[TTS Hook] Capacitor TextToSpeech.speak failed:", error);
      } finally {
        setIsSpeaking(false);
        console.log(
          "[TTS Hook] Capacitor TTS finished, isSpeaking set to false"
        );
      }
    } else {
      console.log("[TTS Hook] Using Web Speech API");
      // Use browser TTS for web
      const synth = window.speechSynthesis;
      if (!synth) {
        console.error(
          "[TTS Hook] Web Speech API (window.speechSynthesis) not supported."
        );
        setIsSpeaking(false);
        return;
      }

      const speakWithVoices = () => {
        console.log("[TTS Hook] speakWithVoices called");
        const utter = new SpeechSynthesisUtterance(text);

        // Add error handling
        utter.onerror = (event) => {
          console.error(
            "[TTS Hook] Web Speech API Error:",
            event.error,
            "Utterance:",
            utter
          );
          setIsSpeaking(false); // Ensure state is reset on error
        };

        let voices = synth.getVoices();
        console.log(`[TTS Hook] Found ${voices.length} voices.`);
        let selectedVoice: SpeechSynthesisVoice | undefined;

        // Prioritize finding the specific voice preference
        if (voicePreference === "luna-ai") {
          selectedVoice = voices.find(
            (v) =>
              v.name.toLowerCase().includes("luna") || // Look for 'luna'
              (v.lang === "en-US" && v.name.toLowerCase().includes("female")) // Fallback to US Female
          );
        } else if (voicePreference === "indian-female") {
          selectedVoice =
            voices.find(
              (v) =>
                v.lang === "hi-IN" && v.name.toLowerCase().includes("female")
            ) ||
            voices.find(
              (v) =>
                (v.lang === "en-IN" ||
                  v.name.toLowerCase().includes("indian")) &&
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

        // Fallback logic if the preferred voice wasn't found
        if (!selectedVoice) {
          console.warn(
            `[TTS Hook] Web TTS: Voice preference '${voicePreference}' not found. Falling back.`
          );
          // General fallback: Try any female voice, then any voice
          selectedVoice = voices.find((v) =>
            v.name.toLowerCase().includes("female")
          );
        }
        // Removed redundant fallback check
        // if (!selectedVoice) {
        //   selectedVoice = voices.find((v) =>
        //     v.name.toLowerCase().includes("female")
        //   );
        // }
        if (!selectedVoice && voices.length > 0) {
          console.log(
            "[TTS Hook] No female voice found, falling back to first available voice."
          );
          selectedVoice = voices[0];
        }

        if (selectedVoice) {
          console.log(
            `[TTS Hook] Web TTS: Using voice: ${selectedVoice.name} (${selectedVoice.lang}) for preference '${voicePreference}'`
          );
          utter.voice = selectedVoice;
          utter.lang = selectedVoice.lang; // Set lang explicitly based on selected voice
        } else {
          console.warn(
            "[TTS Hook] Web TTS: No suitable voice found, using browser default."
          );
          // If still no voice, the browser will use its default
        }

        utter.onend = () => {
          console.log("[TTS Hook] Web Speech API onend event fired.");
          setIsSpeaking(false);
        };

        // Cancel any previous speech before starting new
        synth.cancel();
        console.log("[TTS Hook] Calling synth.speak");
        synth.speak(utter);
      };

      // If voices are not loaded yet, wait for them
      const currentVoices = synth.getVoices();
      if (currentVoices.length === 0) {
        console.log("[TTS Hook] Voices not loaded yet, adding event listener.");
        const handleVoicesChanged = () => {
          console.log("[TTS Hook] voiceschanged event fired.");
          speakWithVoices();
          synth.removeEventListener("voiceschanged", handleVoicesChanged);
        };
        synth.addEventListener("voiceschanged", handleVoicesChanged);
        // Some browsers require getVoices to be called again to trigger loading
        synth.getVoices();
      } else {
        console.log(
          "[TTS Hook] Voices already loaded, calling speakWithVoices directly."
        );
        speakWithVoices();
      }
    }
  };

  const cancel = async () => {
    console.log("[TTS Hook] Cancel called.");
    setIsSpeaking(false);
    if (Capacitor.isNativePlatform()) {
      console.log("[TTS Hook] Stopping Capacitor TextToSpeech.");
      try {
        await TextToSpeech.stop();
        console.log("[TTS Hook] Capacitor TextToSpeech.stop successful");
      } catch (error) {
        console.error("[TTS Hook] Capacitor TextToSpeech.stop failed:", error);
      }
    } else {
      console.log("[TTS Hook] Cancelling Web Speech API.");
      window.speechSynthesis.cancel();
    }
  };

  return {
    speak,
    cancel,
    isSpeaking,
    selectedVoice: voicePreference, // Keep track of the preference used by this hook instance
  };
}
