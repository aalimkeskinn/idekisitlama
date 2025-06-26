import React from 'react';
import Toast, { ToastProps } from './Toast';

interface ToastContainerProps {
  toasts: ToastProps[];
  onClose: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onClose }) => {
  if (toasts.length === 0) {
    return null;
  }
  
  return (
    <div 
      className="space-y-4 w-full"
      style={{
        pointerEvents: 'auto',
        position: 'relative',
        zIndex: 2147483647
      }}
    >
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          style={{
            transform: `translateY(${index * 10}px) scale(${1 - index * 0.02})`,
            zIndex: 2147483647 - index,
            position: 'relative',
            opacity: 1 - index * 0.1
          }}
        >
          <Toast {...toast} onClose={onClose} />
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;