import { FC, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface VoiceUIProps {
  isActive: boolean;
  message: string;
  instruction: string;
  isListening: boolean;
  isSpeaking: boolean;
  isInferring: boolean;
  onRecordToggle: () => void;
  voicePreference?: string; // Add voice preference prop
}

export const VoiceUI: FC<VoiceUIProps> = ({
  isActive,
  message,
  instruction,
  isListening,
  isSpeaking,
  isInferring,
  onRecordToggle,
  voicePreference = "indian-female", // Default to Indian female voice
}) => {
  const [speechStartTime, setSpeechStartTime] = useState(Date.now());
  const [subtitle, setSubtitle] = useState("");
  const [speakerType, setSpeakerType] = useState<"assistant" | "user" | null>(
    null
  );
  const [silenceTimer, setSilenceTimer] = useState<NodeJS.Timeout | null>(null);
  const [lastSpeechTime, setLastSpeechTime] = useState(Date.now());

  // Add voice selection logic
  const [availableVoices, setAvailableVoices] = useState<
    SpeechSynthesisVoice[]
  >([]);
  const selectedVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    if (isSpeaking) {
      setSpeechStartTime(Date.now());
      setSpeakerType("assistant");
      setSubtitle("Luna is speaking...");
      setLastSpeechTime(Date.now());

      // Reset silence timer when assistant stops speaking
      if (silenceTimer) {
        clearTimeout(silenceTimer);
      }
    } else if (isListening) {
      setSpeakerType("user");
      setSubtitle("Listening to you...");
      setLastSpeechTime(Date.now());

      // Start silence timer when user starts speaking
      if (silenceTimer) {
        clearTimeout(silenceTimer);
      }
      const timer = setTimeout(() => {
        if (isListening) {
          onRecordToggle(); // Stop listening after 3 seconds of silence
        }
      }, 3000);
      setSilenceTimer(timer);
    } else if (!isSpeaking && !isListening) {
      // Only wait 15 seconds after assistant response
      if (speakerType === "assistant") {
        const timer = setTimeout(() => {
          setSubtitle("Waiting for your response...");
          setSpeakerType(null);
          onRecordToggle(); // Start listening after 15 seconds
        }, 15000);
        return () => clearTimeout(timer);
      } else {
        setSpeakerType(null);
        setSubtitle("");
      }
    }

    return () => {
      if (silenceTimer) {
        clearTimeout(silenceTimer);
      }
    };
  }, [isSpeaking, isListening, onRecordToggle, speakerType]);

  const getAnimationState = () => {
    if (isListening) {
      // Add pulsing animation to indicate 15s timeout
      return "listening";
    }
    if (isSpeaking) return "speaking";
    if (isInferring) return "processing";
    return "idle";
  };

  const circleVariants = {
    listening: {
      scale: [1, 1.2, 1],
      opacity: [0.7, 1, 0.7],
      borderColor: ["#ef4444", "#dc2626", "#ef4444"],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
    speaking: {
      scale: [1, 1.1, 1],
      opacity: [0.8, 1, 0.8],
      borderColor: ["#3b82f6", "#2563eb", "#3b82f6"],
      transition: {
        duration: 1,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
    processing: {
      rotate: [0, 360],
      borderColor: ["#8b5cf6", "#6366f1", "#8b5cf6"],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "linear",
      },
    },
    idle: {
      scale: 1,
      opacity: 0.7,
      borderColor: "#6366f1",
    },
  };

  const waveformVariants = {
    listening: (i: number) => ({
      height: ["10px", "30px", "10px"],
      backgroundColor: ["#ef4444", "#dc2626", "#ef4444"],
      transition: {
        duration: 0.5,
        repeat: Infinity,
        delay: i * 0.1,
        ease: "easeInOut",
      },
    }),
    speaking: (i: number) => ({
      height: ["15px", "25px", "15px"],
      backgroundColor: ["#3b82f6", "#2563eb", "#3b82f6"],
      transition: {
        duration: 0.7,
        repeat: Infinity,
        delay: i * 0.15,
        ease: "easeInOut",
      },
    }),
    processing: (i: number) => ({
      height: "20px",
      backgroundColor: "#8b5cf6",
      opacity: [0.3, 1, 0.3],
      transition: {
        duration: 1,
        repeat: Infinity,
        delay: i * 0.2,
        ease: "easeInOut",
      },
    }),
    idle: {
      height: "10px",
      backgroundColor: "#6366f1",
      opacity: 0.5,
    },
  };

  const currentState = getAnimationState();

  // Load available voices
  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        setAvailableVoices(voices);

        // Find Indian female voice
        let voice = null;

        // First try: Look for Hindi voices
        voice = voices.find(
          (v) => v.lang === "hi-IN" && v.name.toLowerCase().includes("female")
        );

        // Second try: Look for Indian English voices
        if (!voice) {
          voice = voices.find(
            (v) =>
              (v.lang === "en-IN" || v.name.toLowerCase().includes("indian")) &&
              v.name.toLowerCase().includes("female")
          );
        }

        // Third try: Any female voice
        if (!voice) {
          voice = voices.find((v) => v.name.toLowerCase().includes("female"));
        }

        // Fallback to any voice
        if (!voice && voices.length > 0) {
          voice = voices[0];
        }

        if (voice) {
          console.log("Selected voice:", voice.name, voice.lang);
          selectedVoiceRef.current = voice;
        }
      };

      loadVoices();

      // Chrome loads voices asynchronously
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
    }
  }, []);

  // Export the selected voice for use in the parent component
  useEffect(() => {
    if (selectedVoiceRef.current && window.speechSynthesis) {
      // You can expose this to parent component if needed
      window.selectedVoice = selectedVoiceRef.current;
    }
  }, [availableVoices]);

  return (
    <motion.div
      className="flex-1 flex flex-col items-center justify-center p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="relative w-48 h-48 mb-6"
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
      >
        {/* Main Circle */}
        <motion.div
          className="absolute inset-0 rounded-full border-4"
          animate={currentState}
          variants={circleVariants}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Luna Logo */}
            <motion.div
              className="w-24 h-24"
              animate={{
                opacity: isInferring ? [0.5, 1] : 1,
                scale: isInferring ? [0.95, 1.05] : 1,
              }}
              transition={{ duration: 1, repeat: isInferring ? Infinity : 0 }}
            >
              <svg viewBox="0 0 100 100" className="w-full h-full text-white">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="M50 20C33.43 20 20 33.43 20 50s13.43 30 30 30c6.59 0 12.75-2.12 17.76-5.73C73.69 70.09 78 60.61 78 50c0-16.57-13.43-30-30-30zm0 50c-11.05 0-20-8.95-20-20s8.95-20 20-20 20 8.95 20 20-8.95 20-20 20z"
                  fill="currentColor"
                />
                <motion.g
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.7, 1, 0.7],
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <circle cx="65" cy="35" r="5" fill="currentColor" />
                </motion.g>
              </svg>
            </motion.div>
          </div>
        </motion.div>

        {/* Waveform Visualization */}
        <div className="absolute inset-x-0 bottom-0 flex justify-center space-x-1 pb-4">
          {[...Array(7)].map((_, i) => (
            <motion.div
              key={i}
              className="w-1.5 rounded-full"
              custom={i}
              variants={waveformVariants}
              animate={currentState}
            />
          ))}
        </div>
      </motion.div>

      <motion.div
        className="text-center mb-8 max-w-md"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <motion.div className="relative">
          {subtitle && (
            <motion.div
              className="absolute -top-6 left-0 right-0 text-sm font-medium"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <span
                className={`${
                  speakerType === "assistant"
                    ? "text-blue-400"
                    : "text-green-400"
                }`}
              >
                {subtitle}
              </span>
            </motion.div>
          )}
          <motion.div className="text-white text-2xl font-bold mb-2 font-tech h-[111px] overflow-y-auto scrollbar-thin scrollbar-thumb-blue-500 scrollbar-track-transparent px-4">
            {message.split(" ").map((word, index, array) => {
              const currentWordIndex =
                Math.floor((Date.now() - speechStartTime) / 200) % array.length;
              const isCurrentWord = isSpeaking && index === currentWordIndex;
              const isPrevWord =
                index >= currentWordIndex - 2 && index < currentWordIndex;
              const isNextWord =
                index <= currentWordIndex + 2 && index > currentWordIndex;

              const getWordStyle = () => {
                if (isCurrentWord) {
                  return isSpeaking
                    ? "bg-blue-500/20 text-blue-400 scale-110"
                    : "bg-green-500/20 text-green-400 scale-110";
                }
                if (isPrevWord || isNextWord) {
                  return "opacity-80";
                }
                return "opacity-40";
              };

              return (
                <motion.span
                  key={index}
                  className={`inline-block mx-1 rounded px-1 transition-all duration-200 ${getWordStyle()}`}
                  ref={(node) => {
                    if (node && isCurrentWord) {
                      node.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                      });
                    }
                  }}
                  animate={{
                    color: isCurrentWord ? "#3b82f6" : "#ffffff",
                    scale: isCurrentWord ? 1.1 : 1,
                    backgroundColor: isCurrentWord
                      ? "rgba(59, 130, 246, 0.2)"
                      : "transparent",
                    boxShadow: isCurrentWord
                      ? "0 0 10px rgba(59, 130, 246, 0.3)"
                      : "none",
                  }}
                  transition={{
                    duration: 0.3,
                    ease: "easeInOut",
                  }}
                >
                  {word}
                </motion.span>
              );
            })}
          </motion.div>
        </motion.div>
        <p className="text-gray-300 text-sm">{instruction}</p>
      </motion.div>

      <motion.button
        onClick={onRecordToggle}
        className="w-16 h-16 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg
          flex items-center justify-center hover:scale-110 transition-transform duration-300"
        whileTap={{ scale: 0.9 }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-8 w-8"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
            clipRule="evenodd"
          />
        </svg>
      </motion.button>
    </motion.div>
  );
};
