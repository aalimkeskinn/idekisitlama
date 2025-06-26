// --- START OF FILE src/components/UI/ClassSchedulePrintView.tsx ---

import React from 'react';
import { Teacher, Class, Subject, DAYS, PERIODS, getTimeForPeriod, formatTimeRange } from '../../types';

interface ClassSchedulePrintViewProps {
  classItem: Class;
  schedule: { [day: string]: { [period: string]: { teacher: Teacher; subject?: Subject } | null } };
  teachers: Teacher[];
  subjects: Subject[];
}

const ClassSchedulePrintView: React.FC<ClassSchedulePrintViewProps> = ({
  classItem,
  schedule,
  teachers,
  subjects
}) => {
  // --- YENİ VE DAHA GÜVENLİ FONKSİYON ---
  /**
   * Bir öğretmenin branşına ve seviyesine uygun dersi güvenli bir şekilde bulur.
   */
  const getSubjectForTeacher = (teacher: Teacher): Subject | undefined => {
    if (!teacher) return undefined;
    return subjects.find(subject => 
      subject.branch === teacher.branch && 
      subject.level === teacher.level
    );
  };

  // Haftalık ders saatini güvenli bir şekilde hesaplar
  const calculateWeeklyHours = () => {
    let totalHours = 0;
    if (!schedule) return 0;
    
    DAYS.forEach(day => {
      if (schedule[day]) {
        PERIODS.forEach(period => {
          const slot = schedule[day][period];
          // Sabit periyotları ve boş slotları sayma
          if (slot && !(slot as any).isFixed) {
            totalHours++;
          }
        });
      }
    });
    return totalHours;
  };
  
  // Zaman bilgisini al
  const getTimeInfo = (period: string) => {
    const timePeriod = getTimeForPeriod(period, classItem.level);
    if (timePeriod) {
      return formatTimeRange(timePeriod.startTime, timePeriod.endTime);
    }
    return `${period}. Ders`;
  };

  const getPeriodLabel = (period: string) => {
    const lunchPeriod = (classItem.level === 'Ortaokul') ? '6' : '5';
    if (period === 'prep') return { title: classItem.level === 'Ortaokul' ? 'Hazırlık' : 'Kahvaltı', time: classItem.level === 'Ortaokul' ? '08:30-08:40' : '08:30-08:50', isFixed: true, bg: '#e6f3ff' };
    if (period === 'breakfast') return { title: 'Kahvaltı', time: '09:15-09:35', isFixed: true, bg: '#fff8f0' };
    if (period === lunchPeriod) return { title: 'Yemek', time: getTimeInfo(period), isFixed: true, bg: '#e6ffe6' };
    if (period === 'afternoon-breakfast') return { title: 'İkindi Kahvaltısı', time: '14:35-14:45', isFixed: true, bg: '#fffbf0' };
    return { title: `${period}.`, time: getTimeInfo(period), isFixed: false, bg: '#e6f3ff' };
  };

  const allPeriodsToRender = [
    'prep',
    '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
    'breakfast',
    'afternoon-breakfast'
  ].filter(p => schedule?.[DAYS[0]]?.[p] !== undefined) // Sadece programda var olan periyotları al
   .sort((a,b) => { // Periyotları doğru sıraya diz
     const getOrder = (p: string) => {
       if (p === 'prep') return 0;
       if (!isNaN(parseInt(p))) return parseInt(p);
       if (p === 'breakfast') return 1.5;
       if (p === 'afternoon-breakfast') return 8.5;
       return 99;
     };
     return getOrder(a) - getOrder(b);
   });


  return (
    <div style={{ 
      width: '297mm', height: '210mm', padding: '10mm',
      fontSize: '12px', lineHeight: '1.4',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
      backgroundColor: 'white', color: '#000000'
    }}>
      <div style={{ marginBottom: '8mm', paddingBottom: '4mm', borderBottom: '2px solid #000000' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>
          {classItem.name} Sınıfı Ders Programı
        </h1>
        <p style={{ fontSize: '14px', margin: '4px 0 0 0' }}>
          {classItem.level} • Haftalık Toplam: {calculateWeeklyHours()} ders saati
        </p>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid #000000', padding: '8px 4px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#e6f3ff', width: '80px' }}>SAAT</th>
            {DAYS.map(day => (
              <th key={day} style={{ border: '1px solid #000000', padding: '8px 4px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#e6f3ff' }}>{day.toUpperCase()}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {allPeriodsToRender.map((period, periodIndex) => {
            const periodInfo = getPeriodLabel(period);
            const bgColor = periodInfo.isFixed ? periodInfo.bg : (periodIndex % 2 === 0 ? '#ffffff' : '#f8f9fa');
            
            return (
              <tr key={period} style={{ backgroundColor: bgColor }}>
                <td style={{ border: '1px solid #000000', padding: '8px 4px', textAlign: 'center', fontWeight: 'bold', backgroundColor: periodInfo.bg }}>
                  <div style={{ fontSize: '10px', fontWeight: 'bold' }}>{periodInfo.title}</div>
                  <div style={{ fontSize: '8px', color: '#666666', marginTop: '2px' }}>{periodInfo.time}</div>
                </td>
                {DAYS.map(day => {
                  const slot = schedule?.[day]?.[period];
                  
                  // --- ANA HATA DÜZELTMESİ BURADA ---
                  // Bir slotu işlemeden önce var olup olmadığını kontrol et
                  if (!slot) {
                    return <td key={`${day}-${period}`} style={{ border: '1px solid #000000', padding: '8px 4px', textAlign: 'center' }}><span style={{ color: '#999999', fontSize: '9px' }}>-</span></td>;
                  }

                  if ((slot as any).isFixed) {
                    return <td key={`${day}-${period}`} style={{ border: '1px solid #000000', padding: '8px 4px', textAlign: 'center', backgroundColor: periodInfo.bg }}>{(slot as any).subjectId}</td>;
                  }

                  // Öğretmeni ve dersi güvenli bir şekilde bul
                  const teacher = teachers.find(t => t.id === slot.teacher?.id);
                  const subject = slot.subject;

                  return (
                    <td key={`${day}-${period}`} style={{ border: '1px solid #000000', padding: '8px 4px', textAlign: 'center' }}>
                      {teacher ? (
                        <div>
                          <div style={{ fontWeight: 'bold', fontSize: '10px', marginBottom: '2px' }}>
                            {teacher.name}
                          </div>
                          <div style={{ fontSize: '9px', color: '#666666' }}>
                            {/* Dersi güvenli bir şekilde göster, bulunamazsa branşı göster */}
                            {subject?.name || subject?.branch || ''}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: '#999999', fontSize: '9px' }}>Boş</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>

      <div style={{ marginTop: '10mm', display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#666666' }}>
        <div>Haftalık Toplam: {calculateWeeklyHours()} ders saati</div>
        <div>İDE Okulları Ders Programı</div>
      </div>
    </div>
  );
};

export default ClassSchedulePrintView;
// --- END OF FILE src/components/UI/ClassSchedulePrintView.tsx ---