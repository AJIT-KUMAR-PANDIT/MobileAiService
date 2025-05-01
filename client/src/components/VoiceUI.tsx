import { FC } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Waveform } from "@/utils/waveform";

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
  if (!isActive) return null;

  // Determine button state classes
  const buttonStateClasses = isListening
    ? "bg-error animate-pulse"
    : "bg-gradient-to-r from-primary to-accent";

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  return (
    <motion.div 
      className="flex-1 flex flex-col items-center justify-center p-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* AI Visualization */}
      <motion.div 
        className="relative w-48 h-48 mb-6"
        variants={itemVariants}
      >
        {/* Outer Rings */}
        <motion.div 
          className="absolute inset-0 rounded-full bg-primary bg-opacity-10"
          animate={{ 
            scale: [1, 1.1, 1],
            opacity: [0.5, 0.7, 0.5]
          }}
          transition={{ 
            repeat: Infinity, 
            duration: 3,
            ease: "easeInOut" 
          }}
        />
        
        <motion.div 
          className="absolute inset-4 rounded-full bg-primary bg-opacity-15"
          animate={{ 
            scale: [1, 1.05, 1],
            opacity: [0.6, 0.8, 0.6]
          }}
          transition={{ 
            repeat: Infinity, 
            duration: 2,
            ease: "easeInOut" 
          }}
        />
        
        {/* Core Circle */}
        <motion.div 
          className="absolute inset-8 rounded-full flex items-center justify-center overflow-hidden bg-gradient-to-br from-primary to-accent shadow-lg"
          animate={{ 
            y: [0, -8, 0] 
          }}
          transition={{ 
            repeat: Infinity, 
            duration: 4,
            ease: "easeInOut" 
          }}
        >
          {/* Waveform Visualization */}
          <AnimatePresence>
            {(isListening || isSpeaking || isInferring) && (
              <Waveform isListening={isListening} isSpeaking={isSpeaking} />
            )}
          </AnimatePresence>
        </motion.div>
        
        {/* Particle Effects */}
        <motion.div 
          className="absolute top-4 left-10 w-2 h-2 bg-blue-400 rounded-full opacity-60"
          animate={{ 
            x: [0, 5, 0],
            y: [0, -5, 0],
            opacity: [0.4, 0.6, 0.4]
          }}
          transition={{ 
            repeat: Infinity, 
            duration: 3.5,
            ease: "easeInOut" 
          }}
        />
        
        <motion.div 
          className="absolute top-12 right-8 w-3 h-3 bg-accent rounded-full opacity-40"
          animate={{ 
            x: [0, -5, 0],
            y: [0, 5, 0],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{ 
            repeat: Infinity, 
            duration: 4.2,
            ease: "easeInOut" 
          }}
        />
        
        <motion.div 
          className="absolute bottom-10 left-16 w-4 h-4 bg-green-400 rounded-full opacity-30"
          animate={{ 
            x: [0, 5, 0],
            y: [0, 5, 0],
            opacity: [0.2, 0.4, 0.2]
          }}
          transition={{ 
            repeat: Infinity, 
            duration: 5,
            ease: "easeInOut" 
          }}
        />
      </motion.div>
      
      {/* Message Display */}
      <motion.div className="text-center mb-8" variants={itemVariants}>
        <h2 className="text-white text-2xl font-tech mb-2">{message}</h2>
        <p className="text-gray-400 text-sm">{instruction}</p>
      </motion.div>
      
      {/* Microphone Button */}
      <motion.button 
        onClick={onRecordToggle}
        className={`w-16 h-16 rounded-full ${buttonStateClasses} text-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform duration-300 ease-in-out`}
        variants={itemVariants}
        whileTap={{ scale: 0.9 }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
        </svg>
      </motion.button>
    </motion.div>
  );
};
