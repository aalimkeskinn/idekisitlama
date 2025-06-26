import { useState, useCallback } from 'react';

interface ConfirmationOptions {
  title: string;
  message: string;
  type?: 'warning' | 'danger' | 'success' | 'info';
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'danger' | 'secondary';
}

interface ConfirmationState extends ConfirmationOptions {
  isOpen: boolean;
  onConfirm: () => void;
}

export const useConfirmation = () => {
  const [confirmation, setConfirmation] = useState<ConfirmationState>({
    isOpen: false,
    title: '',
    message: '',
    type: 'warning',
    confirmText: 'Onayla',
    cancelText: 'İptal',
    confirmVariant: 'primary',
    onConfirm: () => {}
  });

  const showConfirmation = useCallback((
    options: ConfirmationOptions,
    onConfirm: () => void
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmation({
        ...options,
        isOpen: true,
        onConfirm: () => {
          onConfirm();
          resolve(true);
        }
      });
    });
  }, []);

  const hideConfirmation = useCallback(() => {
    setConfirmation(prev => ({ ...prev, isOpen: false }));
  }, []);

  // Convenience methods for common confirmation types
  const confirmDelete = useCallback((
    itemName: string,
    onConfirm: () => void
  ) => {
    return showConfirmation({
      title: '🗑️ Silme Onayı',
      message: `"${itemName}" öğesini silmek istediğinizden emin misiniz?\n\nBu işlem geri alınamaz.`,
      type: 'danger',
      confirmText: 'Sil',
      cancelText: 'İptal',
      confirmVariant: 'danger'
    }, onConfirm);
  }, [showConfirmation]);

  const confirmReset = useCallback((
    onConfirm: () => void
  ) => {
    return showConfirmation({
      title: '🔄 Sıfırlama Onayı',
      message: 'Tüm değişiklikleri sıfırlamak istediğinizden emin misiniz?\n\nKaydedilmemiş tüm değişiklikler kaybolacak.',
      type: 'warning',
      confirmText: 'Sıfırla',
      cancelText: 'İptal',
      confirmVariant: 'danger'
    }, onConfirm);
  }, [showConfirmation]);

  const confirmUnsavedChanges = useCallback((
    onConfirm: () => void
  ) => {
    return showConfirmation({
      title: '⚠️ Kaydedilmemiş Değişiklikler',
      message: 'Kaydedilmemiş değişiklikler var. Devam etmek istediğinizden emin misiniz?\n\nTüm değişiklikler kaybolacak.',
      type: 'warning',
      confirmText: 'Devam Et',
      cancelText: 'İptal',
      confirmVariant: 'danger'
    }, onConfirm);
  }, [showConfirmation]);

  const confirmConflictOverride = useCallback((
    conflicts: string[],
    onConfirm: () => void
  ) => {
    return showConfirmation({
      title: '⚠️ Çakışma Uyarısı',
      message: `Aşağıdaki çakışmalar tespit edildi:\n\n${conflicts.join('\n')}\n\nYine de kaydetmek istediğinizden emin misiniz?`,
      type: 'warning',
      confirmText: 'Yine de Kaydet',
      cancelText: 'İptal',
      confirmVariant: 'danger'
    }, onConfirm);
  }, [showConfirmation]);

  return {
    confirmation,
    showConfirmation,
    hideConfirmation,
    confirmDelete,
    confirmReset,
    confirmUnsavedChanges,
    confirmConflictOverride
  };
};