import { FC, useEffect, useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { VoiceUI } from "./VoiceUI";
import { ChatUI } from "./ChatUI";
import { ModelDownloadStatus } from "./ModelDownloadStatus";
import { ModelSelector } from "./ModelSelector";
import { ThemeCustomizer } from "./ThemeCustomizer";
import { ConversationHistory } from "./ConversationHistory";
import { OfflineBanner } from "./OfflineBanner";
import { useLLMService } from "@/services/LLMService";
import { Message, ModelOptions } from "@/types/llm";
import useSpeechRecognition from "@/hooks/useSpeechRecognition";
import useSpeechSynthesis from "@/hooks/useSpeechSynthesis";
import { useOfflineStatus } from "@/hooks/useOfflineStatus";
import useWakeWordDetection from "@/services/WakeWordService";
import { processVoiceCommand, CommandType } from "@/utils/voiceCommands";
import { saveConversation, getConversations } from "@/utils/conversationHistory";
import { useTheme } from "@/contexts/ThemeContext";
import prompts from "@/data/prompts.json";
import { prebuiltAppConfig } from "@mlc-ai/web-llm";

// Import sound generator utility
import { generateWakeupSound } from '@/utils/generateWakeupSound';

// Create a placeholder URL for the wakeup sound
const DEFAULT_SOUND_URL = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAA=';

interface AIOverlayProps {
  isVisible: boolean;
  onClose: () => void;
}

export const AIOverlay: FC<AIOverlayProps> = ({ isVisible, onClose }) => {
  const [mode, setMode] = useState<"voice" | "chat">("voice");
  const [chatMessages, setChatMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I'm Luna, your AI assistant. How can I help you today?"
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [aiResponse, setAIResponse] = useState("How can I help you today?");
  const [instruction, setInstruction] = useState("Say 'Luna' or tap the microphone");
  const [isWakeWordMode, setIsWakeWordMode] = useState(true);
  const [wakeupSoundUrl, setWakeupSoundUrl] = useState(DEFAULT_SOUND_URL);
  const [showHistorySidebar, setShowHistorySidebar] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTimer, setActiveTimer] = useState<{ id: string; endTime: number; display: string } | null>(null);
  
  // Use our custom offline status hook
  const { isOffline } = useOfflineStatus();
  
  // Use the theme context
  const { mode: themeMode } = useTheme();
  
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
    modelOptions
  } = useLLMService();
  
  const { 
    transcript, 
    listening, 
    startListening, 
    stopListening,
    resetTranscript 
  } = useSpeechRecognition();
  
  const { speak, speaking, supported, voices, setVoice } = useSpeechSynthesis();
  
  // Select a female voice if available
  useEffect(() => {
    console.log("Available voices:", voices);
    
    if (voices.length > 0) {
      // Try to find a female voice - prefer Google UK English Female, Microsoft Zira, or any voice with "female" in the name
      const femaleVoice = voices.find(
        voice => 
          voice.name.includes("Google UK English Female") || 
          voice.name.includes("Microsoft Zira") || 
          voice.name.toLowerCase().includes("female")
      );
      
      // If a female voice is found, use it
      if (femaleVoice) {
        console.log("Using female voice:", femaleVoice.name);
        setVoice(femaleVoice);
      } else {
        // Otherwise, use the first available voice
        console.log("No female voice found, using default:", voices[0].name);
        setVoice(voices[0]);
      }
    }
  }, [voices, setVoice]);
  
  // Wake word detection
  const {
    isListening: isWakeWordListening,
    isWakeWordDetected,
    startListening: startWakeWordListening,
    stopListening: stopWakeWordListening,
    resetDetection,
    wakeWordConfidence
  } = useWakeWordDetection();

  // Auto-load model when overlay becomes visible
  useEffect(() => {
    if (isVisible && !isModelLoaded && !isDownloading) {
      console.log("Auto-loading AI model...");
      
      // Log available WebLLM models
      if (prebuiltAppConfig && prebuiltAppConfig.model_list) {
        console.log("Available WebLLM models:", prebuiltAppConfig.model_list);
        console.log("Model IDs:");
        prebuiltAppConfig.model_list.forEach(model => {
          console.log(`- ${model.model_id} (URL: ${model.model})`);
        });
      } else {
        console.log("WebLLM model list not available");
      }
      
      loadModel()
        .then(() => console.log("Model loaded successfully"))
        .catch(err => console.error("Failed to load model:", err));
    }
  }, [isVisible, isModelLoaded, isDownloading, loadModel]);
  
  // Start wake word detection when overlay is visible
  useEffect(() => {
    if (isVisible && isWakeWordMode && mode === "voice" && !isWakeWordListening && !listening && !speaking) {
      console.log("Starting wake word detection for 'Luna'...");
      startWakeWordListening();
      setInstruction("Say 'Luna' or tap the microphone");
    }
    
    return () => {
      if (isWakeWordListening) {
        stopWakeWordListening();
      }
    };
  }, [isVisible, isWakeWordMode, mode, isWakeWordListening, listening, speaking, startWakeWordListening, stopWakeWordListening]);
  
  // Handle wake word detection
  useEffect(() => {
    if (isWakeWordDetected && isModelLoaded && !listening) {
      console.log("Wake word 'Luna' detected!");
      
      // Play wake sound
      const audio = new Audio(wakeupSoundUrl);
      audio.play().catch(e => console.error("Failed to play wake sound:", e));
      
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
  }, [isWakeWordDetected, isModelLoaded, listening, startListening, stopWakeWordListening, resetDetection, wakeupSoundUrl]);
  
  // Process transcript when available
  useEffect(() => {
    if (transcript && !isInferring) {
      handleVoiceInput(transcript);
      resetTranscript();
    }
  }, [transcript, isInferring, resetTranscript]);
  
  // Restart wake word detection after response
  useEffect(() => {
    if (isVisible && isModelLoaded && mode === "voice" && !listening && !speaking && !isInferring && 
        isWakeWordMode && !isWakeWordListening) {
      // Add a delay to avoid immediate restart
      const timer = setTimeout(() => {
        setInstruction("Say 'Luna' or tap the microphone");
        startWakeWordListening();
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [isVisible, isModelLoaded, mode, listening, speaking, isInferring, isWakeWordMode, 
      isWakeWordListening, startWakeWordListening]);

  const toggleMode = () => {
    const newMode = mode === "voice" ? "chat" : "voice";
    setMode(newMode);
    
    // Handle wake word detection when switching modes
    if (newMode === "voice") {
      // Switching to voice mode - start wake word detection if enabled
      if (isWakeWordMode && !isWakeWordListening && !listening && !speaking) {
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
    if (!text.trim()) return;
    
    setInstruction("Processing...");
    
    try {
      const userMessage: Message = { role: "user", content: text };
      
      // Add user message to chat history
      if (mode === "chat") {
        setChatMessages(prev => [...prev, userMessage]);
        setIsTyping(true);
      }
      
      // Check if this is a special command
      const commandResult = await processVoiceCommand(text);
      
      if (commandResult.success && commandResult.type !== CommandType.GENERAL) {
        // Handle special commands
        const specialResponse = commandResult.message;
        
        // Create assistant message with the command response
        const assistantMessage: Message = { 
          role: "assistant", 
          content: specialResponse 
        };
        
        // Handle specific command types
        switch (commandResult.type) {
          case CommandType.TIMER:
            if (commandResult.data?.durationMs) {
              // Set a timer
              const timerEndTime = Date.now() + commandResult.data.durationMs;
              const timerId = Math.random().toString(36).substring(2);
              
              setActiveTimer({
                id: timerId,
                endTime: timerEndTime,
                display: commandResult.data.display
              });
              
              // Set a timeout to alert when timer is done
              setTimeout(() => {
                if (activeTimer?.id === timerId) {
                  // Play an alert sound
                  const audio = new Audio(wakeupSoundUrl);
                  audio.play().catch(e => console.error("Failed to play timer alert:", e));
                  
                  // Alert the user
                  speak(`Your timer for ${commandResult.data.display} is complete.`);
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
        
        // Update chat and UI with special command response
        if (mode === "chat") {
          setChatMessages(prev => [...prev, assistantMessage]);
          setIsTyping(false);
        } else {
          setAIResponse(specialResponse);
          setInstruction("Tap the microphone to speak again");
          speak(specialResponse);
        }
        
        return;
      }
      
      // For general queries, use the LLM
      const systemPrompt = prompts.template;
      const messages = [...chatMessages, userMessage];
      
      // Send to LLM for inference
      const response = await inference(systemPrompt, messages);
      
      // Create assistant message with LLM response
      const assistantMessage: Message = { role: "assistant", content: response };
      
      // Update conversation
      const updatedMessages = [...chatMessages, userMessage, assistantMessage];
      
      // Save conversation history (only if meaningful interaction occurred)
      if (updatedMessages.length > 3) {
        saveConversation(updatedMessages, modelOptions.modelId);
      }
      
      // Update UI based on mode
      if (mode === "chat") {
        setChatMessages(updatedMessages);
        setIsTyping(false);
      } else {
        setAIResponse(response);
        setInstruction("Tap the microphone to speak again");
        
        // Use text-to-speech for the response
        speak(response);
      }
    } catch (error) {
      console.error("Error processing voice input:", error);
      
      // Offline fallback response
      if (isOffline) {
        const offlineResponse = "I'm currently in offline mode and can't process complex requests. I can still help with basic commands and previously saved responses.";
        
        if (mode === "chat") {
          setChatMessages(prev => [...prev, { role: "assistant", content: offlineResponse }]);
          setIsTyping(false);
        } else {
          setAIResponse(offlineResponse);
          setInstruction("Tap the microphone to speak again");
          speak(offlineResponse);
        }
      } else {
        setInstruction("Something went wrong. Please try again.");
        setIsTyping(false);
      }
    }
  };

  const handleChatSend = async (message: string) => {
    if (!message.trim()) return;
    
    const userMessage: Message = { role: "user", content: message };
    setChatMessages(prev => [...prev, userMessage]);
    setIsTyping(true);
    
    try {
      // Check if this is a special command
      const commandResult = await processVoiceCommand(message);
      
      if (commandResult.success && commandResult.type !== CommandType.GENERAL) {
        // Handle special commands (same as voice input)
        const specialResponse = commandResult.message;
        
        // Create assistant message with the command response
        const assistantMessage: Message = { 
          role: "assistant", 
          content: specialResponse 
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
                display: commandResult.data.display
              });
              
              // Set a timeout to alert when timer is done
              setTimeout(() => {
                if (activeTimer?.id === timerId) {
                  // Play an alert sound
                  const audio = new Audio(wakeupSoundUrl);
                  audio.play().catch(e => console.error("Failed to play timer alert:", e));
                  
                  // Alert the user
                  speak(`Your timer for ${commandResult.data.display} is complete.`);
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
        setChatMessages(prev => [...prev, assistantMessage]);
        setIsTyping(false);
        return;
      }
      
      // For general queries, use the LLM
      const systemPrompt = prompts.template;
      const messages = [...chatMessages, userMessage];
      
      // Send to LLM for inference
      const response = await inference(systemPrompt, messages);
      
      // Create assistant message with LLM response
      const assistantMessage: Message = { role: "assistant", content: response };
      
      // Update conversation
      const updatedMessages = [...chatMessages, userMessage, assistantMessage];
      
      // Save conversation history (only if meaningful interaction occurred)
      if (updatedMessages.length > 3) {
        saveConversation(updatedMessages, modelOptions.modelId);
      }
      
      // Update chat
      setChatMessages(updatedMessages);
      
    } catch (error) {
      console.error("Error sending chat message:", error);
      
      // Offline fallback response
      if (isOffline) {
        setChatMessages(prev => [...prev, { 
          role: "assistant", 
          content: "I'm currently in offline mode and can't process complex requests. I can still help with basic commands and previously saved responses."
        }]);
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
      // If wake word detection is active, disable it first
      if (isWakeWordListening) {
        stopWakeWordListening();
      }
      
      // Start direct listening
      startListening();
      setInstruction("Luna is listening...");
      
      // Play wake sound
      const audio = new Audio(wakeupSoundUrl);
      audio.play().catch(e => console.error("Failed to play wake sound:", e));
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
      if (!listening && !speaking && !isInferring) {
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
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
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
              overflowY: "auto"
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
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div className="absolute top-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-darkBg"></div>
                </div>
                
                {/* AI Status */}
                <div>
                  <h3 className="text-white font-semibold font-tech">Luna</h3>
                  <div className="flex items-center">
                    <span className="text-xs text-green-400">Online</span>
                    <span className="mx-1 text-gray-500">•</span>
                    <span className="text-xs text-gray-400">
                      {isModelLoaded ? `Using ${modelName}` : "Loading model..."}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Controls */}
              <div className="flex items-center space-x-2">
                {/* Wake Word Toggle (only in voice mode) */}
                {mode === "voice" && (
                  <button 
                    onClick={toggleWakeWordMode}
                    className={`p-2 rounded-full hover:bg-gray-700 transition-colors ${isWakeWordMode ? 'text-accent' : 'text-gray-400'} hover:text-white`}
                    title={isWakeWordMode ? "Wake word 'Luna' is active" : "Wake word detection off"}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                    </svg>
                    {isWakeWordMode && (
                      <motion.div 
                        className="absolute -top-1 -right-1 w-2 h-2 bg-accent rounded-full"
                        animate={{ 
                          scale: [1, 1.2, 1],
                          opacity: [0.7, 1, 0.7] 
                        }}
                        transition={{ 
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      />
                    )}
                  </button>
                )}
                
                {/* Mode Toggle */}
                <button 
                  onClick={toggleMode}
                  className="p-2 rounded-full hover:bg-gray-700 transition-colors text-gray-400 hover:text-white"
                  title={mode === "voice" ? "Switch to chat mode" : "Switch to voice mode"}
                >
                  {mode === "voice" ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
                
                {/* Close Button */}
                <button 
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-gray-700 transition-colors text-gray-400 hover:text-white"
                  title="Close assistant"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Voice UI or Chat UI based on mode */}
            {mode === "voice" ? (
              <VoiceUI 
                isActive={true}
                message={aiResponse}
                instruction={instruction}
                isListening={listening}
                isSpeaking={speaking}
                isInferring={isInferring}
                onRecordToggle={handleMicrophoneToggle}
              />
            ) : (
              <ChatUI 
                isActive={true}
                messages={chatMessages}
                isTyping={isTyping}
                onSendMessage={handleChatSend}
              />
            )}
            
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