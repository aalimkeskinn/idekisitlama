import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md' }) => {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'sm:max-w-md',
    md: 'sm:max-w-lg',
    lg: 'sm:max-w-2xl',
    xl: 'sm:max-w-4xl'
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end sm:items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
        
        {/* Center modal */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        
        {/* CRITICAL: Mobile-optimized modal panel */}
        <div className={`
          inline-block align-bottom bg-white text-left overflow-hidden shadow-2xl transform transition-all 
          sm:my-8 sm:align-middle sm:w-full ${sizeClasses[size]}
          
          /* MOBILE OPTIMIZATIONS */
          w-full max-w-none mx-0 mb-0
          sm:mx-4 sm:mb-4 sm:max-w-lg
          
          /* MOBILE: Full width with rounded top corners */
          rounded-t-2xl sm:rounded-xl
          
          /* MOBILE: Better height management */
          max-h-[95vh] sm:max-h-[90vh]
          
          /* MOBILE: Ensure proper positioning */
          modal-mobile
        `}>
          {/* Header - Mobile optimized */}
          <div className="bg-white px-4 sm:px-6 pt-5 sm:pt-6 pb-4 border-b border-gray-200 sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 pr-4 truncate">
                {title}
              </h3>
              <button
                onClick={onClose}
                className="rounded-lg p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 btn-touch flex-shrink-0"
                aria-label="Modalı kapat"
              >
                <X size={24} />
              </button>
            </div>
          </div>
          
          {/* Content - Mobile optimized with proper scrolling */}
          <div className="bg-white px-4 sm:px-6 py-4 sm:py-6 overflow-y-auto flex-1">
            <div className="form-mobile">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;