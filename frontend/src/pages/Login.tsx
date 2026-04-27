import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiPost } from '../utils/api'; 
import { ShieldCheck, Mail, Lock, ArrowLeft, Zap } from "lucide-react";

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'login' | 'forgot' | 'reset-admin' | 'contact-admin'>('login');
  const navigate = useNavigate();

const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  try {
    const res = await apiPost("/auth/login", { email, password });
    
    // Smart extraction: check direct, check .data, and check .user
    const token = res?.token || res?.data?.token;
    const user = res?.user || res?.data?.user;

    if (token) {
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      window.location.replace("/dashboard");
    } else {
      console.error("Response received but no token found:", res);
      alert("Login failed: Server did not return a token.");
    }
  } catch (err: any) {
    alert(err.message || "Invalid credentials.");
  } finally {
    setLoading(false);
  }
};
const handleForgotPassword = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  try {
    // UPDATED URL: Added /api/users prefix
    await apiPost("/api/users/forgot-password", { email });
    alert("Reset link sent to your email!");
    setView('login');
  } catch (err: any) {
    console.log("Error details:", err.response); // Debug to see actual error
    alert(err.response?.data?.message || "Error sending reset link.");
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] dark:bg-[#0f172a] p-4 font-sans selection:bg-blue-100">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-[2.5rem] border border-white dark:border-gray-800 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.1)] p-10 space-y-8 relative z-10">
        
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-500/30 transform hover:rotate-6 transition-transform duration-300">
            <ShieldCheck className="text-white" size={32} />
          </div>
          <h2 className="text-2xl font-[800] text-gray-900 dark:text-white uppercase tracking-tighter leading-none">
            {view === 'login' ? 'Edu ' : 'Reset '}
            <span className="text-blue-600">{view === 'login' ? 'Track' : 'Access'}</span>
          </h2>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 font-black uppercase tracking-[0.2em] mt-3 opacity-80">
            {view === 'login' ? 'Unified Lead Management Access' : 'Enter email to receive link'}
          </p>
        </div>

        {view === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-400 group-focus-within:text-blue-500 transition-colors">
                <Mail size={18} />
              </div>
              <input
                required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@webgyor.com"
                className="w-full pl-11 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
              />
            </div>

            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-400 group-focus-within:text-blue-500 transition-colors">
                <Lock size={18} />
              </div>
              <input
                required type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
              />
            </div>

            <div className="flex items-center justify-between px-1">
              <label className="flex items-center space-x-2 text-xs font-bold text-gray-500 cursor-pointer select-none">
                <input type="checkbox" className="rounded border-gray-300 text-blue-600" />
                <span>Remember me</span>
              </label>
              <button type="button" onClick={() => setView('forgot')} className="text-xs font-bold text-blue-600 hover:text-blue-700 underline-offset-4 hover:underline">
                Forgot?
              </button>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-[900] uppercase tracking-wider text-sm shadow-lg shadow-blue-600/30 transition-all">
              {loading ? "Verifying..." : "Authorize Access"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleForgotPassword} className="space-y-5">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-400">
                <Mail size={18} />
              </div>
              <input
                required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter registered email"
                className="w-full pl-11 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 text-gray-900 dark:text-white outline-none"
              />
            </div>

            <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-[900] uppercase tracking-wider text-sm shadow-lg shadow-blue-600/30 transition-all">
              {loading ? "Sending..." : "Send Reset Link"}
            </button>

            <button type="button" onClick={() => setView('login')} className="w-full text-xs font-bold text-gray-500 flex items-center justify-center gap-2">
              <ArrowLeft size={14} /> Back to Login
            </button>
          </form>
        )}

        <div className="text-center pt-4 border-t border-gray-50 dark:border-gray-800">
          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">
            &copy; 2026 Webgyor Media
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;