// --- START OF FILE src/components/Wizard/WizardStepConstraints.tsx ---

import React, { useState } from 'react';
import { Clock, User, Building, BookOpen, Settings, Wand2, Grid, List } from 'lucide-react';
import { Teacher, Class, Subject, DAYS, PERIODS } from '../../types';
import { WizardData } from '../../types/wizard';
import { TimeConstraint, CONSTRAINT_TYPES, ConstraintType } from '../../types/constraints';
import Button from '../UI/Button';
import Select from '../UI/Select';
import TimeConstraintGrid from '../Constraints/TimeConstraintGrid';
import { useToast } from '../../hooks/useToast';

const RULE_TEMPLATES = [
  { 
    id: 'ortaokul-ade', 
    label: 'ADE Dersleri (Ortaokul)',
    level: 'Ortaokul',
    subjectKeyword: 'ADE',
    rules: [
        { day: 'Salı', periods: ['4', '5'] },
        { day: 'Salı', periods: ['7', '8'] },
    ]
  },
  { 
    id: 'ilkokul-kulup', 
    label: 'Kulüp Dersi (İlkokul)',
    level: 'İlkokul',
    subjectKeyword: 'KULÜP',
    rules: [{ day: 'Perşembe', periods: ['9', '10'] }]
  },
  { 
    id: 'ortaokul-kulup', 
    label: 'Kulüp Dersi (Ortaokul)',
    level: 'Ortaokul',
    subjectKeyword: 'KULÜP',
    rules: [{ day: 'Perşembe', periods: ['6', '7'] }]
  },
];

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
  const { success, warning } = useToast();
  const [activeTab, setActiveTab] = useState<'global' | 'teachers' | 'classes' | 'subjects'>('global');
  const [selectedEntity, setSelectedEntity] = useState<string>('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [viewMode, setViewMode] = useState<'individual' | 'table'>('individual');

  const getEntityOptions = () => {
    switch (activeTab) {
      case 'teachers': return teachers.filter(t => data.teachers?.selectedTeachers.includes(t.id)).map(t => ({ value: t.id, label: `${t.name} (${t.branch})` }));
      case 'classes': return classes.filter(c => data.classes?.selectedClasses.includes(c.id)).map(c => ({ value: c.id, label: `${c.name} (${(c.levels || [c.level]).join(', ')})` }));
      case 'subjects': return subjects.filter(s => data.subjects?.selectedSubjects.includes(s.id)).map(s => ({ value: s.id, label: `${s.name} (${s.branch})` }));
      default: return [];
    }
  };

  const getSelectedEntity = () => {
    if (!selectedEntity) return null;
    switch (activeTab) {
      case 'teachers': return teachers.find(t => t.id === selectedEntity);
      case 'classes': return classes.find(c => c.id === selectedEntity);
      case 'subjects': return subjects.find(s => s.id === selectedEntity);
      default: return null;
    }
  };
  
  const handleApplyRuleTemplate = () => {
    if (!selectedTemplateId) return;
    const template = RULE_TEMPLATES.find(t => t.id === selectedTemplateId);
    if (!template) return;
    
    const targetSubjects = subjects.filter(s => 
        data.subjects.selectedSubjects.includes(s.id) &&
        s.name.toUpperCase().includes(template.subjectKeyword.toUpperCase()) &&
        (s.levels || [s.level]).includes(template.level as any)
    );

    if (targetSubjects.length === 0) {
        warning('Uygun Ders Bulunamadı', `Sihirbaz seçimlerinizde "${template.label}" kuralının uygulanabileceği bir ders bulunamadı.`);
        return;
    }

    let updatedConstraints = [...(data.constraints.timeConstraints || [])];

    targetSubjects.forEach(subject => {
        const ruleSlots = new Set<string>();
        template.rules.forEach(rule => {
            rule.periods.forEach(period => {
                ruleSlots.add(`${rule.day}-${period}`);
            });
        });

        DAYS.forEach(day => {
            PERIODS.forEach(period => {
                const isRuleSlot = ruleSlots.has(`${day}-${period}`);
                const constraintType = isRuleSlot ? 'preferred' : 'unavailable';

                const existingIndex = updatedConstraints.findIndex(c => c.entityType === 'subject' && c.entityId === subject.id && c.day === day && c.period === period);
                const newConstraint: TimeConstraint = {
                    id: `${subject.id}-${day}-${period}-${Date.now()}`,
                    entityType: 'subject',
                    entityId: subject.id,
                    day, period,
                    constraintType: constraintType,
                    reason: `Kural: ${template.label}`,
                    createdAt: new Date(), updatedAt: new Date(),
                };
                if (existingIndex > -1) {
                    if (newConstraint.constraintType === 'preferred' && updatedConstraints[existingIndex].constraintType === 'unavailable') {
                        // Stronger constraint already exists, do not overwrite 'unavailable' with 'preferred'
                    } else {
                        updatedConstraints[existingIndex] = newConstraint;
                    }
                } else {
                    updatedConstraints.push(newConstraint);
                }
            });
        });
    });
    
    onUpdate({ constraints: { ...data.constraints, timeConstraints: updatedConstraints }});
    success('Kural Uygulandı', `"${template.label}" kuralı ${targetSubjects.length} derse başarıyla uygulandı.`);
    setSelectedTemplateId('');
  };

  const handleConstraintsUpdate = (newConstraints: TimeConstraint[]) => {
    onUpdate({
      constraints: {
        ...data.constraints,
        timeConstraints: newConstraints,
      },
    });
    success("Kısıtlamalar Kaydedildi", "Değişiklikler başarıyla kaydedildi.");
  };

  // YENİ: Toplu kısıtlama güncelleme fonksiyonu
  const handleBulkConstraintUpdate = (entityType: 'teacher' | 'class' | 'subject', entityId: string, day: string, period: string, constraintType: ConstraintType | null) => {
    let updatedConstraints = [...(data.constraints.timeConstraints || [])];
    
    // Mevcut kısıtlamayı bul ve kaldır
    const existingIndex = updatedConstraints.findIndex(c => 
      c.entityType === entityType && 
      c.entityId === entityId && 
      c.day === day && 
      c.period === period
    );
    
    if (existingIndex > -1) {
      updatedConstraints.splice(existingIndex, 1);
    }
    
    // Yeni kısıtlama ekle (eğer null değilse)
    if (constraintType && constraintType !== 'preferred') {
      const newConstraint: TimeConstraint = {
        id: `${entityId}-${day}-${period}-${Date.now()}`,
        entityType,
        entityId,
        day,
        period,
        constraintType,
        reason: `Toplu atama: ${CONSTRAINT_TYPES[constraintType].label}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      updatedConstraints.push(newConstraint);
    }
    
    onUpdate({ constraints: { ...data.constraints, timeConstraints: updatedConstraints }});
  };

  // YENİ: Mevcut kısıtlamayı al
  const getConstraintForSlot = (entityType: 'teacher' | 'class' | 'subject', entityId: string, day: string, period: string): ConstraintType => {
    const constraint = data.constraints.timeConstraints?.find(c => 
      c.entityType === entityType && 
      c.entityId === entityId && 
      c.day === day && 
      c.period === period
    );
    return constraint?.constraintType || 'preferred';
  };

  // YENİ: Tablo görünümü render fonksiyonu
  const renderTableView = () => {
    const entities = getEntityOptions();
    const entityType = activeTab.slice(0, -1) as 'teacher' | 'class' | 'subject';
    
    if (entities.length === 0) {
      return (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed">
          <Grid className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Seçili Öğe Yok</h3>
          <p className="text-gray-500">
            Tablo görünümü için önce sihirbazın önceki adımlarında {activeTab} seçimi yapmalısınız.
          </p>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <h3 className="font-medium text-gray-900">
            {activeTab === 'teachers' ? 'Öğretmen' : activeTab === 'classes' ? 'Sınıf' : 'Ders'} Zaman Kısıtlamaları Tablosu
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Her hücreye tıklayarak kısıtlama türünü değiştirebilirsiniz
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase sticky left-0 bg-gray-50 z-10">
                  {activeTab === 'teachers' ? 'Öğretmen' : activeTab === 'classes' ? 'Sınıf' : 'Ders'}
                </th>
                {DAYS.map(day => (
                  <th key={day} className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase" colSpan={PERIODS.length}>
                    {day}
                  </th>
                ))}
              </tr>
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 sticky left-0 bg-gray-50 z-10">
                  Ders Saati
                </th>
                {DAYS.map(day => 
                  PERIODS.map(period => (
                    <th key={`${day}-${period}`} className="px-1 py-2 text-center text-xs font-medium text-gray-500">
                      {period}
                    </th>
                  ))
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {entities.map(entity => {
                const entityData = activeTab === 'teachers' ? teachers.find(t => t.id === entity.value) :
                                 activeTab === 'classes' ? classes.find(c => c.id === entity.value) :
                                 subjects.find(s => s.id === entity.value);
                
                return (
                  <tr key={entity.value} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900 sticky left-0 bg-white z-10 border-r border-gray-200">
                      <div className="text-sm">
                        <div className="font-semibold">{entityData?.name}</div>
                        <div className="text-xs text-gray-500">
                          {activeTab === 'teachers' ? (entityData as Teacher)?.branch :
                           activeTab === 'classes' ? (entityData as Class)?.level :
                           (entityData as Subject)?.branch}
                        </div>
                      </div>
                    </td>
                    {DAYS.map(day => 
                      PERIODS.map(period => {
                        const currentConstraint = getConstraintForSlot(entityType, entity.value, day, period);
                        const constraintConfig = CONSTRAINT_TYPES[currentConstraint];
                        
                        return (
                          <td key={`${entity.value}-${day}-${period}`} className="px-1 py-1">
                            <button
                              onClick={() => {
                                // Cycle through constraint types: preferred -> unavailable -> restricted -> preferred
                                const nextConstraint = currentConstraint === 'preferred' ? 'unavailable' :
                                                     currentConstraint === 'unavailable' ? 'restricted' :
                                                     'preferred';
                                handleBulkConstraintUpdate(entityType, entity.value, day, period, nextConstraint);
                              }}
                              className={`w-8 h-8 rounded text-xs font-bold transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1 ${constraintConfig.color}`}
                              title={`${day} ${period}. ders - ${constraintConfig.label}`}
                            >
                              {constraintConfig.icon}
                            </button>
                          </td>
                        );
                      })
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {/* Legend */}
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Kısıtlama Türleri:</h4>
          <div className="flex flex-wrap gap-4">
            {Object.entries(CONSTRAINT_TYPES).map(([key, config]) => (
              <div key={key} className="flex items-center space-x-2">
                <div className={`w-6 h-6 rounded text-xs font-bold flex items-center justify-center ${config.color}`}>
                  {config.icon}
                </div>
                <span className="text-sm text-gray-700">{config.label}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Hücrelere tıklayarak kısıtlama türlerini değiştirebilirsiniz
          </p>
        </div>
      </div>
    );
  };
  
  const handleGlobalConstraintChange = (key: string, value: any) => {
    onUpdate({
      constraints: { ...(data.constraints || { timeConstraints: [], globalRules: {} }), globalRules: { ...(data.constraints?.globalRules as object), [key]: value } }
    });
  };

  const currentSelectedEntityObject = getSelectedEntity();
  const entityName = currentSelectedEntityObject?.name || '';
  const entityLevel = getEntityLevel(currentSelectedEntityObject) || 'İlkokul';
  
  const globalConstraints = data.constraints?.globalRules || {};

  const renderGlobalConstraints = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h4 className="font-medium text-gray-900 mb-3 flex items-center"><Wand2 className="w-5 h-5 mr-2 text-orange-500"/>Okul Geneli Kural Şablonları</h4>
          <p className="text-sm text-gray-600 mb-4">Belirli etkinlikler (ADE, Kulüp vb.) için belirlenmiş olan sabit saatleri tek tıkla ilgili tüm derslere uygulayın.</p>
          <div className="flex items-end gap-3">
              <div className="flex-grow"><Select label="Uygulanacak Kuralı Seçin" value={selectedTemplateId} onChange={setSelectedTemplateId} options={[{value: '', label: 'Bir kural şablonu seçin...'}, ...RULE_TEMPLATES.map(t => ({ value: t.id, label: t.label }))]} /></div>
              <Button onClick={handleApplyRuleTemplate} disabled={!selectedTemplateId} variant="primary">Kuralı Uygula</Button>
          </div>
          <p className="text-xs text-gray-500 mt-2">Bu işlem, ilgili dersi sihirbazda seçtiyseniz, o dersin zaman kısıtlamalarını güncelleyecektir.</p>
      </div>
    </div>
  );

  const tabs = [
    { id: 'global', label: 'Genel Kurallar', icon: Settings },
    { id: 'teachers', label: 'Öğretmenler', icon: User },
    { id: 'classes', label: 'Sınıflar', icon: Building },
    { id: 'subjects', label: 'Dersler', icon: BookOpen }
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Clock className="w-12 h-12 text-purple-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Zaman Kısıtlamaları</h2>
        <p className="text-gray-600">Program oluşturma kurallarını ve zaman kısıtlamalarını belirleyin.</p>
      </div>
      
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button 
              key={tab.id} 
              onClick={() => { 
                setActiveTab(tab.id as any); 
                setSelectedEntity(''); 
              }} 
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
                activeTab === tab.id 
                  ? 'border-purple-500 text-purple-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
      
      <div className="mt-6">
        {activeTab === 'global' && renderGlobalConstraints()}
        
        {activeTab !== 'global' && (
          <div className="space-y-4">
            {/* YENİ: Görünüm modu seçici */}
            <div className="flex items-center justify-between">
              <Select 
                label={`${activeTab === 'teachers' ? 'Öğretmen' : activeTab === 'classes' ? 'Sınıf' : 'Ders'} Seçin`} 
                value={selectedEntity} 
                onChange={(value) => { setSelectedEntity(value); }} 
                options={[{ value: '', label: 'Seçim yapın...' }, ...getEntityOptions()]} 
              />
              
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">Görünüm:</span>
                <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                  <button
                    onClick={() => setViewMode('individual')}
                    className={`px-3 py-2 text-sm font-medium transition-colors ${
                      viewMode === 'individual'
                        ? 'bg-purple-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <List className="w-4 h-4 mr-1 inline" />
                    Bireysel
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    className={`px-3 py-2 text-sm font-medium transition-colors ${
                      viewMode === 'table'
                        ? 'bg-purple-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Grid className="w-4 h-4 mr-1 inline" />
                    Tablo
                  </button>
                </div>
              </div>
            </div>

            {viewMode === 'table' ? (
              renderTableView()
            ) : (
              <>
                {selectedEntity && currentSelectedEntityObject ? (
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <TimeConstraintGrid 
                        entityType={activeTab.slice(0, -1) as any} 
                        entityId={selectedEntity} 
                        entityName={entityName} 
                        entityLevel={entityLevel} 
                        constraints={data.constraints.timeConstraints} 
                        onSave={handleConstraintsUpdate}
                    />
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed">
                      <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                        {React.createElement(tabs.find(t=>t.id === activeTab)?.icon || Clock, {className:"w-8 h-8 text-gray-400"})}
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Öğe Seçin</h3>
                      <p className="text-gray-500 max-w-md mx-auto">
                        Zaman kısıtlamalarını düzenlemek için yukarıdaki listeden bir {activeTab.slice(0,-1)} seçin.
                      </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WizardStepConstraints;

// --- END OF FILE src/components/Wizard/WizardStepConstraints.tsx ---