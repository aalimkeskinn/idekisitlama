// --- START OF FILE src/types/wizard.ts ---

import { Schedule } from './index'; // Projenizdeki ana type dosyasından import
import { TimeConstraint } from './constraints'; // Projenizdeki constraints dosyasından import

/**
 * Sihirbaz boyunca toplanan tüm verileri tutan ana arayüz.
 * Bu, ScheduleWizard.tsx component'inin state'inde tutulan yapıdır.
 */
export interface WizardData {
  basicInfo: {
    name: string;
    academicYear: string;
    semester: string;
    startDate: string;
    endDate: string;
    description: string;
    institutionTitle: string;
    dailyHours: number;
    weekDays: number;
    weekendClasses: boolean;
  };
  subjects: {
    selectedSubjects: string[];
    subjectHours: { [subjectId: string]: number };
    subjectPriorities: { [subjectId: string]: 'high' | 'medium' | 'low' };
  };
  classes: {
    selectedClasses: string[];
    classCapacities: { [classId: string]: number };
    classPreferences: { [classId: string]: string[] };
  };
  classrooms: any[]; // Bu tipi projenizin ilerleyen aşamalarında `Classroom[]` olarak güncelleyebilirsiniz.
  teachers: {
    selectedTeachers: string[];
    teacherSubjects: { [teacherId: string]: string[] };
    teacherMaxHours: { [teacherId: string]: number };
    teacherPreferences: { [teacherId: string]: string[] };
  };
  constraints: {
    timeConstraints: TimeConstraint[];
    globalRules: {
      maxDailyHoursTeacher: number;
      maxDailyHoursClass: number;
      maxConsecutiveHours: number;
      avoidConsecutiveSameSubject: boolean;
      preferMorningHours: boolean;
      avoidFirstLastPeriod: boolean;
      lunchBreakRequired: boolean;
      lunchBreakDuration: number;
      useDistributionPatterns?: boolean; // YENİ: Dağıtım şekillerini kullan
      preferBlockScheduling?: boolean; // YENİ: Blok ders yerleştirmeyi tercih et
      enforceDistributionPatterns?: boolean; // YENİ: Dağıtım şekillerine kesinlikle uy
      maximumBlockSize?: number; // YENİ: Maksimum blok boyutu
    };
  };
  generationSettings: {
    algorithm: 'balanced' | 'compact' | 'distributed';
    prioritizeTeacherPreferences: boolean;
    prioritizeClassPreferences: boolean;
    allowOverlaps: boolean;
    generateMultipleOptions: boolean;
    optimizationLevel: 'fast' | 'balanced' | 'thorough';
  };
}


/**
 * Hangi dersin, hangi sınıfa, hangi öğretmen tarafından, kaç saat verileceğinin planıdır.
 * Program oluşturma algoritmasının "görev listesi" olarak düşünebilirsiniz.
 */
export interface SubjectTeacherMapping {
  id: string; // Benzersiz ID (örn: classId-subjectId)
  classId: string;
  subjectId: string;
  teacherId: string; // Bu eşleştirmeyi yapacak öğretmen
  weeklyHours: number; // Bu ders bu sınıfta haftada kaç saat olacak
  assignedHours: number; // Algoritma tarafından kaç saatinin atandığı (başlangıçta 0)
  distribution?: number[]; // YENİ: Dersin dağıtım şekli (örn: [2, 2, 2])
  priority: 'high' | 'medium' | 'low';
}

/**
 * Program oluşturma işlemi tamamlandığında dönecek olan sonuç yapısı.
 * Başarı durumu, istatistikler ve hatalar hakkında detaylı bilgi içerir.
 */
export interface EnhancedGenerationResult {
  success: boolean;
  schedules: Omit<Schedule, 'id' | 'createdAt'>[]; // Oluşturulan programlar (henüz ID'siz)
  statistics: {
    totalLessonsToPlace: number;
    placedLessons: number;
    unassignedLessons: {
      className: string;
      subjectName: string;
      teacherName: string;
      missingHours: number;
    }[];
  };
  warnings: string[];
  errors: string[];
}


/**
 * Sihirbaz durumunu bir şablon olarak kaydetmek için kullanılan arayüz.
 * Bu, `schedule-templates` koleksiyonunuzun yapısını temsil eder.
 */
export interface ScheduleTemplate {
  id: string;
  name: string;
  description: string;
  academicYear: string;
  semester: string;
  updatedAt: Date;
  wizardData: WizardData; // Sihirbazın o anki tüm verilerini saklar
  generatedSchedules: any[]; // Oluşturulmuş programları saklamak için (isteğe bağlı)
  status: 'draft' | 'published' | 'archived';
}

// --- END OF FILE src/types/wizard.ts ---