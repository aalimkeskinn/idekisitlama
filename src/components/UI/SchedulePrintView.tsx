import React from 'react';
import { Teacher, Class, Subject, Schedule, DAYS, PERIODS, getTimeForPeriod, formatTimeRange } from '../../types';

interface SchedulePrintViewProps {
  teacher: Teacher;
  schedule: Schedule;
  subjects: Subject[];
  classes: Class[];
}

const SchedulePrintView: React.FC<SchedulePrintViewProps> = ({
  teacher,
  schedule,
  subjects,
  classes
}) => {
  const getSlotInfo = (day: string, period: string) => {
    const slot = schedule.schedule[day]?.[period];
    if (!slot?.classId) return null;

    const classItem = classes.find(c => c.id === slot.classId);

    return { classItem };
  };

  // Check if a period is fixed (preparation, lunch, breakfast, or afternoon breakfast)
  const isFixedPeriod = (day: string, period: string): boolean => {
    const slot = schedule.schedule[day]?.[period];
    return slot?.classId === 'fixed-period';
  };

  // Get fixed period display info with correct text
  const getFixedPeriodInfo = (day: string, period: string, level?: 'Anaokulu' | 'İlkokul' | 'Ortaokul') => {
    const slot = schedule.schedule[day]?.[period];
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
        subtitle: level === 'Ortaokul' ? '09:15-09:35' : '08:30-08:50',
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

  const calculateWeeklyHours = () => {
    let totalHours = 0;
    DAYS.forEach(day => {
      PERIODS.forEach(period => {
        const slot = schedule.schedule[day]?.[period];
        // Don't count fixed periods in weekly hours
        if (slot?.classId && slot.classId !== 'fixed-period') {
          totalHours++;
        }
      });
    });
    return totalHours;
  };

  // Zaman bilgisini al
  const getTimeInfo = (period: string) => {
    const timePeriod = getTimeForPeriod(period, teacher.level);
    if (timePeriod) {
      return formatTimeRange(timePeriod.startTime, timePeriod.endTime);
    }
    return `${period}. Ders`;
  };

  return (
    <div style={{ 
      width: '297mm', 
      height: '210mm',
      padding: '10mm',
      fontSize: '12px',
      lineHeight: '1.4',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
      backgroundColor: 'white',
      color: '#000000'
    }}>
      {/* Header */}
      <div style={{ 
        marginBottom: '8mm',
        paddingBottom: '4mm',
        borderBottom: '2px solid #000000'
      }}>
        <h1 style={{ 
          fontSize: '18px', 
          fontWeight: 'bold', 
          margin: '0 0 4px 0',
          color: '#000000'
        }}>
          {teacher.name}
        </h1>
        <p style={{ 
          fontSize: '14px', 
          margin: 0,
          color: '#000000'
        }}>
          {teacher.branch} - {teacher.level}
        </p>
      </div>

      {/* Schedule Table */}
      <table style={{ 
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '11px'
      }}>
        <thead>
          <tr>
            <th style={{ 
              border: '1px solid #000000',
              padding: '8px 4px',
              textAlign: 'center',
              fontWeight: 'bold',
              backgroundColor: '#e6f3ff',
              width: '80px'
            }}>
              SAAT
            </th>
            {DAYS.map(day => (
              <th key={day} style={{ 
                border: '1px solid #000000',
                padding: '8px 4px',
                textAlign: 'center',
                fontWeight: 'bold',
                backgroundColor: '#e6f3ff'
              }}>
                {day.toUpperCase()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* Hazırlık/Kahvaltı Period */}
          <tr style={{ backgroundColor: '#f0f8ff' }}>
            <td style={{ 
              border: '1px solid #000000',
              padding: '8px 4px',
              textAlign: 'center',
              fontWeight: 'bold',
              backgroundColor: '#e6f3ff'
            }}>
              <div style={{ fontSize: '10px', fontWeight: 'bold' }}>
                {teacher.level === 'Ortaokul' ? 'Hazırlık' : 'Kahvaltı'}
              </div>
              <div style={{ fontSize: '8px', color: '#666666', marginTop: '2px' }}>
                {teacher.level === 'Ortaokul' ? '08:30-08:40' : '08:30-08:50'}
              </div>
            </td>
            {DAYS.map(day => {
              const fixedInfo = getFixedPeriodInfo(day, 'prep', teacher.level);
              
              return (
                <td key={`${day}-prep`} style={{ 
                  border: '1px solid #000000',
                  padding: '8px 4px',
                  textAlign: 'center',
                  backgroundColor: '#f0f8ff'
                }}>
                  {fixedInfo?.title || (teacher.level === 'Ortaokul' ? 'Hazırlık' : 'Kahvaltı')}
                </td>
              );
            })}
          </tr>

          {PERIODS.map((period, periodIndex) => {
            const timeInfo = getTimeInfo(period);
            const isLunchPeriod = (
              (teacher.level === 'İlkokul' || teacher.level === 'Anaokulu') && period === '5'
            ) || (
              teacher.level === 'Ortaokul' && period === '6'
            );
            
            // Show breakfast between 1st and 2nd period for middle school
            const showBreakfastAfter = teacher.level === 'Ortaokul' && period === '1';
            
            const showAfternoonBreakAfter = period === '8';
            
            return (
              <React.Fragment key={period}>
                <tr style={{ 
                  backgroundColor: isLunchPeriod ? '#f0fff0' : (periodIndex % 2 === 0 ? '#ffffff' : '#f8f9fa')
                }}>
                  <td style={{ 
                    border: '1px solid #000000',
                    padding: '8px 4px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    backgroundColor: isLunchPeriod ? '#e6ffe6' : '#e6f3ff'
                  }}>
                    <div style={{ fontSize: '10px', fontWeight: 'bold' }}>
                      {isLunchPeriod ? 'Yemek' : `${period}.`}
                    </div>
                    <div style={{ fontSize: '8px', color: '#666666', marginTop: '2px' }}>
                      {isLunchPeriod 
                        ? (teacher.level === 'İlkokul' || teacher.level === 'Anaokulu' ? '11:50-12:25' : '12:30-13:05')
                        : timeInfo
                      }
                    </div>
                  </td>
                  {DAYS.map(day => {
                    if (isLunchPeriod) {
                      return (
                        <td key={`${day}-${period}`} style={{ 
                          border: '1px solid #000000',
                          padding: '8px 4px',
                          textAlign: 'center',
                          backgroundColor: '#f0fff0'
                        }}>
                          Yemek
                        </td>
                      );
                    }
                    
                    const slotInfo = getSlotInfo(day, period);
                    
                    return (
                      <td key={`${day}-${period}`} style={{ 
                        border: '1px solid #000000',
                        padding: '8px 4px',
                        textAlign: 'center',
                        backgroundColor: periodIndex % 2 === 0 ? '#ffffff' : '#f8f9fa'
                      }}>
                        {slotInfo ? (
                          <div style={{ 
                            fontWeight: 'bold',
                            fontSize: '10px'
                          }}>
                            {slotInfo.classItem?.name}
                          </div>
                        ) : (
                          <span style={{ color: '#999999', fontSize: '9px' }}>Boş</span>
                        )}
                      </td>
                    );
                  })}
                </tr>

                {/* NEW: Breakfast between 1st and 2nd period for middle school */}
                {showBreakfastAfter && (
                  <tr style={{ backgroundColor: '#fff8f0' }}>
                    <td style={{ 
                      border: '1px solid #000000',
                      padding: '8px 4px',
                      textAlign: 'center',
                      fontWeight: 'bold',
                      backgroundColor: '#ffe6cc'
                    }}>
                      <div style={{ fontSize: '10px', fontWeight: 'bold' }}>
                        Kahvaltı
                      </div>
                      <div style={{ fontSize: '8px', color: '#666666', marginTop: '2px' }}>
                        09:15-09:35
                      </div>
                    </td>
                    {DAYS.map(day => {
                      const fixedInfo = getFixedPeriodInfo(day, 'breakfast', teacher.level);
                      
                      return (
                        <td key={`${day}-breakfast`} style={{ 
                          border: '1px solid #000000',
                          padding: '8px 4px',
                          textAlign: 'center',
                          backgroundColor: '#fff8f0'
                        }}>
                          {fixedInfo?.title || 'Kahvaltı'}
                        </td>
                      );
                    })}
                  </tr>
                )}

                {/* İkindi Kahvaltısı 8. ders sonrasında */}
                {showAfternoonBreakAfter && (
                  <tr style={{ backgroundColor: '#fffbf0' }}>
                    <td style={{ 
                      border: '1px solid #000000',
                      padding: '8px 4px',
                      textAlign: 'center',
                      fontWeight: 'bold',
                      backgroundColor: '#fff3e0'
                    }}>
                      <div style={{ fontSize: '10px', fontWeight: 'bold' }}>
                        İkindi Kahvaltısı
                      </div>
                      <div style={{ fontSize: '8px', color: '#666666', marginTop: '2px' }}>
                        14:35-14:45
                      </div>
                    </td>
                    {DAYS.map(day => (
                      <td key={`${day}-afternoon-breakfast`} style={{ 
                        border: '1px solid #000000',
                        padding: '8px 4px',
                        textAlign: 'center',
                        backgroundColor: '#fffbf0'
                      }}>
                        İkindi Kahvaltısı
                      </td>
                    ))}
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default SchedulePrintView;