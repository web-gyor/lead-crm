import { Toaster, resolveValue, toast as hotToast } from 'react-hot-toast';

const ToastProvider = () => {
  return (
    <Toaster 
      position="top-right" 
      reverseOrder={false}
      // ✅ FIX: Shifts the notifications safely below your header and forces them above all containers
      containerStyle={{
        top: 80,
        zIndex: 99999,
        width: '100%',
        maxWidth: '540px',
      }}
    >
      {(t) => {
        const isError = t.type === "error";
        return (
          <div
            style={{
              ...t.style,
              opacity: t.visible ? 1 : 0,
              transform: t.visible ? "translateY(0)" : "translateY(-10px)",
              transition: "all 0.2s ease-in-out",
              
              // 🎨 Premium Webgyor Media Branding Aesthetic
              background: '#ffffff',
              color: '#18181b',
              fontSize: '11px',
              fontWeight: '700',
              borderRadius: '10px',
              border: '1px solid #e4e4e7',
              boxShadow: '0 10px 25px -5px rgba(24, 24, 27, 0.08)',
              
              // 🟢 Elegant left status strip indicators
              borderLeft: isError ? "4px solid #ef4444" : "4px solid #10b981",
              
              // 🚀 Horizontal bar layout allocation 
              width: "calc(100vw - 32px)", 
              maxWidth: "500px", 
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              padding: "14px 18px",
            }}
          >
            <span className="flex-1 text-left leading-normal whitespace-normal break-words">
              {resolveValue(t.message, t)}
            </span>
            
            {t.duration !== Infinity && (
              <button 
                onClick={() => hotToast.dismiss(t.id)} // ✅ Simplified import tracking hook execution
                className="text-[9px] text-zinc-400 hover:text-zinc-900 uppercase tracking-wider font-black shrink-0 ml-2 transition-colors cursor-pointer outline-none border-none bg-transparent"
              >
                Dismiss
              </button>
            )}
          </div>
        );
      }}
    </Toaster>
  );
};

export default ToastProvider;