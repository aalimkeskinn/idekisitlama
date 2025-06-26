import React, { useState, useRef } from 'react';
import { Calendar, Users, BookOpen, Building, Eye, FileText, Download, Search, X, Trash2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Teacher, Class, Subject, Schedule, DAYS, PERIODS } from '../types';
import { useFirestore } from '../hooks/useFirestore';
import { useToast } from '../hooks/useToast';
import { useConfirmation } from '../hooks/useConfirmation';
import Button from '../components/UI/Button';
import Select from '../components/UI/Select';
import ConfirmationModal from '../components/UI/ConfirmationModal';
import SchedulePrintView from '../components/UI/SchedulePrintView';

// Schedule Template interface
interface ScheduleTemplate {
  id: string;
  name: string;
  description: string;
  academicYear: string;
  semester: string;
  wizardData: any;
  createdAt: Date;
  updatedAt: Date;
  status: 'draft' | 'published' | 'archived';
}

const AllSchedules = () => {
  const { data: teachers } = useFirestore<Teacher>('teachers');
  const { data: classes } = useFirestore<Class>('classes');
  const { data: subjects } = useFirestore<Subject>('subjects');
  const { data: schedules, remove: removeSchedule } = useFirestore<Schedule>('schedules');
  const { data: templates } = useFirestore<ScheduleTemplate>('schedule-templates');
  const { success, error, warning } = useToast();
  const { 
    confirmation, 
    showConfirmation, 
    hideConfirmation,
    confirmDelete 
  } = useConfirmation();

  const [selectedLevel, setSelectedLevel] = useState('');
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const printRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const sortedTeachers = [...teachers].sort((a, b) => a.name.localeCompare(b.name, 'tr'));
  const sortedClasses = [...classes].sort((a, b) => a.name.localeCompare(b.name, 'tr'));

  const levelOptions = [
    { value: '', label: 'Tüm Seviyeler' },
    { value: 'Anaokulu', label: 'Anaokulu' },
    { value: 'İlkokul', label: 'İlkokul' },
    { value: 'Ortaokul', label: 'Ortaokul' }
  ];

  const dayOptions = [
    { value: '', label: 'Tüm Günler' },
    ...DAYS.map(day => ({ value: day, label: day }))
  ];

  const periodOptions = [
    { value: '', label: 'Tüm Saatler' },
    ...PERIODS.map(period => ({ value: period, label: `${period}. Ders` }))
  ];

  const getFilteredTeachers = () => {
    return sortedTeachers.filter(teacher => {
      const matchesLevel = !selectedLevel || teacher.level === selectedLevel;
      const matchesSearch = !searchQuery || 
        teacher.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        teacher.branch.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesLevel && matchesSearch;
    });
  };

  const getTeacherSchedule = (teacherId: string) => {
    return schedules.find(s => s.teacherId === teacherId);
  };

  const getSlotInfo = (teacherId: string, day: string, period: string) => {
    const schedule = getTeacherSchedule(teacherId);
    const slot = schedule?.schedule[day]?.[period];
    
    if (!slot?.classId) return null;

    const classItem = classes.find(c => c.id === slot.classId);

    return { classItem };
  };

  // Check if a period is fixed (preparation, lunch, or afternoon breakfast)
  const isFixedPeriod = (day: string, period: string, teacherId: string): boolean => {
    const schedule = getTeacherSchedule(teacherId);
    const slot = schedule?.schedule[day]?.[period];
    return slot?.classId === 'fixed-period';
  };

  // Get fixed period display info with correct text
  const getFixedPeriodInfo = (day: string, period: string, teacherId: string, level?: 'Anaokulu' | 'İlkokul' | 'Ortaokul') => {
    const schedule = getTeacherSchedule(teacherId);
    const slot = schedule?.schedule[day]?.[period];
    if (!slot || slot.classId !== 'fixed-period') return null;

    if (slot.subjectId === 'fixed-prep') {
      return {
        title: 'Hazırlık',
        subtitle: level === 'Ortaokul' ? '08:30-08:40' : '08:30-08:50',
        color: 'bg-blue-100 border-blue-300 text-blue-800'
      };
    } else if (slot.subjectId === 'fixed-breakfast') {
      return {
        title: 'Kahvaltı',
        subtitle: '08:30-08:50',
        color: 'bg-orange-100 border-orange-300 text-orange-800'
      };
    } else if (slot.subjectId === 'fixed-lunch') {
      return {
        title: 'Yemek',
        subtitle: level === 'İlkokul' || level === 'Anaokulu' ? '11:50-12:25' : '12:30-13:05',
        color: 'bg-green-100 border-green-300 text-green-800'
      };
    } else if (slot.subjectId === 'fixed-afternoon-breakfast') {
      return {
        title: 'İkindi Kahvaltısı',
        subtitle: '14:35-14:45',
        color: 'bg-yellow-100 border-yellow-300 text-yellow-800'
      };
    }

    return null;
  };

  const getClassScheduleForSlot = (day: string, period: string) => {
    const classSchedules: { [classId: string]: { teacher: Teacher } } = {};
    
    schedules.forEach(schedule => {
      const slot = schedule.schedule[day]?.[period];
      if (slot?.classId && slot.classId !== 'fixed-period') {
        const teacher = teachers.find(t => t.id === schedule.teacherId);
        
        if (teacher) {
          classSchedules[slot.classId] = { teacher };
        }
      }
    });

    return classSchedules;
  };

  const getConflicts = () => {
    const conflicts: string[] = [];
    
    DAYS.forEach(day => {
      PERIODS.forEach(period => {
        const classSchedules = getClassScheduleForSlot(day, period);
        const classIds = Object.keys(classSchedules);
        
        // Check for duplicate class assignments
        const duplicateClasses = classIds.filter((classId, index) => 
          classIds.indexOf(classId) !== index
        );
        
        duplicateClasses.forEach(classId => {
          const className = classes.find(c => c.id === classId)?.name || 'Bilinmeyen Sınıf';
          conflicts.push(`${day} ${period}. ders: ${className} sınıfı çakışıyor`);
        });
      });
    });

    return [...new Set(conflicts)];
  };

  // Get template name for a teacher's schedule
  const getTemplateNameForTeacher = (teacherId: string) => {
    // Find the template that has this teacher in its selectedTeachers
    const template = templates.find(t => 
      t.wizardData?.teachers?.selectedTeachers?.includes(teacherId)
    );
    
    return template ? template.name : null;
  };

  // NEW: Delete all teacher schedules function
  const handleDeleteAllSchedules = () => {
    const teachersWithSchedules = filteredTeachers.filter(teacher => 
      schedules.some(s => s.teacherId === teacher.id)
    );

    if (teachersWithSchedules.length === 0) {
      warning('⚠️ Silinecek Program Yok', 'Filtrelenen öğretmenler arasında silinecek program bulunamadı');
      return;
    }

    confirmDelete(
      `${teachersWithSchedules.length} Öğretmen Programı`,
      async () => {
        setIsDeletingAll(true);
        
        try {
          let deletedCount = 0;
          
          // Find schedules for filtered teachers
          const schedulesToDelete = schedules.filter(schedule => 
            teachersWithSchedules.some(teacher => teacher.id === schedule.teacherId)
          );

          console.log('🗑️ Silinecek öğretmen programları:', {
            totalSchedules: schedules.length,
            schedulesToDelete: schedulesToDelete.length,
            teachersWithSchedules: teachersWithSchedules.length
          });

          // Delete each schedule
          for (const schedule of schedulesToDelete) {
            try {
              await removeSchedule(schedule.id);
              deletedCount++;
              console.log(`✅ Öğretmen programı silindi: ${schedule.id}`);
            } catch (err) {
              console.error(`❌ Program silinemedi: ${schedule.id}`, err);
            }
          }

          if (deletedCount > 0) {
            success('🗑️ Programlar Silindi', `${deletedCount} öğretmen programı başarıyla silindi`);
          } else {
            error('❌ Silme Hatası', 'Hiçbir program silinemedi');
          }

        } catch (err) {
          console.error('❌ Toplu silme hatası:', err);
          error('❌ Silme Hatası', 'Programlar silinirken bir hata oluştu');
        } finally {
          setIsDeletingAll(false);
        }
      }
    );
  };

  const generateSingleTeacherPDF = async (teacher: Teacher, schedule: Schedule) => {
    const printElement = printRefs.current[teacher.id];
    if (!printElement) return null;

    try {
      // Wait for any pending renders
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(printElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: printElement.scrollWidth,
        height: printElement.scrollHeight,
        scrollX: 0,
        scrollY: 0,
        logging: false,
        removeContainer: true,
        imageTimeout: 0,
        onclone: (clonedDoc) => {
          // Ensure all styles are properly applied in the cloned document
          const clonedElement = clonedDoc.querySelector('[data-teacher-id="' + teacher.id + '"]');
          if (clonedElement) {
            (clonedElement as HTMLElement).style.transform = 'none';
            (clonedElement as HTMLElement).style.position = 'static';
          }
        }
      });

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      const imgWidth = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Center the image if it's smaller than the page
      const yOffset = imgHeight < 210 ? (210 - imgHeight) / 2 : 0;

      pdf.addImage(imgData, 'PNG', 0, yOffset, imgWidth, imgHeight);
      return pdf;
    } catch (error) {
      console.error(`${teacher.name} için PDF oluşturma hatası:`, error);
      return null;
    }
  };

  const downloadSingleTeacherPDF = async (teacher: Teacher) => {
    const schedule = getTeacherSchedule(teacher.id);
    if (!schedule) return;

    const pdf = await generateSingleTeacherPDF(teacher, schedule);
    if (pdf) {
      let teacherName = teacher.name
        .replace(/ğ/g, 'g').replace(/Ğ/g, 'G')
        .replace(/ü/g, 'u').replace(/Ü/g, 'U')
        .replace(/ş/g, 's').replace(/Ş/g, 'S')
        .replace(/ı/g, 'i').replace(/İ/g, 'I')
        .replace(/ö/g, 'o').replace(/Ö/g, 'O')
        .replace(/ç/g, 'c').replace(/Ç/g, 'C')
        .replace(/[^a-zA-Z\s]/g, '')
        .replace(/\s+/g, '_');
      
      const fileName = `${teacherName}_Ders_Programi_${new Date().getFullYear()}.pdf`;
      pdf.save(fileName);
    }
  };

  const downloadAllSchedules = async () => {
    const teachersWithSchedules = filteredTeachers.filter(teacher => 
      schedules.some(s => s.teacherId === teacher.id)
    );

    if (teachersWithSchedules.length === 0) {
      alert('İndirilecek program bulunamadı');
      return;
    }

    setIsGeneratingAll(true);

    try {
      let combinedPdf: jsPDF | null = null;

      for (let i = 0; i < teachersWithSchedules.length; i++) {
        const teacher = teachersWithSchedules[i];
        const schedule = schedules.find(s => s.teacherId === teacher.id);
        
        if (schedule) {
          const pdf = await generateSingleTeacherPDF(teacher, schedule);
          
          if (pdf) {
            if (i === 0) {
              combinedPdf = pdf;
            } else if (combinedPdf) {
              combinedPdf.addPage();
              
              // Get the image data from the new PDF
              const printElement = printRefs.current[teacher.id];
              if (printElement) {
                await new Promise(resolve => setTimeout(resolve, 100));
                
                const canvas = await html2canvas(printElement, {
                  scale: 2,
                  useCORS: true,
                  allowTaint: true,
                  backgroundColor: '#ffffff',
                  logging: false
                });

                const imgData = canvas.toDataURL('image/png', 1.0);
                const imgWidth = 297;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                const yOffset = imgHeight < 210 ? (210 - imgHeight) / 2 : 0;

                combinedPdf.addImage(imgData, 'PNG', 0, yOffset, imgWidth, imgHeight);
              }
            }
          }
        }
      }

      if (combinedPdf) {
        const fileName = `Tum_Ders_Programlari_${new Date().getFullYear()}.pdf`;
        combinedPdf.save(fileName);
      }
    } catch (error) {
      console.error('Toplu PDF oluşturma hatası:', error);
      alert('PDF oluşturulurken bir hata oluştu');
    } finally {
      setIsGeneratingAll(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  // ENTER tuşu desteği
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      console.log('🔍 Enter ile öğretmen araması:', searchQuery);
      // Arama zaten otomatik olarak çalışıyor, sadece focus'u kaldır
      const target = e.target as HTMLInputElement;
      target.blur();
    }
    
    if (e.key === 'Escape') {
      clearSearch();
      const target = e.target as HTMLInputElement;
      target.blur();
    }
  };

  const filteredTeachers = getFilteredTeachers();
  const conflicts = getConflicts();
  const teachersWithSchedules = filteredTeachers.filter(teacher => 
    schedules.some(s => s.teacherId === teacher.id)
  );

  return (
    <div className="container-mobile">
      {/* FIXED: Mobile-optimized header with consistent spacing */}
      <div className="header-mobile">
        <div className="flex items-center">
          <Calendar className="w-8 h-8 text-indigo-600 mr-3" />
          <div>
            <h1 className="text-responsive-xl font-bold text-gray-900">Öğretmen Ders Programları</h1>
            <p className="text-responsive-sm text-gray-600">Okuldaki tüm öğretmen programlarını görüntüleyin</p>
          </div>
        </div>
        <div className="button-group-mobile">
          {/* NEW: Delete All Button */}
          {teachersWithSchedules.length > 0 && (
            <Button
              onClick={handleDeleteAllSchedules}
              icon={Trash2}
              variant="danger"
              disabled={isDeletingAll}
              className="w-full sm:w-auto"
            >
              {isDeletingAll ? 'Siliniyor...' : `Tüm Programları Sil (${teachersWithSchedules.length})`}
            </Button>
          )}
          
          <Button
            onClick={downloadAllSchedules}
            icon={Download}
            variant="primary"
            disabled={teachersWithSchedules.length === 0 || isGeneratingAll}
            className="w-full sm:w-auto"
          >
            {isGeneratingAll ? 'PDF Oluşturuluyor...' : `Tüm Programları İndir (${teachersWithSchedules.length})`}
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mobile-card mobile-spacing mb-6">
        {/* Global Search */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-800 mb-2">
            🔍 Öğretmen Ara
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Öğretmen adı veya branş ara... (Enter ile ara)"
              className="w-full pl-10 pr-10 py-3 text-base border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
              title="Enter ile ara, ESC ile temizle"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors btn-touch"
                title="Aramayı temizle"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          {searchQuery && (
            <div className="mt-2 flex items-center justify-between">
              <p className="text-sm text-blue-600">
                🔍 "{searchQuery}" için {filteredTeachers.length} sonuç bulundu
              </p>
              <button
                onClick={clearSearch}
                className="text-xs text-gray-500 hover:text-gray-700 underline"
              >
                Temizle
              </button>
            </div>
          )}
        </div>

        <div className="responsive-grid gap-responsive">
          <Select
            label="Seviye Filtresi"
            value={selectedLevel}
            onChange={setSelectedLevel}
            options={levelOptions}
          />
          <Select
            label="Gün Filtresi"
            value={selectedDay}
            onChange={setSelectedDay}
            options={dayOptions}
          />
          <Select
            label="Ders Saati"
            value={selectedPeriod}
            onChange={setSelectedPeriod}
            options={periodOptions}
          />
        </div>
      </div>

      {/* Conflicts Warning */}
      {conflicts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <FileText className="w-5 h-5 text-red-600 mt-0.5" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Program Çakışmaları Tespit Edildi</h3>
              <div className="mt-2 text-sm text-red-700">
                <ul className="list-disc list-inside space-y-1">
                  {conflicts.map((conflict, index) => (
                    <li key={index}>{conflict}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Statistics */}
      <div className="responsive-grid mb-6">
        <div className="mobile-card mobile-spacing">
          <div className="flex items-center">
            <Users className="w-8 h-8 text-blue-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Toplam Öğretmen</p>
              <p className="text-2xl font-bold text-gray-900">{teachers.length}</p>
            </div>
          </div>
        </div>
        <div className="mobile-card mobile-spacing">
          <div className="flex items-center">
            <Building className="w-8 h-8 text-emerald-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Toplam Sınıf</p>
              <p className="text-2xl font-bold text-gray-900">{classes.length}</p>
            </div>
          </div>
        </div>
        <div className="mobile-card mobile-spacing">
          <div className="flex items-center">
            <BookOpen className="w-8 h-8 text-indigo-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Toplam Ders</p>
              <p className="text-2xl font-bold text-gray-900">{subjects.length}</p>
            </div>
          </div>
        </div>
        <div className="mobile-card mobile-spacing">
          <div className="flex items-center">
            <Calendar className="w-8 h-8 text-purple-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Hazır Program</p>
              <p className="text-2xl font-bold text-gray-900">{schedules.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Teacher Schedules */}
      <div className="space-y-6">
        {filteredTeachers.map(teacher => {
          const schedule = getTeacherSchedule(teacher.id);
          const templateName = getTemplateNameForTeacher(teacher.id);
          
          return (
            <div key={teacher.id} className="mobile-card overflow-hidden">
              <div className="p-4 bg-gray-50 border-b">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-3 sm:space-y-0">
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {teacher.name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm text-gray-600">
                        {teacher.branch} - {teacher.level}
                      </p>
                      {templateName && (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                          {templateName}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {schedule && (
                      <Button
                        onClick={() => downloadSingleTeacherPDF(teacher)}
                        icon={Download}
                        variant="secondary"
                        size="sm"
                        className="flex-1 sm:flex-none"
                      >
                        PDF İndir
                      </Button>
                    )}
                    {!schedule && (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        Program Yok
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              {schedule ? (
                <>
                  <div className="table-responsive schedule-mobile">
                    <table className="min-w-full schedule-table">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Saat
                          </th>
                          {DAYS.map(day => (
                            <th key={day} className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                              {day}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {/* Preparation Period */}
                        <tr className="bg-blue-50">
                          <td className="px-3 py-2 font-medium text-gray-900 bg-blue-100 text-sm">
                            Hazırlık
                          </td>
                          {DAYS.map(day => {
                            const fixedInfo = getFixedPeriodInfo(day, 'prep', teacher.id, teacher.level);
                            
                            return (
                              <td key={`${day}-prep`} className="px-2 py-2">
                                <div className="text-center p-2 bg-blue-50 rounded border border-blue-200">
                                  <div className="font-medium text-blue-900 text-sm">
                                    {fixedInfo?.title || 'Hazırlık'}
                                  </div>
                                </div>
                              </td>
                            );
                          })}
                        </tr>

                        {PERIODS.map(period => {
                          // Apply filters
                          if (selectedDay && !DAYS.includes(selectedDay)) return null;
                          if (selectedPeriod && period !== selectedPeriod) return null;
                          
                          const isLunchPeriod = (
                            (teacher.level === 'İlkokul' || teacher.level === 'Anaokulu') && period === '5'
                          ) || (
                            teacher.level === 'Ortaokul' && period === '6'
                          );
                          
                          const showAfternoonBreakAfter = period === '8';
                          
                          return (
                            <React.Fragment key={period}>
                              <tr className={isLunchPeriod ? 'bg-green-50' : ''}>
                                <td className={`px-3 py-2 font-medium text-gray-900 text-sm ${isLunchPeriod ? 'bg-green-100' : 'bg-gray-50'}`}>
                                  {isLunchPeriod ? 'Yemek' : `${period}.`}
                                </td>
                                {DAYS.map(day => {
                                  // Apply day filter
                                  if (selectedDay && day !== selectedDay) return null;
                                  
                                  if (isLunchPeriod) {
                                    const fixedInfo = getFixedPeriodInfo(day, period, teacher.id, teacher.level);
                                    
                                    return (
                                      <td key={`${day}-${period}`} className="px-2 py-2">
                                        <div className="text-center p-2 bg-green-50 rounded border border-green-200">
                                          <div className="font-medium text-green-900 text-sm">
                                            Yemek
                                          </div>
                                        </div>
                                      </td>
                                    );
                                  }
                                  
                                  const slotInfo = getSlotInfo(teacher.id, day, period);
                                  
                                  return (
                                    <td key={`${day}-${period}`} className="px-2 py-2">
                                      {slotInfo ? (
                                        <div className="text-center p-2 bg-blue-50 rounded border border-blue-200">
                                          <div className="font-medium text-blue-900 text-sm">
                                            {slotInfo.classItem?.name}
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="text-center p-2 bg-gray-50 rounded border border-gray-200">
                                          <div className="text-gray-400 text-xs">Boş</div>
                                        </div>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>

                              {/* İkindi Kahvaltısı 8. ders sonrasında */}
                              {showAfternoonBreakAfter && (
                                <tr className="bg-yellow-50">
                                  <td className="px-3 py-2 font-medium text-gray-900 bg-yellow-100 text-sm">
                                    İkindi Kahvaltısı
                                  </td>
                                  {DAYS.map(day => {
                                    const fixedInfo = getFixedPeriodInfo(day, 'afternoon-breakfast', teacher.id, teacher.level);
                                    
                                    return (
                                      <td key={`${day}-afternoon-breakfast`} className="px-2 py-2">
                                        <div className="text-center p-2 bg-yellow-50 rounded border border-yellow-200">
                                          <div className="font-medium text-yellow-900 text-sm">
                                            İkindi Kahvaltısı
                                          </div>
                                        </div>
                                      </td>
                                    );
                                  })}
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Off-screen print view for PDF generation */}
                  <div style={{ 
                    position: 'absolute', 
                    left: '-9999px', 
                    top: '-9999px', 
                    zIndex: -1, 
                    opacity: 0,
                    pointerEvents: 'none'
                  }}>
                    <div 
                      ref={el => printRefs.current[teacher.id] = el}
                      data-teacher-id={teacher.id}
                      style={{
                        transform: 'none',
                        position: 'static'
                      }}
                    >
                      <SchedulePrintView
                        teacher={teacher}
                        schedule={schedule}
                        subjects={subjects}
                        classes={classes}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-8 text-center">
                  <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Bu öğretmen için henüz program oluşturulmamış</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredTeachers.length === 0 && (
        <div className="text-center py-12 mobile-card">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchQuery ? 'Arama Sonucu Bulunamadı' : 'Öğretmen Bulunamadı'}
          </h3>
          <p className="text-gray-500 mb-4">
            {searchQuery 
              ? `"${searchQuery}" araması için sonuç bulunamadı`
              : 'Seçilen filtrelere uygun öğretmen bulunmuyor'
            }
          </p>
          {(searchQuery || selectedLevel) && (
            <div className="button-group-mobile">
              {searchQuery && (
                <Button onClick={clearSearch} variant="secondary">
                  Aramayı Temizle
                </Button>
              )}
              {selectedLevel && (
                <Button onClick={() => setSelectedLevel('')} variant="secondary">
                  Filtreleri Temizle
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmation.isOpen}
        onClose={hideConfirmation}
        onConfirm={confirmation.onConfirm}
        title={confirmation.title}
        message={confirmation.message}
        type={confirmation.type}
        confirmText={confirmation.confirmText}
        cancelText={confirmation.cancelText}
        confirmVariant={confirmation.confirmVariant}
      />
    </div>
  );
};

export default AllSchedules;