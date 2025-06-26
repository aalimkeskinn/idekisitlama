import { Teacher, Class, Subject, Schedule, DAYS, PERIODS } from '../types';
import { TimeConstraint } from '../types/constraints';

export interface ScheduleValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  constraintViolations: string[];
}

export interface ConflictCheckResult {
  hasConflict: boolean;
  message: string;
}

// Check if a schedule slot has conflicts
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
  const sanitizedDay = day;
  const sanitizedPeriod = period;
  
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

// ENHANCED: Check if a schedule slot violates any time constraints
export const checkConstraintViolations = (
  mode: 'teacher' | 'class',
  day: string,
  period: string,
  teacherId?: string,
  classId?: string,
  constraints: TimeConstraint[] = []
): string[] => {
  const violations: string[] = [];

  if (mode === 'teacher' && teacherId) {
    // Check teacher constraints - only "unavailable" blocks scheduling
    const teacherConstraints = constraints.filter(c => 
      c.entityType === 'teacher' && 
      c.entityId === teacherId && 
      c.day === day && 
      c.period === period
    );

    teacherConstraints.forEach(constraint => {
      if (constraint.constraintType === 'unavailable') {
        violations.push(`Öğretmen ${day} günü ${period}. ders saatinde müsait değil`);
      }
      // NOTE: "restricted" and "preferred" don't block scheduling, just show warnings
    });
  }

  if (mode === 'class' && classId) {
    // Check class constraints - only "unavailable" blocks scheduling
    const classConstraints = constraints.filter(c => 
      c.entityType === 'class' && 
      c.entityId === classId && 
      c.day === day && 
      c.period === period
    );

    classConstraints.forEach(constraint => {
      if (constraint.constraintType === 'unavailable') {
        violations.push(`Sınıf ${day} günü ${period}. ders saatinde müsait değil`);
      }
      // NOTE: "restricted" and "preferred" don't block scheduling, just show warnings
    });
  }

  return violations;
};

// ENHANCED: Get constraint warnings (non-blocking)
export const getConstraintWarnings = (
  mode: 'teacher' | 'class',
  day: string,
  period: string,
  teacherId?: string,
  classId?: string,
  constraints: TimeConstraint[] = []
): string[] => {
  const warnings: string[] = [];

  if (mode === 'teacher' && teacherId) {
    // Check teacher constraints for warnings
    const teacherConstraints = constraints.filter(c => 
      c.entityType === 'teacher' && 
      c.entityId === teacherId && 
      c.day === day && 
      c.period === period
    );

    teacherConstraints.forEach(constraint => {
      if (constraint.constraintType === 'restricted') {
        warnings.push(`Öğretmen ${day} günü ${period}. ders saatinde kısıtlı`);
      }
      // "preferred" is the default, so no warning needed
    });
  }

  if (mode === 'class' && classId) {
    // Check class constraints for warnings
    const classConstraints = constraints.filter(c => 
      c.entityType === 'class' && 
      c.entityId === classId && 
      c.day === day && 
      c.period === period
    );

    classConstraints.forEach(constraint => {
      if (constraint.constraintType === 'restricted') {
        warnings.push(`Sınıf ${day} günü ${period}. ders saatinde kısıtlı`);
      }
      // "preferred" is the default, so no warning needed
    });
  }

  return warnings;
};

