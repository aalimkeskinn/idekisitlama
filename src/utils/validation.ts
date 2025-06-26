import { Teacher, Class, Subject, Schedule, DAYS, PERIODS } from '../types';
import { CONFLICT_MESSAGES, VALIDATION_ERRORS } from './messages';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ConflictCheckResult {
  hasConflict: boolean;
  message: string;
}

// SECURITY: Input sanitization function
export const sanitizeInput = (input: string): string => {
  if (typeof input !== 'string') {
    return '';
  }
  
  // Remove potentially dangerous characters
  return input
    .trim()
    .replace(/[<>\"'&]/g, '') // Remove HTML/script injection chars
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .substring(0, 500); // Limit length
};

// SECURITY: Email validation with domain restriction
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const sanitizedEmail = sanitizeInput(email);
  
  // SECURITY: Only allow @ide.k12.tr domain
  return emailRegex.test(sanitizedEmail) && sanitizedEmail.endsWith('@ide.k12.tr');
};

// SECURITY: Teacher validation with sanitization
export const validateTeacher = (teacher: Partial<Teacher>): string[] => {
  const errors: string[] = [];
  
  // Sanitize inputs
  const name = teacher.name ? sanitizeInput(teacher.name) : '';
  const branch = teacher.branch ? sanitizeInput(teacher.branch) : '';
  
  // Validate name
  if (!name || name.length < 2) {
    errors.push(VALIDATION_ERRORS.MIN_LENGTH('Ad', 2));
  }
  
  if (name.length > 100) {
    errors.push(VALIDATION_ERRORS.MAX_LENGTH('Ad', 100));
  }
  
  // Check for suspicious patterns
  if (name && /<script|javascript:|on\w+=/i.test(name)) {
    errors.push('Geçersiz karakter tespit edildi');
  }
  
  // Validate branch
  if (!branch || branch.length < 2) {
    errors.push(VALIDATION_ERRORS.MIN_LENGTH('Branş', 2));
  }
  
  // Validate level - now supporting multiple levels
  const validLevels = ['Anaokulu', 'İlkokul', 'Ortaokul'];
  
  if (teacher.levels && teacher.levels.length > 0) {
    // Check if all levels are valid
    const invalidLevels = teacher.levels.filter(level => !validLevels.includes(level));
    if (invalidLevels.length > 0) {
      errors.push(`Geçersiz seviye(ler): ${invalidLevels.join(', ')}`);
    }
  } else if (!teacher.level || !validLevels.includes(teacher.level)) {
    errors.push(VALIDATION_ERRORS.INVALID_SELECTION('seviye'));
  }
  
  return errors;
};

// SECURITY: Class validation with sanitization
export const validateClass = (classItem: Partial<Class>): string[] => {
  const errors: string[] = [];
  
  // Sanitize inputs
  const name = classItem.name ? sanitizeInput(classItem.name) : '';
  
  // Validate name
  if (!name || name.length < 1) {
    errors.push(VALIDATION_ERRORS.MIN_LENGTH('Sınıf adı', 1));
  }
  
  if (name.length > 50) {
    errors.push(VALIDATION_ERRORS.MAX_LENGTH('Sınıf adı', 50));
  }
  
  // Check for suspicious patterns
  if (name && /<script|javascript:|on\w+=/i.test(name)) {
    errors.push('Geçersiz karakter tespit edildi');
  }
  
  // Validate level - now supporting multiple levels
  const validLevels = ['Anaokulu', 'İlkokul', 'Ortaokul'];
  
  if (classItem.levels && classItem.levels.length > 0) {
    // Check if all levels are valid
    const invalidLevels = classItem.levels.filter(level => !validLevels.includes(level));
    if (invalidLevels.length > 0) {
      errors.push(`Geçersiz seviye(ler): ${invalidLevels.join(', ')}`);
    }
  } else if (!classItem.level || !validLevels.includes(classItem.level)) {
    errors.push(VALIDATION_ERRORS.INVALID_SELECTION('seviye'));
  }
  
  return errors;
};

// SECURITY: Subject validation with sanitization
export const validateSubject = (subject: Partial<Subject>): string[] => {
  const errors: string[] = [];
  
  // Sanitize inputs
  const name = subject.name ? sanitizeInput(subject.name) : '';
  const branch = subject.branch ? sanitizeInput(subject.branch) : '';
  
  // Validate name
  if (!name || name.length < 2) {
    errors.push(VALIDATION_ERRORS.MIN_LENGTH('Ders adı', 2));
  }
  
  if (name.length > 100) {
    errors.push(VALIDATION_ERRORS.MAX_LENGTH('Ders adı', 100));
  }
  
  // Validate branch
  if (!branch || branch.length < 2) {
    errors.push(VALIDATION_ERRORS.MIN_LENGTH('Branş', 2));
  }
  
  // Validate weekly hours
  if (!subject.weeklyHours || subject.weeklyHours < 1 || subject.weeklyHours > 45) {
    errors.push('Haftalık ders saati 1-45 arasında olmalıdır');
  }
  
  // Validate level - now supporting multiple levels
  const validLevels = ['Anaokulu', 'İlkokul', 'Ortaokul'];
  
  if (subject.levels && subject.levels.length > 0) {
    // Check if all levels are valid
    const invalidLevels = subject.levels.filter(level => !validLevels.includes(level));
    if (invalidLevels.length > 0) {
      errors.push(`Geçersiz seviye(ler): ${invalidLevels.join(', ')}`);
    }
  } else if (!subject.level || !validLevels.includes(subject.level)) {
    errors.push(VALIDATION_ERRORS.INVALID_SELECTION('seviye'));
  }
  
  // Check for suspicious patterns
  if ((name && /<script|javascript:|on\w+=/i.test(name)) || 
      (branch && /<script|javascript:|on\w+=/i.test(branch))) {
    errors.push('Geçersiz karakter tespit edildi');
  }
  
  return errors;
};

// FIXED: Real-time conflict detection for slot assignment - IMPROVED VERSION
export const checkSlotConflict = (
  mode: 'teacher' | 'class',
  day: string,
  period: string,
  targetId: string, // classId for teacher mode, teacherId for class mode
  currentEntityId: string, // teacherId for teacher mode, classId for class mode
  allSchedules: Schedule[],
  teachers: Teacher[],
  classes: Class[]
): ConflictCheckResult => {
  
  // SECURITY: Input validation
  if (!day || !period || !targetId || !currentEntityId) {
    return { hasConflict: true, message: 'Geçersiz parametre' };
  }
  
  // SECURITY: Sanitize inputs
  const sanitizedDay = sanitizeInput(day);
  const sanitizedPeriod = sanitizeInput(period);
  
  // SECURITY: Validate day and period
  if (!DAYS.includes(sanitizedDay) || !PERIODS.includes(sanitizedPeriod)) {
    return { hasConflict: true, message: 'Geçersiz gün veya ders saati' };
  }

  console.log('🔍 IMPROVED Çakışma kontrolü başlatıldı:', {
    mode,
    day: sanitizedDay,
    period: sanitizedPeriod,
    targetId,
    currentEntityId,
    schedulesCount: allSchedules.length
  });

  if (mode === 'teacher') {
    // FIXED: Teacher mode - Check if class is already assigned to another teacher at this time
    const conflictingSchedules = allSchedules.filter(schedule => {
      // Skip current teacher's schedule
      if (schedule.teacherId === currentEntityId) {
        return false;
      }
      
      const slot = schedule.schedule[sanitizedDay]?.[sanitizedPeriod];
      
      // Check if this slot has the same class assigned
      const hasConflict = slot?.classId === targetId && slot.classId !== 'fixed-period';
      
      if (hasConflict) {
        console.log('⚠️ Teacher mode çakışma bulundu:', {
          conflictingTeacherId: schedule.teacherId,
          currentTeacherId: currentEntityId,
          classId: targetId,
          slot
        });
      }
      
      return hasConflict;
    });
    
    if (conflictingSchedules.length > 0) {
      const conflictingSchedule = conflictingSchedules[0];
      const conflictingTeacher = teachers.find(t => t.id === conflictingSchedule.teacherId);
      const classItem = classes.find(c => c.id === targetId);
      
      const message = `${classItem?.name || 'Sınıf'} ${sanitizedDay} günü ${sanitizedPeriod}. ders saatinde ${conflictingTeacher?.name || 'başka bir öğretmen'} ile çakışıyor`;
      
      console.log('❌ Teacher mode çakışma mesajı:', message);
      
      return {
        hasConflict: true,
        message
      };
    }
  } else {
    // FIXED: Class mode - Check if teacher is already assigned to another class at this time
    const teacherSchedule = allSchedules.find(s => s.teacherId === targetId);
    
    console.log('🔍 Class mode - öğretmen programı kontrol ediliyor:', {
      teacherId: targetId,
      teacherScheduleFound: !!teacherSchedule,
      currentClassId: currentEntityId
    });
    
    if (teacherSchedule) {
      const existingSlot = teacherSchedule.schedule[sanitizedDay]?.[sanitizedPeriod];
      
      console.log('🔍 Mevcut slot kontrol ediliyor:', {
        day: sanitizedDay,
        period: sanitizedPeriod,
        existingSlot,
        existingClassId: existingSlot?.classId,
        currentClassId: currentEntityId,
        isFixedPeriod: existingSlot?.classId === 'fixed-period'
      });
      
      // FIXED: Check if teacher is already assigned to a different class (not fixed period)
      if (existingSlot?.classId && 
          existingSlot.classId !== currentEntityId && 
          existingSlot.classId !== 'fixed-period') {
        
        const teacher = teachers.find(t => t.id === targetId);
        const conflictingClass = classes.find(c => c.id === existingSlot.classId);
        
        const message = `${teacher?.name || 'Öğretmen'} ${sanitizedDay} günü ${sanitizedPeriod}. ders saatinde ${conflictingClass?.name || 'başka bir sınıf'} ile çakışıyor`;
        
        console.log('❌ Class mode çakışma mesajı:', message);
        
        return {
          hasConflict: true,
          message
        };
      }
    }
  }

  console.log('✅ Çakışma bulunamadı');
  return { hasConflict: false, message: '' };
};

// FIXED: Enhanced schedule validation with detailed conflict detection - IMPROVED VERSION
export const validateSchedule = (
  mode: 'teacher' | 'class',
  currentSchedule: Schedule['schedule'],
  selectedId: string,
  allSchedules: Schedule[],
  teachers: Teacher[],
  classes: Class[],
  subjects: Subject[]
): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // SECURITY: Input validation
  if (!mode || !currentSchedule || !selectedId) {
    errors.push('Geçersiz program verisi');
    return { isValid: false, errors, warnings };
  }

  // SECURITY: Validate mode
  if (!['teacher', 'class'].includes(mode)) {
    errors.push('Geçersiz program modu');
    return { isValid: false, errors, warnings };
  }

  console.log('🔍 IMPROVED Program doğrulama başlatıldı:', {
    mode,
    selectedId,
    scheduleSlots: Object.keys(currentSchedule).length
  });

  // Calculate weekly and daily hours
  const weeklyHours = calculateWeeklyHours(currentSchedule, mode);
  const dailyHours = calculateDailyHours(currentSchedule, mode);

  // Check weekly hour limits - UPDATED: Limit increased to 45
  if (weeklyHours > 45) {
    errors.push('Haftalık ders saati 45\'i geçemez');
  }

  // Check daily hour limits
  DAYS.forEach(day => {
    const dayHours = dailyHours[day] || 0;
    if (dayHours > 9) {
      errors.push(`${day} günü için günlük ders saati 9'u geçemez (şu an: ${dayHours})`);
    }
  });

  // FIXED: Comprehensive conflict detection with better filtering
  const conflictMap = new Map<string, string[]>(); // Track conflicts per slot
  
  DAYS.forEach(day => {
    PERIODS.forEach(period => {
      const slot = currentSchedule[day]?.[period];
      if (!slot || slot.classId === 'fixed-period') return;

      const slotKey = `${day}-${period}`;

      if (mode === 'teacher' && slot.classId) {
        // Check if this class is assigned to another teacher at the same time
        const conflictingSchedules = allSchedules.filter(schedule => {
          // Skip current teacher's schedule
          if (schedule.teacherId === selectedId) return false;
          
          const otherSlot = schedule.schedule[day]?.[period];
          return otherSlot?.classId === slot.classId && otherSlot.classId !== 'fixed-period';
        });
        
        if (conflictingSchedules.length > 0) {
          const conflictingTeacher = teachers.find(t => t.id === conflictingSchedules[0].teacherId);
          const className = classes.find(c => c.id === slot.classId)?.name || 'Bilinmeyen Sınıf';
          
          const conflictMessage = `${className} sınıfı ${day} günü ${period}. ders saatinde ${conflictingTeacher?.name || 'başka bir öğretmen'} ile çakışıyor`;
          
          if (!conflictMap.has(slotKey)) {
            conflictMap.set(slotKey, []);
          }
          conflictMap.get(slotKey)!.push(conflictMessage);
        }
        
      } else if (mode === 'class' && slot.teacherId) {
        // Check if this teacher is assigned to another class at the same time
        const teacherSchedule = allSchedules.find(s => s.teacherId === slot.teacherId);
        
        if (teacherSchedule) {
          const existingSlot = teacherSchedule.schedule[day]?.[period];
          
          if (existingSlot?.classId && 
              existingSlot.classId !== selectedId && 
              existingSlot.classId !== 'fixed-period') {
            
            const teacher = teachers.find(t => t.id === slot.teacherId);
            const conflictingClass = classes.find(c => c.id === existingSlot.classId);
            
            const conflictMessage = `${teacher?.name || 'Öğretmen'} ${day} günü ${period}. ders saatinde ${conflictingClass?.name || 'başka bir sınıf'} ile çakışıyor`;
            
            if (!conflictMap.has(slotKey)) {
              conflictMap.set(slotKey, []);
            }
            conflictMap.get(slotKey)!.push(conflictMessage);
          }
        }
      }

      // Check level and branch compatibility
      const compatibilityIssues = checkCompatibility(slot, teachers, classes, subjects);
      warnings.push(...compatibilityIssues);
    });
  });

  // Add all unique conflicts to errors
  const allConflicts: string[] = [];
  conflictMap.forEach(conflicts => {
    allConflicts.push(...conflicts);
  });
  errors.push(...allConflicts);

  console.log('📊 IMPROVED Doğrulama sonuçları:', {
    isValid: errors.length === 0,
    errorsCount: errors.length,
    warningsCount: warnings.length,
    conflictsFound: allConflicts.length,
    errors,
    warnings
  });

  return {
    isValid: errors.length === 0,
    errors: [...new Set(errors)], // Remove duplicates
    warnings: [...new Set(warnings)] // Remove duplicates
  };
};

