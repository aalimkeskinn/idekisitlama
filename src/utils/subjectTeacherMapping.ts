// --- START OF FILE src/utils/subjectTeacherMapping.ts ---

import { Teacher, Class, Subject, parseDistributionPattern } from '../types';
import { WizardData, SubjectTeacherMapping } from '../types/wizard';

function getEntityLevel(entity: Teacher | Class): 'Anaokulu' | 'İlkokul' | 'Ortaokul' {
    return (entity as any).level || (entity as any).levels?.[0] || 'İlkokul';
}

export function createSubjectTeacherMappings(
  wizardData: WizardData,
  allTeachers: Teacher[],
  allClasses: Class[],
  allSubjects: Subject[]
): { mappings: SubjectTeacherMapping[], errors: string[] } {
  
  const mappings: SubjectTeacherMapping[] = [];
  const errors: string[] = [];

  const selectedClassIds = new Set(wizardData.classes.selectedClasses);
  const selectedSubjectIds = new Set(wizardData.subjects.selectedSubjects);
  const selectedTeacherIds = new Set(wizardData.teachers.selectedTeachers);

  for (const classId of selectedClassIds) {
    const classItem = allClasses.find(c => c.id === classId);
    if (!classItem || !classItem.assignments || classItem.assignments.length === 0) continue;

    for (const assignment of classItem.assignments) {
      const teacherId = assignment.teacherId;
      const teacher = allTeachers.find(t => t.id === teacherId);

      if (!selectedTeacherIds.has(teacherId) || !teacher) continue;
      
      // *** YENİ: Seviye uyumluluğunu burada kontrol et ***
      const teacherLevels = new Set(teacher.levels || [teacher.level]);
      const classLevel = getEntityLevel(classItem);
      if (!teacherLevels.has(classLevel)) {
          errors.push(`UYARI: ${teacher.name} (${[...teacherLevels].join(', ')}) öğretmeni, ${classItem.name} (${classLevel}) sınıfının seviyesiyle uyumsuz. Bu atama yoksayıldı.`);
          continue; // Bu öğretmeni bu sınıf için atla
      }

      for (const subjectId of assignment.subjectIds) {
        if (!selectedSubjectIds.has(subjectId)) continue;
        
        const subject = allSubjects.find(s => s.id === subjectId);
        if (!subject) continue;
        
        const mappingExists = mappings.some(m => m.classId === classId && m.subjectId === subjectId);
        if (!mappingExists) {
          const weeklyHours = subject.weeklyHours;
          const distribution = subject.distributionPattern ? parseDistributionPattern(subject.distributionPattern) : undefined;

          const task: SubjectTeacherMapping = {
            id: `${classId}-${subjectId}`, classId, subjectId, teacherId, weeklyHours,
            assignedHours: 0, distribution, priority: 'medium',
          };

          if (distribution && distribution.reduce((a, b) => a + b, 0) !== weeklyHours) {
            errors.push(`UYARI: ${classItem.name} > ${subject.name} dersinin dağıtım şekli (${subject.distributionPattern}) haftalık saatle (${weeklyHours}) uyuşmuyor. Ders 1'er saatlik bloklar halinde yerleştirilecek.`);
            delete task.distribution;
          }
          
          mappings.push(task);
        }
      }
    }
  }
  
  if (mappings.length === 0 && selectedSubjectIds.size > 0) {
    errors.push("Hiçbir geçerli ders ataması bulunamadı. Lütfen 'Sınıflar' ekranından öğretmenlere ders atadığınızdan ve sihirbazda ilgili tüm (sınıf, öğretmen, ders) öğeleri seçtiğinizden emin olun.");
  }

  return { mappings, errors };
}

// --- END OF FILE src/utils/subjectTeacherMapping.ts ---