// Enhanced schedule validation with constraint checking
export const validateScheduleWithConstraints = (
  mode: 'teacher' | 'class',
  currentSchedule: Schedule['schedule'],
  selectedId: string,
  allSchedules: Schedule[],
  teachers: Teacher[],
  classes: Class[],
  subjects: Subject[],
  constraints: TimeConstraint[] = []
): ScheduleValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const constraintViolations: string[] = [];

  // Basic validation
  if (!mode || !currentSchedule || !selectedId) {
    errors.push('Geçersiz program verisi');
    return { isValid: false, errors, warnings, constraintViolations };
  }

  // Check each slot for constraint violations (only "unavailable" blocks)
  DAYS.forEach(day => {
    PERIODS.forEach(period => {
      const slot = currentSchedule[day]?.[period];
      if (!slot || slot.classId === 'fixed-period') return;

      if (mode === 'teacher' && slot.classId) {
        // Check teacher constraints (blocking violations)
        const violations = checkConstraintViolations(
          'teacher',
          day,
          period,
          selectedId,
          slot.classId,
          constraints
        );
        constraintViolations.push(...violations);

        // Check class constraints (blocking violations)
        const classViolations = checkConstraintViolations(
          'class',
          day,
          period,
          selectedId,
          slot.classId,
          constraints
        );
        constraintViolations.push(...classViolations);

        // Check for warnings (non-blocking)
        const teacherWarnings = getConstraintWarnings(
          'teacher',
          day,
          period,
          selectedId,
          slot.classId,
          constraints
        );
        warnings.push(...teacherWarnings);

        const classWarnings = getConstraintWarnings(
          'class',
          day,
          period,
          selectedId,
          slot.classId,
          constraints
        );
        warnings.push(...classWarnings);

      } else if (mode === 'class' && slot.teacherId) {
        // Check teacher constraints (blocking violations)
        const teacherViolations = checkConstraintViolations(
          'teacher',
          day,
          period,
          slot.teacherId,
          selectedId,
          constraints
        );
        constraintViolations.push(...teacherViolations);

        // Check class constraints (blocking violations)
        const classViolations = checkConstraintViolations(
          'class',
          day,
          period,
          slot.teacherId,
          selectedId,
          constraints
        );
        constraintViolations.push(...classViolations);

        // Check for warnings (non-blocking)
        const teacherWarnings = getConstraintWarnings(
          'teacher',
          day,
          period,
          slot.teacherId,
          selectedId,
          constraints
        );
        warnings.push(...teacherWarnings);

        const classWarnings = getConstraintWarnings(
          'class',
          day,
          period,
          slot.teacherId,
          selectedId,
          constraints
        );
        warnings.push(...classWarnings);
      }
    });
  });

  // ENHANCED: Check for non-preferred time slots (informational warnings)
  DAYS.forEach(day => {
    PERIODS.forEach(period => {
      const slot = currentSchedule[day]?.[period];
      if (!slot || slot.classId === 'fixed-period') return;

      if (mode === 'teacher' && selectedId) {
        // Check if teacher has any non-preferred constraints for this slot
        const teacherConstraints = constraints.filter(c => 
          c.entityType === 'teacher' && 
          c.entityId === selectedId && 
          c.day === day && 
          c.period === period
        );

        // If no constraint exists, it means it's using the default "preferred" state
        // If constraint exists and is not "preferred", it's already handled above
        
        // Check if this slot is not in teacher's preferred times
        const hasNonPreferredConstraint = teacherConstraints.some(c => c.constraintType !== 'preferred');
        if (hasNonPreferredConstraint) {
          // Already handled in warnings above
        }
      }
    });
  });

  return {
    isValid: errors.length === 0 && constraintViolations.length === 0,
    errors: [...new Set(errors)],
    warnings: [...new Set(warnings)],
    constraintViolations: [...new Set(constraintViolations)]
  };
};

// Get constraint recommendations for optimal scheduling
export const getConstraintRecommendations = (
  entityType: 'teacher' | 'class',
  entityId: string,
  constraints: TimeConstraint[]
): { preferred: string[], avoid: string[], restricted: string[] } => {
  const entityConstraints = constraints.filter(c => 
    c.entityType === entityType && c.entityId === entityId
  );

  const preferred: string[] = [];
  const avoid: string[] = [];
  const restricted: string[] = [];

  // If no constraints exist, all slots are considered preferred (default)
  if (entityConstraints.length === 0) {
    DAYS.forEach(day => {
      PERIODS.forEach(period => {
        preferred.push(`${day} ${period}. ders`);
      });
    });
    return { preferred, avoid, restricted };
  }

  entityConstraints.forEach(constraint => {
    const timeSlot = `${constraint.day} ${constraint.period}. ders`;
    
    switch (constraint.constraintType) {
      case 'preferred':
        preferred.push(timeSlot);
        break;
      case 'unavailable':
        avoid.push(timeSlot);
        break;
      case 'restricted':
        restricted.push(timeSlot);
        break;
    }
  });

  return { preferred, avoid, restricted };
};

// ENHANCED: Check if a time slot is optimal for scheduling
export const isOptimalTimeSlot = (
  entityType: 'teacher' | 'class',
  entityId: string,
  day: string,
  period: string,
  constraints: TimeConstraint[]
): { isOptimal: boolean, reason: string, constraintType?: string } => {
  const constraint = constraints.find(c => 
    c.entityType === entityType && 
    c.entityId === entityId && 
    c.day === day && 
    c.period === period
  );

  // If no constraint exists, it's considered preferred (default)
  if (!constraint) {
    return {
      isOptimal: true,
      reason: 'Tercih edilen zaman dilimi (varsayılan)',
      constraintType: 'preferred'
    };
  }

  switch (constraint.constraintType) {
    case 'preferred':
      return {
        isOptimal: true,
        reason: 'Tercih edilen zaman dilimi',
        constraintType: 'preferred'
      };
    case 'restricted':
      return {
        isOptimal: false,
        reason: 'Kısıtlı zaman dilimi - dikkatli kullanın',
        constraintType: 'restricted'
      };
    case 'unavailable':
      return {
        isOptimal: false,
        reason: 'Müsait olmayan zaman dilimi - kullanılamaz',
        constraintType: 'unavailable'
      };
    default:
      return {
        isOptimal: true,
        reason: 'Bilinmeyen kısıtlama türü',
        constraintType: constraint.constraintType
      };
  }
};