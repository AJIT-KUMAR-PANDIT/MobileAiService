import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import { useEffect, useState } from "react";
import { syncCacheToIndexDbOnStartup } from "./utils/cacheToIndexDb";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";
import { Capacitor } from "@capacitor/core";
import "./index.css";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Run the cache to IndexedDB sync when the app starts
    syncCacheToIndexDbOnStartup();

    // Initialize Capacitor for native platforms
    const initCapacitor = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          await SplashScreen.hide();
          await StatusBar.setStyle({ style: Style.Dark });
          if (Capacitor.getPlatform() === "android") {
            StatusBar.setBackgroundColor({ color: "#000000" });
          }
        } catch (error) {
          console.error("Error initializing Capacitor:", error);
        }
      }
    };

    initCapacitor();

    // Check system preference for dark mode
    if (
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    ) {
      setIsDarkMode(true);
      document.documentElement.classList.add("dark");
    }

    // Listen for changes in color scheme preference
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      setIsDarkMode(e.matches);
      if (e.matches) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className={isDarkMode ? "dark" : ""}>
          <Toaster />
          <Router />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;



