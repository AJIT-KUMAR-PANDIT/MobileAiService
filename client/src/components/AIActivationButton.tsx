import { FC } from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface AIActivationButtonProps {
  onClick: () => void;
}

export const AIActivationButton: FC<AIActivationButtonProps> = ({ onClick }) => {
  return (
    <motion.div
      className="fixed bottom-6 right-6 z-40"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ 
        type: "spring", 
        stiffness: 260, 
        damping: 20,
        delay: 0.5 
      }}
    >
      <Button
        onClick={onClick}
        className="w-14 h-14 rounded-full bg-gradient-to-r from-primary to-accent text-white shadow-lg hover:shadow-xl hover:scale-110 transition-transform duration-300 ease-in-out p-0 flex items-center justify-center"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-7 w-7"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-.464 5.535a1 1 0 10-1.415-1.414 3 3 0 01-4.242 0 1 1 0 00-1.415 1.414 5 5 0 007.072 0z"
            clipRule="evenodd"
          />
        </svg>
      </Button>
    </motion.div>
  );
};
