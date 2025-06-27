// project/src/components/Constraints/TimeConstraintGrid.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { Clock, Save, RotateCcw, Lock, Slash } from 'lucide-react';
import { DAYS, formatTimeRange, getTimePeriods } from '../../types';
import { TimeConstraint, CONSTRAINT_TYPES, ConstraintType } from '../../types/constraints';
import Button from '../UI/Button';

interface TimeConstraintGridProps {
  entityType: 'teacher' | 'class' | 'subject';
  entityId: string;
  entityName: string;
  entityLevel?: 'Anaokulu' | 'İlkokul' | 'Ortaokul';
  constraints: TimeConstraint[];
  onSave: (newConstraints: TimeConstraint[]) => void;
}

const TimeConstraintGrid: React.FC<TimeConstraintGridProps> = ({
  entityType,
  entityId,
  entityName,
  entityLevel,
  constraints,
  onSave,
}) => {
  const [selectedConstraintType, setSelectedConstraintType] = useState<ConstraintType>('unavailable');
  const [localConstraints, setLocalConstraints] = useState<TimeConstraint[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setLocalConstraints(constraints);
    setHasChanges(false);
  }, [entityId, constraints]);

  const timePeriodsToRender = useMemo(() => {
    const level = entityLevel || 'İlkokul';
    return getTimePeriods(level);
  }, [entityLevel]);

  const updateLocalConstraints = (newConstraints: TimeConstraint[]) => {
    setLocalConstraints(newConstraints);
    setHasChanges(true);
  };
  
  const handleSetAll = (type: ConstraintType) => {
    let newConstraints = localConstraints.filter(c => c.entityId !== entityId);
    if (type !== 'preferred') {
        timePeriodsToRender.forEach(tp => {
            if (!tp.isBreak) {
                DAYS.forEach(day => {
                    newConstraints.push({
                        id: `${entityId}-${day}-${tp.period}-${Date.now()}`,
                        entityType, entityId, day, period: tp.period,
                        constraintType: type,
                        reason: `Toplu atama: ${CONSTRAINT_TYPES[type].label}`,
                        createdAt: new Date(), updatedAt: new Date()
                    });
                });
            }
        });
    }
    updateLocalConstraints(newConstraints);
  };

  const handleReset = () => {
    const originalEntityConstraints = constraints.filter(c => c.entityId === entityId);
    const otherEntitiesConstraints = localConstraints.filter(c => c.entityId !== entityId);
    setLocalConstraints([...otherEntitiesConstraints, ...originalEntityConstraints]);
    setHasChanges(false);
  }

  const handleSave = () => {
    onSave(localConstraints);
    setHasChanges(false);
  }

  const handleSlotClick = (day: string, period: string, isFixed: boolean) => {
    if (isFixed) return;

    let updatedConstraints = [...localConstraints];
    const existingConstraintIndex = updatedConstraints.findIndex(c => c.entityType === entityType && c.entityId === entityId && c.day === day && c.period === period);

    if (existingConstraintIndex !== -1) {
      const currentConstraint = updatedConstraints[existingConstraintIndex];
      if (currentConstraint.constraintType === selectedConstraintType) {
        updatedConstraints.splice(existingConstraintIndex, 1);
      } else {
        updatedConstraints[existingConstraintIndex] = { ...currentConstraint, constraintType: selectedConstraintType, updatedAt: new Date() };
      }
    } else {
      if (selectedConstraintType === 'preferred') return;
      const newConstraint: TimeConstraint = {
        id: `${entityId}-${day}-${period}-${Date.now()}`,
        entityType, entityId, day, period,
        constraintType: selectedConstraintType,
        reason: `${CONSTRAINT_TYPES[selectedConstraintType].label} - ${entityName}`,
        createdAt: new Date(), updatedAt: new Date()
      };
      updatedConstraints.push(newConstraint);
    }
    updateLocalConstraints(updatedConstraints);
  };
  
  const getConstraintForSlot = (day: string, period: string): TimeConstraint | undefined => {
    return localConstraints.find(c => c.entityType === entityType && c.entityId === entityId && c.day === day && c.period === period);
  };

  return (
    <div className="space-y-6">
      <div className="p-6 bg-gray-50 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{entityName} - Zaman Kısıtlamaları</h3>
            <p className="text-sm text-gray-600 mt-1">Bir kısıtlama türü seçip tabloya tıklayarak uygulayın.</p>
          </div>
          <div className="flex items-center space-x-3">
            <Button onClick={() => handleSetAll('unavailable')} icon={Slash} variant="danger" size="sm">Tümünü Meşgul Yap</Button>
            <Button onClick={handleReset} icon={RotateCcw} variant="secondary" size="sm">Sıfırla</Button>
            <Button onClick={handleSave} icon={Save} variant="primary" size="sm" disabled={!hasChanges}>Kaydet</Button>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-6">
            <h4 className="font-semibold">Uygulanacak Kısıtlama Türü:</h4>
            <div className="flex flex-wrap gap-2">
                {Object.entries(CONSTRAINT_TYPES).map(([key, value]) => (
                    <button key={key} onClick={() => setSelectedConstraintType(key as ConstraintType)} className={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all ${selectedConstraintType === key ? `${value.color} border-current` : 'border-gray-300 bg-white hover:bg-gray-100'}`}>
                        <span className="mr-2">{value.icon}</span>{value.label}
                    </button>
                ))}
            </div>
        </div>
      </div>

      <div className="border-t border-gray-200">
        <div className="table-responsive">
          <table className="min-w-full">
            <thead className="bg-gray-50"><tr><th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase sticky left-0 bg-gray-50 z-10">DERS SAATİ</th>{DAYS.map(day => (<th key={day} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase"><div className="font-bold">{day}</div></th>))}</tr></thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {timePeriodsToRender.map((tp) => {
                  const isFixed = tp.isBreak;
                  const periodLabel = typeof tp.period === 'string' && tp.period.startsWith('break') ? 'Teneffüs/Kahvaltı' : tp.isBreak ? 'Mola' : `${tp.period}. Ders`;
                  
                  return (
                    <tr key={tp.period} className={isFixed ? 'bg-gray-100' : ''}>
                      <td className={`px-4 py-3 font-medium text-gray-900 sticky left-0 z-10 border-r ${isFixed ? 'bg-gray-200' : 'bg-gray-100'}`}>
                        <div className="text-left">
                            <div className="font-bold text-sm">{periodLabel}</div>
                            <div className="text-xs text-gray-600 mt-1 flex items-center">
                                <Clock className="w-3 h-3 mr-1" />
                                {formatTimeRange(tp.startTime, tp.endTime)}
                            </div>
                        </div>
                      </td>
                      {DAYS.map(day => {
                        if (isFixed) {
                          return (<td key={`${day}-${tp.period}`} className="px-2 py-2"><div className="w-full min-h-[70px] p-3 rounded-lg border-2 border-dashed border-gray-300 bg-gray-100 flex flex-col items-center justify-center text-gray-500"><Lock size={18} className="mb-1"/><div className="text-xs font-medium leading-tight">{periodLabel}</div></div></td>);
                        }
                        const constraint = getConstraintForSlot(day, tp.period);
                        const constraintConfig = constraint ? CONSTRAINT_TYPES[constraint.constraintType] : CONSTRAINT_TYPES.preferred;
                        return (<td key={`${day}-${tp.period}`} className="px-2 py-2"><button onClick={() => handleSlotClick(day, tp.period, isFixed || false)} disabled={isFixed} className={`w-full min-h-[70px] p-3 rounded-lg border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${constraintConfig.color} ${isFixed ? 'cursor-not-allowed' : 'hover:opacity-80 hover:scale-105'}`}><div className="text-center"><div className="text-xl mb-1">{constraintConfig.icon}</div><div className="text-xs font-medium leading-tight">{constraintConfig.label}</div></div></button></td>);
                      })}
                    </tr>
                  )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TimeConstraintGrid;