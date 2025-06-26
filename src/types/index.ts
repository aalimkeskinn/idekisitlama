// --- START OF FILE src/types/index.ts ---

// Sabit yerleşim kuralı (Bu yapı değişmedi, gelecekte kullanılabilir)
export interface FixedPlacement {
  day: 'Pazartesi' | 'Salı' | 'Çarşamba' | 'Perşembe' | 'Cuma';
  periods: string[];
}

export interface Teacher {
  id: string;
  name: string;
  branch: string;
  branches?: string[];
  level: 'Anaokulu' | 'İlkokul' | 'Ortaokul';
  levels?: ('Anaokulu' | 'İlkokul' | 'Ortaokul')[];
  subjectIds?: string[];
  totalWeeklyHours?: number; // YENİ: Öğretmenin toplam ders yükü
  createdAt: Date;
}

export interface Subject {
  id: string;
  name: string;
  branch: string;
  level: 'Anaokulu' | 'İlkokul' | 'Ortaokul';
  levels?: ('Anaokulu' | 'İlkokul' | 'Ortaokul')[];
  weeklyHours: number;
  distributionPattern?: string; // YENİ: Dağıtım şekli (örn: "2+2+2+2+2+2")
  createdAt: Date;
}

// YENİ: Sınıfa atanan bir öğretmenin hangi dersleri verdiğini belirten arayüz
export interface TeacherAssignment {
  teacherId: string;
  subjectIds: string[];
}

// GÜNCELLENDİ: Class arayüzü yeni `assignments` yapısını içeriyor
export interface Class {
  id: string;
  name: string;
  level: 'Anaokulu' | 'İlkokul' | 'Ortaokul';
  levels?: ('Anaokulu' | 'İlkokul' | 'Ortaokul')[];
  createdAt: Date;
  classTeacherId?: string; // Sınıf öğretmeni ID'si (opsiyonel)
  assignments?: TeacherAssignment[]; // YENİ VE DAHA DOĞRU YAPI
  // Geriye dönük uyumluluk için bu alanı silebilir veya null bırakabilirsiniz.
  teacherIds?: string[]; 
}

export interface ScheduleSlot {
  subjectId?: string;
  classId?: string;
  teacherId?: string;
  isFixed?: boolean;
}

export interface Schedule {
  id: string;
  teacherId: string;
  schedule: {
    [day: string]: {
      [period: string]: ScheduleSlot | null;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

export const DAYS: ('Pazartesi' | 'Salı' | 'Çarşamba' | 'Perşembe' | 'Cuma')[] = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];
export const PERIODS: string[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
export const EDUCATION_LEVELS: readonly ['Anaokulu', 'İlkokul', 'Ortaokul'] = ['Anaokulu', 'İlkokul', 'Ortaokul'];

export interface TimePeriod {
  period: string;
  startTime: string;
  endTime: string;
  isBreak?: boolean;
}

export const PRIMARY_SCHOOL_TIME_PERIODS: TimePeriod[] = [ { period: '1', startTime: '08:50', endTime: '09:25' }, /* ... */ ];
export const MIDDLE_SCHOOL_TIME_PERIODS: TimePeriod[] = [ { period: '1', startTime: '08:40', endTime: '09:15' }, /* ... */ ];
export const KINDERGARTEN_TIME_PERIODS: TimePeriod[] = PRIMARY_SCHOOL_TIME_PERIODS;

export const getTimePeriods = (level?: 'Anaokulu' | 'İlkokul' | 'Ortaokul'): TimePeriod[] => { /* ... */ return []; };
export const getTimeForPeriod = (period: string, level?: 'Anaokulu' | 'İlkokul' | 'Ortaokul'): TimePeriod | undefined => { /* ... */ return undefined; };
export const formatTimeRange = (startTime: string, endTime: string): string => `${startTime} - ${endTime}`;

// YENİ: Dağıtım şekli yardımcı fonksiyonları
export const parseDistributionPattern = (pattern: string): number[] => {
  if (!pattern || typeof pattern !== 'string') return [];
  
  // "2+2+2+2+2+2" formatını parse et
  return pattern.split('+').map(num => parseInt(num.trim(), 10)).filter(num => !isNaN(num) && num > 0);
};

export const formatDistributionPattern = (hours: number[]): string => {
  return hours.filter(h => h > 0).join('+');
};

export const validateDistributionPattern = (pattern: string, totalHours: number): boolean => {
  const parsedHours = parseDistributionPattern(pattern);
  const sum = parsedHours.reduce((acc, curr) => acc + curr, 0);
  return sum === totalHours && parsedHours.length <= 5; // Maksimum 5 gün
};

export const generateDistributionSuggestions = (totalHours: number): string[] => {
  const suggestions: string[] = [];
  
  if (totalHours <= 0) return suggestions;
  
  // Eşit dağıtım önerileri
  if (totalHours > 0 && totalHours % 5 === 0) {
    const perDay = totalHours / 5;
    if (perDay > 0) suggestions.push(Array(5).fill(perDay).join('+'));
  }
  
  if (totalHours > 0 && totalHours % 4 === 0) {
    const perDay = totalHours / 4;
    if (perDay > 0) suggestions.push(Array(4).fill(perDay).join('+'));
  }
  
  if (totalHours > 0 && totalHours % 3 === 0) {
    const perDay = totalHours / 3;
    if (perDay > 0) suggestions.push(Array(3).fill(perDay).join('+'));
  }
  
  if (totalHours > 0 && totalHours % 2 === 0) {
    const perDay = totalHours / 2;
    if (perDay > 0) suggestions.push(Array(2).fill(perDay).join('+'));
  }
  
  // Özel durumlar
  if (totalHours === 1) {
    suggestions.push('1');
  } else if (totalHours === 2) {
    suggestions.push('2', '1+1');
  } else if (totalHours === 3) {
    suggestions.push('3', '2+1', '1+1+1');
  } else if (totalHours === 4) {
    suggestions.push('4', '2+2', '2+1+1', '1+1+1+1');
  } else if (totalHours === 5) {
    suggestions.push('5', '3+2', '2+2+1', '2+1+1+1', '1+1+1+1+1');
  } else if (totalHours === 6) {
    suggestions.push('6', '3+3', '2+2+2', '3+2+1', '2+2+1+1');
  } else if (totalHours === 8) {
    suggestions.push('4+4', '2+2+2+2', '3+3+2', '2+2+2+1+1');
  } else if (totalHours === 10) {
    suggestions.push('5+5', '2+2+2+2+2', '3+3+2+2', '4+3+2+1');
  } else if (totalHours === 12) {
    suggestions.push('6+6', '3+3+3+3', '2+2+2+2+2+2', '4+4+2+2');
  }
  
  return [...new Set(suggestions)]; // Tekrarları kaldır
};

