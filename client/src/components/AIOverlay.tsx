import { FC, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { VoiceUI } from "./VoiceUI";
import { ChatUI } from "./ChatUI";
import { ModelDownloadStatus } from "./ModelDownloadStatus";
import { useLLMService } from "@/services/LLMService";
import { Message } from "@/types/llm";
import useSpeechRecognition from "@/hooks/useSpeechRecognition";
import useSpeechSynthesis from "@/hooks/useSpeechSynthesis";
import prompts from "@/data/prompts.json";

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
  const [instruction, setInstruction] = useState("Tap the microphone and speak");

  const { 
    isModelLoaded, 
    isDownloading, 
    downloadProgress, 
    downloadSize,
    totalSize,
    modelName,
    inference, 
    loadModel,
    isInferring
  } = useLLMService();
  
  const { 
    transcript, 
    listening, 
    startListening, 
    stopListening 
  } = useSpeechRecognition();
  
  const { speak, speaking } = useSpeechSynthesis();

  // Auto-load model when overlay becomes visible
  useEffect(() => {
    if (isVisible && !isModelLoaded && !isDownloading) {
      console.log("Auto-loading AI model...");
      loadModel()
        .then(() => console.log("Model loaded successfully"))
        .catch(err => console.error("Failed to load model:", err));
    }
  }, [isVisible, isModelLoaded, isDownloading, loadModel]);
  
  // Automatically start voice input when voice mode is active and the model is loaded
  useEffect(() => {
    if (isVisible && isModelLoaded && mode === "voice" && !listening && !speaking && !isInferring) {
      // Add a small delay to allow the UI to render and avoid immediate activation
      const timer = setTimeout(() => {
        setInstruction("Tap the microphone to start speaking");
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [isVisible, isModelLoaded, mode, listening, speaking, isInferring]);

  useEffect(() => {
    if (transcript) {
      handleVoiceInput(transcript);
    }
  }, [transcript]);

  const toggleMode = () => {
    setMode(mode === "voice" ? "chat" : "voice");
  };

  const handleVoiceInput = async (text: string) => {
    if (!text.trim()) return;
    
    setInstruction("Processing...");
    
    try {
      const userMessage: Message = { role: "user", content: text };
      
      if (mode === "chat") {
        setChatMessages(prev => [...prev, userMessage]);
        setIsTyping(true);
      }
      
      const systemPrompt = prompts.template;
      const messages = [...chatMessages, userMessage];
      
      // Send to LLM for inference
      const response = await inference(systemPrompt, messages);
      
      const assistantMessage: Message = { role: "assistant", content: response };
      
      if (mode === "chat") {
        setChatMessages(prev => [...prev, assistantMessage]);
        setIsTyping(false);
      } else {
        setAIResponse(response);
        setInstruction("Tap the microphone to speak again");
        
        // Use text-to-speech for the response
        speak(response);
      }
    } catch (error) {
      console.error("Error processing voice input:", error);
      setInstruction("Something went wrong. Please try again.");
      setIsTyping(false);
    }
  };

  const handleChatSend = async (message: string) => {
    if (!message.trim()) return;
    
    const userMessage: Message = { role: "user", content: message };
    setChatMessages(prev => [...prev, userMessage]);
    setIsTyping(true);
    
    try {
      const systemPrompt = prompts.template;
      const messages = [...chatMessages, userMessage];
      
      // Send to LLM for inference
      const response = await inference(systemPrompt, messages);
      
      setChatMessages(prev => [
        ...prev, 
        { role: "assistant", content: response }
      ]);
    } catch (error) {
      console.error("Error sending chat message:", error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleMicrophoneToggle = () => {
    if (listening) {
      stopListening();
      setInstruction("Processing...");
    } else {
      startListening();
      setInstruction("Listening...");
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
            className="relative w-full max-w-xl min-h-[400px] sm:min-h-[500px] glass-effect rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            style={{
              background: "rgba(17, 24, 39, 0.7)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)"
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
                {/* Mode Toggle */}
                <button 
                  onClick={toggleMode}
                  className="p-2 rounded-full hover:bg-gray-700 transition-colors text-gray-400 hover:text-white"
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
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
