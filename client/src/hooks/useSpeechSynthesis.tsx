import { useState, useEffect, useCallback } from 'react';

interface UseSpeechSynthesisReturn {
  speak: (text: string) => void;
  cancel: () => void;
  speaking: boolean;
  supported: boolean;
  voices: SpeechSynthesisVoice[];
  setVoice: (voice: SpeechSynthesisVoice) => void;
}

const useSpeechSynthesis = (): UseSpeechSynthesisReturn => {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [currentVoice, setCurrentVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setSupported(true);

      // Set up event handlers for speech synthesis
      const synth = window.speechSynthesis;
      
      const updateVoices = () => {
        const availableVoices = synth.getVoices();
        setVoices(availableVoices);
        
        // Find a female English voice, or any English voice, or fall back to first voice
        const femaleEnglishVoice = availableVoices.find(
          voice => voice.lang.includes('en-') && voice.name.toLowerCase().includes('female')
        );
        const anyFemaleVoice = femaleEnglishVoice || availableVoices.find(
          voice => voice.name.toLowerCase().includes('female')
        );
        const englishVoice = anyFemaleVoice || availableVoices.find(
          voice => voice.lang.includes('en-')
        );
        
        // Log available voices to help with debugging
        console.log('Available voices:', availableVoices.map(v => `${v.name} (${v.lang})`));
        
        setCurrentVoice(englishVoice || (availableVoices.length > 0 ? availableVoices[0] : null));
      };
      
      // Chrome loads voices asynchronously
      if (synth.onvoiceschanged !== undefined) {
        synth.onvoiceschanged = updateVoices;
      }
      
      // Initial voices load
      updateVoices();
      
      // Set up speech events
      const handleSpeechStart = () => setSpeaking(true);
      const handleSpeechEnd = () => setSpeaking(false);
      const handleSpeechError = (e: any) => {
        console.error('Speech synthesis error:', e);
        setSpeaking(false);
      };
      
      // Clean up event listeners
      return () => {
        synth.cancel();
        // Remove event listeners if needed in the future
      };
    }
  }, []);

  const speak = useCallback((text: string) => {
    if (!supported) return;
    
    const synth = window.speechSynthesis;
    
    // Cancel any ongoing speech
    if (speaking) {
      synth.cancel();
    }
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    if (currentVoice) {
      utterance.voice = currentVoice;
    }
    
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = (e) => {
      console.error('Speech synthesis error:', e);
      setSpeaking(false);
    };
    
    synth.speak(utterance);
  }, [supported, speaking, currentVoice]);

  const cancel = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [supported]);

  const setVoice = useCallback((voice: SpeechSynthesisVoice) => {
    setCurrentVoice(voice);
  }, []);

  return {
    speak,
    cancel,
    speaking,
    supported,
    voices,
    setVoice,
  };
};

export default useSpeechSynthesis;
