import React, { useState, useMemo } from 'react';
import { apiPost } from '../utils/api'; 
import { Mail, Lock, ArrowLeft, Zap, Loader2 } from "lucide-react";

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'login' | 'forgot'>('login');

  // 🚀 FIXED: Dynamic Brand Logo URL Port Resolver
  const brandLogoSrc = useMemo(() => {
    // Known WebGyor media directory upload location string hash
    const logoPath = "/uploads/b8381a77e5ced538ac38d6dbddaf6528"; 
    
    // Automatically clips trailing '/api' from your environment configurations
    const BACKEND = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000').replace(/\/api\/?$/, '');
    return `${BACKEND}${logoPath}`;
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiPost("/api/auth/login", { email, password });
      
      const token = res?.token || res?.data?.token;
      const user = res?.user || res?.data?.user;

      if (token) {
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
        window.location.replace("/dashboard");
      } else {
        console.error("Response received but no token found:", res);
        alert("Login failed: Server did not return an authentication token.");
      }
    } catch (err: any) {
      alert(err.message || "Invalid corporate credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiPost("/api/users/forgot-password", { email });
      alert("Reset link dispatched to your corporate inbox.");
      setView('login');
    } catch (err: any) {
      alert(err.response?.data?.message || "Error processing token reset demand.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950 p-4 font-sans select-none selection:bg-blue-50">
      
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.02)] p-8 sm:p-10 space-y-8 relative">
        
        {/* 🚀 UPGRADED: Brand Logo Header Container Element */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 bg-white dark:bg-slate-950 rounded-xl flex items-center justify-center mx-auto shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden p-1.5 shrink-0">
            {brandLogoSrc ? (
              <img 
                src={brandLogoSrc} 
                alt="WebGyor Media Agency Logo" 
                crossOrigin="anonymous"
                className="w-full h-full object-contain"
                onError={(e) => {
                  // Fallback: hides image element instantly and un-hides default Zap markup block
                  e.currentTarget.style.display = 'none';
                  const fallbackNode = e.currentTarget.parentElement?.querySelector('.login-fallback-icon');
                  if (fallbackNode) fallbackNode.classList.remove('hidden');
                }}
              />
            ) : null}
            <div className="login-fallback-icon hidden w-full h-full bg-blue-600 rounded-lg flex items-center justify-center text-white">
              <Zap size={16} fill="currentColor" />
            </div>
          </div>

          <div>
            <h2 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-tight">
              {view === 'login' ? 'CRM Alpha' : 'Reset Clearance'}
            </h2>
            <p className="text-[9px] font-black tracking-[0.25em] text-blue-600 uppercase mt-0.5">
              {view === 'login' ? 'Enterprise Security Gateway' : 'Identity Verification'}
            </p>
          </div>
        </div>

        {view === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Corporate Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 pointer-events-none">
                  <Mail size={14} />
                </div>
                <input
                  required 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@webgyor.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-800 bg-transparent text-xs text-gray-900 dark:text-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Security Password</label>
                <button 
                  type="button" 
                  onClick={() => setView('forgot')} 
                  className="text-[10px] font-bold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
                >
                  Forgot?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 pointer-events-none">
                  <Lock size={14} />
                </div>
                <input
                  required 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-800 bg-transparent text-xs text-gray-900 dark:text-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all"
                />
              </div>
            </div>

            <div className="pt-2">
              <button 
                type="submit" 
                disabled={loading} 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-black uppercase tracking-wider text-[10px] transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-sm shadow-blue-600/10"
              >
                {loading ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    <span>Verifying Identity...</span>
                  </>
                ) : (
                  <span>Authorize Access</span>
                )}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Account Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 pointer-events-none">
                  <Mail size={14} />
                </div>
                <input
                  required 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter registered email"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-800 bg-transparent text-xs text-gray-900 dark:text-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button 
                type="submit" 
                disabled={loading} 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-black uppercase tracking-wider text-[10px] transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-sm shadow-blue-600/10"
              >
                {loading ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <span>Send Recovery Token</span>
                )}
              </button>

              <button 
                type="button" 
                onClick={() => setView('login')} 
                className="w-full text-[9px] font-black text-gray-400 hover:text-gray-600 uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors pt-2 cursor-pointer"
              >
                <ArrowLeft size={10} strokeWidth={2.5} /> Return to Login
              </button>
            </div>
          </form>
        )}

        {/* Corporate Branding Footer Layout */}
        <div className="text-center pt-4 border-t border-gray-50 dark:border-slate-800/60">
          <p className="text-[8px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.2em]">
            &copy; 2026 Webgyor 
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;