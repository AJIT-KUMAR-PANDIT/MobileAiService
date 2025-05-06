import { FC, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Capacitor } from "@capacitor/core";

interface VoiceUIProps {
  isActive: boolean;
  message: string;
  instruction: string;
  isListening: boolean;
  isSpeaking: boolean;
  isInferring: boolean;
  onRecordToggle: () => void;
  voicePreference?: string;
  isWakeWordMode?: boolean;
  isWakeWordListening?: boolean;
  onWakeWordDetected?: () => void;
  onProcessVoiceInput: (text: string) => Promise<void>;
  speechRate?: number;
  volume?: number;
  onVolumeChange?: (volume: number) => void;
  onSpeechRateChange?: (rate: number) => void;
  enableVisualizations?: boolean;
  theme?: "light" | "dark" | "auto";
}

export const VoiceUI: FC<VoiceUIProps> = ({
  isActive,
  message,
  instruction,
  isListening,
  isSpeaking,
  isInferring,
  onRecordToggle,
  voicePreference = "indian-female",
  isWakeWordMode = false,
  isWakeWordListening = false,
  onWakeWordDetected,
  onProcessVoiceInput,
  speechRate = 1,
  volume = 1,
  onVolumeChange,
  onSpeechRateChange,
  enableVisualizations = true,
  theme = "dark",
}) => {
  const [speechStartTime, setSpeechStartTime] = useState(Date.now());
  const [subtitle, setSubtitle] = useState("");
  const [speakerType, setSpeakerType] = useState<"assistant" | "user" | null>(
    null
  );
  const [lastSpeechTime, setLastSpeechTime] = useState(Date.now());
  const [showControls, setShowControls] = useState(false);
  const [visualizerData, setVisualizerData] = useState<number[]>(
    Array(20).fill(5)
  );
  const [wakeWordStatus, setWakeWordStatus] = useState<
    "idle" | "detected" | "listening"
  >("idle");

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (isWakeWordMode && isWakeWordListening) {
      setWakeWordStatus("listening");
      setSubtitle("Listening for wake word...");
    } else if (isWakeWordMode && wakeWordStatus === "detected") {
      // Keep detected status until explicitly changed
    } else if (!isWakeWordMode && !isListening && !isSpeaking && !isInferring) {
      setWakeWordStatus("idle");
      setSubtitle("");
    }
  }, [
    isWakeWordMode,
    isWakeWordListening,
    wakeWordStatus,
    isListening,
    isSpeaking,
    isInferring,
  ]);

  const handleWakeWordDetection = () => {
    if (onWakeWordDetected) {
      setWakeWordStatus("detected");
      setSubtitle("Wake word detected!");
      onWakeWordDetected();

      setTimeout(() => {
        setWakeWordStatus("listening");
        setSubtitle("Listening for command...");
      }, 1000);
    }
  };

  useEffect(() => {
    if (isSpeaking) {
      setSpeechStartTime(Date.now());
      setSpeakerType("assistant");
      setSubtitle("Luna is speaking...");
      setLastSpeechTime(Date.now());

      if (enableVisualizations) {
        const interval = setInterval(() => {
          setVisualizerData(
            Array(20)
              .fill(0)
              .map(() => Math.floor(Math.random() * 25) + 5)
          );
        }, 100);
        return () => clearInterval(interval);
      }
    } else if (isListening) {
      setSpeakerType("user");
      setSubtitle("Listening to you...");
      setLastSpeechTime(Date.now());

      if (enableVisualizations && !analyserRef.current) {
        setupAudioAnalysis();
      }
    } else if (!isSpeaking && !isListening) {
      if (analyserRef.current) {
        cleanupAudioAnalysis();
      }

      if (speakerType === "assistant") {
        const timer = setTimeout(() => {
          if (isActive && !isListening && !isSpeaking) {
            onRecordToggle();
          }
        }, 150);
        return () => clearTimeout(timer);
      } else {
        setSpeakerType(null);
        setSubtitle("");
      }
    }
  }, [
    isSpeaking,
    isListening,
    onRecordToggle,
    speakerType,
    isActive,
    enableVisualizations,
  ]);

  const setupAudioAnalysis = async () => {
    if (Capacitor.isNativePlatform()) {
      setVisualizerData(Array(20).fill(10));
      return;
    }

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
      }

      if (!audioContextRef.current) {
        console.error("AudioContext could not be initialized.");
        return;
      }

      if (!micStreamRef.current) {
        micStreamRef.current = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
      }

      if (!micStreamRef.current) {
        console.error("Microphone stream could not be obtained.");
        return;
      }

      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 64;

      const source = audioContextRef.current.createMediaStreamSource(
        micStreamRef.current
      );
      source.connect(analyser);

      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateVisualizer = () => {
        if (!analyserRef.current || !isListening) return;

        analyserRef.current.getByteFrequencyData(dataArray);
        const normalizedData = Array.from(dataArray)
          .slice(0, 20)
          .map((value) => Math.max(5, Math.floor(value / 5)));

        setVisualizerData(normalizedData);
        requestAnimationFrame(updateVisualizer);
      };

      updateVisualizer();
    } catch (err) {
      console.error("Error setting up audio analysis:", err);
      cleanupAudioAnalysis();
    }
  };

  const cleanupAudioAnalysis = () => {
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }

    if (analyserRef.current) {
      analyserRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };

  const getAnimationState = () => {
    if (isWakeWordMode && isWakeWordListening) return "wakeword";
    if (wakeWordStatus === "detected") return "detected";
    if (isListening) return "listening";
    if (isSpeaking) return "speaking";
    if (isInferring) return "processing";
    return "idle";
  };

  const circleVariants = {
    wakeword: {
      scale: [1, 1.1, 1],
      opacity: [0.6, 0.9, 0.6],
      borderColor: ["#a855f7", "#9333ea", "#a855f7"],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
    detected: {
      scale: [1, 1.3, 1],
      opacity: [0.7, 1, 0.7],
      borderColor: ["#22c55e", "#16a34a", "#22c55e"],
      transition: {
        duration: 0.5,
        repeat: 3,
        ease: "easeInOut",
      },
    },
    listening: {
      scale: [1, 1.2, 1],
      opacity: [0.7, 1, 0.7],
      borderColor: ["#f87171", "#ef4444", "#f87171"],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
    speaking: {
      scale: [1, 1.1, 1],
      opacity: [0.8, 1, 0.8],
      borderColor: ["#60a5fa", "#3b82f6", "#60a5fa"],
      transition: {
        duration: 1,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
    processing: {
      rotate: [0, 360],
      borderColor: ["#8b5cf6", "#6366f1", "#8b5cf6"],
      borderWidth: ["4px", "6px", "4px"],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "linear",
      },
    },
    idle: {
      scale: 1,
      opacity: 0.7,
      borderColor: "#818cf8",
    },
  };

  const waveformVariants = {
    wakeword: (i: number) => ({
      height: ["8px", "18px", "8px"],
      backgroundColor: ["#9333ea", "#7e22ce", "#9333ea"],
      opacity: [0.5, 0.9, 0.5],
      transition: {
        duration: 0.8,
        repeat: Infinity,
        delay: i * 0.1,
        ease: "easeInOut",
      },
    }),
    detected: (i: number) => ({
      height: ["20px", "40px", "20px"],
      backgroundColor: ["#16a34a", "#15803d", "#16a34a"],
      opacity: [0.6, 1, 0.6],
      transition: {
        duration: 0.3,
        repeat: 3,
        delay: i * 0.05,
        ease: "easeInOut",
      },
    }),
    listening: (i: number) => ({
      height:
        enableVisualizations &&
        !Capacitor.isNativePlatform() &&
        visualizerData.length > 0
          ? `${Math.max(5, visualizerData[i % visualizerData.length] ?? 5)}px` // Ensure minimum height and handle potential undefined
          : "15px", // Default height when visualization is off or data unavailable
      backgroundColor: ["#ef4444", "#dc2626", "#ef4444"],
      opacity:
        enableVisualizations &&
        !Capacitor.isNativePlatform() &&
        visualizerData.length > 0
          ? 1
          : [0.6, 1, 0.6],
      transition:
        enableVisualizations &&
        !Capacitor.isNativePlatform() &&
        visualizerData.length > 0
          ? { duration: 0.1 }
          : {
              duration: 0.5,
              repeat: Infinity,
              delay: i * 0.1,
              ease: "easeInOut",
            },
    }),
    speaking: (i: number) => ({
      height:
        enableVisualizations && visualizerData.length > 0
          ? `${Math.max(5, visualizerData[i % visualizerData.length] ?? 5)}px` // Ensure minimum height and handle potential undefined
          : "20px", // Default height when visualization is off or data unavailable
      backgroundColor: ["#3b82f6", "#2563eb", "#3b82f6"],
      opacity:
        enableVisualizations && visualizerData.length > 0 ? 1 : [0.7, 1, 0.7],
      transition:
        enableVisualizations && visualizerData.length > 0
          ? { duration: 0.1 }
          : {
              duration: 0.7,
              repeat: Infinity,
              delay: i * 0.15,
              ease: "easeInOut",
            },
    }),
    processing: (i: number) => ({
      height: "20px",
      backgroundColor: "#8b5cf6",
      opacity: [0.4, 1, 0.4],
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
      opacity: 0.6,
    },
  };

  const currentState = getAnimationState();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && e.ctrlKey) {
        e.preventDefault();
        onRecordToggle();
      }

      if (e.code === "Escape" && isListening) {
        e.preventDefault();
        onRecordToggle();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      cleanupAudioAnalysis();
    };
  }, [isListening, onRecordToggle]);

  const toggleControls = () => {
    setShowControls(!showControls);
  };

  const handleSpeechRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newRate = parseFloat(e.target.value);
    if (onSpeechRateChange) {
      onSpeechRateChange(newRate);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    if (onVolumeChange) {
      onVolumeChange(newVolume);
    }
  };

  return (
    <motion.div
      className={`flex-1 flex flex-col items-center justify-center p-6 ${
        theme === "light"
          ? "bg-gray-100 text-gray-800"
          : "bg-gray-900 text-white"
      }`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="relative w-48 h-48 mb-6"
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
      >
        {isWakeWordMode && (
          <motion.div
            className="absolute -top-8 left-0 right-0 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <span
              className={`inline-block px-3 py-1 rounded-full text-xs ${
                wakeWordStatus === "detected"
                  ? "bg-green-500 text-white"
                  : wakeWordStatus === "listening"
                  ? "bg-purple-500 text-white"
                  : "bg-gray-500 text-white"
              }`}
            >
              {wakeWordStatus === "detected"
                ? "Wake Word Detected"
                : wakeWordStatus === "listening"
                ? "Listening for Wake Word"
                : "Wake Mode Active"}
            </span>
          </motion.div>
        )}

        <motion.div
          className="absolute inset-0 rounded-full border-4"
          animate={currentState}
          variants={circleVariants}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              className="w-24 h-24"
              animate={{
                scale:
                  currentState === "idle" || currentState === "wakeword"
                    ? [1, 1.03, 1]
                    : 1,
                opacity: isInferring ? [0.5, 1] : 1,
              }}
              transition={{
                duration:
                  currentState === "idle" || currentState === "wakeword"
                    ? 2.5
                    : isInferring
                    ? 1
                    : 0.2,
                repeat:
                  currentState === "idle" ||
                  currentState === "wakeword" ||
                  isInferring
                    ? Infinity
                    : 0,
                ease: "easeInOut",
              }}
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

        <div className="absolute inset-x-0 bottom-0 flex justify-center space-x-1 pb-4">
          {[...Array(15)].map((_, i) => (
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
              animate={{ opacity: subtitle ? 1 : 0 }}
              exit={{ opacity: 0 }}
            >
              <span
                className={`${
                  speakerType === "assistant"
                    ? "text-blue-400"
                    : speakerType === "user"
                    ? "text-green-400"
                    : "text-purple-400"
                }`}
              >
                {subtitle}
              </span>
            </motion.div>
          )}
          <motion.div
            className={`${
              theme === "light" ? "text-gray-800" : "text-white"
            } text-2xl font-bold mb-2 font-tech h-[111px] overflow-y-auto scrollbar-thin scrollbar-thumb-blue-500 scrollbar-track-transparent px-4`}
          >
            {message.split(" ").map((word, index, array) => {
              // Avoid division by zero if array is empty
              const currentWordIndex =
                array.length > 0
                  ? Math.floor((Date.now() - speechStartTime) / 200) %
                    array.length
                  : -1;
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
                    color: isCurrentWord
                      ? "#3b82f6"
                      : theme === "light"
                      ? "#111827"
                      : "#ffffff",
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
        <p
          className={`${
            theme === "light" ? "text-gray-600" : "text-gray-300"
          } text-sm`}
        >
          {instruction}
        </p>
      </motion.div>

      <div className="flex items-center justify-center space-x-4">
        <motion.button
          onClick={toggleControls}
          className={`w-10 h-10 rounded-full ${
            theme === "light"
              ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
              : "bg-gray-700 text-gray-200 hover:bg-gray-600"
          } flex items-center justify-center`}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
              clipRule="evenodd"
            />
          </svg>
        </motion.button>

        <motion.button
          onClick={onRecordToggle}
          className="w-16 h-16 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg
            flex items-center justify-center hover:scale-110 transition-transform duration-300"
          whileTap={{ scale: 0.9 }}
        >
          {isListening ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <rect x="5" y="5" width="10" height="10" rx="2" />
            </svg>
          ) : (
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
          )}
        </motion.button>

        {isWakeWordMode !== undefined && onWakeWordDetected && (
          <motion.button
            onClick={() => {
              if (isWakeWordListening) {
                handleWakeWordDetection();
              }
            }}
            className={`w-10 h-10 rounded-full ${
              isWakeWordListening
                ? "bg-purple-600 text-white hover:bg-purple-700"
                : theme === "light"
                ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
                : "bg-gray-700 text-gray-200 hover:bg-gray-600"
            } flex items-center justify-center`}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L10 6.477V16h2a1 1 0 110 2H8a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.616a1 1 0 01.894-1.79l1.599.8L9 4.323V3a1 1 0 011-1z"
                clipRule="evenodd"
              />
            </svg>
          </motion.button>
        )}
      </div>

      <AnimatePresence>
        {showControls && (
          <motion.div
            className={`mt-6 p-4 rounded-lg ${
              theme === "light" ? "bg-gray-200" : "bg-gray-800"
            } w-full max-w-sm`}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <h3
              className={`text-sm font-semibold mb-3 ${
                theme === "light" ? "text-gray-700" : "text-gray-200"
              }`}
            >
              Voice Settings
            </h3>

            <div className="mb-4">
              <label
                className={`block text-xs mb-1 ${
                  theme === "light" ? "text-gray-600" : "text-gray-300"
                }`}
              >
                Voice Type
              </label>
              <select
                className={`w-full p-2 rounded text-sm ${
                  theme === "light"
                    ? "bg-white border border-gray-300 text-gray-700"
                    : "bg-gray-700 border border-gray-600 text-gray-200"
                }`}
                value={voicePreference}
              >
                <option value="indian-female">Indian Female</option>
                <option value="british-male">British Male</option>
                <option value="american-female">American Female</option>
              </select>
            </div>

            <div className="mb-4">
              <label
                className={`block text-xs mb-1 ${
                  theme === "light" ? "text-gray-600" : "text-gray-300"
                }`}
              >
                Speech Rate: {speechRate}x
              </label>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={speechRate}
                onChange={handleSpeechRateChange}
                className="w-full"
              />
            </div>

            <div className="mb-4">
              <label
                className={`block text-xs mb-1 ${
                  theme === "light" ? "text-gray-600" : "text-gray-300"
                }`}
              >
                Volume: {Math.round(volume * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={handleVolumeChange}
                className="w-full"
              />
            </div>

            <div className="mb-4 flex items-center justify-between">
              <label
                className={`block text-xs ${
                  theme === "light" ? "text-gray-600" : "text-gray-300"
                }`}
              >
                Audio Visualizations
              </label>
              <button
                onClick={() => {
                  console.log("Toggle visualizations");
                }}
                className={`w-12 h-6 rounded-full relative ${
                  enableVisualizations
                    ? "bg-indigo-500"
                    : theme === "light"
                    ? "bg-gray-300"
                    : "bg-gray-600"
                }`}
              >
                <div
                  className={`absolute w-5 h-5 rounded-full top-0.5 transform transition-transform ${
                    enableVisualizations
                      ? "translate-x-6 bg-white"
                      : "translate-x-0.5 bg-gray-100"
                  }`}
                />
              </button>
            </div>

            <div
              className={`text-xs ${
                theme === "light" ? "text-gray-500" : "text-gray-400"
              }`}
            >
              <p>Keyboard shortcuts:</p>
              <p>• Ctrl+Space: Toggle microphone</p>
              <p>• Esc: Cancel recording</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isListening && (
        <motion.div
          className="mt-4 flex items-center space-x-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="w-3 h-3 rounded-full bg-red-500"
            animate={{
              opacity: [0.5, 1],
              scale: [0.8, 1.2, 0.8],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <span
            className={`text-xs font-medium ${
              theme === "light" ? "text-gray-600" : "text-gray-300"
            }`}
          >
            Recording... {Math.floor((Date.now() - lastSpeechTime) / 1000)}s
          </span>
        </motion.div>
      )}
    </motion.div>
  );
};
