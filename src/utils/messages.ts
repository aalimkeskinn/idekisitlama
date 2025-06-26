// Standardized message templates for consistent user communication

export const MESSAGES = {
  // Success Messages
  SUCCESS: {
    SCHEDULE_SAVED: (entityName: string) => ({
      title: '✅ Program Kaydedildi!',
      message: `${entityName} için program başarıyla kaydedildi`
    }),
    SLOT_ASSIGNED: (entityName: string, day: string, period: string) => ({
      title: '✅ Ders Atandı',
      message: `${entityName} ${day} günü ${period}. derse atandı`
    }),
    SLOT_CLEARED: () => ({
      title: '🧹 Slot Temizlendi',
      message: 'Ders saati başarıyla temizlendi'
    }),
    SCHEDULE_RESET: () => ({
      title: '🔄 Program Sıfırlandı',
      message: 'Tüm değişiklikler temizlendi'
    }),
    PDF_DOWNLOADED: (entityName: string) => ({
      title: '📄 PDF İndirildi',
      message: `${entityName} programı başarıyla indirildi`
    }),
    BULK_PDF_DOWNLOADED: (count: number) => ({
      title: '📄 Toplu PDF İndirildi',
      message: `${count} program başarıyla indirildi`
    }),
    ITEM_ADDED: (itemType: string, itemName: string) => ({
      title: '✅ Eklendi',
      message: `${itemType} "${itemName}" başarıyla eklendi`
    }),
    ITEM_UPDATED: (itemType: string, itemName: string) => ({
      title: '✅ Güncellendi',
      message: `${itemType} "${itemName}" başarıyla güncellendi`
    }),
    ITEM_DELETED: (itemType: string, itemName: string) => ({
      title: '🗑️ Silindi',
      message: `${itemType} "${itemName}" başarıyla silindi`
    })
  },

  // Error Messages
  ERROR: {
    CONFLICT_DETECTED: (entity1: string, entity2: string, day: string, period: string) => ({
      title: '❌ Çakışma Tespit Edildi!',
      message: `${entity1} ile ${entity2} ${day} günü ${period}. ders saatinde çakışıyor`
    }),
    SCHEDULE_SAVE_FAILED: () => ({
      title: '❌ Kayıt Hatası',
      message: 'Program kaydedilirken bir hata oluştu'
    }),
    PDF_GENERATION_FAILED: () => ({
      title: '❌ PDF Hatası',
      message: 'PDF oluşturulurken bir hata oluştu'
    }),
    VALIDATION_FAILED: (errors: string[]) => ({
      title: '🚫 Program Kaydedilemedi!',
      message: `Aşağıdaki sorunları düzeltin:\n\n${errors.join('\n')}`
    }),
    NO_SCHEDULE_FOUND: (entityName: string) => ({
      title: '❌ Program Bulunamadı',
      message: `${entityName} için program bulunamadı`
    }),
    SELECTION_REQUIRED: (itemType: string) => ({
      title: '⚠️ Seçim Gerekli',
      message: `Lütfen bir ${itemType} seçin`
    }),
    WEEKLY_HOURS_EXCEEDED: () => ({
      title: '❌ Haftalık Saat Aşımı',
      message: 'Haftalık ders saati 30\'u geçemez'
    }),
    DAILY_HOURS_EXCEEDED: (day: string) => ({
      title: '❌ Günlük Saat Aşımı',
      message: `${day} günü için günlük ders saati 9'u geçemez`
    })
  },

  // Warning Messages
  WARNING: {
    MODE_SWITCHED: (newMode: string) => ({
      title: '🔄 Mod Değiştirildi',
      message: `${newMode} bazlı program oluşturma moduna geçildi`
    }),
    UNSAVED_CHANGES: () => ({
      title: '⚠️ Kaydedilmemiş Değişiklikler',
      message: 'Kaydedilmemiş değişiklikler var. Devam etmek istediğinizden emin misiniz?'
    }),
    POTENTIAL_CONFLICTS: (count: number) => ({
      title: '⚠️ Potansiyel Çakışmalar',
      message: `${count} potansiyel çakışma tespit edildi. Lütfen kontrol edin`
    })
  },

  // Info Messages
  INFO: {
    SCHEDULE_DISPLAYED: (entityName: string) => ({
      title: '👁️ Program Görüntülendi',
      message: `${entityName} programı yukarıda görüntüleniyor`
    }),
    PREVIEW_SHOWN: () => ({
      title: '👁️ Önizleme Gösteriliyor',
      message: 'Program önizlemesi aşağıda görüntüleniyor'
    }),
    FILTER_APPLIED: (filterType: string, filterValue: string) => ({
      title: '🔍 Filtre Uygulandı',
      message: `${filterType}: ${filterValue} filtresi uygulandı`
    }),
    LOADING_PROGRESS: (current: number, total: number) => ({
      title: '⏳ İşleniyor...',
      message: `${current}/${total} tamamlandı`
    })
  }
};

// Validation error messages
export const VALIDATION_ERRORS = {
  REQUIRED_FIELD: (fieldName: string) => `${fieldName} alanı zorunludur`,
  INVALID_EMAIL: () => 'Geçerli bir e-posta adresi girin',
  INVALID_NUMBER: (fieldName: string) => `${fieldName} geçerli bir sayı olmalıdır`,
  MIN_LENGTH: (fieldName: string, minLength: number) => 
    `${fieldName} en az ${minLength} karakter olmalıdır`,
  MAX_LENGTH: (fieldName: string, maxLength: number) => 
    `${fieldName} en fazla ${maxLength} karakter olmalıdır`,
  DUPLICATE_ENTRY: (itemName: string) => `"${itemName}" zaten mevcut`,
  INVALID_SELECTION: (fieldName: string) => `Geçerli bir ${fieldName} seçin`
};

// Conflict detection messages
export const CONFLICT_MESSAGES = {
  CLASS_TEACHER_CONFLICT: (className: string, teacherName: string, day: string, period: string) =>
    `${className} sınıfı ${day} günü ${period}. ders saatinde ${teacherName} ile çakışıyor`,
  
  TEACHER_CLASS_CONFLICT: (teacherName: string, className: string, day: string, period: string) =>
    `${teacherName} öğretmeni ${day} günü ${period}. ders saatinde ${className} sınıfı ile çakışıyor`,
  
  LEVEL_MISMATCH: (teacherLevel: string, classLevel: string) =>
    `Öğretmen seviyesi (${teacherLevel}) ile sınıf seviyesi (${classLevel}) uyuşmuyor`,
  
  SUBJECT_BRANCH_MISMATCH: (teacherBranch: string, subjectBranch: string) =>
    `Öğretmen branşı (${teacherBranch}) ile ders branşı (${subjectBranch}) uyuşmuyor`
};

// Helper function to format conflict lists
export const formatConflictList = (conflicts: string[]): string => {
  if (conflicts.length === 0) return '';
  
  return conflicts
    .map((conflict, index) => `${index + 1}. ${conflict}`)
    .join('\n');
};