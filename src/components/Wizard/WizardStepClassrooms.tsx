import React, { useState, useEffect } from 'react';
import { MapPin, Plus, Edit, Trash2, Monitor, Wifi, Volume2 } from 'lucide-react';
import { Classroom } from '../../types/wizard';
import { WizardData } from '../../types/wizard';
import { useFirestore } from '../../hooks/useFirestore';
import Button from '../UI/Button';
import Modal from '../UI/Modal';
import Input from '../UI/Input';
import Select from '../UI/Select';

interface WizardStepClassroomsProps {
  data: WizardData;
  onUpdate: (data: Partial<WizardData>) => void;
}

const WizardStepClassrooms: React.FC<WizardStepClassroomsProps> = ({
  data,
  onUpdate
}) => {
  const { data: classroomsData } = useFirestore('classrooms');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClassroom, setEditingClassroom] = useState<Classroom | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    shortName: '',
    classLevel: '',
    sharedClassroom: false,
    needsSpecialEquipment: false,
    color: '',
    floors: '',
    nearbyClassrooms: ''
  });

  // Initialize classrooms from Firebase data if available
  useEffect(() => {
    if (classroomsData.length > 0 && (!data.classrooms || data.classrooms.length === 0)) {
      onUpdate({
        classrooms: classroomsData
      });
    }
  }, [classroomsData, data.classrooms, onUpdate]);

  const classrooms = data.classrooms || [];

  // Auto-generate short name from classroom name
  const generateShortName = (name: string): string => {
    if (!name) return '';
    
    // Take first 2 characters and make uppercase
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const classroomData: Classroom = {
      id: editingClassroom?.id || Date.now().toString(),
      name: formData.name,
      type: 'normal',
      capacity: 30,
      floor: '1',
      building: 'Ana Bina',
      equipment: [],
      shortName: formData.shortName || generateShortName(formData.name),
      color: formData.color || generateColor()
    };

    if (editingClassroom) {
      onUpdate({
        classrooms: classrooms.map(c => 
          c.id === editingClassroom.id ? classroomData : c
        )
      });
    } else {
      onUpdate({
        classrooms: [...classrooms, classroomData]
      });
    }

    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      shortName: '',
      classLevel: '',
      sharedClassroom: false,
      needsSpecialEquipment: false,
      color: '',
      floors: '',
      nearbyClassrooms: ''
    });
    setEditingClassroom(null);
    setIsModalOpen(false);
  };

  const handleEdit = (classroom: Classroom) => {
    setFormData({
      name: classroom.name,
      shortName: (classroom as any).shortName || generateShortName(classroom.name),
      classLevel: '',
      sharedClassroom: false,
      needsSpecialEquipment: false,
      color: (classroom as any).color || generateColor(),
      floors: classroom.floor,
      nearbyClassrooms: ''
    });
    setEditingClassroom(classroom);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    onUpdate({
      classrooms: classrooms.filter(c => c.id !== id)
    });
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

  return (
    <div className="space-y-6">
      <div className="text-center">
        <MapPin className="w-12 h-12 text-orange-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Derslik Yönetimi</h2>
        <p className="text-gray-600">
          Derslikleri tanımlayın ve özelliklerini belirleyin
        </p>
      </div>

      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Derslikler</h3>
          <p className="text-sm text-gray-600">
            {classrooms.length} derslik tanımlandı
          </p>
        </div>
        <Button
          onClick={() => setIsModalOpen(true)}
          icon={Plus}
          variant="primary"
        >
          Yeni Derslik
        </Button>
      </div>

      {classrooms.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Derslik Eklenmemiş</h3>
          <p className="text-gray-500 mb-4">
            Program oluşturmak için en az bir derslik tanımlamalısınız
          </p>
          <Button
            onClick={() => setIsModalOpen(true)}
            icon={Plus}
            variant="primary"
          >
            İlk Dersliği Ekle
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classrooms.map((classroom) => (
            <div key={classroom.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
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

      <Modal
        isOpen={isModalOpen}
        onClose={resetForm}
        title={editingClassroom ? 'Derslik Düzenle' : 'Yeni Derslik Ekle'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
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

          {/* Optional Fields */}
          <Input
            label="Sınıfın Dersliği"
            value={formData.classLevel}
            onChange={(value) => setFormData({ ...formData, classLevel: value })}
            placeholder="Hangi sınıfın dersliği"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="sharedClassroom"
                checked={formData.sharedClassroom}
                onChange={(e) => setFormData({ ...formData, sharedClassroom: e.target.checked })}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="sharedClassroom" className="text-sm font-medium text-gray-700">
                Ortak Derslik
              </label>
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="needsSpecialEquipment"
                checked={formData.needsSpecialEquipment}
                onChange={(e) => setFormData({ ...formData, needsSpecialEquipment: e.target.checked })}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="needsSpecialEquipment" className="text-sm font-medium text-gray-700">
                Nöbet/Gözetim Gereken Alan
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Renk"
              value={formData.color}
              onChange={(value) => setFormData({ ...formData, color: value })}
              placeholder="Otomatik atanır"
              disabled
            />
            
            <Input
              label="Ziller"
              value={formData.floors}
              onChange={(value) => setFormData({ ...formData, floors: value })}
              placeholder="Kat bilgisi"
            />
          </div>

          <Input
            label="Yakındaki Derslikler"
            value={formData.nearbyClassrooms}
            onChange={(value) => setFormData({ ...formData, nearbyClassrooms: value })}
            placeholder="Komşu derslikler"
          />

          <div className="flex justify-end space-x-3 pt-4">
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
              {editingClassroom ? 'Güncelle' : 'Tamamla'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default WizardStepClassrooms;