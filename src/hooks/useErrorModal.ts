import { useState, useCallback } from 'react';

interface ErrorModalState {
  isOpen: boolean;
  title: string;
  message: string;
}

export const useErrorModal = () => {
  const [errorModal, setErrorModal] = useState<ErrorModalState>({
    isOpen: false,
    title: '',
    message: ''
  });

  const showError = useCallback((title: string, message: string) => {
    console.log('🚨 ERROR MODAL AÇILIYOR:', { title, message });
    setErrorModal({
      isOpen: true,
      title,
      message
    });
  }, []);

  const hideError = useCallback(() => {
    console.log('✅ ERROR MODAL KAPATILIYOR');
    setErrorModal(prev => ({ ...prev, isOpen: false }));
  }, []);

  return {
    errorModal,
    showError,
    hideError
  };
};