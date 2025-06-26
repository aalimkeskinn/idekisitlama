// --- START OF FILE src/utils/scheduleGeneration.ts ---

import { DAYS, PERIODS, Schedule, Teacher, Class, Subject, ScheduleSlot } from '../types';
import { SubjectTeacherMapping, EnhancedGenerationResult } from '../types/wizard';
import { TimeConstraint } from '../types/constraints';

/**
 * Belirli bir sınıf için TÜM sabit periyotları (Yemek, Hazırlık, Kahvaltılar vb.) program ızgarasına ekler.
 */
function addFixedPeriodsToGrid(grid: Schedule['schedule'], classLevel: 'Anaokulu' | 'İlkokul' | 'Ortaokul') {
  const fixedSlot: ScheduleSlot = { isFixed: true };
  const lunchPeriod = (classLevel === 'Ortaokul') ? '6' : '5';
  const fixedPeriodsMap: { [period: string]: ScheduleSlot } = {
    'prep': { ...fixedSlot, subjectId: 'Hazırlık/Kahvaltı' },
    'afternoon-breakfast': { ...fixedSlot, subjectId: 'İkindi Kahvaltısı' },
    [lunchPeriod]: { ...fixedSlot, subjectId: 'Yemek' },
  };
  if (classLevel === 'Ortaokul') {
    fixedPeriodsMap['breakfast'] = { ...fixedSlot, subjectId: 'Kahvaltı' };
  }
  DAYS.forEach(day => {
    Object.entries(fixedPeriodsMap).forEach(([period, slotData]) => {
      grid[day][period] = slotData;
    });
  });
}

/**
 * Sistematik olarak, çakışmaları ve zaman kısıtlamalarını dikkate alarak ders programını oluşturur.
 * Bu versiyon, kilitlenmeleri önlemek için esnek bir "ders havuzu" ve "rastgele deneme" stratejisi kullanır.
 */
