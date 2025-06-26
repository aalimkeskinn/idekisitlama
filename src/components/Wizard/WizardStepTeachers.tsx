import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Users, Check, BookOpen } from 'lucide-react';
import { Teacher, EDUCATION_LEVELS, Subject, Class } from '../../types';
import { WizardData } from '../../types/wizard';
import { useFirestore } from '../../hooks/useFirestore';
import { useToast } from '../../hooks/useToast';
import Button from '../UI/Button';
import Modal from '../UI/Modal';
import Input from '../UI/Input';
import Select from '../UI/Select';

interface WizardStepTeachersProps {
  selectedTeachers: string[];
  onSelectedTeachersChange: (teacherIds: string[]) => void;
  // GÜNCELLENDİ: Otomatik seçim için yeni proplar
  wizardData: WizardData;
  all_classes: Class[];
}

const WizardStepTeachers: React.FC<WizardStepTeachersProps> = ({
  selectedTeachers,
  onSelectedTeachersChange,
  wizardData,
  all_classes,
}) => {
  const { data: teachers, add: addTeacher, update: updateTeacher, remove: removeTeacher } = useFirestore<Teacher>('teachers');
  const { data: subjects } = useFirestore<Subject>('subjects');
  const { success, error, info } = useToast();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    branch: '',
    levels: [] as ('Anaokulu' | 'İlkokul' | 'Ortaokul')[],
    subjectIds: [] as string[],
  });

  // YENİ EKLENDİ: Otomatik öğretmen seçme mantığı
  useEffect(() => {
    const selectedClassIds = wizardData.classes?.selectedClasses || [];
    
    if (selectedClassIds.length === 0 || all_classes.length === 0) {
      return; // Sınıf seçimi yoksa veya sınıflar henüz yüklenmediyse işlem yapma
    }

    const teacherIdsFromClasses = new Set<string>();
    const selectedClassObjects = all_classes.filter(c => selectedClassIds.includes(c.id));

    selectedClassObjects.forEach(classItem => {
      (classItem.teacherIds || []).forEach(id => teacherIdsFromClasses.add(id));
      if (classItem.classTeacherId) {
        teacherIdsFromClasses.add(classItem.classTeacherId);
      }
    });

    if (teacherIdsFromClasses.size > 0) {
      const newSelectedTeachers = Array.from(new Set([...selectedTeachers, ...Array.from(teacherIdsFromClasses)]));

      // Sadece gerçekten bir değişiklik varsa state'i güncelle ve bildirim göster
      if (newSelectedTeachers.length > selectedTeachers.length) {
        onSelectedTeachersChange(newSelectedTeachers);
        info(
          'Öğretmenler Otomatik Seçildi',
          `Seçilen sınıflara atanmış ${teacherIdsFromClasses.size} öğretmen listeye eklendi.`
        );
      }
    }
  // Bu useEffect'in sadece sınıf seçimi değiştiğinde çalışmasını istiyoruz.
  }, [wizardData.classes.selectedClasses, all_classes]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.branch) { error('❌ Branş Seçimi Gerekli', 'Lütfen bir branş seçin.'); return; }
    if (formData.levels.length === 0) { error('❌ Eğitim Seviyesi Gerekli', 'En az bir eğitim seviyesi seçmelisiniz.'); return; }
    
    try {
      const teacherData = {
        name: formData.name,
        branch: formData.branch,
        branches: [formData.branch],
        level: formData.levels[0],
        levels: formData.levels,
        subjectIds: formData.subjectIds,
      };
      if (editingTeacher) {
        await updateTeacher(editingTeacher.id, teacherData);
        success('✅ Öğretmen Güncellendi', `${formData.name} başarıyla güncellendi.`);
      } else {
        await addTeacher(teacherData as Omit<Teacher, 'id' | 'createdAt'>);
        success('✅ Öğretmen Eklendi', `${formData.name} başarıyla eklendi.`);
      }
      resetForm();
    } catch (err) {
      error('❌ Hata', 'Öğretmen kaydedilirken bir hata oluştu.');
    }
  };

  const resetForm = () => {
    setFormData({ name: '', branch: '', levels: [], subjectIds: [] });
    setEditingTeacher(null);
    setIsModalOpen(false);
  };

  const handleEdit = (teacher: Teacher) => {
    setFormData({
      name: teacher.name,
      branch: teacher.branch,
      levels: teacher.levels || (teacher.level ? [teacher.level] : []),
      subjectIds: teacher.subjectIds || [],
    });
    setEditingTeacher(teacher);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    const teacher = teachers.find(t => t.id === id);
    if (teacher && window.confirm(`${teacher.name} öğretmenini silmek istediğinizden emin misiniz?`)) {
      await removeTeacher(id);
      success('🗑️ Silindi', `${teacher.name} başarıyla silindi`);
      onSelectedTeachersChange(selectedTeachers.filter(teacherId => teacherId !== id));
    }
  };
  
  const handleTeacherToggle = (teacherId: string) => onSelectedTeachersChange(selectedTeachers.includes(teacherId) ? selectedTeachers.filter(id => id !== teacherId) : [...selectedTeachers, teacherId]);
  const handleSelectAll = () => onSelectedTeachersChange(selectedTeachers.length === teachers.length ? [] : teachers.map(t => t.id));
  const handleLevelToggle = (level: 'Anaokulu' | 'İlkokul' | 'Ortaokul') => setFormData(prev => ({...prev, levels: prev.levels.includes(level) ? prev.levels.filter(l => l !== level) : [...prev.levels, level]}));
  const handleSubjectToggle = (subjectId: string) => setFormData(prev => ({...prev, subjectIds: prev.subjectIds.includes(subjectId) ? prev.subjectIds.filter(id => id !== subjectId) : [...prev.subjectIds, subjectId]}));

  const sortedTeachers = [...teachers].sort((a, b) => a.name.localeCompare(b.name, 'tr'));
  const uniqueBranches = [...new Set(subjects.map(subject => subject.branch))].sort((a, b) => a.localeCompare(b, 'tr'));
  const branchOptions = [{ value: '', label: 'Branş Seçin...' }, ...uniqueBranches.map(branch => ({ value: branch, label: branch }))];
  const filteredSubjectsForModal = subjects.filter(subject => formData.levels.length === 0 ? false : (subject.levels || [subject.level]).some(sl => formData.levels.includes(sl))).sort((a, b) => a.name.localeCompare(b.name, 'tr'));

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4"><Users className="w-8 h-8 text-blue-600" /></div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Öğretmen Seçimi</h3>
        <p className="text-gray-600">Programa dahil edilecek öğretmenleri seçin. Sınıf adımında seçtiğiniz öğretmenler otomatik olarak işaretlenir.</p>
      </div>
      <div className="flex items-center justify-between">
        <div><h3 className="text-lg font-semibold">Öğretmenler ({teachers.length})</h3></div>
        <div className="flex items-center space-x-3">
          {teachers.length > 0 && <Button onClick={handleSelectAll} variant="secondary" size="sm">{selectedTeachers.length === teachers.length ? 'Tüm Seçimi Kaldır' : 'Tümünü Seç'}</Button>}
          <Button onClick={() => setIsModalOpen(true)} icon={Plus} variant="primary" size="sm">Yeni Öğretmen</Button>
        </div>
      </div>
      {sortedTeachers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedTeachers.map((teacher) => {
            const isSelected = selectedTeachers.includes(teacher.id);
            return (
              <div key={teacher.id} className={`relative bg-white rounded-lg border-2 p-4 transition-all cursor-pointer ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`} onClick={() => handleTeacherToggle(teacher.id)}>
                <div className={`absolute top-3 right-3 w-6 h-6 rounded-full border-2 flex items-center justify-center ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300 bg-white'}`}>{isSelected && <Check className="w-4 h-4 text-white" />}</div>
                <div className="pr-8">
                  <h4 className="font-semibold">{teacher.name}</h4>
                  <p className="text-sm text-gray-600 mt-1">Branş: {teacher.branch}</p>
                  <div className="flex flex-wrap gap-1 mt-2">{(teacher.levels || [teacher.level]).map(level => (<span key={level} className={`px-2 py-1 text-xs rounded-full ${level === 'Anaokulu' ? 'bg-green-100 text-green-800' : level === 'İlkokul' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>{level}</span>))}</div>
                </div>
                <div className="absolute bottom-3 right-3 flex space-x-1">
                  <button onClick={e => {e.stopPropagation(); handleEdit(teacher);}} className="p-1 text-gray-400 hover:text-blue-600"><Edit size={14} /></button>
                  <button onClick={e => {e.stopPropagation(); handleDelete(teacher.id);}} className="p-1 text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
                </div>
              </div>
            );
          })}
        </div>
      ) : <p className="text-center text-gray-500 py-8">Henüz öğretmen eklenmemiş.</p>}

      <Modal isOpen={isModalOpen} onClose={resetForm} title={editingTeacher ? 'Öğretmen Düzenle' : 'Yeni Öğretmen Ekle'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Ad Soyad" value={formData.name} onChange={(v) => setFormData(p => ({...p, name: v}))} required />
          <Select label="Branş" value={formData.branch} onChange={(v) => setFormData(p => ({...p, branch: v}))} options={branchOptions} required />
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-800 mb-2">Eğitim Seviyeleri <span className="text-red-500">*</span></label>
            <div className="flex flex-wrap gap-3">{EDUCATION_LEVELS.map(level => (<label key={level} className={`flex items-center p-3 border-2 rounded-lg cursor-pointer ${formData.levels.includes(level) ? 'bg-blue-50 border-blue-500' : 'bg-white border-gray-300'}`}><input type="checkbox" checked={formData.levels.includes(level)} onChange={() => handleLevelToggle(level)} className="sr-only" /><span className="text-sm">{level}</span>{formData.levels.includes(level) && <span className="ml-2 text-blue-600">✓</span>}</label>))}</div>
          </div>
          <div className="mt-6 pt-6 border-t">
            <h3 className="text-lg font-medium mb-4 flex items-center"><BookOpen className="w-5 h-5 mr-2 text-indigo-600" />Verebileceği Dersler</h3>
            <div className="space-y-2 p-3 border rounded-lg bg-gray-50 max-h-60 overflow-y-auto">
              {filteredSubjectsForModal.map(subject => (<label key={subject.id} className="flex items-center space-x-3 p-2 hover:bg-gray-100 rounded-md"><input type="checkbox" checked={formData.subjectIds.includes(subject.id)} onChange={() => handleSubjectToggle(subject.id)} className="w-4 h-4" /><span className="text-sm">{subject.name} <span className="text-xs text-gray-500">({subject.branch} - {(subject.levels || [subject.level]).join(', ')})</span></span></label>))}
              {formData.levels.length > 0 && filteredSubjectsForModal.length === 0 && <div className="text-center text-sm text-gray-500 py-4">Seçilen seviyelere uygun ders bulunamadı.</div>}
              {formData.levels.length === 0 && <div className="text-center text-sm text-gray-500 py-4">Dersleri görmek için seviye seçin.</div>}
            </div>
          </div>
          <div className="flex justify-end space-x-3 pt-4"><Button type="button" onClick={resetForm} variant="secondary">İptal</Button><Button type="submit" variant="primary" disabled={!formData.branch || formData.levels.length === 0}>{editingTeacher ? 'Güncelle' : 'Kaydet'}</Button></div>
        </form>
      </Modal>
    </div>
  );
};

export default WizardStepTeachers;