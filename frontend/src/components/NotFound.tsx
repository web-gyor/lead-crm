import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft } from 'lucide-react';

const NotFound = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      {/* Icon with tech-inspired glow */}
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-rose-500/20 blur-2xl rounded-full" />
        <AlertCircle size={64} className="text-rose-500 relative z-10" />
      </div>

      {/* Text Content */}
      <h1 className="text-5xl font-black text-gray-900 dark:text-white tracking-tighter">
        404
      </h1>
      
      <p className="mt-2 text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.3em]">
        Access Denied or Page Not Found
      </p>

      <p className="mt-4 text-xs text-gray-500 dark:text-gray-400 max-w-xs leading-relaxed">
        The requested resource might have been moved, deleted, or you may not have the required permissions to view it.
      </p>

      {/* Action Button */}
      <Link 
        to="/dashboard" 
        className="mt-8 flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-95"
      >
        <ArrowLeft size={14} />
        Return to Dashboard
      </Link>

      {/* System Note */}
      <div className="mt-12 pt-6 border-t border-gray-100 dark:border-gray-800 w-full max-w-[200px]">
        <p className="text-[9px] font-medium text-gray-400 dark:text-gray-600 uppercase tracking-widest">
          CRM Alpha • System Log
        </p>
      </div>
    </div>
  );
};

export default NotFound;