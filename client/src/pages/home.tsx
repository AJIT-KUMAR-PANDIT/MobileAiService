import { FC, useState, useEffect } from "react"; // Import useEffect
import { AIActivationButton } from "@/components/AIActivationButton";
import { AIOverlay } from "@/components/AIOverlay";
import { motion } from "framer-motion";
import useGlobalWakeWord from "@/hooks/useGlobalWakeWord"; // Import the new hook

const Home: FC = () => {
  const [isAIOverlayVisible, setIsAIOverlayVisible] = useState(false);

  const handleAIActivation = () => {
    console.log("Activating AI assistant...");
    setIsAIOverlayVisible(true);
  };

  const handleAIClose = () => {
    setIsAIOverlayVisible(false);
  };

  // Use the global wake word hook
  const { isListening: isGlobalWakeWordListening } = useGlobalWakeWord({
    onWakeWordDetected: handleAIActivation, // Open overlay on detection
  });

  // Log global listening state (optional)
  useEffect(() => {
    console.log("Global Wake Word Listening:", isGlobalWakeWordListening);
  }, [isGlobalWakeWordListening]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-4">
      <div className="max-w-7xl mx-auto">
        <motion.div
          className="flex justify-between items-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            AI Voice Assistant
          </h1>
          <div className="flex space-x-4">
            <motion.div
              className="w-10 h-10 bg-gradient-to-r from-primary/30 to-accent/30 rounded-full flex items-center justify-center"
              whileHover={{ scale: 1.1 }}
            >
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
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </motion.div>
            <motion.div
              className="w-10 h-10 bg-gradient-to-r from-primary/30 to-accent/30 rounded-full flex items-center justify-center"
              whileHover={{ scale: 1.1 }}
            >
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
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </motion.div>
          </div>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <motion.div
            className="bg-gray-800/50 p-6 rounded-xl border border-gray-700 backdrop-blur-sm"
            whileHover={{
              scale: 1.02,
              backgroundColor: "rgba(31, 41, 55, 0.7)",
            }}
            transition={{ duration: 0.3 }}
          >
            <div className="text-primary mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-10 w-10"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Offline AI</h3>
            <p className="text-gray-400">
              All language processing happens locally in your browser using
              WebLLM. No data sent to external servers.
            </p>
          </motion.div>

          <motion.div
            className="bg-gray-800/50 p-6 rounded-xl border border-gray-700 backdrop-blur-sm"
            whileHover={{
              scale: 1.02,
              backgroundColor: "rgba(31, 41, 55, 0.7)",
            }}
            transition={{ duration: 0.3 }}
          >
            <div className="text-accent mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-10 w-10"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Voice Interface</h3>
            <p className="text-gray-400">
              Interact naturally through voice commands with advanced speech
              recognition and natural-sounding responses.
            </p>
          </motion.div>

          <motion.div
            className="bg-gray-800/50 p-6 rounded-xl border border-gray-700 backdrop-blur-sm"
            whileHover={{
              scale: 1.02,
              backgroundColor: "rgba(31, 41, 55, 0.7)",
            }}
            transition={{ duration: 0.3 }}
          >
            <div className="text-primary mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-10 w-10"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Text Chat</h3>
            <p className="text-gray-400">
              Switch between voice and text modes. Get detailed responses to
              your questions in a conversational interface.
            </p>
          </motion.div>
        </motion.div>

        <motion.div
          className="bg-gray-800/50 p-8 rounded-xl border border-gray-700 backdrop-blur-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <h2 className="text-2xl font-semibold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            About the AI Assistant
          </h2>
          <p className="mb-4 text-gray-300 leading-relaxed">
            This application demonstrates a cross-platform AI assistant that
            runs directly in your browser. Built with WebLLM, React, and modern
            web technologies, it provides a futuristic interface for both voice
            and text interactions.
          </p>
          <p className="mb-4 text-gray-300 leading-relaxed">
            When you activate the assistant, the required AI model will
            automatically download and be stored locally in your browser's
            IndexedDB. This ensures your data stays private and allows the
            application to function offline once downloaded.
          </p>
          <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 mt-6">
            <motion.button
              className="px-6 py-3 bg-gradient-to-r from-primary to-accent rounded-full text-white font-semibold transition-all duration-300"
              whileHover={{
                scale: 1.05,
                boxShadow: "0 0 20px rgba(79, 70, 229, 0.5)",
              }}
              onClick={handleAIActivation}
            >
              Try the Assistant
            </motion.button>
            <motion.button
              className="px-6 py-3 bg-gray-700 rounded-full text-white font-semibold hover:bg-gray-600 transition-all duration-300"
              whileHover={{ scale: 1.05 }}
            >
              Learn More
            </motion.button>
          </div>
        </motion.div>
      </div>

      {/* AI Components */}
      <AIActivationButton onClick={handleAIActivation} />
      <AIOverlay isVisible={isAIOverlayVisible} onClose={handleAIClose} />
    </div>
  );
};

export default Home;
