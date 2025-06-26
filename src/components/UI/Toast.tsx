import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

export interface ToastProps {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  onClose: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({
  id,
  type,
  title,
  message,
  duration = 5000,
  onClose
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    // Immediate visibility for error toasts
    const delay = type === 'error' ? 50 : 100;
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);
    return () => clearTimeout(timer);
  }, [type]);

  useEffect(() => {
    if (duration > 0) {
      // Progress bar animation
      const progressTimer = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev - (100 / (duration / 100));
          return newProgress <= 0 ? 0 : newProgress;
        });
      }, 100);

      // Auto close timer
      const closeTimer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => {
        clearInterval(progressTimer);
        clearTimeout(closeTimer);
      };
    }
  }, [duration]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      onClose(id);
    }, 300);
  };

  const icons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertCircle,
    info: Info
  };

  const colors = {
    success: 'bg-ide-secondary-50 border-ide-secondary-500 text-ide-secondary-800',
    error: 'bg-ide-accent-50 border-ide-accent-500 text-ide-accent-800',
    warning: 'bg-ide-orange-50 border-ide-orange-500 text-ide-orange-800',
    info: 'bg-ide-primary-50 border-ide-primary-500 text-ide-primary-800'
  };

  const iconColors = {
    success: 'text-ide-secondary-600',
    error: 'text-ide-accent-600',
    warning: 'text-ide-orange-600',
    info: 'text-ide-primary-600'
  };

  const progressColors = {
    success: 'bg-ide-secondary-500',
    error: 'bg-ide-accent-600',
    warning: 'bg-ide-orange-500',
    info: 'bg-ide-primary-500'
  };

  const Icon = icons[type];

  return (
    <div
      className={`
        w-full bg-white pointer-events-auto transform transition-all duration-500 ease-out relative overflow-hidden
        ${colors[type]}
        ${isVisible && !isLeaving ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-full opacity-0 scale-95'}
        ${type === 'error' ? 'ring-8 ring-ide-accent-400 ring-opacity-75 shadow-ide-2xl' : 'shadow-ide-xl'}
        hover:shadow-ide-2xl hover:scale-105 rounded-xl border-l-8
      `}
      style={{
        minHeight: type === 'error' ? '120px' : '90px',
        maxWidth: '400px',
        zIndex: 2147483647,
        position: 'relative',
        // Special styling for error toasts
        ...(type === 'error' && {
          animation: 'shake 0.6s ease-in-out, glow 2s ease-in-out infinite',
          boxShadow: '0 25px 50px -12px rgba(220, 38, 38, 0.5), 0 0 0 4px rgba(220, 38, 38, 0.2), 0 0 30px rgba(220, 38, 38, 0.4)'
        })
      }}
    >
      {/* Error toast special background */}
      {type === 'error' && (
        <div className="absolute inset-0 bg-gradient-to-r from-ide-accent-100 via-ide-accent-50 to-ide-accent-100 animate-pulse opacity-60"></div>
      )}
      
      <div className="p-6 relative z-10">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <Icon className={`h-8 w-8 ${iconColors[type]} ${type === 'error' ? 'animate-bounce' : ''}`} />
          </div>
          <div className="ml-4 w-0 flex-1">
            <p className={`text-lg font-bold leading-tight ${
              type === 'error' ? 'text-ide-accent-900' : 'text-ide-gray-900'
            }`}>
              {title}
            </p>
            {message && (
              <p className={`mt-3 text-sm leading-relaxed whitespace-pre-line ${
                type === 'error' ? 'text-ide-accent-800 font-semibold' : 'text-ide-gray-700'
              }`}>
                {message}
              </p>
            )}
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              onClick={handleClose}
              className={`rounded-full p-2 inline-flex transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                type === 'error' 
                  ? 'text-ide-accent-600 hover:text-ide-accent-800 hover:bg-ide-accent-200 focus:ring-ide-accent-500' 
                  : 'text-ide-gray-400 hover:text-ide-gray-600 hover:bg-ide-gray-100 focus:ring-ide-primary-500'
              }`}
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Progress bar */}
      {duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-3 bg-ide-gray-200 overflow-hidden">
          <div 
            className={`h-full transition-all ease-linear ${progressColors[type]}`}
            style={{
              width: `${progress}%`,
              transition: 'width 100ms linear'
            }}
          />
        </div>
      )}

      {/* Error toast special effects */}
      {type === 'error' && (
        <div className="absolute -inset-2 bg-ide-accent-500 rounded-xl blur-sm opacity-20 animate-pulse -z-10"></div>
      )}
    </div>
  );
};

export default Toast;