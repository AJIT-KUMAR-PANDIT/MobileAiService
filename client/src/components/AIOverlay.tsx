import { FC, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { VoiceUI } from "./VoiceUI";
import { ChatUI } from "./ChatUI";
import { ModelDownloadStatus } from "./ModelDownloadStatus";
import { ModelSelector } from "./ModelSelector";
import { useLLMService } from "@/services/LLMService";
import { Message, ModelOptions } from "@/types/llm";
import useSpeechRecognition from "@/hooks/useSpeechRecognition";
import { useOfflineStatus } from "@/hooks/useOfflineStatus";
import useWakeWordDetection from "@/services/WakeWordService";
import { processVoiceCommand, CommandType } from "@/utils/voiceCommands";
import { saveConversation } from "@/utils/conversationHistory";
import { useTheme } from "@/contexts/ThemeContext";
import prompts from "@/data/prompts.json";
import { generateWakeupSound } from "@/utils/generateWakeupSound";
import { useIndianVoice } from "../hooks/useIndianVoice";
import { Capacitor } from "@capacitor/core";
import { SpeechRecognition } from "@capacitor-community/speech-recognition";
import { Device } from "@capacitor/device";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Camera } from "@capacitor/camera";
// Create a placeholder URL for the wakeup sound
const DEFAULT_SOUND_URL =
  "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAA=";

interface AIOverlayProps {
  isVisible: boolean;
  onClose: () => void;
}

