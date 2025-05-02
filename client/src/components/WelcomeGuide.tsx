import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface WelcomeGuideProps {
  isVisible: boolean;
  onClose: () => void;
}

export const WelcomeGuide: React.FC<WelcomeGuideProps> = ({ isVisible, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: 'Welcome to Luna AI Assistant',
      content: (
        <>
          <p className="mb-4">
            Luna is your intelligent AI assistant with offline capabilities and smart home control.
          </p>
          <p className="mb-2">How to interact with Luna:</p>
          <ul className="list-disc pl-5 mb-4 space-y-1">
            <li>Use voice by saying "Luna" or tapping the microphone</li>
            <li>Type in the chat interface for text-based interaction</li>
            <li>Switch between different modes for various capabilities</li>
          </ul>
        </>
      )
    },
    {
      title: 'Device Control Mode',
      content: (
        <>
          <p className="mb-4">
            Control your smart home devices with simple voice commands.
          </p>
          <p className="mb-2">Example commands:</p>
          <ul className="list-disc pl-5 mb-4 space-y-1 text-sm">
            <li>"Turn on the lights in the living room"</li>
            <li>"Set the bedroom temperature to 72 degrees"</li>
            <li>"Increase the volume of the speaker in the kitchen"</li>
            <li>"Turn off all the lights in the house"</li>
          </ul>
          <p className="text-xs text-blue-400 mb-2">Device control is enabled by default</p>
        </>
      )
    },
    {
      title: 'Normal Chat Mode',
      content: (
        <>
          <p className="mb-4">
            Disable device control and just have a normal conversation with Luna.
          </p>
          <p className="mb-2">How to enable Normal Chat Mode:</p>
          <ul className="list-disc pl-5 mb-4 space-y-1 text-sm">
            <li>"Let's just chat" or "Normal talk mode"</li>
            <li>"Don't control any devices"</li>
            <li>"Disable device control"</li>
            <li>Or click the chat icon in the top menu</li>
          </ul>
          <p className="text-xs text-yellow-400 mb-2">Luna won't try to control any devices in this mode</p>
        </>
      )
    },
    {
      title: 'Online Search',
      content: (
        <>
          <p className="mb-4">
            When connected to the internet, Luna can search for information online.
          </p>
          <p className="mb-2">How to search online:</p>
          <ul className="list-disc pl-5 mb-4 space-y-1 text-sm">
            <li>"Search online for the latest news"</li>
            <li>"Look up the weather in New York"</li>
            <li>"Find information about renewable energy"</li>
            <li>"Search the web for chocolate chip cookie recipes"</li>
          </ul>
          <p className="text-xs text-accent mb-2">
            Luna will search using Perplexity API when online
          </p>
        </>
      )
    },
    {
      title: 'Offline Capabilities',
      content: (
        <>
          <p className="mb-4">
            Luna works offline with downloaded models stored on your device.
          </p>
          <p className="mb-2">Offline features:</p>
          <ul className="list-disc pl-5 mb-4 space-y-1 text-sm">
            <li>All conversations work without internet</li>
            <li>Smart home commands are queued when offline</li>
            <li>Downloaded AI models are saved locally</li>
            <li>Your conversation history is stored on your device</li>
          </ul>
          <p className="text-xs text-green-400 mb-2">
            Models are downloaded once and stored for future use
          </p>
        </>
      )
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-black bg-opacity-60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          
          <motion.div
            className="relative bg-darkBg w-full max-w-md rounded-xl overflow-hidden shadow-2xl"
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            {/* Progress bar */}
            <div className="w-full h-1.5 bg-gray-700">
              <div 
                className="h-full bg-accent"
                style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              />
            </div>
            
            {/* Content */}
            <div className="p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                <span 
                  className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-sm mr-3"
                >
                  {currentStep + 1}
                </span>
                {steps[currentStep].title}
              </h2>
              
              <div className="text-gray-200 mb-6">
                {steps[currentStep].content}
              </div>
              
              {/* Navigation buttons */}
              <div className="flex justify-between">
                <button
                  onClick={handlePrev}
                  className={`px-4 py-2 rounded-md ${
                    currentStep === 0 
                      ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                      : 'bg-gray-600 text-white hover:bg-gray-500'
                  }`}
                  disabled={currentStep === 0}
                >
                  Previous
                </button>
                
                <button
                  onClick={handleNext}
                  className="px-4 py-2 rounded-md bg-accent text-white hover:bg-accent/80"
                >
                  {currentStep === steps.length - 1 ? 'Got It!' : 'Next'}
                </button>
              </div>
            </div>
            
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-gray-300 hover:bg-gray-600"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WelcomeGuide;