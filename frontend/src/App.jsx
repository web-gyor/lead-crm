import { BrowserRouter as Router } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import AppRoutes from "./routes/AppRoutes";
import ToastProvider from "./components/ToastProvider";
import "./App.css";
import { useEffect } from "react";

function App() {
useEffect(() => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(() => {
      console.log("Service Worker Active ✅");
    });
  }
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