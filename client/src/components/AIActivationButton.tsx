import { FC, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

interface AIActivationButtonProps {
  onClick: () => void;
}

export const AIActivationButton: FC<AIActivationButtonProps> = ({ onClick }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isReady, setIsReady] = useState(false);
  
  // Add animation sequence when component loads
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 800);
    
    return () => clearTimeout(timer);
  }, []);
  
  const handleClick = () => {
    // Add haptic-like animation
    const button = document.getElementById('ai-button');
    if (button) {
      button.classList.add('scale-90');
      setTimeout(() => button.classList.remove('scale-90'), 150);
    }
    
    // Load and show console message for debugging
    console.log("Activating AI assistant...");
    
    // Call the provided onClick handler
    onClick();
  };
  
  return (
    <motion.div
      className="fixed bottom-6 right-6 z-40"
      initial={{ scale: 0, rotate: -10 }}
      animate={{ 
        scale: 1, 
        rotate: 0,
      }}
      transition={{ 
        type: "spring", 
        stiffness: 260, 
        damping: 20,
        delay: 0.5 
      }}
    >
      <AnimatePresence>
        {isHovered && (
          <motion.div 
            className="absolute -top-10 right-0 bg-black/80 text-white px-3 py-1 rounded-full text-sm whitespace-nowrap"
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            transition={{ duration: 0.2 }}
          >
            Activate AI Assistant
          </motion.div>
        )}
      </AnimatePresence>
      
      <Button
        id="ai-button"
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="w-14 h-14 rounded-full bg-gradient-to-r from-primary to-accent text-white shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 ease-in-out p-0 flex items-center justify-center relative overflow-hidden"
      >
        <motion.div 
          className="absolute inset-0 bg-gradient-to-r from-accent to-primary opacity-0"
          animate={{ 
            opacity: isHovered ? 0.5 : 0,
          }}
          transition={{ duration: 0.3 }}
        />
        
        {isReady && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ scale: 1.5, opacity: 0 }}
            animate={{ 
              scale: [1.5, 1, 1.2, 1],
              opacity: 1
            }}
            transition={{ 
              duration: 0.6,
              times: [0, 0.5, 0.8, 1] 
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-7 w-7"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                clipRule="evenodd"
              />
            </svg>
          </motion.div>
        )}
        
        {!isReady && (
          <motion.div 
            className="w-6 h-6"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </motion.div>
        )}
      </Button>
      
      <motion.div
        className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-500 border-2 border-darkBg"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 1, duration: 0.3 }}
      />
    </motion.div>
  );
};
