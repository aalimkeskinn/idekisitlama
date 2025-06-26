import React, { useState } from 'react';
import { Plus, Edit, Trash2, MapPin, Monitor, Wifi, Volume2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFirestore } from '../hooks/useFirestore';
import { useToast } from '../hooks/useToast';
import { useConfirmation } from '../hooks/useConfirmation';
import Button from '../components/UI/Button';
import Modal from '../components/UI/Modal';
import Input from '../components/UI/Input';
import Select from '../components/UI/Select';
import ConfirmationModal from '../components/UI/ConfirmationModal';

// Classroom interface
interface Classroom {
  id: string;
  name: string;
  type: string;
  capacity: number;
  floor: string;
  building: string;
  equipment: string[];
  shortName?: string;
  color?: string;
  createdAt: Date;
}

const Classrooms = () => {
  const navigate = useNavigate();
  const { data: classrooms, loading, add, update, remove } = useFirestore<Classroom>('classrooms');
  const { success, error, warning } = useToast();
  const { 
    confirmation, 
    showConfirmation, 
    hideConfirmation,
    confirmDelete 
  } = useConfirmation();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClassroom, setEditingClassroom] = useState<Classroom | null>(null);
  const [typeFilter, setTypeFilter] = useState('');
  const [buildingFilter, setBuildingFilter] = useState('');
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    shortName: '',
    type: '',
    capacity: '',
    floor: '',
    building: '',
    equipment: [] as string[],
    color: ''
  });

  // Auto-generate short name from classroom name
  const generateShortName = (name: string): string => {
    if (!name) return '';
    return name.substring(0, 2).toUpperCase();
  };

  // Auto-generate color
  const generateColor = (): string => {
    const colors = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const classroomTypes = [
    { value: 'normal', label: 'Normal Sınıf' },
    { value: 'laboratory', label: 'Laboratuvar' },
    { value: 'workshop', label: 'Atölye' },
    { value: 'gym', label: 'Spor Salonu' },
    { value: 'library', label: 'Kütüphane' },
    { value: 'computer', label: 'Bilgisayar Sınıfı' }
  ];

  const equipmentOptions = [
    { id: 'projector', label: 'Projeksiyon', icon: Monitor },
    { id: 'computer', label: 'Bilgisayar', icon: Monitor },
    { id: 'wifi', label: 'WiFi', icon: Wifi },
    { id: 'sound', label: 'Ses Sistemi', icon: Volume2 }
  ];

  const buildingOptions = [
    { value: 'Ana Bina', label: 'Ana Bina' },
    { value: 'Ek Bina', label: 'Ek Bina' },
    { value: 'Spor Kompleksi', label: 'Spor Kompleksi' },
    { value: 'Laboratuvar Binası', label: 'Laboratuvar Binası' }
  ];

  // Filter classrooms
  const getFilteredClassrooms = () => {
    return classrooms.filter(classroom => {
      const matchesType = !typeFilter || classroom.type === typeFilter;
      const matchesBuilding = !buildingFilter || classroom.building === buildingFilter;
      return matchesType && matchesBuilding;
    });
  };

  const sortedClassrooms = getFilteredClassrooms().sort((a, b) => a.name.localeCompare(b.name, 'tr'));

  // Delete all classrooms function
  const handleDeleteAllClassrooms = () => {
    if (classrooms.length === 0) {
      warning('⚠️ Silinecek Derslik Yok', 'Sistemde silinecek derslik bulunamadı');
      return;
    }

    confirmDelete(
      `${classrooms.length} Derslik`,
      async () => {
        setIsDeletingAll(true);
        
        try {
          let deletedCount = 0;
          
          for (const classroom of classrooms) {
            try {
              await remove(classroom.id);
              deletedCount++;
            } catch (err) {
              console.error(`❌ Derslik silinemedi: ${classroom.name}`, err);
            }
          }

          if (deletedCount > 0) {
            success('🗑️ Derslikler Silindi', `${deletedCount} derslik başarıyla silindi`);
            setTypeFilter('');
            setBuildingFilter('');
          } else {
            error('❌ Silme Hatası', 'Hiçbir derslik silinemedi');
          }

        } catch (err) {
          console.error('❌ Toplu silme hatası:', err);
          error('❌ Silme Hatası', 'Derslikler silinirken bir hata oluştu');
        } finally {
          setIsDeletingAll(false);
        }
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const classroomData = {
      name: formData.name,
      type: formData.type || 'normal',
      capacity: parseInt(formData.capacity) || 30,
      floor: formData.floor || '1',
      building: formData.building || 'Ana Bina',
      equipment: formData.equipment,
      shortName: formData.shortName || generateShortName(formData.name),
      color: formData.color || generateColor()
    };

    try {
      if (editingClassroom) {
        await update(editingClassroom.id, classroomData);
        success('✅ Güncellendi', `${formData.name} başarıyla güncellendi`);
      } else {
        await add(classroomData as Omit<Classroom, 'id' | 'createdAt'>);
        success('✅ Eklendi', `${formData.name} başarıyla eklendi`);
      }
      resetForm();
    } catch (err) {
      error('❌ Hata', 'Derslik kaydedilirken bir hata oluştu');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      shortName: '',
      type: '',
      capacity: '',
      floor: '',
      building: '',
      equipment: [],
      color: ''
    });
    setEditingClassroom(null);
    setIsModalOpen(false);
  };

  const handleEdit = (classroom: Classroom) => {
    setFormData({
      name: classroom.name,
      shortName: classroom.shortName || generateShortName(classroom.name),
      type: classroom.type,
      capacity: classroom.capacity.toString(),
      floor: classroom.floor,
      building: classroom.building,
      equipment: classroom.equipment || [],
      color: classroom.color || generateColor()
    });
    setEditingClassroom(classroom);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    const classroom = classrooms.find(c => c.id === id);
    if (classroom) {
      confirmDelete(
        classroom.name,
        async () => {
          await remove(id);
          success('🗑️ Derslik Silindi', `${classroom.name} başarıyla silindi`);
        }
      );
    }
  };

  const handleEquipmentChange = (equipmentId: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        equipment: [...prev.equipment, equipmentId]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        equipment: prev.equipment.filter(id => id !== equipmentId)
      }));
    }
  };

  // Auto-update short name when name changes
  React.useEffect(() => {
    if (formData.name && !editingClassroom) {
      setFormData(prev => ({
        ...prev,
        shortName: generateShortName(prev.name)
      }));
    }
  }, [formData.name, editingClassroom]);

  // Auto-update color when not editing
  React.useEffect(() => {
    if (formData.name && !editingClassroom && !formData.color) {
      setFormData(prev => ({
        ...prev,
        color: generateColor()
      }));
    }
  }, [formData.name, editingClassroom]);

  const getTypeLabel = (type: string) => {
    return classroomTypes.find(t => t.value === type)?.label || type;
  };

  const getTypeColor = (type: string) => {
    const colors = {
      normal: 'bg-blue-100 text-blue-800',
      laboratory: 'bg-purple-100 text-purple-800',
      workshop: 'bg-orange-100 text-orange-800',
      gym: 'bg-green-100 text-green-800',
      library: 'bg-indigo-100 text-indigo-800',
      computer: 'bg-red-100 text-red-800'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const typeFilterOptions = [
    { value: '', label: 'Tüm Türler' },
    ...classroomTypes
  ];

  const buildingFilterOptions = [
    { value: '', label: 'Tüm Binalar' },
    ...buildingOptions
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="mobile-loading">
          <div className="mobile-loading-spinner"></div>
          <div className="mobile-loading-text">Yükleniyor...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-mobile">
      {/* Header */}
      <div className="header-mobile">
        <div className="flex items-center">
          <MapPin className="w-8 h-8 text-teal-600 mr-3" />
          <div>
            <h1 className="text-responsive-xl font-bold text-gray-900">Derslik Yönetimi</h1>
            <p className="text-responsive-sm text-gray-600">{classrooms.length} derslik kayıtlı ({sortedClassrooms.length} gösteriliyor)</p>
          </div>
        </div>
        <div className="button-group-mobile">
          <Button
            onClick={() => navigate('/data-management')}
            variant="secondary"
            className="w-full sm:w-auto"
          >
            Veri Yönetimine Dön
          </Button>
          
          {classrooms.length > 0 && (
            <Button
              onClick={handleDeleteAllClassrooms}
              icon={Trash2}
              variant="danger"
              disabled={isDeletingAll}
              className="w-full sm:w-auto"
            >
              {isDeletingAll ? 'Siliniyor...' : `Tümünü Sil (${classrooms.length})`}
            </Button>
          )}
          
          <Button
            onClick={() => setIsModalOpen(true)}
            icon={Plus}
            variant="primary"
            className="w-full sm:w-auto"
          >
            Yeni Derslik
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="mobile-card mobile-spacing mb-6">
        <div className="responsive-grid-2 gap-responsive">
          <Select
            label="Tür Filtresi"
            value={typeFilter}
            onChange={setTypeFilter}
            options={typeFilterOptions}
          />
          <Select
            label="Bina Filtresi"
            value={buildingFilter}
            onChange={setBuildingFilter}
            options={buildingFilterOptions}
          />
        </div>
      </div>

      {sortedClassrooms.length === 0 ? (
        <div className="text-center py-12 mobile-card">
          <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {classrooms.length === 0 ? 'Henüz derslik eklenmemiş' : 'Filtrelere uygun derslik bulunamadı'}
          </h3>
          <p className="text-gray-500 mb-4">
            {classrooms.length === 0 ? 'İlk dersliğinizi ekleyerek başlayın' : 'Farklı filtre kriterleri deneyin'}
          </p>
          <div className="button-group-mobile">
            {classrooms.length === 0 && (
              <Button
                onClick={() => setIsModalOpen(true)}
                icon={Plus}
                variant="primary"
              >
                Derslik Ekle
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="responsive-grid gap-responsive">
          {sortedClassrooms.map((classroom) => (
            <div key={classroom.id} className="mobile-card mobile-spacing hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-gray-900">{classroom.name}</h4>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(classroom.type)}`}>
                    {getTypeLabel(classroom.type)}
                  </span>
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={() => handleEdit(classroom)}
                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(classroom.id)}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Kapasite:</span>
                  <span className="font-medium">{classroom.capacity} kişi</span>
                </div>
                <div className="flex justify-between">
                  <span>Konum:</span>
                  <span className="font-medium">{classroom.building} - {classroom.floor}. Kat</span>
                </div>
                {classroom.equipment && classroom.equipment.length > 0 && (
                  <div>
                    <span className="text-xs text-gray-500">Ekipmanlar:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {classroom.equipment.map((eq) => {
                        const equipment = equipmentOptions.find(e => e.id === eq);
                        return equipment ? (
                          <span key={eq} className="inline-flex items-center px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                            <equipment.icon size={12} className="mr-1" />
                            {equipment.label}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={resetForm}
        title={editingClassroom ? 'Derslik Düzenle' : 'Yeni Derslik Ekle'}
        size="lg"
      >
        <form onSubmit={handleSubmit}>
          {/* Required Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="İsim"
              value={formData.name}
              onChange={(value) => setFormData({ ...formData, name: value })}
              placeholder="Örn: A101, Fen Lab 1"
              required
            />
            
            <Input
              label="Kısaltma"
              value={formData.shortName}
              onChange={(value) => setFormData({ ...formData, shortName: value })}
              placeholder="Otomatik oluşturulur"
              disabled
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Derslik Türü"
              value={formData.type}
              onChange={(value) => setFormData({ ...formData, type: value })}
              options={classroomTypes}
            />
            
            <Input
              label="Kapasite"
              type="number"
              value={formData.capacity}
              onChange={(value) => setFormData({ ...formData, capacity: value })}
              placeholder="30"
              min="1"
              max="100"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Bina"
              value={formData.building}
              onChange={(value) => setFormData({ ...formData, building: value })}
              options={buildingOptions}
            />
            
            <Input
              label="Kat"
              value={formData.floor}
              onChange={(value) => setFormData({ ...formData, floor: value })}
              placeholder="1"
            />
          </div>

          <Input
            label="Renk"
            value={formData.color}
            onChange={(value) => setFormData({ ...formData, color: value })}
            placeholder="Otomatik atanır"
            disabled
          />

          {/* Equipment Selection */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-800 mb-2">
              Ekipmanlar
            </label>
            <div className="grid grid-cols-2 gap-3">
              {equipmentOptions.map((equipment) => (
                <label key={equipment.id} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.equipment.includes(equipment.id)}
                    onChange={(e) => handleEquipmentChange(equipment.id, e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <equipment.icon size={16} className="text-gray-500" />
                  <span className="text-sm text-gray-700">{equipment.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="button-group-mobile mt-6">
            <Button
              type="button"
              onClick={resetForm}
              variant="secondary"
            >
              İptal
            </Button>
            <Button
              type="submit"
              variant="primary"
            >
              {editingClassroom ? 'Güncelle' : 'Kaydet'}
            </Button>
          </div>
        </form>
      </Modal>

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

export default Classrooms;