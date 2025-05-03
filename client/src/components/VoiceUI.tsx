import { FC } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface VoiceUIProps {
  isActive: boolean;
  message: string;
  instruction: string;
  isListening: boolean;
  isSpeaking: boolean;
  isInferring: boolean;
  onRecordToggle: () => void;
}

export const VoiceUI: FC<VoiceUIProps> = ({
  isActive,
  message,
  instruction,
  isListening,
  isSpeaking,
  isInferring,
  onRecordToggle,
}) => {
  const buttonStateClasses = isListening
    ? "bg-red-500 animate-pulse"
    : isSpeaking
    ? "bg-blue-500"
    : "bg-gradient-to-r from-purple-500 to-blue-500";

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
        <motion.div
          className={`absolute inset-0 rounded-full ${
            isListening || isSpeaking ? "bg-opacity-20" : "bg-opacity-10"
          } bg-white`}
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.5, 0.7, 0.5],
          }}
          transition={{
            repeat: Infinity,
            duration: 3,
          }}
        />

        <motion.div
          className="absolute inset-8 rounded-full flex items-center justify-center"
          style={{
            background: "linear-gradient(45deg, #6366f1, #8b5cf6)",
          }}
        >
          {(isListening || isSpeaking) && (
            <motion.div
              className="w-full h-full flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="flex space-x-1">
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-1 bg-white"
                    animate={{
                      height: [10, 30, 10],
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 1,
                      delay: i * 0.1,
                    }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>
      </motion.div>

      <motion.div
        className="text-center mb-8"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <h2 className="text-white text-2xl font-bold mb-2">{message}</h2>
        <p className="text-gray-300 text-sm">{instruction}</p>
      </motion.div>

      <motion.button
        onClick={onRecordToggle}
        className={`w-16 h-16 rounded-full ${buttonStateClasses} text-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform duration-300`}
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
