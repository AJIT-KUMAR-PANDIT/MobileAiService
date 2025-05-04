import { useState, useEffect, useCallback } from 'react';

interface UseIndianVoiceReturn {
  speak: (text: string) => void;
  cancel: () => void;
  isPrepared: boolean;
  isSpeaking: boolean;
  selectedVoice: SpeechSynthesisVoice | null;
}

export const useIndianVoice = (): UseIndianVoiceReturn => {
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [isPrepared, setIsPrepared] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      return;
    }

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      
      // Selection priority:
      // 1. Hindi female voice
      // 2. Indian English female voice
      // 3. Any female voice
      // 4. Any voice
      
      let voice = voices.find(v => 
        v.lang === 'hi-IN' && v.name.toLowerCase().includes('female')
      );
      
      if (!voice) {
        voice = voices.find(v => 
          (v.lang === 'en-IN' || v.name.toLowerCase().includes('indian')) && 
          v.name.toLowerCase().includes('female')
        );
      }
      
      if (!voice) {
        voice = voices.find(v => v.name.toLowerCase().includes('female'));
      }
      
      if (!voice && voices.length > 0) {
        voice = voices[0];
      }
      
      if (voice) {
        console.log("Selected voice for TTS:", voice.name, voice.lang);
        setSelectedVoice(voice);
        setIsPrepared(true);
      }
    };
    
    loadVoices();
    
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const speak = useCallback((text: string) => {
    if (!window.speechSynthesis || !text) return;
    
    window.speechSynthesis.cancel(); // Cancel any ongoing speech
    setIsSpeaking(true);
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    
    // Adjust parameters for Indian accent
    utterance.rate = 0.9; // Slightly slower for better clarity
    utterance.pitch = 1.1; // Slightly higher pitch for female voice
    
    utterance.onend = () => {
      setIsSpeaking(false);
    };
    
    utterance.onerror = (event) => {
      console.error("Speech synthesis error:", event);
      setIsSpeaking(false);
    };
    
    window.speechSynthesis.speak(utterance);
  }, [selectedVoice]);

  const cancel = useCallback(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  return {
    speak,
    cancel,
    isPrepared,
    isSpeaking,
    selectedVoice
  };
};