export const AIOverlay: FC<AIOverlayProps> = ({ isVisible, onClose }) => {
  const [mode, setMode] = useState<"voice" | "chat">("voice");
  const [chatMessages, setChatMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I'm Luna, your AI assistant. How can I help you today?",
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [aiResponse, setAIResponse] = useState("How can I help you today?");
  const [instruction, setInstruction] = useState(
    "Say 'Luna' or tap the microphone"
  );
  const [isWakeWordMode, setIsWakeWordMode] = useState(true);
  const [wakeupSoundUrl, setWakeupSoundUrl] = useState(DEFAULT_SOUND_URL);
  const [activeTimer, setActiveTimer] = useState<{
    id: string;
    endTime: number;
    display: string;
  } | null>(null);
  const [isNormalChatMode, setIsNormalChatMode] = useState(false);
  const [isDeviceControlEnabled, setIsDeviceControlEnabled] = useState(true);
  const [isConversationActive, setIsConversationActive] = useState(false); // Added state
  const { speak, cancel, isSpeaking, selectedVoice } = useIndianVoice();
  // Use our custom offline status hook
  const { isOffline } = useOfflineStatus();

  // Use the theme context
  const { mode: themeMode } = useTheme();

  useEffect(() => {
    const requestAllPermissions = async () => {
      try {
        // Only request permissions on native platforms
        if (Capacitor.isNativePlatform()) {
          // Request microphone and speech recognition permissions
          await SpeechRecognition.requestPermissions();

          // Optionally, check device info for platform-specific logic
          const info = await Device.getInfo();
          console.log("Running on:", info.platform);
        } else {
          console.log("Skipping native permission requests on web platform.");
        }
      } catch (err) {
        console.error("Permission error:", err);
      }
    };

    if (isVisible) {
      requestAllPermissions();
    }
  }, [isVisible]);
  // Generate wakeup sound when component mounts
  useEffect(() => {
    async function createSound() {
      try {
        const soundUrl = await generateWakeupSound();
        if (soundUrl) {
          setWakeupSoundUrl(soundUrl);
          console.log("Wake sound generated successfully");
        }
      } catch (error) {
        console.error("Failed to generate wakeup sound:", error);
      }
    }

    createSound();

    // Clean up on unmount
    return () => {
      if (wakeupSoundUrl && wakeupSoundUrl !== DEFAULT_SOUND_URL) {
        URL.revokeObjectURL(wakeupSoundUrl);
      }
    };
  }, []);

  const {
    isModelLoaded,
    isDownloading,
    downloadProgress,
    downloadSize,
    totalSize,
    modelName,
    inference,
    loadModel,
    isInferring,
    changeModel,
    modelOptions,
    error: modelError,
  } = useLLMService();

  // Add model reload handler
  useEffect(() => {
    if (modelError) {
      console.error("Model error detected:", modelError);
      const timer = setTimeout(() => {
        console.log("Attempting to reload model...");
        loadModel();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [modelError, loadModel]);

  const {
    transcript,
    listening,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition();

  // Initial conversation when overlay opens
  useEffect(() => {
    if (isVisible && !isConversationActive) {
      const initialGreetings = [
        "How can I assist you today?",
        "What can I help you with?",
        "What's on your mind?",
        "I'm here to help. What do you need?",
        "How may I be of service?",
      ];
      const greeting =
        initialGreetings[Math.floor(Math.random() * initialGreetings.length)];
      setAIResponse(greeting);
      if (speak) {
        speak(greeting);
      }
      setIsConversationActive(true);
    }
  }, [isVisible, isConversationActive, speak]);

  // Wake word detection
  const {
    isListening: isWakeWordListening,
    isWakeWordDetected,
    startListening: startWakeWordListening,
    stopListening: stopWakeWordListening,
    resetDetection,
  } = useWakeWordDetection();

  // Auto-load model when overlay becomes visible
  useEffect(() => {
    if (isVisible && !isModelLoaded && !isDownloading) {
      console.log("Auto-loading AI model...");
      loadModel()
        .then(() => {
          console.log("Model loaded successfully");
        })
        .catch((err) => {
          console.error("Failed to load model:", err);
          // Try one more time after a delay
          setTimeout(() => {
            if (!isModelLoaded && !isDownloading) {
              console.log("Retrying model load...");
              loadModel()
                .then(() => console.log("Model loaded successfully on retry"))
                .catch((retryErr) =>
                  console.error("Failed to load model on retry:", retryErr)
                );
            }
          }, 3000);
        });
    }
  }, [isVisible, isModelLoaded, isDownloading, loadModel]);

  // Start wake word detection when overlay is visible
  useEffect(() => {
    const startWakeWordDetection = () => {
      if (
        isVisible &&
        isWakeWordMode &&
        mode === "voice" &&
        !isWakeWordListening &&
        !listening &&
        !isSpeaking &&
        !isInferring
      ) {
        console.log("Starting wake word detection for 'Luna'...");
        startWakeWordListening();
        setInstruction("Say 'Luna' or tap the microphone");
      }
    };

    // Initial start with delay to allow setup
    setTimeout(startWakeWordDetection, 1000);

    // Restart detection when other processes finish
    if (!listening && !isSpeaking && !isInferring) {
      startWakeWordDetection();
    }

    return () => {
      if (isWakeWordListening) {
        stopWakeWordListening();
      }
    };
  }, [
    isVisible,
    isWakeWordMode,
    mode,
    isWakeWordListening,
    listening,
    isSpeaking,
    isInferring,
    startWakeWordListening,
    stopWakeWordListening,
  ]);

  // Handle wake word detection
  useEffect(() => {
    if (isWakeWordDetected && isModelLoaded && !listening) {
      console.log("Wake word 'Luna' detected!");

      // Play wake sound
      const audio = new Audio(wakeupSoundUrl);
      audio.play().catch((e) => console.error("Failed to play wake sound:", e));

      // Stop wake word detection temporarily
      stopWakeWordListening();

      // Reset detection to prepare for next wake word
      resetDetection();

      // Start listening for command after a short delay
      setTimeout(() => {
        setInstruction("Luna is listening...");
        startListening();
      }, 500);
    }
  }, [
    isWakeWordDetected,
    isModelLoaded,
    listening,
    startListening,
    stopWakeWordListening,
    resetDetection,
    wakeupSoundUrl,
  ]);

  const LISTENING_DURATION = 15000; // 15 seconds in milliseconds
  const SENTENCE_COMPLETION_DURATION = 3000; // 3 seconds to complete the sentence

  // Process transcript when available
  useEffect(() => {
    let listenTimeoutTimer: NodeJS.Timeout;
    let lastActivityTime = Date.now();
    let sentenceCompletionTimer: NodeJS.Timeout;

    const checkInactivity = () => {
      const currentTime = Date.now();
      const inactiveTime = currentTime - lastActivityTime;

      if (inactiveTime >= LISTENING_DURATION) {
        console.log("No activity detected for 15 seconds, stopping listening");
        stopListening();
        setInstruction("Say 'Luna' or tap the microphone");

        // Restart wake word detection if enabled
        if (isWakeWordMode && !isWakeWordListening) {
          startWakeWordListening();
        }
        return true;
      }
      return false;
    };

    const handleSentenceCompletion = () => {
      clearTimeout(sentenceCompletionTimer);
      if (transcript.trim()) {
        handleVoiceInput(transcript);
      }
      stopListening();
      setInstruction("Say 'Luna' or tap the microphone");
      if (isWakeWordMode && !isWakeWordListening) {
        startWakeWordListening();
      }
    };

    if (listening) {
      // Reset activity timer when speech is detected
      const resetTimer = () => {
        lastActivityTime = Date.now();
        clearTimeout(sentenceCompletionTimer);
        sentenceCompletionTimer = setTimeout(
          handleSentenceCompletion,
          SENTENCE_COMPLETION_DURATION
        );
      };

      // Check for inactivity every second
      listenTimeoutTimer = setInterval(() => {
        if (checkInactivity()) {
          clearInterval(listenTimeoutTimer);
        }
      }, 1000);

      // Add speech detection listener
      window.addEventListener("speech", resetTimer);

      return () => {
        clearInterval(listenTimeoutTimer);
        clearTimeout(sentenceCompletionTimer);
        window.removeEventListener("speech", resetTimer);
      };
    }

    if (transcript && !listening && !isInferring) {
      console.log("Processing transcript:", transcript);
      const currentTranscript = transcript;
      resetTranscript();
      handleVoiceInput(currentTranscript);
    }
  }, [
    transcript,
    listening,
    isSpeaking,
    isInferring,
    resetTranscript,
    startListening,
    stopListening,
  ]);

  // Restart wake word detection after response
  useEffect(() => {
    if (
      isVisible &&
      isModelLoaded &&
      mode === "voice" &&
      !listening &&
      !isSpeaking &&
      !isInferring &&
      isWakeWordMode &&
      !isWakeWordListening
    ) {
      // Add a delay to avoid immediate restart
      const timer = setTimeout(() => {
        setInstruction("Say 'Luna' or tap the microphone");
        startWakeWordListening();
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [
    isVisible,
    isModelLoaded,
    mode,
    listening,
    isSpeaking,
    isInferring,
    isWakeWordMode,
    isWakeWordListening,
    startWakeWordListening,
  ]);

  const toggleMode = () => {
    const newMode = mode === "voice" ? "chat" : "voice";
    setMode(newMode);

    // Handle wake word detection when switching modes
    if (newMode === "voice") {
      // Switching to voice mode - start wake word detection if enabled
      if (isWakeWordMode && !isWakeWordListening && !listening && !isSpeaking) {
        setTimeout(() => {
          startWakeWordListening();
          setInstruction("Say 'Luna' or tap the microphone");
        }, 500); // Short delay to allow UI updates first
      }
    } else {
      // Switching to chat mode - stop wake word detection if running
      if (isWakeWordListening) {
        stopWakeWordListening();
      }
    }
  };

  const handleVoiceInput = async (text: string) => {
    setIsConversationActive(true);
    if (!text.trim()) return;
    setInstruction("Processing...");

    // Always use plain JS objects/arrays for messages
    const systemPrompt = isNormalChatMode
      ? prompts.normalConversationPrompt
      : prompts.deviceControlPrompt;

    const userMessage: Message = { role: "user", content: text };
    // Ensure chatMessages is a plain array of plain objects
    const messages: Message[] = [...chatMessages, userMessage];

    try {
      // Pass only plain JS objects/arrays to inference
      const response = await inference(systemPrompt, messages);

      const assistantMessage: Message = {
        role: "assistant",
        content: response,
      };

      const updatedMessages = [...chatMessages, userMessage, assistantMessage];

      setChatMessages(updatedMessages);
      setAIResponse(response);

      if (speak) {
        speak(response);
      }
    } catch (inferenceError) {
      // Add detailed error logging for WASM binding errors
      if (
        inferenceError &&
        typeof inferenceError === "object" &&
        "message" in inferenceError &&
        (inferenceError as any).message.includes("BindingError")
      ) {
        console.error(
          "LLM inference BindingError: This usually means a WASM object (like VectorInt) was passed from the wrong context. Ensure you only pass plain JS arrays/objects to inference.",
          inferenceError
        );
      } else {
        console.error("LLM inference error:", inferenceError);
      }

      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I encountered an error processing your request. Please try again.",
        },
      ]);
      setAIResponse(
        "I encountered an error processing your request. Please try again."
      );
    } finally {
      setIsTyping(false);
      setInstruction("Say 'Luna' or tap the microphone");
    }
  };

  const handleChatSend = async (message: string) => {
    if (!message.trim()) return;

    const userMessage: Message = { role: "user", content: message };
    setChatMessages((prev) => [...prev, userMessage]);
    setIsTyping(true);

    try {
      // Check if model is loaded before proceeding
      if (!isModelLoaded) {
        console.log("Model not loaded, attempting to load it now");
        try {
          await loadModel();
        } catch (loadError) {
          console.error("Failed to load model:", loadError);
          setChatMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content:
                "I'm having trouble loading my AI model. Please try again in a moment.",
            },
          ]);
          setIsTyping(false);
          return;
        }
      }

      // Check if this is a special command
      let commandResult = await processVoiceCommand(message);

      // Check for enabling/disabling device control explicitly
      if (
        message.toLowerCase().includes("enable device control") ||
        message.toLowerCase().includes("turn on device control")
      ) {
        setIsDeviceControlEnabled(true);
        setIsNormalChatMode(false);

        const response =
          "Device control mode enabled. I can now control your smart home devices.";
        const assistantMessage: Message = {
          role: "assistant",
          content: response,
        };

        setChatMessages((prev) => [...prev, assistantMessage]);
        setIsTyping(false);
        return;
      }

      if (
        message.toLowerCase().includes("disable device control") ||
        message.toLowerCase().includes("turn off device control")
      ) {
        setIsDeviceControlEnabled(false);
        setIsNormalChatMode(true);

        const response =
          "Device control mode disabled. I won't control any smart home devices until you enable it again.";
        const assistantMessage: Message = {
          role: "assistant",
          content: response,
        };

        setChatMessages((prev) => [...prev, assistantMessage]);
        setIsTyping(false);
        return;
      }

      // Handle normal chat mode
      if (commandResult.type === CommandType.NORMAL_CHAT) {
        // Update normal chat mode state
        setIsNormalChatMode(true);
        setIsDeviceControlEnabled(false);

        // If command has a message (welcome/instruction), use it directly
        if (commandResult.message) {
          const assistantMessage: Message = {
            role: "assistant",
            content: commandResult.message,
          };

          // Update chat with normal chat mode message
          setChatMessages((prev) => [...prev, assistantMessage]);
          setIsTyping(false);
          return;
        }

        // If they had a follow-up question with the normal chat request,
        // extract it and continue to LLM processing with the cleaned text
        if (commandResult.data?.processedText) {
          message = commandResult.data.processedText;
          console.log("Normal chat mode with question:", message);
        }
      }
      // Exit normal chat mode if they're using a specific command
      else if (isNormalChatMode && commandResult.type !== CommandType.GENERAL) {
        console.log("Exiting normal chat mode due to specific command");
        setIsNormalChatMode(false);
        setIsDeviceControlEnabled(true);
      }

      // Override smart home commands if device control is disabled
      if (
        !isDeviceControlEnabled &&
        commandResult.type === CommandType.SMART_HOME
      ) {
        console.log(
          "Smart home command detected but device control is disabled"
        );

        // Convert to a normal chat message instead
        commandResult = {
          type: CommandType.GENERAL,
          success: true,
          message: "",
          data: {
            originalCommand: message,
            deviceControlDisabled: true,
          },
        };

        // Inform user that device control is disabled
        const notice =
          "Device control is currently disabled. Please enable device control first, or continue chatting in normal mode.";
        setChatMessages((prev) => [
          ...prev,
          { role: "assistant", content: notice },
        ]);
        setIsTyping(false);
        return;
      }

      if (
        commandResult.success &&
        commandResult.type !== CommandType.GENERAL &&
        commandResult.type !== CommandType.NORMAL_CHAT
      ) {
        // Handle special commands (same as voice input)
        const specialResponse = commandResult.message;

        // Create assistant message with the command response
        const assistantMessage: Message = {
          role: "assistant",
          content: specialResponse,
        };

        // Handle specific command types (same as voice input)
        switch (commandResult.type) {
          case CommandType.TIMER:
            if (commandResult.data?.durationMs) {
              // Set a timer
              const timerEndTime = Date.now() + commandResult.data.durationMs;
              const timerId = Math.random().toString(36).substring(2);

              setActiveTimer({
                id: timerId,
                endTime: timerEndTime,
                display: commandResult.data.display,
              });

              // Set a timeout to alert when timer is done
              setTimeout(() => {
                if (activeTimer?.id === timerId) {
                  // Play an alert sound
                  const audio = new Audio(wakeupSoundUrl);
                  audio
                    .play()
                    .catch((e) =>
                      console.error("Failed to play timer alert:", e)
                    );

                  // Alert the user
                  if (speak) {
                    speak(
                      `Your timer for ${commandResult.data.display} is complete.`
                    );
                  }
                  setActiveTimer(null);
                }
              }, commandResult.data.durationMs);
            }
            break;

          case CommandType.SMART_HOME:
            // Smart home commands are handled by the processVoiceCommand function
            console.log("Smart home command executed:", commandResult.data);
            break;
        }

        // Update chat with special command response
        setChatMessages((prev) => [...prev, assistantMessage]);
        setIsTyping(false);
        return;
      }

      // For general queries, use the LLM
      const systemPrompt = isNormalChatMode
        ? prompts.normalConversationPrompt // Use regular conversation prompt
        : prompts.deviceControlPrompt; // Use device control prompt by default

      const messages = [...chatMessages, userMessage];

      console.log(
        "Sending to LLM for inference with system prompt:",
        systemPrompt
      );
      console.log("Messages:", messages);

      try {
        // Send to LLM for inference with error handling
        const response = await inference(systemPrompt, messages);
        console.log("Received response from LLM:", response);

        // Create assistant message with LLM response
        const assistantMessage: Message = {
          role: "assistant",
          content: response,
        };

        // Update conversation
        const updatedMessages = [
          ...chatMessages,
          userMessage,
          assistantMessage,
        ];

        // Save conversation history (only if meaningful interaction occurred)
        if (updatedMessages.length > 3) {
          saveConversation(updatedMessages, modelOptions.modelId);
        }

        // Update chat
        setChatMessages(updatedMessages);
      } catch (inferenceError) {
        console.error("Inference error:", inferenceError);
        setChatMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "I encountered an error processing your request. This might be due to a technical issue with my AI model. Please try again or try a different question.",
          },
        ]);
      } finally {
        setIsTyping(false);
      }
    } catch (error) {
      console.error("Error sending chat message:", error);

      // Offline fallback response
      if (isOffline) {
        setChatMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "I'm currently in offline mode and can't process complex requests. I can still help with basic commands and previously saved responses.",
          },
        ]);
      }
    } finally {
      setIsTyping(false);
    }
  };

  const handleMicrophoneToggle = () => {
    if (listening) {
      // If already listening for voice commands, stop and process
      stopListening();
      setInstruction("Processing...");
    } else {
      // Allow both wake word and direct listening to work together
      if (!isWakeWordListening) {
        startWakeWordListening();
      }

      // Start direct listening alongside wake word detection
      startListening();
      setInstruction("Luna is listening...");

      // Play wake sound
      const audio = new Audio(wakeupSoundUrl);
      audio.play().catch((e) => console.error("Failed to play wake sound:", e));
    }
  };

  // Toggle wake word mode (enable/disable wake word)
  const toggleWakeWordMode = () => {
    setIsWakeWordMode(!isWakeWordMode);

    if (isWakeWordMode) {
      // Turning off wake word detection
      if (isWakeWordListening) {
        stopWakeWordListening();
      }
      setInstruction("Wake word detection disabled");
    } else {
      // Turning on wake word detection
      if (!listening && !isSpeaking && !isInferring) {
        startWakeWordListening();
        setInstruction("Say 'Luna' to activate");
      }
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center pb-4 sm:items-center sm:p-6"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{
            duration: 0.4,
            ease: [0.4, 0, 0.2, 1],
          }}
        >
          <motion.div
            className="absolute inset-0 bg-darkBg bg-opacity-60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            className="relative w-full max-w-xl min-h-[400px] sm:min-h-[500px] max-h-[90vh] glass-effect rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            style={{
              background: "rgba(17, 24, 39, 0.7)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              overflowY: "auto",
            }}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ delay: 0.1, duration: 0.3 }}
          >
            {/* AI Header */}
            <div className="p-4 flex items-center justify-between border-b border-gray-700">
              <div className="flex items-center space-x-3">
                {/* AI Icon */}
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-accent flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                      />
                    </svg>
                  </div>
                  <div className="absolute top-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-darkBg"></div>
                </div>{" "}
                {/* AI Status */}
                <div>
                  <h3 className="text-white font-semibold font-tech">Luna</h3>
                  <div className="flex items-center">
                    <span className="text-xs text-green-400">Online</span>
                    <span className="mx-1 text-gray-500">•</span>
                    <span className="text-xs text-gray-400">
                      {isModelLoaded
                        ? `Using ${modelName}`
                        : "Loading model..."}
                    </span>
                    {isNormalChatMode && (
                      <>
                        <span className="mx-1 text-gray-500">•</span>
                        <span className="text-xs text-yellow-400 font-semibold">
                          Normal Chat Mode
                        </span>
                      </>
                    )}
                    {!isNormalChatMode && isDeviceControlEnabled && (
                      <>
                        <span className="mx-1 text-gray-500">•</span>
                        <span className="text-xs text-blue-400 font-semibold">
                          Device Control Enabled
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center space-x-2">
                {/* Device Control Toggle Button */}
                <button
                  onClick={() => {
                    setIsDeviceControlEnabled(!isDeviceControlEnabled);
                    setIsNormalChatMode(isDeviceControlEnabled); // Set to opposite state
                  }}
                  className={`relative p-2 rounded-full hover:bg-gray-700 transition-colors ${
                    isDeviceControlEnabled ? "text-blue400" : "text-yellow-400"
                  } hover:text-white`}
                  title={
                    isDeviceControlEnabled
                      ? "Switch to normal chat mode"
                      : "Enable device control mode"
                  }
                >
                  {isDeviceControlEnabled ? (
                    // Smart home icon
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4a1 1 0 011-1zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z" />
                    </svg>
                  ) : (
                    // Chat icon
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>

                {/* Wake Word Toggle (only in voice mode) */}
                {mode === "voice" && (
                  <button
                    onClick={toggleWakeWordMode}
                    className={`relative p-2 rounded-full hover:bg-gray-700 transition-colors ${
                      isWakeWordMode ? "text-accent" : "text-gray-400"
                    } hover:text-white`}
                    title={
                      isWakeWordMode
                        ? "Wake word 'Luna' is active"
                        : "Wake word detection off"
                    }
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                    </svg>
                    {isWakeWordMode && (
                      <motion.div
                        className="absolute -top-1 -right-1 w-2 h-2 bg-accent rounded-full"
                        animate={{
                          scale: [1, 1.2, 1],
                          opacity: [0.7, 1, 0.7],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      />
                    )}
                  </button>
                )}

                {/* Voice/Chat Mode Toggle */}
                <button
                  onClick={toggleMode}
                  className="p-2 rounded-full hover:bg-gray-700 transition-colors text-gray-400 hover:text-white"
                  title={
                    mode === "voice"
                      ? "Switch to chat mode"
                      : "Switch to voice mode"
                  }
                >
                  {mode === "voice" ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
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
                </button>

                {/* Close Button */}
                <button
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-gray-700 transition-colors text-gray-400 hover:text-white"
                  title="Close assistant"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            </div>
            {/* Voice UI or Chat UI based on mode */}
            {/* ?  */}
            {mode === "voice" ? (
              <VoiceUI
                isActive={true}
                message={aiResponse}
                instruction={instruction}
                isListening={listening}
                isSpeaking={isSpeaking}
                isInferring={isInferring}
                onRecordToggle={handleMicrophoneToggle}
                // Add this prop to allow VoiceUI to trigger LLM inference directly if needed
                onProcessVoiceInput={handleVoiceInput}
              />
            ) : (
              <ChatUI
                isActive={true}
                messages={chatMessages}
                isTyping={isTyping}
                onSendMessage={handleChatSend}
              />
            )}
            {/*  */}
            {/* Model Download Status */}
            {isDownloading && (
              <ModelDownloadStatus
                isDownloading={isDownloading}
                progress={downloadProgress}
                downloadedSize={downloadSize}
                totalSize={totalSize}
              />
            )}
            {/* Model Selector */}
            <ModelSelector
              currentModel={modelOptions.modelId}
              isLoading={isDownloading || isInferring}
              onModelChange={changeModel}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
