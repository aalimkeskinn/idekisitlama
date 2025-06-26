import React, { useState, useRef, useEffect } from 'react';
import { Building, Calendar, Users, BookOpen, Download, Filter, Trash2 } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Teacher, Class, Subject, Schedule, DAYS, PERIODS } from '../types';
import { useFirestore } from '../hooks/useFirestore';
import { useToast } from '../hooks/useToast';
import { useConfirmation } from '../hooks/useConfirmation';
import Button from '../components/UI/Button';
import Select from '../components/UI/Select';
import ConfirmationModal from '../components/UI/ConfirmationModal';
import ClassSchedulePrintView from '../components/UI/ClassSchedulePrintView';

const ClassSchedules = () => {
  const location = useLocation();
  const { data: teachers } = useFirestore<Teacher>('teachers');
  const { data: classes } = useFirestore<Class>('classes');
  const { data: subjects } = useFirestore<Subject>('subjects');
  const { data: schedules, remove: removeSchedule } = useFirestore<Schedule>('schedules');
  const { success, error, info, warning } = useToast();
  const { 
    confirmation, 
    showConfirmation, 
    hideConfirmation,
    confirmDelete 
  } = useConfirmation();

  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const printRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const scheduleViewRef = useRef<HTMLDivElement>(null);

  // Check for classId in URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const classIdFromUrl = urlParams.get('classId');
    if (classIdFromUrl && classes.length > 0) {
      const classExists = classes.find(c => c.id === classIdFromUrl);
      if (classExists) {
        setSelectedClassId(classIdFromUrl);
        // Auto-scroll to schedule view after a short delay
        setTimeout(() => {
          scheduleViewRef.current?.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
          });
        }, 500);
      }
    }
  }, [location.search, classes]);

  const sortedClasses = [...classes].sort((a, b) => a.name.localeCompare(b.name, 'tr'));

  const levelOptions = [
    { value: '', label: 'Tüm Seviyeler' },
    { value: 'Anaokulu', label: 'Anaokulu' },
    { value: 'İlkokul', label: 'İlkokul' },
    { value: 'Ortaokul', label: 'Ortaokul' }
  ];

  const getFilteredClasses = () => {
    return sortedClasses.filter(classItem => 
      !selectedLevel || classItem.level === selectedLevel
    );
  };

  const getClassSchedule = (classId: string) => {
    const classSchedule: { [day: string]: { [period: string]: { teacher: Teacher; subject?: Subject } | null } } = {};
    
    DAYS.forEach(day => {
      classSchedule[day] = {};
      PERIODS.forEach(period => {
        classSchedule[day][period] = null;
        
        // Find which teacher has this class at this time
        schedules.forEach(schedule => {
          const slot = schedule.schedule[day]?.[period];
          if (slot?.classId === classId) {
            const teacher = teachers.find(t => t.id === schedule.teacherId);
            const subject = subjects.find(s => s.id === slot.subjectId);
            
            if (teacher) {
              classSchedule[day][period] = { teacher, subject };
            }
          }
        });
      });
    });
    
    return classSchedule;
  };

  // Check if a period is fixed (preparation, lunch, or afternoon breakfast)
  const isFixedPeriod = (day: string, period: string, classLevel?: 'Anaokulu' | 'İlkokul' | 'Ortaokul'): boolean => {
    if (period === 'prep') return true;
    if ((classLevel === 'İlkokul' || classLevel === 'Anaokulu') && period === '5') return true;
    if (classLevel === 'Ortaokul' && period === '6') return true;
    if (period === 'afternoon-breakfast') return true;
    return false;
  };

  // Get fixed period display info with correct text
  const getFixedPeriodInfo = (period: string, level?: 'Anaokulu' | 'İlkokul' | 'Ortaokul') => {
    if (period === 'prep') {
      return {
        title: 'Hazırlık',
        subtitle: level === 'Ortaokul' ? '08:30-08:40' : '08:30-08:50',
        color: 'bg-blue-100 border-blue-300 text-blue-800'
      };
    } else if ((level === 'İlkokul' || level === 'Anaokulu') && period === '5') {
      return {
        title: 'Yemek',
        subtitle: '11:50-12:25',
        color: 'bg-green-100 border-green-300 text-green-800'
      };
    } else if (level === 'Ortaokul' && period === '6') {
      return {
        title: 'Yemek',
        subtitle: '12:30-13:05',
        color: 'bg-green-100 border-green-300 text-green-800'
      };
    } else if (period === 'afternoon-breakfast') {
      return {
        title: 'İkindi Kahvaltısı',
        subtitle: '14:35-14:45',
        color: 'bg-yellow-100 border-yellow-300 text-yellow-800'
      };
    }

    return null;
  };

  // CRITICAL: Düzeltilmiş haftalık ders saati hesaplama
  const calculateWeeklyHours = (classId: string) => {
    let totalHours = 0;
    const classSchedule = getClassSchedule(classId);
    
    DAYS.forEach(day => {
      PERIODS.forEach(period => {
        // Sabit periyotlar hariç tüm dolu slotları say
        if (classSchedule[day][period] && !isFixedPeriod(day, period)) {
          totalHours++;
        }
      });
    });
    
    return totalHours;
  };

  const calculateDailyHours = (classId: string, day: string) => {
    let dailyHours = 0;
    const classSchedule = getClassSchedule(classId);
    
    PERIODS.forEach(period => {
      // Sabit periyotlar hariç tüm dolu slotları say
      if (classSchedule[day][period] && !isFixedPeriod(day, period)) {
        dailyHours++;
      }
    });
    
    return dailyHours;
  };

  const handleViewClass = (classId: string) => {
    const classItem = classes.find(c => c.id === classId);
    if (classItem) {
      console.log('👁️ Sınıf görüntüleme:', { classId, className: classItem.name });
      setSelectedClassId(classId);
      
      // Scroll to the schedule view with smooth animation
      setTimeout(() => {
        scheduleViewRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }, 100);
      
      // Show success toast
      info('Program Görüntülendi', `${classItem.name} sınıfının programı yukarıda görüntüleniyor`);
    }
  };

  // NEW: Delete all class schedules function
  const handleDeleteAllSchedules = () => {
    const classesWithSchedules = filteredClasses.filter(classItem => 
      calculateWeeklyHours(classItem.id) > 0
    );

    if (classesWithSchedules.length === 0) {
      warning('⚠️ Silinecek Program Yok', 'Filtrelenen sınıflar arasında silinecek program bulunamadı');
      return;
    }

    confirmDelete(
      `${classesWithSchedules.length} Sınıf Programı`,
      async () => {
        setIsDeletingAll(true);
        
        try {
          let deletedCount = 0;
          
          // Find all schedules that contain these classes
          const schedulesToDelete = schedules.filter(schedule => {
            return Object.values(schedule.schedule).some(day => 
              Object.values(day).some(slot => 
                slot?.classId && classesWithSchedules.some(c => c.id === slot.classId)
              )
            );
          });

          console.log('🗑️ Silinecek programlar:', {
            totalSchedules: schedules.length,
            schedulesToDelete: schedulesToDelete.length,
            classesWithSchedules: classesWithSchedules.length
          });

          // Delete each schedule
          for (const schedule of schedulesToDelete) {
            try {
              await removeSchedule(schedule.id);
              deletedCount++;
              console.log(`✅ Program silindi: ${schedule.id}`);
            } catch (err) {
              console.error(`❌ Program silinemedi: ${schedule.id}`, err);
            }
          }

          if (deletedCount > 0) {
            success('🗑️ Programlar Silindi', `${deletedCount} sınıf programı başarıyla silindi`);
            
            // Reset selected class if it was deleted
            if (selectedClassId && classesWithSchedules.some(c => c.id === selectedClassId)) {
              setSelectedClassId('');
            }
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

  const generateSingleClassPDF = async (classItem: Class) => {
    const printElement = printRefs.current[classItem.id];
    if (!printElement) return null;

    try {
      await new Promise(resolve => setTimeout(resolve, 200));

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
        imageTimeout: 0
      });

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      const imgWidth = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const yOffset = imgHeight < 210 ? (210 - imgHeight) / 2 : 0;

      pdf.addImage(imgData, 'PNG', 0, yOffset, imgWidth, imgHeight);
      return pdf;
    } catch (err) {
      console.error(`${classItem.name} için PDF oluşturma hatası:`, err);
      return null;
    }
  };

  const downloadSingleClassPDF = async (classItem: Class) => {
    setIsGenerating(true);
    
    try {
      const pdf = await generateSingleClassPDF(classItem);
      if (pdf) {
        let className = classItem.name
          .replace(/ğ/g, 'g').replace(/Ğ/g, 'G')
          .replace(/ü/g, 'u').replace(/Ü/g, 'U')
          .replace(/ş/g, 's').replace(/Ş/g, 'S')
          .replace(/ı/g, 'i').replace(/İ/g, 'I')
          .replace(/ö/g, 'o').replace(/Ö/g, 'O')
          .replace(/ç/g, 'c').replace(/Ç/g, 'C')
          .replace(/[^a-zA-Z0-9\s]/g, '')
          .replace(/\s+/g, '_');
        
        const fileName = `${className}_Sinif_Programi_${new Date().getFullYear()}.pdf`;
        pdf.save(fileName);
        success('PDF İndirildi', `${classItem.name} sınıfı programı başarıyla indirildi`);
      } else {
        error('PDF Hatası', 'PDF oluşturulurken bir hata oluştu');
      }
    } catch (err) {
      error('PDF Hatası', 'PDF oluşturulurken bir hata oluştu');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadAllClassSchedules = async () => {
    const filteredClasses = getFilteredClasses();
    const classesWithSchedules = filteredClasses.filter(classItem => 
      calculateWeeklyHours(classItem.id) > 0
    );

    if (classesWithSchedules.length === 0) {
      error('Program Bulunamadı', 'İndirilecek sınıf programı bulunamadı');
      return;
    }

    setIsGeneratingAll(true);

    try {
      let combinedPdf: jsPDF | null = null;

      for (let i = 0; i < classesWithSchedules.length; i++) {
        const classItem = classesWithSchedules[i];
        const pdf = await generateSingleClassPDF(classItem);
        
        if (pdf) {
          if (i === 0) {
            combinedPdf = pdf;
          } else if (combinedPdf) {
            combinedPdf.addPage();
            
            const printElement = printRefs.current[classItem.id];
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

      if (combinedPdf) {
        const fileName = `Tum_Sinif_Programlari_${new Date().getFullYear()}.pdf`;
        combinedPdf.save(fileName);
        success('Toplu PDF İndirildi', `${classesWithSchedules.length} sınıf programı başarıyla indirildi`);
      }
    } catch (err) {
      error('PDF Hatası', 'Toplu PDF oluşturulurken bir hata oluştu');
    } finally {
      setIsGeneratingAll(false);
    }
  };

  const filteredClasses = getFilteredClasses();
  const classesWithSchedules = filteredClasses.filter(classItem => 
    calculateWeeklyHours(classItem.id) > 0
  );
  const selectedClass = classes.find(c => c.id === selectedClassId);

  // Check if selected class has schedule
  const selectedClassHasSchedule = selectedClass ? calculateWeeklyHours(selectedClass.id) > 0 : false;

  // CRITICAL: Tüm PERIODS dizisini kullan, sabit periyotları da dahil et
  const allPeriods = ['prep', ...PERIODS, 'afternoon-breakfast'];

  return (
    <div className="container-mobile">
      {/* FIXED: Mobile-optimized header with consistent spacing */}
      <div className="header-mobile">
        <div className="flex items-center">
          <Building className="w-8 h-8 text-emerald-600 mr-3" />
          <div>
            <h1 className="text-responsive-xl font-bold text-gray-900">Sınıf Ders Programları</h1>
            <p className="text-responsive-sm text-gray-600">Sınıf bazında ders programlarını görüntüleyin</p>
          </div>
        </div>
        <div className="button-group-mobile">
          {/* Delete All Button */}
          {classesWithSchedules.length > 0 && (
            <Button
              onClick={handleDeleteAllSchedules}
              icon={Trash2}
              variant="danger"
              disabled={isDeletingAll}
              className="w-full sm:w-auto"
            >
              {isDeletingAll ? 'Siliniyor...' : `Tüm Programları Sil (${classesWithSchedules.length})`}
            </Button>
          )}
          
          <Button
            onClick={downloadAllClassSchedules}
            icon={Download}
            variant="primary"
            disabled={classesWithSchedules.length === 0 || isGeneratingAll}
            className="w-full sm:w-auto"
          >
            {isGeneratingAll ? 'PDF Oluşturuluyor...' : `Tüm Programları İndir (${classesWithSchedules.length})`}
          </Button>
        </div>
      </div>

      {/* Filters and Class Selection */}
      <div className="mobile-card mobile-spacing mb-6">
        <div className="responsive-grid-2 gap-responsive">
          <Select
            label="Seviye Filtresi"
            value={selectedLevel}
            onChange={setSelectedLevel}
            options={levelOptions}
          />
          
          <Select
            label="Sınıf Seçin"
            value={selectedClassId}
            onChange={(value) => {
              console.log('🔄 Sınıf değiştirildi:', { oldClass: selectedClassId, newClass: value });
              setSelectedClassId(value);
              
              if (value) {
                const classItem = classes.find(c => c.id === value);
                if (classItem && calculateWeeklyHours(value) > 0) {
                  setTimeout(() => {
                    scheduleViewRef.current?.scrollIntoView({ 
                      behavior: 'smooth', 
                      block: 'start' 
                    });
                  }, 100);
                }
              }
            }}
            options={filteredClasses.map(classItem => ({
              value: classItem.id,
              label: `${classItem.name} (${classItem.level})`
            }))}
          />
        </div>
      </div>

      {/* Statistics */}
      <div className="responsive-grid gap-responsive mb-6">
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
            <Calendar className="w-8 h-8 text-blue-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Programlı Sınıf</p>
              <p className="text-2xl font-bold text-gray-900">{classesWithSchedules.length}</p>
            </div>
          </div>
        </div>
        <div className="mobile-card mobile-spacing">
          <div className="flex items-center">
            <Users className="w-8 h-8 text-purple-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Aktif Öğretmen</p>
              <p className="text-2xl font-bold text-gray-900">{teachers.length}</p>
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
      </div>

      {/* Selected Class Schedule */}
      {selectedClass && (
        <div ref={scheduleViewRef} className="mobile-card overflow-hidden mb-6 scroll-mt-6">
          <div className="p-4 bg-emerald-50 border-b border-emerald-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-emerald-900 text-lg">
                  📚 {selectedClass.name} Sınıfı Ders Programı
                </h3>
                <p className="text-emerald-700 mt-1">
                  <span className="font-medium">{selectedClass.level}</span> • 
                  <span className="ml-2">Haftalık toplam: <strong>{calculateWeeklyHours(selectedClass.id)} ders saati</strong></span>
                </p>
              </div>
              {selectedClassHasSchedule && (
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={() => downloadSingleClassPDF(selectedClass)}
                    icon={Download}
                    variant="primary"
                    size="sm"
                    disabled={isGenerating}
                  >
                    {isGenerating ? 'PDF Oluşturuluyor...' : 'PDF İndir'}
                  </Button>
                </div>
              )}
            </div>
          </div>
          
          {selectedClassHasSchedule ? (
            <div className="table-responsive">
              <table className="min-w-full">
                <thead className="bg-emerald-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-emerald-800 uppercase tracking-wider">
                      Ders Saati
                    </th>
                    {DAYS.map(day => (
                      <th key={day} className="px-4 py-3 text-center text-xs font-bold text-emerald-800 uppercase tracking-wider">
                        <div className="font-bold">{day}</div>
                        <div className="text-xs mt-1 font-normal">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700">
                            {calculateDailyHours(selectedClass.id, day)} ders
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {/* Preparation Period */}
                  <tr className="bg-blue-50">
                    <td className="px-4 py-4 font-bold text-gray-900 bg-blue-100 text-center">
                      <div className="inline-flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full font-bold">
                        H
                      </div>
                      <div className="text-xs mt-1">Hazırlık</div>
                    </td>
                    {DAYS.map(day => {
                      const fixedInfo = getFixedPeriodInfo('prep', selectedClass.level);
                      
                      return (
                        <td key={`${day}-prep`} className="px-3 py-3">
                          <div className="text-center p-3 bg-blue-50 rounded-lg border-2 border-blue-200 hover:bg-blue-100 transition-colors">
                            <div className="font-bold text-blue-900 text-sm">
                              {fixedInfo?.title || 'Hazırlık'}
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>

                  {/* CRITICAL: Tüm ders saatlerini göster */}
                  {PERIODS.map((period, index) => {
                    const classSchedule = getClassSchedule(selectedClass.id);
                    const isLunchPeriod = (
                      (selectedClass.level === 'İlkokul' || selectedClass.level === 'Anaokulu') && period === '5'
                    ) || (
                      selectedClass.level === 'Ortaokul' && period === '6'
                    );
                    
                    const showAfternoonBreakAfter = period === '8';
                    
                    return (
                      <React.Fragment key={period}>
                        <tr className={isLunchPeriod ? 'bg-green-50' : (index % 2 === 0 ? 'bg-white' : 'bg-gray-50')}>
                          <td className={`px-4 py-4 font-bold text-gray-900 text-center ${isLunchPeriod ? 'bg-green-100' : 'bg-emerald-50'}`}>
                            {isLunchPeriod ? (
                              <>
                                <div className="inline-flex items-center justify-center w-8 h-8 bg-green-600 text-white rounded-full font-bold">
                                  Y
                                </div>
                                <div className="text-xs mt-1">Yemek</div>
                              </>
                            ) : (
                              <>
                                <div className="inline-flex items-center justify-center w-8 h-8 bg-emerald-600 text-white rounded-full font-bold">
                                  {period}
                                </div>
                                <div className="text-xs mt-1">{period}. Ders</div>
                              </>
                            )}
                          </td>
                          {DAYS.map(day => {
                            if (isLunchPeriod) {
                              const fixedInfo = getFixedPeriodInfo(period, selectedClass.level);
                              
                              return (
                                <td key={`${day}-${period}`} className="px-3 py-3">
                                  <div className="text-center p-3 bg-green-50 rounded-lg border-2 border-green-200 hover:bg-green-100 transition-colors">
                                    <div className="font-bold text-green-900 text-sm">
                                      Yemek
                                    </div>
                                  </div>
                                </td>
                              );
                            }
                            
                            const slot = classSchedule[day][period];
                            
                            return (
                              <td key={`${day}-${period}`} className="px-3 py-3">
                                {slot ? (
                                  <div className="text-center p-3 bg-emerald-50 rounded-lg border-2 border-emerald-200 hover:bg-emerald-100 transition-colors">
                                    <div className="font-bold text-emerald-900 text-sm">
                                      {slot.teacher.name.length > 20 
                                        ? slot.teacher.name.substring(0, 20) + '...'
                                        : slot.teacher.name
                                      }
                                    </div>
                                    <div className="text-emerald-700 text-xs mt-1 font-medium">
                                      {slot.subject?.name || slot.subject?.branch || ''}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                                    <div className="text-gray-400 text-xs font-medium">Boş Ders</div>
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>

                        {/* İkindi Kahvaltısı 8. ders sonrasında */}
                        {showAfternoonBreakAfter && (
                          <tr className="bg-yellow-50">
                            <td className="px-4 py-4 font-bold text-gray-900 bg-yellow-100 text-center">
                              <div className="inline-flex items-center justify-center w-8 h-8 bg-yellow-600 text-white rounded-full font-bold">
                                İ
                              </div>
                              <div className="text-xs mt-1">İkindi Kahvaltısı</div>
                            </td>
                            {DAYS.map(day => {
                              const fixedInfo = getFixedPeriodInfo('afternoon-breakfast', selectedClass.level);
                              
                              return (
                                <td key={`${day}-afternoon-breakfast`} className="px-3 py-3">
                                  <div className="text-center p-3 bg-yellow-50 rounded-lg border-2 border-yellow-200 hover:bg-yellow-100 transition-colors">
                                    <div className="font-bold text-yellow-900 text-sm">
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
          ) : (
            <div className="p-12 text-center">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Program Bulunamadı</h3>
              <p className="text-gray-500">Bu sınıf için henüz program oluşturulmamış</p>
              <p className="text-sm text-gray-400 mt-2">Program oluşturmak için "Program Oluştur" sayfasını kullanın</p>
            </div>
          )}

          {/* Off-screen print view for PDF generation */}
          {selectedClassHasSchedule && (
            <div style={{ 
              position: 'absolute', 
              left: '-9999px', 
              top: '-9999px', 
              zIndex: -1, 
              opacity: 0,
              pointerEvents: 'none'
            }}>
              <div 
                ref={el => printRefs.current[selectedClass.id] = el}
                data-class-id={selectedClass.id}
                style={{
                  transform: 'none',
                  position: 'static'
                }}
              >
                <ClassSchedulePrintView
                  classItem={selectedClass}
                  schedule={getClassSchedule(selectedClass.id)}
                  teachers={teachers}
                  subjects={subjects}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* All Classes Overview */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <Filter className="w-6 h-6 mr-2 text-emerald-600" />
            Tüm Sınıf Programları
          </h2>
          <p className="text-sm text-gray-600">
            {filteredClasses.length} sınıf • {classesWithSchedules.length} programlı
          </p>
        </div>
        
        {filteredClasses.map(classItem => {
          const weeklyHours = calculateWeeklyHours(classItem.id);
          const isSelected = selectedClassId === classItem.id;
          
          return (
            <div key={classItem.id} className={`mobile-card mobile-spacing hover:shadow-md transition-shadow ${
              isSelected ? 'ring-2 ring-emerald-500 shadow-lg' : ''
            }`}>
              <div className="p-4 bg-gray-50 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      weeklyHours > 0 ? 'bg-emerald-500' : 'bg-gray-300'
                    }`} />
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg">
                        {classItem.name}
                      </h3>
                      <div className="flex items-center space-x-4 mt-1">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          classItem.level === 'Anaokulu' ? 'bg-green-100 text-green-800' :
                          classItem.level === 'İlkokul' ? 'bg-blue-100 text-blue-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {classItem.level}
                        </span>
                        <span className="text-sm text-gray-600">
                          {weeklyHours > 0 ? `${weeklyHours} ders saati` : 'Program yok'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {weeklyHours > 0 ? (
                      <>
                        <Button
                          onClick={() => handleViewClass(classItem.id)}
                          variant={isSelected ? "primary" : "secondary"}
                          size="sm"
                        >
                          {isSelected ? 'Görüntüleniyor' : 'Görüntüle'}
                        </Button>
                        <Button
                          onClick={() => downloadSingleClassPDF(classItem)}
                          icon={Download}
                          variant="primary"
                          size="sm"
                          disabled={isGenerating}
                        >
                          PDF İndir
                        </Button>
                      </>
                    ) : (
                      <span className="inline-flex px-3 py-2 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        Program Yok
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              {weeklyHours > 0 && (
                <>
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
                      ref={el => printRefs.current[classItem.id] = el}
                      data-class-id={classItem.id}
                      style={{
                        transform: 'none',
                        position: 'static'
                      }}
                    >
                      <ClassSchedulePrintView
                        classItem={classItem}
                        schedule={getClassSchedule(classItem.id)}
                        teachers={teachers}
                        subjects={subjects}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {filteredClasses.length === 0 && (
        <div className="text-center py-12 mobile-card">
          <Building className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Sınıf Bulunamadı</h3>
          <p className="text-gray-500 mb-4">Seçilen filtrelere uygun sınıf bulunmuyor</p>
          <Button
            onClick={() => setSelectedLevel('')}
            variant="secondary"
          >
            Filtreleri Temizle
          </Button>
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

export default ClassSchedules;