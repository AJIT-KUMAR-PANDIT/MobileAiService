import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Import platform detection utilities
import { initializePlatform } from './utils/platformDetection';
import logger, { LogCategory } from './utils/logger';

// Initialize platform-specific configurations
const platformType = initializePlatform();

// Log application startup with IoT information
logger.info(LogCategory.SYSTEM, 'Luna AI Assistant starting up...');
logger.info(LogCategory.IOT, 'IoT integration with nakprciotsystemslabs.local enabled');

// Special styling for console
console.log(
  '%c Luna AI Assistant %c Ready',
  'background: #2c3e50; color: white; padding: 3px 6px; border-radius: 3px 0 0 3px; font-weight: bold;',
  'background: #27ae60; color: white; padding: 3px 6px; border-radius: 0 3px 3px 0; font-weight: bold;'
);

// Initialize the app
createRoot(document.getElementById("root")!).render(<App />);
