import { BrowserRouter as Router } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import AppRoutes from "./routes/AppRoutes";
import ToastProvider from "./components/ToastProvider";
import "./App.css";
import { useEffect } from "react";

function App() {

  useEffect(() => {
    let deferredPrompt;

    const handler = (e) => {
      e.preventDefault();
      deferredPrompt = e;

      // Store globally (optional)
      window.deferredPrompt = deferredPrompt;

      console.log("PWA install ready (desktop/mobile)");
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  return (
    <AuthProvider>
      <Router>
        <ToastProvider />

        <div className="min-h-screen bg-gray-50 dark:bg-[#0f172a]">
          <AppRoutes />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;