import { FC, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Message } from "@/types/llm";

interface ChatUIProps {
  isActive: boolean;
  messages: Message[];
  isTyping: boolean;
  onSendMessage: (message: string) => void;
}

export const ChatUI: FC<ChatUIProps> = ({
  isActive,
  messages,
  isTyping,
  onSendMessage,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Focus input when active
  useEffect(() => {
    if (isActive && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isActive]);

  const handleSend = () => {
    if (inputRef.current && inputRef.current.value.trim()) {
      onSendMessage(inputRef.current.value);
      inputRef.current.value = "";
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSend();
    }
  };

  if (!isActive) return null;

  return (
    <div className="flex-1 flex flex-col">
      {/* Messages Container */}
      <div 
        className="flex-1 overflow-y-auto p-4" 
        ref={messagesContainerRef}
      >
        {/* System Message */}
        <div className="mb-4 flex justify-center">
          <div 
            className="inline-block rounded-full px-4 py-2 text-xs text-gray-300"
            style={{
              background: "rgba(249, 250, 251, 0.25)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
          >
            WebLLM powered AI assistant
          </div>
        </div>
        
        {/* Messages */}
        {messages.map((message, index) => (
          <motion.div
            key={index}
            className={`flex mb-4 ${message.role === "user" ? "justify-end" : "items-end"}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {message.role === "assistant" && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary to-accent flex-shrink-0 mr-2 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" clipRule="evenodd" />
                </svg>
              </div>
            )}
            
            <div 
              className={`max-w-[80%] p-3 text-white shadow-sm ${
                message.role === "user" 
                  ? "bg-primary rounded-t-xl rounded-bl-xl"
                  : "bg-gray-700 rounded-t-xl rounded-br-xl"
              }`}
            >
              <p>{message.content}</p>
            </div>
          </motion.div>
        ))}
        
        {/* Typing Indicator */}
        {isTyping && (
          <motion.div
            className="flex mb-4 items-end"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary to-accent flex-shrink-0 mr-2 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="max-w-[80%] bg-gray-700 rounded-t-xl rounded-br-xl p-3 text-white shadow-sm">
              <div className="flex space-x-2">
                <motion.div
                  className="w-2 h-2 bg-gray-400 rounded-full"
                  animate={{ y: [0, -5, 0] }}
                  transition={{ repeat: Infinity, duration: 1.2 }}
                />
                <motion.div
                  className="w-2 h-2 bg-gray-400 rounded-full"
                  animate={{ y: [0, -5, 0] }}
                  transition={{ repeat: Infinity, duration: 1.2, delay: 0.2 }}
                />
                <motion.div
                  className="w-2 h-2 bg-gray-400 rounded-full"
                  animate={{ y: [0, -5, 0] }}
                  transition={{ repeat: Infinity, duration: 1.2, delay: 0.4 }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </div>
      
      {/* Input Area */}
      <div className="p-4 border-t border-gray-700">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            className="w-full bg-gray-700 border border-gray-600 rounded-full py-3 pl-4 pr-12 text-white focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Send a message..."
            onKeyPress={handleKeyPress}
          />
          <button
            onClick={handleSend}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};