// Check level and branch compatibility - SECURE VERSION
const checkCompatibility = (
  slot: any,
  teachers: Teacher[],
  classes: Class[],
  subjects: Subject[]
): string[] => {
  const warnings: string[] = [];

  // SECURITY: Input validation
  if (!slot || typeof slot !== 'object') {
    return warnings;
  }

  if (slot.teacherId && slot.classId && slot.classId !== 'fixed-period') {
    const teacher = teachers.find(t => t.id === slot.teacherId);
    const classItem = classes.find(c => c.id === slot.classId);

    if (teacher && classItem) {
      // Check level compatibility with support for multiple levels
      const teacherLevels = teacher.levels || [teacher.level];
      const classLevels = classItem.levels || [classItem.level];
      
      // Check if there's any overlap between teacher levels and class levels
      const hasMatchingLevel = teacherLevels.some(tl => classLevels.includes(tl));
      
      if (!hasMatchingLevel) {
        warnings.push(`${teacher.name} (${teacherLevels.join(', ')}) ile ${classItem.name} (${classLevels.join(', ')}) seviye uyumsuzluğu`);
      }
    }
  }

  if (slot.teacherId && slot.subjectId) {
    const teacher = teachers.find(t => t.id === slot.teacherId);
    const subject = subjects.find(s => s.id === slot.subjectId);

    if (teacher && subject) {
      // Check branch compatibility with support for multiple branches
      const teacherBranches = teacher.branches || [teacher.branch];
      const hasBranch = teacherBranches.some(tb => tb === subject.branch || tb.includes(subject.branch));
      
      if (!hasBranch) {
        warnings.push(`${teacher.name} (${teacherBranches.join(', ')}) ile ${subject.name} (${subject.branch}) branş uyumsuzluğu`);
      }
      
      // Check level compatibility with support for multiple levels
      const teacherLevels = teacher.levels || [teacher.level];
      const subjectLevels = subject.levels || [subject.level];
      
      // Check if there's any overlap between teacher levels and subject levels
      const hasMatchingLevel = teacherLevels.some(tl => subjectLevels.includes(tl));
      
      if (!hasMatchingLevel) {
        warnings.push(`${teacher.name} (${teacherLevels.join(', ')}) ile ${subject.name} (${subjectLevels.join(', ')}) seviye uyumsuzluğu`);
      }
    }
  }

  return warnings;
};

