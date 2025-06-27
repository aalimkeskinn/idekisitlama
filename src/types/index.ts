// project/src/types/index.ts

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
  totalWeeklyHours?: number;
  createdAt: Date;
}

export interface Subject {
  id:string;
  name: string;
  branch: string;
  level: 'Anaokulu' | 'İlkokul' | 'Ortaokul';
  levels?: ('Anaokulu' | 'İlkokul' | 'Ortaokul')[];
  weeklyHours: number;
  distributionPattern?: string;
  createdAt: Date;
}

export interface TeacherAssignment {
  teacherId: string;
  subjectIds: string[];
}

export interface Class {
  id: string;
  name: string;
  level: 'Anaokulu' | 'İlkokul' | 'Ortaokul';
  levels?: ('Anaokulu' | 'İlkokul' | 'Ortaokul')[];
  createdAt: Date;
  classTeacherId?: string;
  assignments?: TeacherAssignment[];
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

// --- Zaman Dilimi Tanımları ve Fonksiyonları ---

export interface TimePeriod {
  period: string;
  startTime: string;
  endTime: string;
  isBreak?: boolean;
}

export const PRIMARY_SCHOOL_TIME_PERIODS: TimePeriod[] = [
    { period: 'prep', startTime: '08:30', endTime: '08:50', isBreak: true },
    { period: '1', startTime: '08:50', endTime: '09:25' },
    { period: '2', startTime: '09:35', endTime: '10:10' },
    { period: '3', startTime: '10:20', endTime: '10:55' },
    { period: '4', startTime: '11:05', endTime: '11:40' },
    { period: '5', startTime: '11:50', endTime: '12:25', isBreak: true }, // Yemek
    { period: '6', startTime: '12:25', endTime: '13:00' },
    { period: '7', startTime: '13:10', endTime: '13:45' },
    { period: '8', startTime: '13:55', endTime: '14:30' },
    { period: 'afternoon-breakfast', startTime: '14:35', endTime: '14:45', isBreak: true },
    { period: '9', startTime: '14:45', endTime: '15:20' },
    { period: '10', startTime: '15:30', endTime: '16:05' }
];
export const MIDDLE_SCHOOL_TIME_PERIODS: TimePeriod[] = [
    { period: 'prep', startTime: '08:30', endTime: '08:40', isBreak: true },
    { period: '1', startTime: '08:40', endTime: '09:15' },
    { period: 'break-after-1', startTime: '09:15', endTime: '09:35', isBreak: true },
    { period: '2', startTime: '09:35', endTime: '10:10' },
    { period: '3', startTime: '10:20', endTime: '10:55' },
    { period: '4', startTime: '11:05', endTime: '11:40' },
    { period: '5', startTime: '11:50', endTime: '12:25' },
    { period: '6', startTime: '12:30', endTime: '13:05', isBreak: true }, // Yemek
    { period: '7', startTime: '13:05', endTime: '13:40' },
    { period: '8', startTime: '13:50', endTime: '14:25' },
    { period: 'afternoon-breakfast', startTime: '14:35', endTime: '14:45', isBreak: true },
    { period: '9', startTime: '14:45', endTime: '15:20' },
    { period: '10', startTime: '15:30', endTime: '16:05' }
];
export const KINDERGARTEN_TIME_PERIODS: TimePeriod[] = PRIMARY_SCHOOL_TIME_PERIODS;

export const getTimePeriods = (level?: 'Anaokulu' | 'İlkokul' | 'Ortaokul'): TimePeriod[] => {
    switch (level) {
        case 'Ortaokul': return MIDDLE_SCHOOL_TIME_PERIODS;
        case 'Anaokulu': return KINDERGARTEN_TIME_PERIODS;
        case 'İlkokul':
        default:
            return PRIMARY_SCHOOL_TIME_PERIODS;
    }
};

export const getTimeForPeriod = (period: string, level?: 'Anaokulu' | 'İlkokul' | 'Ortaokul'): TimePeriod | undefined => {
  const periods = getTimePeriods(level);
  return periods.find(p => p.period === period);
};

export const formatTimeRange = (startTime: string, endTime: string): string => `${startTime} - ${endTime}`;

// --- Dağıtım Şekli Yardımcı Fonksiyonları ---

export const parseDistributionPattern = (pattern: string): number[] => {
  if (!pattern || typeof pattern !== 'string') return [];
  return pattern.split('+').map(num => parseInt(num.trim(), 10)).filter(num => !isNaN(num) && num > 0);
};

export const formatDistributionPattern = (hours: number[]): string => {
  return hours.filter(h => h > 0).join('+');
};

export const validateDistributionPattern = (pattern: string, totalHours: number): boolean => {
  const parsedHours = parseDistributionPattern(pattern);
  const sum = parsedHours.reduce((acc, curr) => acc + curr, 0);
  return sum === totalHours && parsedHours.length <= 5;
};

export const generateDistributionSuggestions = (totalHours: number): string[] => {
  const suggestions: string[] = [];
  if (totalHours <= 0) return suggestions;
  if (totalHours > 0 && totalHours % 5 === 0) { const perDay = totalHours / 5; if (perDay > 0) suggestions.push(Array(5).fill(perDay).join('+')); }
  if (totalHours > 0 && totalHours % 4 === 0) { const perDay = totalHours / 4; if (perDay > 0) suggestions.push(Array(4).fill(perDay).join('+')); }
  if (totalHours > 0 && totalHours % 3 === 0) { const perDay = totalHours / 3; if (perDay > 0) suggestions.push(Array(3).fill(perDay).join('+')); }
  if (totalHours > 0 && totalHours % 2 === 0) { const perDay = totalHours / 2; if (perDay > 0) suggestions.push(Array(2).fill(perDay).join('+')); }
  if (totalHours === 1) { suggestions.push('1'); }
  else if (totalHours === 2) { suggestions.push('2', '1+1'); }
  else if (totalHours === 3) { suggestions.push('3', '2+1', '1+1+1'); }
  else if (totalHours === 4) { suggestions.push('4', '2+2', '2+1+1', '1+1+1+1'); }
  else if (totalHours === 5) { suggestions.push('5', '3+2', '2+2+1', '2+1+1+1', '1+1+1+1+1'); }
  else if (totalHours === 6) { suggestions.push('6', '3+3', '2+2+2', '3+2+1', '2+2+1+1'); }
  else if (totalHours === 8) { suggestions.push('4+4', '2+2+2+2', '3+3+2', '2+2+2+1+1'); }
  else if (totalHours === 10) { suggestions.push('5+5', '2+2+2+2+2', '3+3+2+2', '4+3+2+1'); }
  else if (totalHours === 12) { suggestions.push('6+6', '3+3+3+3', '2+2+2+2+2+2', '4+4+2+2'); }
  return [...new Set(suggestions)];
};