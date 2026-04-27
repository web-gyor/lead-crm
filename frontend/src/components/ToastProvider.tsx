// src/components/ToastProvider.tsx
import { Toaster } from 'react-hot-toast';

const ToastProvider = () => {
  return (
    <Toaster
      position="top-right" // 🟢 Top-right is standard for CRM/Admin dashboards
      toastOptions={{
        // Global styling to match Webgyor Media branding
        style: {
          background: '#ffffff',
          color: '#18181b',
          fontSize: '11px',
          fontWeight: '700',
          borderRadius: '10px',
          border: '1px solid #e4e4e7',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
        },
        success: {
          iconTheme: { primary: '#10b981', secondary: '#fff' },
        },
        error: {
          iconTheme: { primary: '#ef4444', secondary: '#fff' },
        },
      }}
    />
  );
};

export default ToastProvider;