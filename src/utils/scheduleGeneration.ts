// --- START OF FILE src/utils/scheduleGeneration.ts ---

import { DAYS, PERIODS, Schedule, Teacher, Class, Subject } from '../types';
import { SubjectTeacherMapping, EnhancedGenerationResult, WizardData } from '../types/wizard';
import { TimeConstraint } from '../types/constraints';

const LEVEL_ORDER: Record<'Anaokulu' | 'İlkokul' | 'Ortaokul', number> = { 'Anaokulu': 1, 'İlkokul': 2, 'Ortaokul': 3 };
function getEntityLevel(entity: Teacher | Class): 'Anaokulu' | 'İlkokul' | 'Ortaokul' {
    return (entity as any).level || (entity as any).levels?.[0] || 'İlkokul';
}

/**
 * "Öncelikli Kısıtlı Görev" Algoritması (v39 - Final)
 * 1. "ADE", "KULÜP" gibi özel dersleri tespit eder.
 * 2. Önce bu özel dersleri, sadece onlara tanımlanmış zaman kısıtlamalarına göre yerleştirir.
 * 3. Ardından kalan normal dersleri, boş kalan slotlara en verimli şekilde dağıtır.
 */
export function generateSystematicSchedule(
  mappings: SubjectTeacherMapping[],
  allTeachers: Teacher[],
  allClasses: Class[],
  allSubjects: Subject[],
  timeConstraints: TimeConstraint[],
  globalRules: WizardData['constraints']['globalRules']
): EnhancedGenerationResult {
  
  const startTime = Date.now();
  console.log('🚀 Program oluşturma başlatıldı (v39 - Öncelikli Kısıtlı Görev)...');

  // --- AŞAMA 1: VERİ MATRİSLERİNİ VE GÖREVLERİ HAZIRLA ---
  const classScheduleGrids: { [classId: string]: Schedule['schedule'] } = {};
  const teacherAvailability = new Map<string, Set<string>>();
  const classAvailability = new Map<string, Set<string>>();
  const constraintMap = new Map<string, string>();

  const teacherLevelTargets = new Map<string, Map<string, number>>();
  mappings.forEach(m => {
      const classItem = allClasses.find(c => c.id === m.classId);
      if (!classItem) return;
      const level = getEntityLevel(classItem);
      if (!teacherLevelTargets.has(m.teacherId)) teacherLevelTargets.set(m.teacherId, new Map<string, number>());
      const levelMap = teacherLevelTargets.get(m.teacherId)!;
      levelMap.set(level, (levelMap.get(level) || 0) + m.weeklyHours);
  });
  
  const teacherLevelActualHours = new Map<string, Map<string, number>>();
  teacherLevelTargets.forEach((levelMap, teacherId) => {
      const newLevelMap = new Map<string, number>();
      levelMap.forEach((_, level) => newLevelMap.set(level, 0));
      teacherLevelActualHours.set(teacherId, newLevelMap);
  });

  timeConstraints.forEach(c => { if (c.constraintType) constraintMap.set(`${c.entityType}-${c.entityId}-${c.day}-${c.period}`, c.constraintType); });

  const selectedClassIds = new Set(mappings.map(m => m.classId));
  selectedClassIds.forEach(classId => {
    const classItem = allClasses.find(c => c.id === classId)!;
    if (classItem) {
      classScheduleGrids[classId] = {};
      classAvailability.set(classId, new Set<string>());
      DAYS.forEach(day => { classScheduleGrids[classId][day] = {}; });
      const lunchPeriod = getEntityLevel(classItem) === 'Ortaokul' ? '6' : '5';
      if (PERIODS.includes(lunchPeriod)) {
        DAYS.forEach(day => { classScheduleGrids[classId][day][lunchPeriod] = { isFixed: true, classId: 'fixed-period', subjectId: 'Yemek' }; classAvailability.get(classId)!.add(`${day}-${lunchPeriod}`); });
      }
    }
  });

  const selectedTeacherIds = new Set(mappings.map(m => m.teacherId));
  selectedTeacherIds.forEach(teacherId => { teacherAvailability.set(teacherId, new Set<string>()); });
  
  type PlacementTask = { mapping: SubjectTeacherMapping; blockLength: number; taskId: string; classLevel: 'Anaokulu' | 'İlkokul' | 'Ortaokul'; isPlaced: boolean; };
  
  let specialTasks: PlacementTask[] = [];
  let normalTasks: PlacementTask[] = [];

  mappings.forEach(mapping => {
    const classItem = allClasses.find(c => c.id === mapping.classId)!;
    const subject = allSubjects.find(s => s.id === mapping.subjectId)!;
    const classLevel = getEntityLevel(classItem);
    const distribution = mapping.distribution || [];
    
    const isSpecial = subject.name.toUpperCase().includes('KULÜP') || subject.name.toUpperCase().includes('ADE');
    const hasSpecificConstraints = timeConstraints.some(c => c.entityType === 'subject' && c.entityId === subject.id);

    if (isSpecial && hasSpecificConstraints) {
        for(let i=0; i<mapping.weeklyHours; i++){
            specialTasks.push({ mapping, blockLength: 1, taskId: `${mapping.id}-special-${i}`, classLevel, isPlaced: false });
        }
    } else {
        let hoursLeft = mapping.weeklyHours;
        if (distribution.length > 0 && globalRules.useDistributionPatterns) {
            distribution.forEach((block, index) => {
                normalTasks.push({ mapping, blockLength: block, taskId: `${mapping.id}-dist-${index}`, classLevel, isPlaced: false });
                hoursLeft -= block;
            });
        }
        for (let i = 0; i < hoursLeft; i++) {
            normalTasks.push({ mapping, blockLength: 1, taskId: `${mapping.id}-single-${i}`, classLevel, isPlaced: false });
        }
    }
  });
  
  // --- AŞAMA 2: ÖZEL GÖREVLERİ YERLEŞTİR (PASS 1) ---
  console.log(`--- 1. Aşama: Özel Görevler (${specialTasks.length} adet) Yerleştiriliyor... ---`);
  specialTasks.sort((a,b) => LEVEL_ORDER[a.classLevel] - LEVEL_ORDER[b.classLevel]);

  for (const task of specialTasks) {
    const { mapping, classLevel } = task;
    const { teacherId, classId, subjectId } = mapping;
    
    const preferredSlots: {day: string, period: string}[] = [];
    timeConstraints.forEach(c => {
        if(c.entityType === 'subject' && c.entityId === subjectId && c.constraintType === 'preferred') {
            preferredSlots.push({day: c.day, period: c.period});
        }
    });

    let placed = false;
    for (const slot of preferredSlots) {
        const slotKey = `${slot.day}-${slot.period}`;
        const isTeacherUnavailable = constraintMap.get(`teacher-${teacherId}-${slot.day}-${slot.period}`) === 'unavailable';
        const isAvailable = !teacherAvailability.get(teacherId)?.has(slotKey) && !classAvailability.get(classId)?.has(slotKey) && !isTeacherUnavailable;
        
        if (isAvailable) {
            classScheduleGrids[classId][slot.day][slot.period] = { subjectId, teacherId, classId, isFixed: false };
            teacherAvailability.get(teacherId)!.add(slotKey);
            classAvailability.get(classId)!.add(slotKey);
            const currentHours = teacherLevelActualHours.get(teacherId)?.get(classLevel) || 0;
            teacherLevelActualHours.get(teacherId)?.set(classLevel, currentHours + 1);
            placed = true;
            task.isPlaced = true;
            break;
        }
    }
  }

  // --- AŞAMA 3: NORMAL GÖREVLERİ YERLEŞTİR (PASS 2) ---
  console.log(`--- 2. Aşama: Normal Görevler (${normalTasks.length} adet) Yerleştiriliyor... ---`);
  
  let tasksToPlace = [...normalTasks];
  let passCount = 0;
  while(tasksToPlace.length > 0 && passCount < 5000) { 
    passCount++;
    
    tasksToPlace.sort((a, b) => b.blockLength - a.blockLength);

    const taskToAttempt = tasksToPlace.shift();
    if (!taskToAttempt) break;

    const { mapping, blockLength, classLevel } = taskToAttempt;
    const { teacherId, classId, subjectId } = mapping;

    const teacher = allTeachers.find(t => t.id === teacherId)!;
    const classItem = allClasses.find(c => c.id === classId)!;
    const teacherLevels = new Set(teacher.levels || [teacher.level]);
    if (!teacherLevels.has(getEntityLevel(classItem))) {
        console.warn(`ALGORITMA İHLALİ: ${teacher.name} öğretmeni, ${classItem.name} sınıfına atanamaz. Seviye uyumsuz. Bu görev atlandı.`);
        continue;
    }

    const currentTeacherLevelHours = teacherLevelActualHours.get(teacherId)?.get(classLevel) || 0;
    const targetTeacherLevelHours = teacherLevelTargets.get(teacherId)?.get(classLevel) || 0;
    
    if (currentTeacherLevelHours + blockLength > targetTeacherLevelHours) {
      taskToAttempt.isPlaced = false;
      continue;
    }

    let placed = false;
    for (const day of [...DAYS].sort(() => Math.random() - 0.5)) {
        for (let i = 0; i <= PERIODS.length - blockLength; i++) {
            let isAvailable = true;
            for (let j = 0; j < blockLength; j++) {
                const period = PERIODS[i+j];
                const slotKey = `${day}-${period}`;
                if (teacherAvailability.get(teacherId)?.has(slotKey) || classAvailability.get(classId)?.has(slotKey) || constraintMap.get(`subject-${subjectId}-${day}-${period}`) === 'unavailable' || constraintMap.get(`teacher-${teacherId}-${day}-${period}`) === 'unavailable' || constraintMap.get(`class-${classId}-${day}-${period}`) === 'unavailable' ) {
                    isAvailable = false;
                    break;
                }
            }
            if (isAvailable) {
                for (let j = 0; j < blockLength; j++) {
                    const period = PERIODS[i + j];
                    const slotKey = `${day}-${period}`;
                    classScheduleGrids[classId][day][period] = { subjectId, teacherId, classId, isFixed: false };
                    teacherAvailability.get(teacherId)!.add(slotKey);
                    classAvailability.get(classId)!.add(slotKey);
                }
                teacherLevelActualHours.get(teacherId)?.set(classLevel, currentTeacherLevelHours + blockLength);
                placed = true;
                taskToAttempt.isPlaced = true;
                break;
            }
        }
        if (placed) break;
    }
  }
  
  // --- AŞAMA 4: SONUÇLARI DERLE ---
  const teacherSchedules: { [teacherId: string]: Schedule['schedule'] } = {};
  selectedTeacherIds.forEach(teacherId => { teacherSchedules[teacherId] = {}; DAYS.forEach(day => teacherSchedules[teacherId][day] = {}); });
  Object.entries(classScheduleGrids).forEach(([classId, grid]) => { Object.entries(grid).forEach(([day, periods]) => { Object.entries(periods).forEach(([period, slot]) => { if (slot && slot.teacherId && !slot.isFixed) { teacherSchedules[slot.teacherId][day][period] = { classId, subjectId: slot.subjectId }; } }); }); });
  const finalSchedules = Object.entries(teacherSchedules).map(([teacherId, schedule]) => ({ teacherId, schedule, updatedAt: new Date() }));
  
  let totalLessonsToPlace = 0;
  teacherLevelTargets.forEach(levelMap => levelMap.forEach(hours => totalLessonsToPlace += hours));
  
  let placedLessons = 0;
  teacherLevelActualHours.forEach(levelMap => levelMap.forEach(hours => placedLessons += hours));

  const finalUnassignedLessons: { [key: string]: any } = {};
  if (placedLessons < totalLessonsToPlace) {
    teacherLevelTargets.forEach((levelMap, teacherId) => {
        levelMap.forEach((targetHours, level) => {
            const actualHours = teacherLevelActualHours.get(teacherId)?.get(level) || 0;
            if (actualHours < targetHours) {
                const missing = targetHours - actualHours;
                const teacherName = allTeachers.find(t => t.id === teacherId)?.name || '?';
                const key = `${teacherName}-${level}`;
                if (!finalUnassignedLessons[key]) { finalUnassignedLessons[key] = { teacherName, level, missingHours: 0 }; }
                finalUnassignedLessons[key].missingHours += missing;
            }
        });
    });
  }

  const warnings: string[] = [];
  if (placedLessons < totalLessonsToPlace) { warnings.push("Tüm ders saatleri yerleştirilemedi. Kısıtlamalar ve yoğun programlar nedeniyle bazı dersler boşta kalmış olabilir."); }
  
  console.log(`✅ Program oluşturma tamamlandı. Süre: ${(Date.now() - startTime) / 1000} saniye. Sonuç: ${placedLessons} / ${totalLessonsToPlace}`);
  
  return {
    success: true,
    schedules: finalSchedules,
    statistics: { totalLessonsToPlace, placedLessons, unassignedLessons: Object.values(finalUnassignedLessons) },
    warnings,
    errors: [],
  };
}
// --- END OF FILE src/utils/scheduleGeneration.ts ---