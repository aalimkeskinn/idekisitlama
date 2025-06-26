import { useState, useCallback } from 'react';
import { ToastProps } from '../components/UI/Toast';

interface ToastOptions {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

export const useToast = () => {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const addToast = useCallback((options: ToastOptions) => {
    const id = Math.random().toString(36).substr(2, 9);
    const toast: ToastProps = {
      id,
      ...options,
      onClose: removeToast
    };

    console.log('🍞 Toast ekleniyor:', toast);
    
    // Error toast'ları için özel davranış
    if (options.type === 'error') {
      // Mevcut error toast'ları temizle
      setToasts(prev => prev.filter(t => t.type !== 'error'));
      
      // Hemen error toast'u ekle
      setToasts(prev => {
        const newToasts = [toast, ...prev.slice(0, 2)]; // Max 3 toast
        console.log('🍞 Error toast eklendi, güncel liste:', newToasts);
        return newToasts;
      });
    } else {
      setToasts(prev => {
        const newToasts = [toast, ...prev.slice(0, 3)]; // Max 4 toast
        console.log('🍞 Güncel toast listesi:', newToasts);
        return newToasts;
      });
    }
    
    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    console.log('🗑️ Toast siliniyor:', id);
    setToasts(prev => {
      const newToasts = prev.filter(toast => toast.id !== id);
      console.log('🍞 Toast silindikten sonra liste:', newToasts);
      return newToasts;
    });
  }, []);

  const success = useCallback((title: string, message?: string) => {
    console.log('✅ Success toast çağrıldı:', { title, message });
    return addToast({ type: 'success', title, message, duration: 4000 });
  }, [addToast]);

  const error = useCallback((title: string, message?: string) => {
    console.log('❌ Error toast çağrıldı:', { title, message });
    // Error toast'ları daha uzun süre kalır ve daha belirgin
    return addToast({ type: 'error', title, message, duration: 12000 });
  }, [addToast]);

  const warning = useCallback((title: string, message?: string) => {
    console.log('⚠️ Warning toast çağrıldı:', { title, message });
    return addToast({ type: 'warning', title, message, duration: 6000 });
  }, [addToast]);

  const info = useCallback((title: string, message?: string) => {
    console.log('ℹ️ Info toast çağrıldı:', { title, message });
    return addToast({ type: 'info', title, message, duration: 5000 });
  }, [addToast]);

  console.log('🍞 useToast hook - mevcut toast sayısı:', toasts.length);

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    warning,
    info
  };
};