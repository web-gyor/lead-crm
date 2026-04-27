import { BrowserRouter as Router } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import AppRoutes from "./routes/AppRoutes";
import ToastProvider from "./components/ToastProvider";
import "./App.css";

function App() {
  // The registration is now handled in index.jsx, 
  // so this stays clean.
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