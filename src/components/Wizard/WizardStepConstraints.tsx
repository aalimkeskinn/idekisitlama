// project/src/components/Wizard/WizardStepConstraints.tsx

import React, { useState } from 'react';
import { Clock, User, Building, BookOpen } from 'lucide-react';
import { Teacher, Class, Subject } from '../../types';
import { WizardData } from '../../types/wizard';
import { TimeConstraint } from '../../types/constraints';
import Select from '../UI/Select';
import TimeConstraintGrid from '../Constraints/TimeConstraintGrid';
import { useToast } from '../../hooks/useToast';

function getEntityLevel(entity: Teacher | Class | Subject | null): 'Anaokulu' | 'İlkokul' | 'Ortaokul' | undefined {
    if (!entity) return undefined;
    return (entity as any).levels?.[0] || (entity as any).level || undefined;
}

interface WizardStepConstraintsProps {
  data: WizardData;
  onUpdate: (data: { constraints: WizardData['constraints'] }) => void;
  teachers: Teacher[];
  classes: Class[];
  subjects: Subject[];
}

const WizardStepConstraints: React.FC<WizardStepConstraintsProps> = ({
  data,
  onUpdate,
  teachers,
  classes,
  subjects
}) => {
  const [activeTab, setActiveTab] = useState<'teachers' | 'classes' | 'subjects'>('teachers');
  const [selectedEntityId, setSelectedEntityId] = useState<string>('');

  const getEntityOptions = () => {
    switch (activeTab) {
      case 'teachers': 
        return teachers
          .filter(t => data.teachers?.selectedTeachers.includes(t.id))
          .map(t => ({ value: t.id, label: `${t.name} (${t.branch})` }));
      case 'classes': 
        return classes
          .filter(c => data.classes?.selectedClasses.includes(c.id))
          .map(c => ({ value: c.id, label: `${c.name} (${(c.levels || [c.level]).join(', ')})` }));
      case 'subjects': 
        return subjects
          .filter(s => data.subjects?.selectedSubjects.includes(s.id))
          .map(s => ({ value: s.id, label: `${s.name} (${s.branch})` }));
      default: 
        return [];
    }
  };

  const getSelectedEntity = () => {
    if (!selectedEntityId) return null;
    switch (activeTab) {
      case 'teachers': return teachers.find(t => t.id === selectedEntityId);
      case 'classes': return classes.find(c => c.id === selectedEntityId);
      case 'subjects': return subjects.find(s => s.id === selectedEntityId);
      default: return null;
    }
  };
  
  const handleConstraintsUpdate = (newConstraints: TimeConstraint[]) => {
    onUpdate({
      constraints: {
        ...(data.constraints || { timeConstraints: [], globalRules: {} as any }),
        timeConstraints: newConstraints,
      },
    });
  };
  
  const currentSelectedEntityObject = getSelectedEntity();
  const entityName = currentSelectedEntityObject?.name || '';
  const entityLevel = getEntityLevel(currentSelectedEntityObject);
  
  const tabs = [
    { id: 'teachers', label: 'Öğretmenler', icon: User },
    { id: 'classes', label: 'Sınıflar', icon: Building },
    { id: 'subjects', label: 'Dersler', icon: BookOpen }
  ];

  const activeTabInfo = tabs.find(t => t.id === activeTab);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Clock className="w-12 h-12 text-purple-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Zaman Kısıtlamaları</h2>
        <p className="text-gray-600">Öğretmen, sınıf veya ders bazında müsait olunmayan zamanları belirleyin.</p>
      </div>
      
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button 
              key={tab.id} 
              onClick={() => { 
                setActiveTab(tab.id as any); 
                setSelectedEntityId(''); 
              }} 
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center transition-colors duration-200 ${
                activeTab === tab.id 
                  ? 'border-purple-500 text-purple-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
      
      <div className="mt-6">
        <div className="space-y-4">
          <Select 
            label={`${activeTabInfo?.label || 'Öğe'} Seçin`} 
            value={selectedEntityId} 
            onChange={(value) => { setSelectedEntityId(value); }} 
            options={[{ value: '', label: 'Bir öğe seçin...' }, ...getEntityOptions()]} 
          />
          
          {selectedEntityId && currentSelectedEntityObject ? (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mt-4">
              <TimeConstraintGrid 
                  entityType={activeTab as any} 
                  entityId={selectedEntityId} 
                  entityName={entityName} 
                  entityLevel={entityLevel} 
                  constraints={data.constraints?.timeConstraints || []} 
                  onSave={handleConstraintsUpdate}
              />
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed mt-4">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  {React.createElement(activeTabInfo?.icon || Clock, {className:"w-8 h-8 text-gray-400"})}
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Öğe Seçin</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  Zaman kısıtlamalarını düzenlemek için yukarıdaki listeden bir {activeTabInfo?.label.toLowerCase() || 'öğe'} seçin.
                </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WizardStepConstraints;
