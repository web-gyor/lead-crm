import { BrowserRouter as Router } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import AppRoutes from "./routes/AppRoutes";
import ToastProvider from "./components/ToastProvider";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import "./App.css";
function App() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    // --- 1. PWA & Install Logic ---
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });

    window.addEventListener("appinstalled", () => {
      setDeferredPrompt(null);
      console.log("PWA was installed");
    });

    // --- 2. Global Network Monitoring Logic ---
    const handleOffline = () => {
      toast.error(
        "We couldn’t connect to the server. Please check your network connection and try again.",
        {
          id: "network-error",
          duration: Infinity,
          position: "top-right",
        }
      );
    };

    const handleOnline = () => {
      toast.dismiss("network-error");
      toast.success("Connection restored!", { 
        position: "top-right",
        duration: 3000 
      });
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  };

  return (
    <AuthProvider>
      <BranchProvider>
      <Router>
        {/* ✅ DELETED DUPLICATE TOASTER MAPPING: 
            ToastProvider now handles the global configuration cleanly without layout conflicts */}
        <ToastProvider />
        
        <div className="min-h-screen bg-gray-50 dark:bg-[#0f172a]">
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
  </BranchProvider>
    </AuthProvider>
  );
}

export default App;