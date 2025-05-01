import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import { useEffect, useState } from "react";
import { AIActivationButton } from "@/components/AIActivationButton";
import { AIOverlay } from "@/components/AIOverlay";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Check system preference for dark mode
  useEffect(() => {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
    
    // Listen for changes in color scheme preference
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setIsDarkMode(e.matches);
      if (e.matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const toggleOverlay = () => {
    setOverlayVisible(!overlayVisible);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AIOverlay 
          isVisible={overlayVisible} 
          onClose={() => setOverlayVisible(false)} 
        />
        <AIActivationButton onClick={toggleOverlay} />
        <div className={isDarkMode ? "dark" : ""}>
          <Toaster />
          <Router />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
