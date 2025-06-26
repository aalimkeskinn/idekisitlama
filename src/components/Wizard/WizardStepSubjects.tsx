import React, { useState } from 'react';
import { BookOpen, Plus, Minus, Edit, Trash2, CheckSquare, Square, Clock, Lightbulb } from 'lucide-react';
import { Subject, EDUCATION_LEVELS, parseDistributionPattern, validateDistributionPattern, generateDistributionSuggestions } from '../../types';
import { WizardData } from '../../types/wizard';
import { useFirestore } from '../../hooks/useFirestore';
import { useToast } from '../../hooks/useToast';
import Button from '../UI/Button';
import Select from '../UI/Select';
import Modal from '../UI/Modal';
import Input from '../UI/Input';

interface WizardStepSubjectsProps {
  data: WizardData['subjects'];
  onUpdate: (data: WizardData['subjects']) => void;
}

const WizardStepSubjects: React.FC<WizardStepSubjectsProps> = ({ data, onUpdate }) => {
  const { data: allSubjects, add: addSubject, update: updateSubject, remove: removeSubject } = useFirestore<Subject>('subjects');
  const { success, error } = useToast();
  const [selectedLevel, setSelectedLevel] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    branch: '',
    levels: [] as ('Anaokulu' | 'İlkokul' | 'Ortaokul')[],
    weeklyHours: '1',
    distributionPattern: '', // YENİ ALAN
  });

  const filteredSubjects = allSubjects.filter(subject => !selectedLevel || (subject.levels || [subject.level]).includes(selectedLevel as any));
  const selectedSubjects = allSubjects.filter(subject => data.selectedSubjects.includes(subject.id));

  const handleSubjectToggle = (subjectId: string) => {
    const isSelected = data.selectedSubjects.includes(subjectId);
    const newSelectedSubjects = isSelected 
      ? data.selectedSubjects.filter(id => id !== subjectId)
      : [...data.selectedSubjects, subjectId];

    const newSubjectHours = { ...data.subjectHours };
    
    if (isSelected) {
      delete newSubjectHours[subjectId];
    } else {
      const subject = allSubjects.find(s => s.id === subjectId);
      newSubjectHours[subjectId] = subject?.weeklyHours || 1;
    }
    
    onUpdate({ selectedSubjects: newSelectedSubjects, subjectHours: newSubjectHours, subjectPriorities: data.subjectPriorities });
  };

  // YENİ: Tümünü seç/kaldır fonksiyonu
  const handleSelectAll = () => {
    const currentFilteredIds = filteredSubjects.map(s => s.id);
    const allCurrentlySelected = currentFilteredIds.every(id => data.selectedSubjects.includes(id));
    
    if (allCurrentlySelected) {
      // Tümünü kaldır
      const newSelectedSubjects = data.selectedSubjects.filter(id => !currentFilteredIds.includes(id));
      const newSubjectHours = { ...data.subjectHours };
      
      // Kaldırılan derslerin saatlerini sil
      currentFilteredIds.forEach(id => {
        delete newSubjectHours[id];
      });
      
      onUpdate({ 
        selectedSubjects: newSelectedSubjects, 
        subjectHours: newSubjectHours, 
        subjectPriorities: data.subjectPriorities 
      });
      
      success('✅ Seçim Kaldırıldı', `${currentFilteredIds.length} dersin seçimi kaldırıldı`);
    } else {
      // Tümünü seç
      const newSelectedSubjects = [...new Set([...data.selectedSubjects, ...currentFilteredIds])];
      const newSubjectHours = { ...data.subjectHours };
      
      // Yeni seçilen derslerin saatlerini ekle
      currentFilteredIds.forEach(id => {
        if (!data.selectedSubjects.includes(id)) {
          const subject = allSubjects.find(s => s.id === id);
          newSubjectHours[id] = subject?.weeklyHours || 1;
        }
      });
      
      onUpdate({ 
        selectedSubjects: newSelectedSubjects, 
        subjectHours: newSubjectHours, 
        subjectPriorities: data.subjectPriorities 
      });
      
      success('✅ Tümü Seçildi', `${currentFilteredIds.length} ders seçildi`);
    }
  };

  const handleHoursChange = (subjectId: string, hours: number) => {
    onUpdate({ ...data, subjectHours: { ...data.subjectHours, [subjectId]: Math.max(1, hours) } });
  };

  const getTotalWeeklyHours = () => selectedSubjects.reduce((sum, subject) => sum + (data.subjectHours[subject.id] || subject.weeklyHours), 0);
  
  const resetForm = () => {
    setFormData({ name: '', branch: '', levels: [], weeklyHours: '1', distributionPattern: '' });
    setEditingSubject(null);
    setIsModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.levels.length === 0) { error('❌ Eğitim Seviyesi Gerekli', 'En az bir eğitim seviyesi seçmelisiniz.'); return; }
    
    const weeklyHours = parseInt(formData.weeklyHours) || 1;
    
    // Dağıtım şekli validasyonu
    if (formData.distributionPattern && !validateDistributionPattern(formData.distributionPattern, weeklyHours)) {
      error('❌ Geçersiz Dağıtım Şekli', 'Dağıtım şeklindeki saatlerin toplamı haftalık saat ile eşleşmiyor.');
      return;
    }
    
    const subjectData = { 
      name: formData.name, 
      branch: formData.branch, 
      level: formData.levels[0], 
      levels: formData.levels, 
      weeklyHours: weeklyHours,
      distributionPattern: formData.distributionPattern || undefined, // YENİ ALAN
    };

    try {
      if (editingSubject) {
        await updateSubject(editingSubject.id, subjectData);
        success('✅ Ders Güncellendi', `${formData.name} başarıyla güncellendi`);
      } else {
        await addSubject(subjectData as Omit<Subject, 'id' | 'createdAt'>);
        success('✅ Ders Eklendi', `${formData.name} başarıyla eklendi`);
      }
      resetForm();
    } catch (err) { 
      error('❌ Hata', 'Ders kaydedilirken bir hata oluştu'); 
    }
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
  
  const handleDelete = async (id: string) => {
    const subject = allSubjects.find(s => s.id === id);
    if (subject && window.confirm(`${subject.name} dersini silmek istediğinizden emin misiniz?`)) {
      await removeSubject(id);
      success('🗑️ Silindi', `${subject.name} başarıyla silindi`);
      if(data.selectedSubjects.includes(id)) {
        handleSubjectToggle(id);
      }
    }
  };
  
  const handleLevelToggle = (level: 'Anaokulu' | 'İlkokul' | 'Ortaokul') => {
    setFormData(prev => ({...prev, levels: prev.levels.includes(level) ? prev.levels.filter(l => l !== level) : [...prev.levels, level]}));
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

  // Filtrelenmiş derslerin seçim durumunu kontrol et
  const filteredSelectedCount = filteredSubjects.filter(s => data.selectedSubjects.includes(s.id)).length;
  const allFilteredSelected = filteredSubjects.length > 0 && filteredSelectedCount === filteredSubjects.length;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <BookOpen className="w-8 h-8 text-indigo-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Ders Seçimi ve Konfigürasyonu</h3>
        <p className="text-gray-600">Programa dahil edilecek dersleri seçin ve haftalık saatlerini belirleyin</p>
      </div>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="md:w-1/2">
          <Select 
            label="Seviye Filtresi" 
            value={selectedLevel} 
            onChange={setSelectedLevel} 
            options={[{ value: '', label: 'Tüm Seviyeler' }, ...EDUCATION_LEVELS.map(l => ({value: l, label: l}))]} 
          />
        </div>
        <Button onClick={() => setIsModalOpen(true)} icon={Plus} variant="primary">Yeni Ders Ekle</Button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900">Mevcut Dersler ({filteredSubjects.length})</h4>
            
            {/* YENİ: Tümünü Seç/Kaldır Butonu */}
            {filteredSubjects.length > 0 && (
              <Button
                onClick={handleSelectAll}
                icon={allFilteredSelected ? Square : CheckSquare}
                variant={allFilteredSelected ? "secondary" : "primary"}
                size="sm"
              >
                {allFilteredSelected ? 'Tümünü Kaldır' : 'Tümünü Seç'}
                {selectedLevel && ` (${selectedLevel})`}
              </Button>
            )}
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
            {filteredSubjects.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">
                  {selectedLevel ? `${selectedLevel} seviyesinde ders bulunamadı` : 'Henüz ders eklenmemiş'}
                </p>
                <Button
                  onClick={() => setIsModalOpen(true)}
                  icon={Plus}
                  variant="primary"
                  size="sm"
                  className="mt-3"
                >
                  İlk Dersi Ekle
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredSubjects.map(s => (
                  <div key={s.id} className={`p-3 rounded-lg border-2 transition-all ${data.selectedSubjects.includes(s.id) ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{s.name}</p>
                        <div className="flex items-center space-x-2 text-xs text-gray-600">
                          <span>{s.branch} • {(s.levels || [s.level]).join(', ')} • {s.weeklyHours} sa/h</span>
                          
                          {/* YENİ: Dağıtım şekli gösterimi */}
                          {s.distributionPattern && (
                            <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                              <Clock className="w-3 h-3 mr-1" />
                              {s.distributionPattern}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button onClick={() => handleEdit(s)} className="p-1 text-gray-400 hover:text-blue-600">
                          <Edit size={16} />
                        </button>
                        <button onClick={() => handleDelete(s.id)} className="p-1 text-gray-400 hover:text-red-600">
                          <Trash2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleSubjectToggle(s.id)} 
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                            data.selectedSubjects.includes(s.id) ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                          }`}
                        >
                          {data.selectedSubjects.includes(s.id) ? (
                            <Minus className="w-3 h-3 text-white" />
                          ) : (
                            <Plus className="w-3 h-3 text-gray-500" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900">Seçilen Dersler ({selectedSubjects.length})</h4>
            <div className="text-sm text-gray-600">
              Toplam: <span className="font-bold text-blue-600">{getTotalWeeklyHours()} saat/hafta</span>
            </div>
          </div>
          
          {selectedSubjects.length === 0 ? (
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 mb-3">Henüz ders seçilmedi</p>
              <p className="text-xs text-gray-400">
                Sol taraftaki listeden ders seçin veya "Tümünü Seç" butonunu kullanın
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-4 max-h-96 overflow-y-auto">
              <div className="space-y-3">
                {selectedSubjects.map(s => (
                  <div key={s.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium text-sm">{s.name}</p>
                        <div className="flex items-center space-x-2 text-xs text-gray-600">
                          <span>{s.branch} • {(s.levels || [s.level]).join(', ')}</span>
                          
                          {/* YENİ: Dağıtım şekli gösterimi */}
                          {s.distributionPattern && (
                            <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                              <Clock className="w-3 h-3 mr-1" />
                              {s.distributionPattern}
                            </span>
                          )}
                        </div>
                      </div>
                      <button 
                        onClick={() => handleSubjectToggle(s.id)} 
                        className="text-red-500 hover:text-red-700 p-1"
                        title="Seçimi kaldır"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Haftalık Saat</label>
                      <div className="flex items-center space-x-2">
                        <button 
                          type="button" 
                          onClick={() => handleHoursChange(s.id, (data.subjectHours[s.id] || 0) - 1)} 
                          className="w-6 h-6 bg-gray-200 rounded text-xs hover:bg-gray-300 transition-colors"
                        >
                          -
                        </button>
                        <input 
                          type="number" 
                          min="1" 
                          value={data.subjectHours[s.id] || s.weeklyHours} 
                          onChange={(e) => handleHoursChange(s.id, parseInt(e.target.value) || 1)} 
                          className="w-12 text-center text-sm font-medium border border-gray-300 rounded py-1 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                        />
                        <button 
                          type="button" 
                          onClick={() => handleHoursChange(s.id, (data.subjectHours[s.id] || 0) + 1)} 
                          className="w-6 h-6 bg-gray-200 rounded text-xs hover:bg-gray-300 transition-colors"
                        >
                          +
                        </button>
                        
                        {/* YENİ: Dağıtım şekli bilgisi */}
                        {s.distributionPattern && (
                          <span className="ml-2 text-xs text-gray-500">
                            Dağıtım: {s.distributionPattern}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Özet Bilgi */}
      {selectedSubjects.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-blue-900">Seçim Özeti</h4>
              <p className="text-sm text-blue-700 mt-1">
                {selectedSubjects.length} ders seçildi • Toplam {getTotalWeeklyHours()} saat/hafta
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">{getTotalWeeklyHours()}</div>
              <div className="text-xs text-blue-500">saat/hafta</div>
            </div>
          </div>
          
          {getTotalWeeklyHours() > 45 && (
            <div className="mt-3 p-2 bg-yellow-100 border border-yellow-300 rounded">
              <p className="text-sm text-yellow-800">
                ⚠️ Haftalık toplam saat 45'i geçiyor. Program oluşturma sırasında sorun yaşayabilirsiniz.
              </p>
            </div>
          )}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={resetForm} title={editingSubject ? 'Ders Düzenle' : 'Yeni Ders Ekle'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Ders Adı" value={formData.name} onChange={v => setFormData({...formData, name: v})} required />
            <Input label="Branş" value={formData.branch} onChange={v => setFormData({...formData, branch: v})} required />
          </div>
          
          <Input 
            label="Haftalık Ders Saati" 
            type="number" 
            value={formData.weeklyHours} 
            onChange={v => setFormData({...formData, weeklyHours: v, distributionPattern: ''})} 
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
                onChange={v => setFormData({...formData, distributionPattern: v})}
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
            <label className="block text-sm font-semibold text-gray-800 mb-2">Eğitim Seviyeleri<span className="text-red-500">*</span></label>
            <div className="flex flex-wrap gap-3">
              {EDUCATION_LEVELS.map(level => (
                <label key={level} className={`flex items-center p-3 border-2 rounded-lg cursor-pointer ${formData.levels.includes(level) ? 'bg-indigo-50 border-indigo-500' : 'bg-white border-gray-300'}`}>
                  <input type="checkbox" checked={formData.levels.includes(level)} onChange={() => handleLevelToggle(level)} className="sr-only" />
                  <span className="text-sm font-medium">{level}</span>
                  {formData.levels.includes(level) && <span className="ml-2 text-indigo-600">✓</span>}
                </label>
              ))}
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" onClick={resetForm} variant="secondary">İptal</Button>
            <Button 
              type="submit" 
              variant="primary" 
              disabled={formData.levels.length === 0 || (formData.distributionPattern && !isValidPattern)}
            >
              {editingSubject ? 'Güncelle' : 'Kaydet'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default WizardStepSubjects;