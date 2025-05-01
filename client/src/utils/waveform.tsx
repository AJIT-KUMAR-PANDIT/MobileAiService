import { FC } from "react";
import { motion } from "framer-motion";

interface WaveformProps {
  isListening: boolean;
  isSpeaking: boolean;
}

export const Waveform: FC<WaveformProps> = ({ isListening, isSpeaking }) => {
  // Determine animation speed based on state
  const animationDuration = isListening ? 0.8 : isSpeaking ? 1.2 : 1.5;
  
  // Generate random heights for initial bars
  const getRandomHeight = () => Math.floor(Math.random() * 3) + 3; // 3-5 units
  
  return (
    <div className="wave-group flex items-center justify-center h-12">
      {[...Array(7)].map((_, index) => (
        <motion.div
          key={index}
          className="wave-bar mx-[2px] w-[6px] rounded-[3px] bg-white"
          initial={{ height: `${getRandomHeight()}px` }}
          animate={{ 
            height: isListening || isSpeaking 
              ? ["4px", "12px", "8px", "16px", "4px"] 
              : ["4px", "8px", "4px"]
          }}
          transition={{
            duration: animationDuration,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut",
            delay: index * 0.1,
          }}
        />
      ))}
    </div>
  );
};