// Calculate weekly hours for a schedule - SECURE VERSION
const calculateWeeklyHours = (
  schedule: Schedule['schedule'],
  mode: 'teacher' | 'class'
): number => {
  let totalHours = 0;
  
  // SECURITY: Input validation
  if (!schedule || typeof schedule !== 'object') {
    return 0;
  }
  
  DAYS.forEach(day => {
    PERIODS.forEach(period => {
      const slot = schedule[day]?.[period];
      // Don't count fixed periods
      if (slot && slot.classId !== 'fixed-period') {
        if (mode === 'teacher' && slot.classId) {
          totalHours++;
        } else if (mode === 'class' && slot.teacherId) {
          totalHours++;
        }
      }
    });
  });
  
  return Math.min(totalHours, 50); // SECURITY: Cap at reasonable limit
};

// Calculate daily hours for each day - SECURE VERSION
const calculateDailyHours = (
  schedule: Schedule['schedule'],
  mode: 'teacher' | 'class'
): { [day: string]: number } => {
  const dailyHours: { [day: string]: number } = {};
  
  // SECURITY: Input validation
  if (!schedule || typeof schedule !== 'object') {
    return dailyHours;
  }
  
  DAYS.forEach(day => {
    let dayHours = 0;
    PERIODS.forEach(period => {
      const slot = schedule[day]?.[period];
      // Don't count fixed periods
      if (slot && slot.classId !== 'fixed-period') {
        if (mode === 'teacher' && slot.classId) {
          dayHours++;
        } else if (mode === 'class' && slot.teacherId) {
          dayHours++;
        }
      }
    });
    dailyHours[day] = Math.min(dayHours, 10); // SECURITY: Cap at reasonable limit
  });
  
  return dailyHours;
};