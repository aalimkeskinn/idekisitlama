// --- START OF FILE src/utils/csvParser.ts ---

import { Teacher, Class, Subject } from '../types';

export interface ParsedCSVData {
  teachers: Map<string, Partial<Teacher>>;
  classes: Map<string, Partial<Class & { tempAssignments: Map<string, Set<string>>, classTeacherName: string | null }>>;
  subjects: Map<string, Partial<Subject>>;
  classSubjectTeacherLinks: { className: string, subjectKey: string, teacherName: string }[];
  errors: string[];
}

const normalizeLevel = (level: string): ('Anaokulu' | 'İlkokul' | 'Ortaokul') | null => {
    if (typeof level !== 'string' || !level.trim()) return null;
    const lowerLevel = level.trim().toLocaleLowerCase('tr-TR');
    if (lowerLevel.includes('anaokul')) return 'Anaokulu';
    if (lowerLevel.includes('ilkokul')) return 'İlkokul';
    if (lowerLevel.includes('ortaokul')) return 'Ortaokul';
    return null;
};

export const parseComprehensiveCSV = (csvContent: string): ParsedCSVData => {
  const teachers = new Map<string, Partial<Teacher>>();
  const classes = new Map<string, Partial<Class & { tempAssignments: Map<string, Set<string>>, classTeacherName: string | null }>>();
  const subjects = new Map<string, Partial<Subject>>();
  const classSubjectTeacherLinks: { className: string, subjectKey: string, teacherName: string }[] = [];
  const errors: string[] = [];

  const lines = csvContent.split('\n').filter(line => line.trim() && !line.startsWith(';'));
  const dataLines = lines.slice(1);

  dataLines.forEach((line, index) => {
    const cleanLine = line.replace(/^\uFEFF/, '').replace(/\r$/, '');
    const columns = cleanLine.split(';').map(col => (col || '').trim().replace(/^"|"$/g, ''));
    if (columns.length < 6) {
      if (line.trim()) errors.push(`${index + 2}. satırda eksik sütun var.`);
      return;
    }
    
    const [teacherNameStr, branchStr, levelStr, subjectNameStr, classNameStr, weeklyHoursStr, distributionPatternStr] = columns;
    
    if (!teacherNameStr || !branchStr || !levelStr || !subjectNameStr || !classNameStr) {
      if(line.trim()) errors.push(`${index + 2}. satırda zorunlu alanlardan biri (öğretmen, branş, seviye, ders, sınıf) eksik.`);
      return;
    }
    
    const levels = levelStr.split('|').map(l => normalizeLevel(l.trim())).filter((l): l is 'Anaokulu' | 'İlkokul' | 'Ortaokul' => !!l);
    if (levels.length === 0) {
      errors.push(`${index + 2}. satırda geçersiz seviye: "${levelStr}"`);
      return;
    }

    const teacherNames = teacherNameStr.split('/').map(t => t.trim());
    const branches = branchStr.split('/').map(b => b.trim());
    const classNames = classNameStr.split('/').map(cn => cn.trim());
    const weeklyHours = parseInt(weeklyHoursStr, 10) || 0;
    
    const subjectKey = `${subjectNameStr.toLowerCase()}-${branches.join('/').toLowerCase()}-${teacherNameStr.toLowerCase()}-${levelStr.toLowerCase()}-${weeklyHours}`;
    
    if (!subjects.has(subjectKey)) {
        subjects.set(subjectKey, {
            name: subjectNameStr,
            branch: branches.join(' / '),
            levels: levels,
            level: levels[0],
            weeklyHours: weeklyHours,
            distributionPattern: distributionPatternStr || undefined,
        });
    }
    
    teacherNames.forEach(teacherName => {
        if (!teachers.has(teacherName)) {
            teachers.set(teacherName, { name: teacherName, branches: new Set(), levels: new Set(), totalWeeklyHours: 0 });
        }
        const teacherEntry = teachers.get(teacherName)!;
        (teacherEntry.totalWeeklyHours as number) += weeklyHours; // *** ANA DEĞİŞİKLİK: Toplam saati artır ***
        branches.forEach(branch => (teacherEntry.branches as Set<string>).add(branch));
        levels.forEach(l => (teacherEntry.levels as Set<any>).add(l));
    });

    classNames.forEach(className => {
        teacherNames.forEach(teacherName => {
          classSubjectTeacherLinks.push({ className, subjectKey, teacherName });
        });
        
        if (!classes.has(className)) {
            classes.set(className, { 
              name: className, 
              level: levels[0], 
              levels, 
              classTeacherName: null, 
              tempAssignments: new Map() 
            });
        }
        
        if (branches.some(b => b.toUpperCase().includes('SINIF ÖĞRETMENLİĞİ'))) {
            classes.get(className)!.classTeacherName = teacherNames[0];
        }
    });
  });

  teachers.forEach(teacher => {
    teacher.branches = Array.from(teacher.branches as Set<string>);
    teacher.levels = Array.from(teacher.levels as Set<any>);
    teacher.branch = (teacher.branches as string[]).join(' / ');
    teacher.level = (teacher.levels as any[])[0] || 'İlkokul';
  });

  return { teachers, classes, subjects, classSubjectTeacherLinks, errors };
};

// --- END OF FILE src/utils/csvParser.ts ---