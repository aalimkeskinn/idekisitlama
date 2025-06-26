// src/pages/Subjects.tsx

import React, { useState } from 'react';
import { Plus, Edit, Trash2, BookOpen, Clock, Lightbulb } from 'lucide-react';
import { Subject, EDUCATION_LEVELS, parseDistributionPattern, validateDistributionPattern, generateDistributionSuggestions } from '../types';
import { useFirestore } from '../hooks/useFirestore';
import { useToast } from '../hooks/useToast';
import { useConfirmation } from '../hooks/useConfirmation';
import Button from '../components/UI/Button';
import Modal from '../components/UI/Modal';
import Input from '../components/UI/Input';
import Select from '../components/UI/Select';
import ConfirmationModal from '../components/UI/ConfirmationModal';

const Subjects = () => {
  const { data: subjects, loading, add, update, remove } = useFirestore<Subject>('subjects');
  const { success, error, warning } = useToast();
  const { confirmation, confirmDelete } = useConfirmation();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [levelFilter, setLevelFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  
  // Sadeleştirilmiş form state'i - YENİ: distributionPattern eklendi
  const [formData, setFormData] = useState({
    name: '',
    branch: '',
    levels: [] as ('Anaokulu' | 'İlkokul' | 'Ortaokul')[],
    weeklyHours: '1',
    distributionPattern: '', // YENİ ALAN
  });

  const getUniqueBranches = () => [...new Set(subjects.map(s => s.branch))].sort((a, b) => a.localeCompare(b, 'tr'));
  const getFilteredSubjects = () => subjects.filter(s => 
    (!levelFilter || (s.levels || [s.level]).includes(levelFilter as any)) &&
    (!branchFilter || s.branch === branchFilter)
  ).sort((a, b) => a.name.localeCompare(b.name, 'tr'));

  const sortedSubjects = getFilteredSubjects();

  const resetForm = () => {
    setFormData({ name: '', branch: '', levels: [], weeklyHours: '1', distributionPattern: '' });
    setEditingSubject(null);
    setIsModalOpen(false);
  };

  const handleEdit = (subject: Subject) => {
    setFormData({
      name: subject.name,
      branch: subject.branch,
      levels: subject.levels || (subject.level ? [subject.level] : []),
      weeklyHours: subject.weeklyHours.toString(),
      distributionPattern: subject.distributionPattern || '', // YENİ ALAN
    });
    setEditingSubject(subject);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    const subject = subjects.find(s => s.id === id);
    if (subject) confirmDelete(subject.name, async () => {
      await remove(id);
      success('🗑️ Ders Silindi', `${subject.name} başarıyla silindi`);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.levels.length === 0) { 
      error('❌ Eğitim Seviyesi Gerekli', 'En az bir eğitim seviyesi seçmelisiniz.'); 
      return; 
    }
    
    const weeklyHours = parseInt(formData.weeklyHours) || 1;
    
    // Dağıtım şekli validasyonu
    if (formData.distributionPattern && !validateDistributionPattern(formData.distributionPattern, weeklyHours)) {
      error('❌ Geçersiz Dağıtım Şekli', 'Dağıtım şeklindeki saatlerin toplamı haftalık saat ile eşleşmiyor.');
      return;
    }
    
    const subjectData: Partial<Subject> = {
      name: formData.name,
      branch: formData.branch,
      level: formData.levels[0],
      levels: formData.levels,
      weeklyHours: weeklyHours,
      distributionPattern: formData.distributionPattern || undefined, // YENİ ALAN
    };

    try {
      if (editingSubject) {
        await update(editingSubject.id, subjectData);
        success('✅ Ders Güncellendi', `${formData.name} başarıyla güncellendi`);
      } else {
        await add(subjectData as Omit<Subject, 'id' | 'createdAt'>);
        success('✅ Ders Eklendi', `${formData.name} başarıyla eklendi`);
      }
      resetForm();
    } catch (err) { 
      error('❌ Hata', 'Ders kaydedilirken bir hata oluştu'); 
    }
  };

  const handleLevelToggle = (level: 'Anaokulu' | 'İlkokul' | 'Ortaokul') => {
    setFormData(prev => {
      const newLevels = prev.levels.includes(level) ? prev.levels.filter(l => l !== level) : [...prev.levels, level];
      return { ...prev, levels: newLevels };
    });
  };

  // YENİ: Dağıtım şekli önerilerini uygulama
  const applySuggestion = (suggestion: string) => {
    setFormData(prev => ({ ...prev, distributionPattern: suggestion }));
  };

  // YENİ: Haftalık saat değiştiğinde dağıtım şekli önerilerini güncelle
  const weeklyHours = parseInt(formData.weeklyHours) || 1;
  const suggestions = generateDistributionSuggestions(weeklyHours);
  const isValidPattern = formData.distributionPattern ? validateDistributionPattern(formData.distributionPattern, weeklyHours) : true;
  const parsedPattern = parseDistributionPattern(formData.distributionPattern);

  const getSubjectLevelsDisplay = (subject: Subject) => subject.levels && subject.levels.length > 0 ? subject.levels : [subject.level];
  const levelOptions = EDUCATION_LEVELS.map(level => ({ value: level, label: level }));
  const branchOptions = getUniqueBranches().map(branch => ({ value: branch, label: branch }));
  
  return (
    <div className="container-mobile">
      <div className="header-mobile">
        <div className="flex items-center">
          <BookOpen className="w-8 h-8 text-indigo-600 mr-3" />
          <div>
            <h1 className="text-responsive-xl font-bold text-gray-900">Dersler</h1>
            <p className="text-responsive-sm text-gray-600">{subjects.length} ders kayıtlı ({sortedSubjects.length} gösteriliyor)</p>
          </div>
        </div>
        <div className="button-group-mobile">
          <Button onClick={() => setIsModalOpen(true)} icon={Plus} variant="primary" className="w-full sm:w-auto">Yeni Ders</Button>
        </div>
      </div>
      
      <div className="mobile-card mobile-spacing mb-6">
        <div className="responsive-grid-2 gap-responsive">
          <Select label="Seviye Filtresi" value={levelFilter} onChange={setLevelFilter} options={[{ value: '', label: 'Tüm Seviyeler' }, ...levelOptions]} />
          <Select label="Branş Filtresi" value={branchFilter} onChange={setBranchFilter} options={[{ value: '', label: 'Tüm Branşlar' }, ...branchOptions]} />
        </div>
      </div>

      {loading ? <p>Yükleniyor...</p> : sortedSubjects.length === 0 ? (
        <div className="text-center py-12 mobile-card">
          <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium">Henüz Ders Eklenmemiş</h3>
        </div>
      ) : (
        <div className="mobile-card overflow-hidden">
          <div className="table-responsive">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ders Adı</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Branş</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Seviye</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Haftalık Saat</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dağıtım Şekli</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">İşlemler</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedSubjects.map((subject) => (
                  <tr key={subject.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{subject.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{subject.branch}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {getSubjectLevelsDisplay(subject).map((level, i) => (
                          <span key={i} className={`px-2 py-1 text-xs rounded-full ${level === 'Anaokulu' ? 'bg-green-100 text-green-800' : level === 'İlkokul' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                            {level}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{subject.weeklyHours} saat</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {subject.distributionPattern ? (
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-sm bg-blue-50 text-blue-700 px-2 py-1 rounded">
                            {subject.distributionPattern}
                          </span>
                          <Clock className="w-4 h-4 text-blue-500" />
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">Belirtilmemiş</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex justify-end space-x-2">
                        <Button onClick={() => handleEdit(subject)} icon={Edit} size="sm" variant="secondary">Düzenle</Button>
                        <Button onClick={() => handleDelete(subject.id)} icon={Trash2} size="sm" variant="danger">Sil</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={resetForm} title={editingSubject ? 'Ders Düzenle' : 'Yeni Ders Ekle'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Ders Adı" value={formData.name} onChange={v => setFormData(p => ({...p, name: v}))} required />
            <Input label="Branş" value={formData.branch} onChange={v => setFormData(p => ({...p, branch: v}))} required />
          </div>
          
          <Input 
            label="Haftalık Ders Saati" 
            type="number" 
            value={formData.weeklyHours} 
            onChange={v => setFormData(p => ({...p, weeklyHours: v, distributionPattern: ''}))} // Saat değişince dağıtımı sıfırla
            required 
          />
          
          {/* YENİ: Dağıtım Şekli Alanı */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                Dağıtım Şekli <span className="text-gray-500">(İsteğe bağlı)</span>
              </label>
              <Input 
                value={formData.distributionPattern} 
                onChange={v => setFormData(p => ({...p, distributionPattern: v}))}
                placeholder="Örn: 2+2+2+2+2+2"
              />
              
              {/* Validasyon Mesajı */}
              {formData.distributionPattern && !isValidPattern && (
                <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700 font-medium">
                    ⚠️ Dağıtım şeklindeki saatlerin toplamı ({parsedPattern.reduce((a, b) => a + b, 0)}) haftalık saat ({weeklyHours}) ile eşleşmiyor.
                  </p>
                </div>
              )}
              
              {/* Başarılı Validasyon */}
              {formData.distributionPattern && isValidPattern && parsedPattern.length > 0 && (
                <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-700 font-medium">
                    ✅ {parsedPattern.length} günde dağıtım: {parsedPattern.map((h, i) => `${i + 1}. gün ${h} saat`).join(', ')}
                  </p>
                </div>
              )}
              
              <p className="text-xs text-gray-500 mt-1">
                Dersin hafta boyunca nasıl dağıtılacağını belirtin. Örn: "2+2+2" = 3 günde 2'şer saat
              </p>
            </div>
            
            {/* Öneriler */}
            {suggestions.length > 0 && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center mb-3">
                  <Lightbulb className="w-5 h-5 text-blue-600 mr-2" />
                  <h4 className="font-medium text-blue-800">{weeklyHours} Saatlik Ders İçin Öneriler</h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => applySuggestion(suggestion)}
                      className={`px-3 py-2 text-sm rounded-lg border transition-all duration-200 ${
                        formData.distributionPattern === suggestion
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-blue-700 border-blue-300 hover:bg-blue-100'
                      }`}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-blue-600 mt-2">
                  Önerilen dağıtım şekillerinden birini seçebilir veya kendiniz yazabilirsiniz.
                </p>
              </div>
            )}
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-800 mb-2">Eğitim Seviyeleri <span className="text-red-500">*</span></label>
            <div className="flex flex-wrap gap-3">
              {EDUCATION_LEVELS.map(level => (
                <label key={level} className={`flex items-center p-3 border-2 rounded-lg cursor-pointer ${formData.levels.includes(level) ? 'bg-indigo-50 border-indigo-500' : 'bg-white border-gray-300'}`}>
                  <input type="checkbox" checked={formData.levels.includes(level)} onChange={() => handleLevelToggle(level)} className="sr-only" />
                  <span className="text-sm">{level}</span>
                  {formData.levels.includes(level) && <span className="ml-2">✓</span>}
                </label>
              ))}
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" onClick={resetForm} variant="secondary">İptal</Button>
            <Button type="submit" variant="primary" disabled={formData.levels.length === 0 || (formData.distributionPattern && !isValidPattern)}>
              {editingSubject ? 'Güncelle' : 'Kaydet'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmationModal {...confirmation} onClose={() => {}} />
    </div>
  );
};

export default Subjects;