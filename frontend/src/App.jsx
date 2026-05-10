import { BrowserRouter as Router } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import AppRoutes from "./routes/AppRoutes";
import ToastProvider from "./components/ToastProvider";
import { useState, useEffect } from "react"; // Added hooks
import "./App.css";

function App() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    // Listen for the browser's install prompt event
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault(); // Stop Chrome from showing the tiny automatic bar
      setDeferredPrompt(e); // Save the event for later
    });

    window.addEventListener("appinstalled", () => {
      setDeferredPrompt(null);
      console.log("PWA was installed");
    });
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt(); // Show the install dialog
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  };

  return (
    <AuthProvider>
      <Router>
        <ToastProvider />
        <div className="min-h-screen bg-gray-50 dark:bg-[#0f172a]">
          {/* Custom Install Banner for your demo */}
          {deferredPrompt && (
            <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-3 animate-bounce">
              <span className="text-sm font-medium">Install CRM App for better experience</span>
              <button 
                onClick={handleInstallClick}
                className="bg-white text-blue-600 px-3 py-1 rounded-full text-xs font-bold uppercase"
              >
                Install
              </button>
            </div>
          )}
          
          <AppRoutes />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;