export function generateSystematicSchedule(
  mappings: SubjectTeacherMapping[],
  allTeachers: Teacher[],
  allClasses: Class[],
  allSubjects: Subject[],
  timeConstraints: TimeConstraint[]
): EnhancedGenerationResult {
  
  const startTime = Date.now();
  console.log('🚀 Program oluşturma başlatıldı (v4 - Esnek Yerleştirme)...');

  const classScheduleGrids: { [classId: string]: Schedule['schedule'] } = {};
  const teacherAvailability: { [teacherId: string]: Set<string> } = {};

  // 1. Gerekli yapıları başlat
  allClasses.forEach(c => {
    if (mappings.some(m => m.classId === c.id)) {
      classScheduleGrids[c.id] = {};
      DAYS.forEach(day => { classScheduleGrids[c.id][day] = {}; });
      addFixedPeriodsToGrid(classScheduleGrids[c.id], c.level);
    }
  });
  allTeachers.forEach(t => { teacherAvailability[t.id] = new Set<string>(); });
  
  timeConstraints.forEach(constraint => {
    if (constraint.constraintType === 'unavailable') {
      const slotKey = `${constraint.day}-${constraint.period}`;
      if (constraint.entityType === 'teacher' && teacherAvailability[constraint.entityId]) {
        teacherAvailability[constraint.entityId].add(slotKey);
      }
    }
  });

  // --- YENİ ALGORİTMA MANTIĞI: DERS HAVUZU ---
  
  // 2. Yerleştirilecek tüm ders saatlerini bir "görev havuzu" olarak oluştur.
  const lessonPlacementPool: SubjectTeacherMapping[] = [];
  mappings.forEach(mapping => {
    for (let i = 0; i < mapping.weeklyHours; i++) {
      // Her bir ders saatini ayrı bir görev olarak havuza ekle
      lessonPlacementPool.push({ ...mapping, assignedHours: 0 }); // Her biri ayrı bir görev
    }
  });

  // 3. Görev havuzunu karıştırarak rastgelelik ve esneklik sağla.
  lessonPlacementPool.sort(() => Math.random() - 0.5);

  let placedLessonsCount = 0;
  
  // 4. Havuzdaki her bir ders saatini uygun bir slota yerleştirmeye çalış.
  for (const lessonToPlace of lessonPlacementPool) {
    let placed = false;
    const shuffledDays = [...DAYS].sort(() => Math.random() - 0.5);

    for (const day of shuffledDays) {
      const shuffledPeriods = [...PERIODS].sort(() => Math.random() - 0.5);
      for (const period of shuffledPeriods) {
        
        const slotKey = `${day}-${period}`;
        
        const isClassSlotFree = !classScheduleGrids[lessonToPlace.classId]?.[day]?.[period];
        const isTeacherSlotFree = !teacherAvailability[lessonToPlace.teacherId]?.has(slotKey);

        if (isClassSlotFree && isTeacherSlotFree) {
          // ATAMAYI YAP
          classScheduleGrids[lessonToPlace.classId][day][period] = {
            subjectId: lessonToPlace.subjectId, teacherId: lessonToPlace.teacherId, classId: lessonToPlace.classId,
          };

          // DOLULUK KAYITLARINI GÜNCELLE
          teacherAvailability[lessonToPlace.teacherId].add(slotKey);
          placed = true;
          break; // Bu ders saatini yerleştirdik, havuzdaki sonraki derse geç.
        }
      }
      if (placed) break; // Gün döngüsünden çık.
    }
    
    if (placed) {
        placedLessonsCount++;
        // `mappings` içindeki asıl nesnenin sayacını artırarak istatistikleri doğru tut
        const originalMapping = mappings.find(m => m.id === lessonToPlace.id);
        if (originalMapping) originalMapping.assignedHours++;
    }
  }
  
  // --- SONUÇLARI OLUŞTURMA (Aynı) ---

  const teacherSchedules: { [teacherId: string]: Schedule['schedule'] } = {};
  Object.values(classScheduleGrids).forEach(classGrid => {
    Object.entries(classGrid).forEach(([day, periods]) => {
      Object.entries(periods).forEach(([period, slot]) => {
        if (slot && slot.teacherId && !slot.isFixed) {
          if (!teacherSchedules[slot.teacherId]) { teacherSchedules[slot.teacherId] = {}; }
          if (!teacherSchedules[slot.teacherId][day]) { teacherSchedules[slot.teacherId][day] = {}; }
          teacherSchedules[slot.teacherId][day][period] = { classId: slot.classId, subjectId: slot.subjectId, isFixed: false };
        }
      });
    });
  });

  const finalSchedules = Object.entries(teacherSchedules).map(([teacherId, schedule]) => ({
    teacherId, schedule, updatedAt: new Date(),
  }));

  const stats = { totalLessonsToPlace: lessonPlacementPool.length, placedLessons: placedLessonsCount, unassignedLessons: [] as any[] };
  mappings.forEach(m => {
    if (m.assignedHours < m.weeklyHours) {
      stats.unassignedLessons.push({
        className: allClasses.find(c => c.id === m.classId)?.name,
        subjectName: allSubjects.find(s => s.id === m.subjectId)?.name,
        teacherName: allTeachers.find(t => t.id === m.teacherId)?.name,
        missingHours: m.weeklyHours - m.assignedHours
      });
    }
  });

  console.log(`✅ Program oluşturma tamamlandı. Süre: ${(Date.now() - startTime) / 1000} saniye.`);
  console.log(`📊 İstatistik: ${stats.placedLessons} / ${stats.totalLessonsToPlace} ders yerleştirildi.`);

  return {
    success: true,
    schedules: finalSchedules,
    statistics: stats,
    warnings: stats.unassignedLessons.length > 0 ? ["Bazı dersler programda tam olarak yerleştirilemedi."] : [],
    errors: [],
  };
}
// --- END OF FILE src/utils/scheduleGeneration.ts ---