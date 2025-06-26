import React, { useState, useEffect } from 'react';
import { Calendar, Users, BookOpen, Building, Save, RotateCcw, AlertTriangle, X, Check, Filter, Clock } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Teacher, Class, Subject, Schedule, DAYS, PERIODS, getTimeForPeriod, formatTimeRange } from '../types';
import { useFirestore } from '../hooks/useFirestore';
import { useToast } from '../hooks/useToast';
import { useConfirmation } from '../hooks/useConfirmation';
import { useErrorModal } from '../hooks/useErrorModal';
import { TimeConstraint } from '../types/constraints';
import { checkSlotConflict, validateScheduleWithConstraints } from '../utils/scheduleValidation';
import Button from '../components/UI/Button';
import Select from '../components/UI/Select';
import ScheduleSlotModal from '../components/UI/ScheduleSlotModal';
import ConfirmationModal from '../components/UI/ConfirmationModal';
import ErrorModal from '../components/UI/ErrorModal';

const Schedules = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: teachers } = useFirestore<Teacher>('teachers');
  const { data: classes } = useFirestore<Class>('classes');
  const { data: subjects } = useFirestore<Subject>('subjects');
  const { data: schedules, add: addSchedule, update: updateSchedule, remove: removeSchedule } = useFirestore<Schedule>('schedules');
  const { data: timeConstraints } = useFirestore<TimeConstraint>('constraints');
  const { success, error, warning } = useToast();
  const { confirmation, showConfirmation, hideConfirmation, confirmUnsavedChanges } = useConfirmation();
  const { errorModal, showError, hideError } = useErrorModal();

  const [mode, setMode] = useState<'teacher' | 'class'>('teacher');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [currentSchedule, setCurrentSchedule] = useState<Schedule['schedule']>({});
  const [originalSchedule, setOriginalSchedule] = useState<Schedule['schedule']>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  
  const [selectedLevel, setSelectedLevel] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [showScheduleTable, setShowScheduleTable] = useState(false);

  const createEmptyScheduleGrid = (): Schedule['schedule'] => {
    const grid: Schedule['schedule'] = {};
    DAYS.forEach(day => {
      grid[day] = {};
      PERIODS.forEach(period => { grid[day][period] = null; });
    });
    return grid;
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const modeParam = params.get('mode');
    const teacherId = params.get('teacherId');
    const classId = params.get('classId');

    if (modeParam === 'class' && classId) {
      setMode('class');
      setSelectedClassId(classId);
    } else if (teacherId) {
      setMode('teacher');
      setSelectedTeacherId(teacherId);
    }
  }, [location]);

  useEffect(() => {
    let newSchedule = createEmptyScheduleGrid();

    if (mode === 'teacher' && selectedTeacherId) {
      const existingSchedule = schedules.find(s => s.teacherId === selectedTeacherId);
      if (existingSchedule) {
        Object.assign(newSchedule, JSON.parse(JSON.stringify(existingSchedule.schedule)));
      }
    } else if (mode === 'class' && selectedClassId) {
      schedules.forEach(schedule => {
        Object.entries(schedule.schedule).forEach(([day, daySlots]) => {
          Object.entries(daySlots).forEach(([period, slot]) => {
            if (slot?.classId === selectedClassId) {
              if (!newSchedule[day]) newSchedule[day] = {};
              newSchedule[day][period] = { ...slot, teacherId: schedule.teacherId };
            }
          });
        });
      });
    }
    setCurrentSchedule(newSchedule);
    setOriginalSchedule(JSON.parse(JSON.stringify(newSchedule)));
    setHasUnsavedChanges(false);
  }, [mode, selectedTeacherId, selectedClassId, schedules]);

  useEffect(() => {
    setHasUnsavedChanges(JSON.stringify(currentSchedule) !== JSON.stringify(originalSchedule));
  }, [currentSchedule, originalSchedule]);
  
  useEffect(() => {
    setShowScheduleTable(
      (mode === 'teacher' && !!selectedTeacherId && !!selectedLevel && !!selectedSubject) ||
      (mode === 'class' && !!selectedClassId)
    );
  }, [mode, selectedTeacherId, selectedClassId, selectedLevel, selectedSubject]);

  const selectedTeacher = teachers.find(t => t.id === selectedTeacherId);
  const selectedClass = classes.find(c => c.id === selectedClassId);

  const getTeacherLevels = (teacher: Teacher | undefined): string[] => {
    if (!teacher) return [];
    return teacher.levels || [teacher.level];
  };

  const getTeacherBranches = (teacher: Teacher | undefined): string[] => {
    if (!teacher) return [];
    return teacher.branches || [teacher.branch];
  };

  const levelOptions = selectedTeacher 
    ? getTeacherLevels(selectedTeacher).map(level => ({ value: level, label: level }))
    : [];
  
  const getSubjectOptions = () => {
    if (!selectedTeacher || !selectedLevel) return [];
    const teacherBranches = getTeacherBranches(selectedTeacher);
    return subjects
      .filter(subject => 
        teacherBranches.includes(subject.branch) && 
        (subject.levels || [subject.level]).includes(selectedLevel as any)
      )
      .map(subject => ({ value: subject.id, label: subject.name }));
  };

  const subjectOptions = getSubjectOptions();

  const getFilteredClasses = () => {
    if (mode !== 'teacher' || !selectedLevel || !selectedSubject) return classes;
    const selectedSubjectObj = subjects.find(s => s.id === selectedSubject);
    if (!selectedSubjectObj) return classes;
    return classes.filter(classItem => {
      const classLevels = classItem.levels || [classItem.level];
      return classLevels.includes(selectedLevel as any);
    });
  };

  const filteredClasses = getFilteredClasses();
  const sortedClasses = [...filteredClasses].sort((a, b) => a.name.localeCompare(b.name, 'tr'));

  const handleSlotClick = (day: string, period: string) => {
    if (currentSchedule[day]?.[period]?.isFixed) return;
    setSelectedDay(day);
    setSelectedPeriod(period);
    setIsSlotModalOpen(true);
  };

  // DÜZELTME 1: handleSaveSlot
  const handleSaveSlot = (subjectId: string, classId: string, teacherId?: string) => {
    if (!selectedDay || !selectedPeriod) return;
    
    const isClearing = mode === 'teacher' ? !classId : !teacherId;
    
    if (!isClearing) {
        const conflictResult = checkSlotConflict(mode, selectedDay, selectedPeriod, mode === 'teacher' ? classId : teacherId!, mode === 'teacher' ? selectedTeacherId : selectedClassId, schedules, teachers, classes);
        if (conflictResult.hasConflict) {
            showError('Çakışma Tespit Edildi', conflictResult.message);
            return;
        }
    }

    setCurrentSchedule(prev => {
      const newSchedule = JSON.parse(JSON.stringify(prev));
      if (!newSchedule[selectedDay]) newSchedule[selectedDay] = {};
      
      if (isClearing) {
        newSchedule[selectedDay][selectedPeriod] = null;
      } else {
        if (mode === 'teacher') {
          newSchedule[selectedDay][selectedPeriod] = { classId, subjectId: selectedSubject || subjectId };
        } else {
          newSchedule[selectedDay][selectedPeriod] = { teacherId, subjectId, classId: selectedClassId };
        }
      }
      return newSchedule;
    });
    setIsSlotModalOpen(false);
  };

  const handleSaveSchedule = async () => {
    const validationResult = validateScheduleWithConstraints(mode, currentSchedule, mode === 'teacher' ? selectedTeacherId : selectedClassId, schedules, teachers, classes, subjects, timeConstraints);
    if (!validationResult.isValid) {
      showError('Program Kaydedilemedi', `Aşağıdaki sorunları düzeltin:\n\n${validationResult.errors.join('\n')}`);
      return;
    }
    if (validationResult.warnings.length > 0) {
      showConfirmation({ title: 'Uyarılar Mevcut', message: `Aşağıdaki uyarılar mevcut:\n\n${validationResult.warnings.join('\n')}\n\nYine de kaydetmek istiyor musunuz?`, type: 'warning', confirmText: 'Yine de Kaydet', cancelText: 'İptal', confirmVariant: 'primary' }, handleConfirmSave);
      return;
    }
    await handleConfirmSave();
  };
  
  // DÜZELTME 2: handleConfirmSave
  const handleConfirmSave = async () => {
    setIsSaving(true);
    try {
        if (mode === 'teacher') {
            const existingSchedule = schedules.find(s => s.teacherId === selectedTeacherId);
            const scheduleData = { schedule: currentSchedule, updatedAt: new Date() };
            if (existingSchedule) {
                await updateSchedule(existingSchedule.id, scheduleData);
            } else {
                await addSchedule({ teacherId: selectedTeacherId, ...scheduleData } as Omit<Schedule, 'id' | 'createdAt'>);
            }
            success('✅ Program Kaydedildi', `${selectedTeacher?.name} programı başarıyla güncellendi.`);
        } else {
            const affectedTeacherIds = new Set<string>();
            Object.values(originalSchedule).forEach(day => Object.values(day || {}).forEach(slot => { if(slot?.teacherId) affectedTeacherIds.add(slot.teacherId)}));
            Object.values(currentSchedule).forEach(day => Object.values(day || {}).forEach(slot => { if(slot?.teacherId) affectedTeacherIds.add(slot.teacherId)}));

            for (const teacherId of affectedTeacherIds) {
                const existingSchedule = schedules.find(s => s.teacherId === teacherId);
                const newTeacherSchedule = existingSchedule ? JSON.parse(JSON.stringify(existingSchedule.schedule)) : createEmptyScheduleGrid();

                DAYS.forEach(day => PERIODS.forEach(period => {
                    if (newTeacherSchedule[day]?.[period]?.classId === selectedClassId) {
                        newTeacherSchedule[day][period] = null;
                    }
                    const newSlot = currentSchedule[day]?.[period];
                    if (newSlot?.teacherId === teacherId) {
                        newTeacherSchedule[day][period] = { classId: selectedClassId, subjectId: newSlot.subjectId };
                    }
                }));
                
                const hasAnyLesson = Object.values(newTeacherSchedule).some(day => Object.values(day).some(slot => slot !== null));
                
                if (existingSchedule) {
                    if (hasAnyLesson) {
                        await updateSchedule(existingSchedule.id, { schedule: newTeacherSchedule, updatedAt: new Date() });
                    } else {
                        await removeSchedule(existingSchedule.id);
                    }
                } else if (hasAnyLesson) {
                    await addSchedule({ teacherId, schedule: newTeacherSchedule, updatedAt: new Date() } as Omit<Schedule, 'id' | 'createdAt'>);
                }
            }
            success('✅ Program Kaydedildi', `${selectedClass?.name} programı başarıyla güncellendi.`);
        }
        
        setOriginalSchedule(JSON.parse(JSON.stringify(currentSchedule)));
    } catch (err) {
        error('❌ Kayıt Hatası', 'Program kaydedilirken bir hata oluştu.');
    } finally {
        setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (hasUnsavedChanges) {
      showConfirmation({ title: 'Değişiklikleri Sıfırla', message: 'Kaydedilmemiş değişiklikler var. Sıfırlamak istediğinizden emin misiniz?', type: 'warning', confirmText: 'Sıfırla', cancelText: 'İptal', confirmVariant: 'danger' }, confirmReset);
    } else {
      confirmReset();
    }
  };

  const confirmReset = () => {
    setIsResetting(true);
    setCurrentSchedule(JSON.parse(JSON.stringify(originalSchedule)));
    setHasUnsavedChanges(false);
    setIsResetting(false);
    success('🔄 Program Sıfırlandı', 'Tüm değişiklikler sıfırlandı');
  };

  const handleModeChange = (newMode: 'teacher' | 'class') => {
    if (hasUnsavedChanges) {
      showConfirmation({ title: 'Kaydedilmemiş Değişiklikler', message: 'Kaydedilmemiş değişiklikler var. Devam etmek istediğinizden emin misiniz?', type: 'warning', confirmText: 'Devam Et', cancelText: 'İptal', confirmVariant: 'danger' }, () => confirmModeChange(newMode));
    } else {
      confirmModeChange(newMode);
    }
  };

  const confirmModeChange = (newMode: 'teacher' | 'class') => {
    setMode(newMode);
    setSelectedTeacherId('');
    setSelectedClassId('');
    setCurrentSchedule({});
    setOriginalSchedule({});
    setHasUnsavedChanges(false);
    setSelectedLevel('');
    setSelectedSubject('');
    setShowScheduleTable(false);
  };

  const getSlotInfo = (day: string, period: string) => {
    const slot = currentSchedule[day]?.[period];
    if (mode === 'teacher') {
      if (!slot?.classId || slot.classId === 'fixed-period') return null;
      const classItem = classes.find(c => c.id === slot.classId);
      const subject = subjects.find(s => s.id === slot.subjectId);
      return { classItem, subject };
    } else {
      if (!slot?.teacherId) return null;
      const teacher = teachers.find(t => t.id === slot.teacherId);
      const subject = subjects.find(s => s.id === slot.subjectId);
      return { teacher, subject };
    }
  };

  const getFixedPeriodInfo = (day: string, period: string, level?: 'Anaokulu' | 'İlkokul' | 'Ortaokul') => {
    const slot = currentSchedule[day]?.[period];
    if (!slot || slot.classId !== 'fixed-period') return null;
    if (slot.subjectId === 'fixed-prep') return { title: 'Hazırlık', subtitle: level === 'Ortaokul' ? '08:30-08:40' : '08:30-08:50', color: 'bg-blue-100 border-blue-300 text-blue-800' };
    if (slot.subjectId === 'fixed-breakfast') return { title: 'Kahvaltı', subtitle: '09:15-09:35', color: 'bg-orange-100 border-orange-300 text-orange-800' };
    if (slot.subjectId === 'fixed-lunch') return { title: 'Yemek', subtitle: level === 'İlkokul' || level === 'Anaokulu' ? '11:50-12:25' : '12:30-13:05', color: 'bg-green-100 border-green-300 text-green-800' };
    if (slot.subjectId === 'fixed-afternoon-breakfast') return { title: 'İkindi Kahvaltısı', subtitle: '14:35-14:45', color: 'bg-yellow-100 border-yellow-300 text-yellow-800' };
    return null;
  };

  const getTimeInfo = (period: string) => {
    const currentLevel = mode === 'teacher' ? selectedLevel as any : selectedClass?.level;
    const timePeriod = getTimeForPeriod(period, currentLevel);
    if (timePeriod) return formatTimeRange(timePeriod.startTime, timePeriod.endTime);
    return `${period}. Ders`;
  };

  const teacherOptions = teachers.map(teacher => ({ value: teacher.id, label: `${teacher.name} (${teacher.branch} - ${teacher.level})` }));
  const classOptions = sortedClasses.map(classItem => ({ value: classItem.id, label: `${classItem.name} (${classItem.level})` }));

  return (
    <div className="container-mobile">
      <div className="header-mobile">
        <div className="flex items-center">
          <Calendar className="w-8 h-8 text-purple-600 mr-3" />
          <div>
            <h1 className="text-responsive-xl font-bold text-gray-900">Program Oluşturucu</h1>
            <p className="text-responsive-sm text-gray-600">{mode === 'teacher' ? 'Öğretmen bazlı program oluşturun' : 'Sınıf bazlı program oluşturun'}</p>
          </div>
        </div>
        <div className="button-group-mobile">
          <Button onClick={() => handleModeChange('teacher')} variant={mode === 'teacher' ? 'primary' : 'secondary'} icon={Users} className="w-full sm:w-auto">Öğretmen Modu</Button>
          <Button onClick={() => handleModeChange('class')} variant={mode === 'class' ? 'primary' : 'secondary'} icon={Building} className="w-full sm:w-auto">Sınıf Modu</Button>
        </div>
      </div>

      <div className="mobile-card mobile-spacing mb-6">
        {mode === 'teacher' ? (
          <div className="space-y-4">
            <Select label="Öğretmen Seçin" value={selectedTeacherId} onChange={(value) => { if (hasUnsavedChanges) { confirmUnsavedChanges(() => { setSelectedTeacherId(value); setSelectedLevel(''); setSelectedSubject(''); setShowScheduleTable(false); }); } else { setSelectedTeacherId(value); setSelectedLevel(''); setSelectedSubject(''); setShowScheduleTable(false); }}} options={teacherOptions} required />
            {selectedTeacher && (<div className="p-4 bg-blue-50 rounded-lg border border-blue-200"><div className="flex items-center mb-2"><Users className="w-5 h-5 text-blue-600 mr-2" /><h3 className="font-medium text-blue-800">Öğretmen Bilgileri</h3></div><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><p className="text-sm text-blue-700"><span className="font-medium">Ad Soyad:</span> {selectedTeacher.name}</p><p className="text-sm text-blue-700"><span className="font-medium">Branş:</span> {getTeacherBranches(selectedTeacher).join(', ')}</p></div><div><p className="text-sm text-blue-700"><span className="font-medium">Seviye:</span> {getTeacherLevels(selectedTeacher).join(', ')}</p></div></div></div>)}
            {selectedTeacher && (<div className="space-y-4 p-4 bg-purple-50 rounded-lg border border-purple-200"><div className="flex items-center mb-2"><Filter className="w-5 h-5 text-purple-600 mr-2" /><h3 className="font-medium text-purple-800">Program Filtresi</h3></div><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><Select label="Eğitim Seviyesi Seçin" value={selectedLevel} onChange={setSelectedLevel} options={levelOptions} required />{selectedLevel && (<Select label="Ders Seçin" value={selectedSubject} onChange={setSelectedSubject} options={subjectOptions} required />)}</div>{!showScheduleTable && selectedLevel && selectedSubject && (<div className="flex justify-center"><Button onClick={() => setShowScheduleTable(true)} variant="primary" icon={Calendar}>Program Tablosunu Göster</Button></div>)}</div>)}
          </div>
        ) : (
          <Select label="Sınıf Seçin" value={selectedClassId} onChange={(value) => { if (hasUnsavedChanges) { confirmUnsavedChanges(() => { setSelectedClassId(value); }); } else { setSelectedClassId(value); }}} options={classOptions} required />
        )}
      </div>

      {showScheduleTable && (
        <div className="mobile-card overflow-hidden mb-6">
          <div className="p-4 bg-gray-50 border-b">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-3 sm:space-y-0">
              <div><h3 className="font-medium text-gray-900">{mode === 'teacher' ? `${selectedTeacher?.name || 'Öğretmen'} - ${selectedLevel} - ${subjects.find(s => s.id === selectedSubject)?.name || 'Ders'} Programı` : `${selectedClass?.name || 'Sınıf'} Programı`}</h3><p className="text-sm text-gray-600">{mode === 'teacher' ? `${selectedLevel} seviyesindeki ${subjects.find(s => s.id === selectedSubject)?.name || 'ders'} için program` : `${selectedClass?.level || ''} seviyesi`}</p></div>
              <div className="flex items-center space-x-2"><Button onClick={handleReset} icon={RotateCcw} variant="secondary" disabled={!hasUnsavedChanges || isResetting}>{isResetting ? 'Sıfırlanıyor...' : 'Sıfırla'}</Button><Button onClick={handleSaveSchedule} icon={Save} variant="primary" disabled={!hasUnsavedChanges || isSaving}>{isSaving ? 'Kaydediliyor...' : 'Kaydet'}</Button></div>
            </div>
          </div>
          {hasUnsavedChanges && (<div className="p-3 bg-yellow-50 border-b border-yellow-200"><div className="flex items-center"><AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" /><p className="text-sm text-yellow-700">Kaydedilmemiş değişiklikler var</p></div></div>)}
          <div className="table-responsive">
            <table className="min-w-full schedule-table">
              <thead className="bg-gray-50">
                <tr><th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Saat</th>{DAYS.map(day => (<th key={day} className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">{day}</th>))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr className="bg-blue-50"><td className="px-3 py-2 font-medium text-gray-900 bg-blue-100 text-sm"><div className="flex flex-col items-center"><span>Hazırlık</span><span className="text-xs text-gray-600 flex items-center mt-1"><Clock className="w-3 h-3 mr-1" />{mode === 'teacher' && selectedLevel === 'Ortaokul' ? '08:30-08:40' : '08:30-08:50'}</span></div></td>{DAYS.map(day => { const fixedInfo = getFixedPeriodInfo(day, 'prep', mode === 'teacher' ? selectedLevel as any : selectedClass?.level); return (<td key={`${day}-prep`} className="px-2 py-2"><div className="text-center p-2 bg-blue-50 rounded border border-blue-200"><div className="font-medium text-blue-900 text-sm">{fixedInfo?.title || 'Hazırlık'}</div></div></td>); })}</tr>
                {PERIODS.map(period => {
                  const isLunchPeriod = (((mode === 'teacher' ? selectedLevel : selectedClass?.level) === 'İlkokul' || (mode === 'teacher' ? selectedLevel : selectedClass?.level) === 'Anaokulu') && period === '5') || ((mode === 'teacher' ? selectedLevel : selectedClass?.level) === 'Ortaokul' && period === '6');
                  const showBreakfastAfter = (mode === 'teacher' ? selectedLevel : selectedClass?.level) === 'Ortaokul' && period === '1';
                  const showAfternoonBreakAfter = period === '8';
                  const timeInfo = getTimeInfo(period);
                  return (
                    <React.Fragment key={period}>
                      <tr className={isLunchPeriod ? 'bg-green-50' : ''}>
                        <td className={`px-3 py-2 font-medium text-gray-900 text-sm ${isLunchPeriod ? 'bg-green-100' : 'bg-gray-50'}`}>
                          <div className="flex flex-col items-center"><span>{isLunchPeriod ? 'Yemek' : `${period}.`}</span><span className="text-xs text-gray-600 flex items-center mt-1"><Clock className="w-3 h-3 mr-1" />{isLunchPeriod ? (((mode === 'teacher' ? selectedLevel : selectedClass?.level) === 'İlkokul' || (mode === 'teacher' ? selectedLevel : selectedClass?.level) === 'Anaokulu') ? '11:50-12:25' : '12:30-13:05') : timeInfo}</span></div>
                        </td>
                        {DAYS.map(day => {
                          if (isLunchPeriod) { const fixedInfo = getFixedPeriodInfo(day, period, mode === 'teacher' ? selectedLevel as any : selectedClass?.level); return (<td key={`${day}-${period}`} className="px-2 py-2"><div className="text-center p-2 bg-green-50 rounded border border-green-200"><div className="font-medium text-green-900 text-sm">Yemek</div></div></td>); }
                          const slotInfo = getSlotInfo(day, period);
                          return (<td key={`${day}-${period}`} className="px-2 py-2" onClick={() => handleSlotClick(day, period)}>{slotInfo ? (<div className="text-center p-2 bg-blue-50 rounded border border-blue-200 hover:bg-blue-100 cursor-pointer transition-colors">{mode === 'teacher' ? (<><div className="font-medium text-blue-900 text-sm">{slotInfo.classItem?.name}</div><div className="text-xs text-blue-700 mt-1">{slotInfo.subject?.name || selectedTeacher?.name}</div></>) : (<><div className="font-medium text-blue-900 text-sm">{slotInfo.teacher?.name}</div><div className="text-xs text-blue-700 mt-1">{slotInfo.subject?.name || ''}</div></>)}</div>) : (<div className="text-center p-2 bg-gray-50 rounded border border-transparent hover:border-gray-200 cursor-pointer transition-colors min-h-[50px] flex items-center justify-center"><div className="text-gray-400 text-xs">Boş</div></div>)}</td>);
                        })}
                      </tr>
                      {showBreakfastAfter && (<tr className="bg-yellow-50"><td className="px-3 py-2 font-medium text-gray-900 bg-yellow-100 text-sm"><div className="flex flex-col items-center"><span>Kahvaltı</span><span className="text-xs text-gray-600 flex items-center mt-1"><Clock className="w-3 h-3 mr-1" />09:15-09:35</span></div></td>{DAYS.map(day => { const fixedInfo = getFixedPeriodInfo(day, 'breakfast', mode === 'teacher' ? selectedLevel as any : selectedClass?.level); return (<td key={`${day}-breakfast`} className="px-2 py-2"><div className="text-center p-2 bg-yellow-50 rounded border border-yellow-200"><div className="font-medium text-yellow-900 text-sm">{fixedInfo?.title || 'Kahvaltı'}</div></div></td>); })}</tr>)}
                      {showAfternoonBreakAfter && (<tr className="bg-yellow-50"><td className="px-3 py-2 font-medium text-gray-900 bg-yellow-100 text-sm"><div className="flex flex-col items-center"><span>İkindi Kahvaltısı</span><span className="text-xs text-gray-600 flex items-center mt-1"><Clock className="w-3 h-3 mr-1" />14:35-14:45</span></div></td>{DAYS.map(day => (<td key={`${day}-afternoon-breakfast`} className="px-2 py-2"><div className="text-center p-2 bg-yellow-50 rounded border border-yellow-200"><div className="font-medium text-yellow-900 text-sm">İkindi Kahvaltısı</div></div></td>))}</tr>)}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {((mode === 'teacher' && !selectedTeacherId) || (mode === 'class' && !selectedClassId)) && (<div className="text-center py-12 mobile-card"><Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" /><h3 className="text-lg font-medium text-gray-900 mb-2">{mode === 'teacher' ? 'Öğretmen Seçin' : 'Sınıf Seçin'}</h3><p className="text-gray-500 mb-4">{mode === 'teacher' ? 'Program oluşturmak için bir öğretmen seçin' : 'Program oluşturmak için bir sınıf seçin'}</p></div>)}
      {mode === 'teacher' && selectedTeacherId && !showScheduleTable && (<div className="text-center py-12 mobile-card"><Filter className="w-16 h-16 text-gray-300 mx-auto mb-4" /><h3 className="text-lg font-medium text-gray-900 mb-2">Eğitim Seviyesi ve Ders Seçin</h3><p className="text-gray-500 mb-4">Program tablosunu görmek için yukarıdan eğitim seviyesi ve o seviyeye uygun bir ders seçimi yapın.</p></div>)}

      <ScheduleSlotModal isOpen={isSlotModalOpen} onClose={() => setIsSlotModalOpen(false)} onSave={handleSaveSlot} subjects={subjects} classes={sortedClasses} teachers={teachers} mode={mode} currentSubjectId={currentSchedule[selectedDay]?.[selectedPeriod]?.subjectId || selectedSubject} currentClassId={mode === 'teacher' ? currentSchedule[selectedDay]?.[selectedPeriod]?.classId || '' : selectedClassId} currentTeacherId={mode === 'class' ? currentSchedule[selectedDay]?.[selectedPeriod]?.teacherId || '' : selectedTeacherId} day={selectedDay} period={selectedPeriod} />
      <ConfirmationModal isOpen={confirmation.isOpen} onClose={hideConfirmation} onConfirm={confirmation.onConfirm} {...confirmation} />
      <ErrorModal isOpen={errorModal.isOpen} onClose={hideError} {...errorModal} />
    </div>
  );
};

export default Schedules;