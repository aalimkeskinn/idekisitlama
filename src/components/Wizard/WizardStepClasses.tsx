import React, { useState } from 'react';
import { Building, Users, Plus, Edit, Trash2 } from 'lucide-react';
import { Class, EDUCATION_LEVELS, Teacher } from '../../types';
import { WizardData } from '../../types/wizard';
import { useFirestore } from '../../hooks/useFirestore';
import Button from '../UI/Button';
import Select from '../UI/Select';
import Modal from '../UI/Modal';
import Input from '../UI/Input';

interface WizardStepClassesProps {
  data: WizardData;
  onUpdate: (data: Partial<WizardData>) => void;
  // DÜZELTME: `classes` prop'u eklendi.
  classes: Class[];
}

const WizardStepClasses: React.FC<WizardStepClassesProps> = ({
  data,
  onUpdate,
  classes: all_classes // Gelen prop'u `all_classes` olarak yeniden adlandırdık.
}) => {
  const { add: addClass, update: updateClass, remove: removeClass } = useFirestore<Class>('classes');
  const { data: teachers } = useFirestore<Teacher>('teachers');

  const [selectedLevel, setSelectedLevel] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    levels: [] as ('Anaokulu' | 'İlkokul' | 'Ortaokul')[],
    teacherIds: [] as string[],
    classTeacherId: ''
  });

  const classesData = data.classes || {
    selectedClasses: [],
    classCapacities: {},
    classPreferences: {}
  };

  const handleClassToggle = (classId: string) => {
    const isSelected = classesData.selectedClasses.includes(classId);
    let newSelectedClasses = classesData.selectedClasses;
    if (isSelected) {
      newSelectedClasses = newSelectedClasses.filter(id => id !== classId);
    } else {
      newSelectedClasses = [...newSelectedClasses, classId];
    }
    onUpdate({ classes: { ...classesData, selectedClasses: newSelectedClasses } });
  };

  const handleCapacityChange = (classId: string, capacity: number) => {
    onUpdate({
      classes: {
        ...classesData,
        classCapacities: { ...classesData.classCapacities, [classId]: Math.max(1, capacity) }
      }
    });
  };

  const handleSelectAllByLevel = (select: boolean) => {
    const levelClassIds = (selectedLevel ? all_classes.filter(c => (c.levels || [c.level]).includes(selectedLevel as any)) : all_classes).map(c => c.id);
    let newSelectedClasses = classesData.selectedClasses;
    if (select) {
      newSelectedClasses = Array.from(new Set([...newSelectedClasses, ...levelClassIds]));
    } else {
      newSelectedClasses = newSelectedClasses.filter(id => !levelClassIds.includes(id));
    }
    onUpdate({ classes: { ...classesData, selectedClasses: newSelectedClasses } });
  };

  const resetForm = () => {
    setFormData({ name: '', levels: [], teacherIds: [], classTeacherId: '' });
    setEditingClass(null);
    setIsModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.levels.length === 0) return;
    const classData = { name: formData.name, level: formData.levels[0], levels: formData.levels, teacherIds: formData.teacherIds, classTeacherId: formData.classTeacherId };
    if (editingClass) {
      await updateClass(editingClass.id, classData);
    } else {
      await addClass(classData as Omit<Class, 'id' | 'createdAt'>);
    }
    resetForm();
  };
  
  const handleEdit = (classItem: Class) => {
    setFormData({ name: classItem.name, levels: classItem.levels || [classItem.level], teacherIds: classItem.teacherIds || [], classTeacherId: classItem.classTeacherId || '' });
    setEditingClass(classItem);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Bu sınıfı silmek istediğinizden emin misiniz?")) {
        await removeClass(id);
        if (classesData.selectedClasses.includes(id)) {
            handleClassToggle(id);
        }
    }
  };

  const handleLevelToggle = (level: 'Anaokulu' | 'İlkokul' | 'Ortaokul') => {
    setFormData(prev => ({ ...prev, levels: prev.levels.includes(level) ? prev.levels.filter(l => l !== level) : [...prev.levels, level] }));
  };

  const handleTeacherToggle = (teacherId: string) => {
    setFormData(prev => {
        const newTeacherIds = prev.teacherIds.includes(teacherId) ? prev.teacherIds.filter(id => id !== teacherId) : [...prev.teacherIds, teacherId];
        const newClassTeacherId = !newTeacherIds.includes(prev.classTeacherId) ? '' : prev.classTeacherId;
        return { ...prev, teacherIds: newTeacherIds, classTeacherId: newClassTeacherId };
    });
  };

  const handleSetClassTeacher = (teacherId: string) => {
    setFormData(prev => ({ ...prev, teacherIds: prev.teacherIds.includes(teacherId) ? prev.teacherIds : [...prev.teacherIds, teacherId], classTeacherId: teacherId }));
  };

  const getFilteredTeachers = () => {
    if (formData.levels.length === 0) return [];
    return teachers.filter(t => (t.levels || [t.level]).some(level => formData.levels.includes(level))).sort((a,b) => a.name.localeCompare(b.name, 'tr'));
  };

  const filteredClasses = selectedLevel ? all_classes.filter(c => (c.levels || [c.level]).includes(selectedLevel as any)) : all_classes;
  const groupedClasses = filteredClasses.reduce((acc, c) => {
    (c.levels || [c.level]).forEach(level => {
        if (!acc[level]) acc[level] = [];
        acc[level].push(c);
    });
    return acc;
  }, {} as Record<string, Class[]>);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Building className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Sınıf Seçimi</h2>
        <p className="text-gray-600">Programa dahil edilecek sınıfları seçin, düzenleyin veya yeni sınıf ekleyin</p>
      </div>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="md:w-1/2"><Select label="Seviye Filtresi" value={selectedLevel} onChange={setSelectedLevel} options={[{value: '', label: 'Tüm Seviyeler'}, ...EDUCATION_LEVELS.map(l => ({value: l, label: l}))]} /></div>
        <Button onClick={() => setIsModalOpen(true)} icon={Plus} variant="primary">Yeni Sınıf Ekle</Button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div><h3 className="font-medium text-blue-900">Seçilen Sınıflar</h3><p className="text-sm text-blue-700">{classesData.selectedClasses.length} / {all_classes.length} sınıf seçildi</p></div>
          <div className="flex space-x-2"><Button onClick={() => handleSelectAllByLevel(true)} variant="secondary" size="sm">{selectedLevel ? `${selectedLevel} Tümünü Seç` : 'Tümünü Seç'}</Button><Button onClick={() => handleSelectAllByLevel(false)} variant="secondary" size="sm">{selectedLevel ? `${selectedLevel} Seçimini Kaldır` : 'Tüm Seçimi Kaldır'}</Button></div>
        </div>
      </div>
      
      <div className="space-y-6">
        {Object.entries(groupedClasses).map(([level, levelClasses]) => (
          <div key={level} className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center"><Users className="w-5 h-5 mr-2 text-emerald-600" />{level}<span className="ml-2 text-sm font-normal text-gray-500">({levelClasses.filter(c => classesData.selectedClasses.includes(c.id)).length}/{levelClasses.length})</span></h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {levelClasses.map(c => {
                  const isSelected = classesData.selectedClasses.includes(c.id);
                  const capacity = classesData.classCapacities[c.id] || 30;
                  return (
                    <div key={c.id} className={`p-4 rounded-lg border-2 transition-all duration-200 ${isSelected ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 bg-gray-50 hover:border-emerald-300'}`}>
                      <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                              <div onClick={() => handleClassToggle(c.id)} className={`w-5 h-5 rounded-full border-2 flex items-center justify-center cursor-pointer ${isSelected ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300'}`}>{isSelected && <div className="w-2 h-2 bg-white rounded-full" />}</div>
                              <div><h4 className="font-medium text-gray-900">{c.name}</h4><p className="text-xs text-gray-600">{c.level}</p></div>
                          </div>
                          <div className="flex items-center space-x-1"><button onClick={() => handleEdit(c)} className="p-1 text-gray-400 hover:text-blue-600" title="Düzenle"><Edit size={16} /></button><button onClick={() => handleDelete(c.id)} className="p-1 text-gray-400 hover:text-red-600" title="Sil"><Trash2 size={16} /></button></div>
                      </div>
                      {isSelected && <div className="mt-3 pt-3 border-t border-gray-200"><label className="block text-xs font-medium text-gray-700 mb-1">Kapasite</label><div className="flex items-center space-x-2"><button type="button" onClick={() => handleCapacityChange(c.id, capacity - 1)} className="w-6 h-6 bg-gray-200 rounded text-xs">-</button><span className="w-8 text-center text-sm font-medium">{capacity}</span><button type="button" onClick={() => handleCapacityChange(c.id, capacity + 1)} className="w-6 h-6 bg-gray-200 rounded text-xs">+</button><span className="text-xs text-gray-500">öğrenci</span></div></div>}
                    </div>
                  )
              })}
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={resetForm} title={editingClass ? 'Sınıf Düzenle' : 'Yeni Sınıf Ekle'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Sınıf Adı" value={formData.name} onChange={value => setFormData({...formData, name: value})} placeholder="Örn: 5A" required />
          <div className="mb-4"><label className="block text-sm font-semibold text-gray-800 mb-2">Eğitim Seviyeleri<span className="text-red-500">*</span></label><div className="flex flex-wrap gap-3">{EDUCATION_LEVELS.map(level => (<label key={level} className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${formData.levels.includes(level) ? 'bg-emerald-50 border-emerald-500' : 'bg-white border-gray-300'}`}><input type="checkbox" checked={formData.levels.includes(level)} onChange={() => handleLevelToggle(level)} className="sr-only" /><span className="text-sm font-medium">{level}</span>{formData.levels.includes(level) && <span className="ml-2 text-emerald-600">✓</span>}</label>))}</div></div>
          {formData.levels.length > 0 && <div className="mt-6 pt-6 border-t border-gray-200"><h3 className="text-lg font-medium text-gray-900 mb-4">Sınıf Öğretmenleri</h3>{getFilteredTeachers().length > 0 ? <div className="space-y-4"><Select label="Sınıf Öğretmeni" value={formData.classTeacherId} onChange={handleSetClassTeacher} options={[{value: '', label: 'Sınıf öğretmeni seçin...'},...getFilteredTeachers().map(t => ({value: t.id, label: `${t.name} (${t.branch})`}))]} /><div className="max-h-60 overflow-y-auto border rounded-lg"><div className="divide-y">{getFilteredTeachers().map(t => { const isSelected = formData.teacherIds.includes(t.id); const isClassTeacher = formData.classTeacherId === t.id; return (<div key={t.id} className={`p-3 flex items-center justify-between ${isClassTeacher ? 'bg-blue-50' : ''}`}><label className="flex items-center"><input type="checkbox" checked={isSelected} onChange={() => handleTeacherToggle(t.id)} className="h-4 w-4 rounded" /><span className="ml-3 text-sm">{t.name} <span className="text-xs text-gray-500">({t.branch})</span>{isClassTeacher && <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">Sınıf Öğrt.</span>}</span></label>{!isClassTeacher && isSelected && <button type="button" onClick={() => handleSetClassTeacher(t.id)} className="text-xs text-blue-600 hover:underline">Sınıf öğrt. yap</button>}</div>)})}</div></div></div> : <div className="text-center py-6 bg-gray-50 rounded-lg"><p>Seçilen seviyelerde öğretmen bulunamadı.</p></div>}</div>}
          <div className="flex justify-end space-x-3 pt-4"><Button type="button" onClick={resetForm} variant="secondary">İptal</Button><Button type="submit" variant="primary" disabled={formData.levels.length === 0}>{editingClass ? 'Güncelle' : 'Kaydet'}</Button></div>
        </form>
      </Modal>
    </div>
  );
};

export default WizardStepClasses;