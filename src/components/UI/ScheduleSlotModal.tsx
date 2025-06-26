import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Subject, Class, Teacher } from '../../types';
import Button from './Button';
import Select from './Select';

interface ScheduleSlotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (subjectId: string, classId: string, teacherId?: string) => void;
  subjects: Subject[];
  classes: Class[];
  teachers?: Teacher[];
  mode?: 'teacher' | 'class';
  currentSubjectId?: string;
  currentClassId?: string;
  currentTeacherId?: string;
  day: string;
  period: string;
}

const ScheduleSlotModal: React.FC<ScheduleSlotModalProps> = ({
  isOpen,
  onClose,
  onSave,
  subjects,
  classes,
  teachers = [],
  mode = 'teacher',
  currentSubjectId = '',
  currentClassId = '',
  currentTeacherId = '',
  day,
  period
}) => {
  const [selectedSubjectId, setSelectedSubjectId] = useState(currentSubjectId);
  const [selectedClassId, setSelectedClassId] = useState(currentClassId);
  const [selectedTeacherId, setSelectedTeacherId] = useState(currentTeacherId);

  React.useEffect(() => {
    setSelectedSubjectId(currentSubjectId);
    setSelectedClassId(currentClassId);
    setSelectedTeacherId(currentTeacherId);
  }, [currentSubjectId, currentClassId, currentTeacherId, isOpen]);

  const handleSave = () => {
    if (mode === 'teacher') {
      if (selectedClassId) {
        const defaultSubject = subjects[0];
        onSave(selectedSubjectId || defaultSubject?.id || '', selectedClassId);
      } else {
        onSave('', '');
      }
    } else {
      if (selectedTeacherId) {
        const defaultSubject = subjects[0];
        onSave(selectedSubjectId || defaultSubject?.id || '', selectedClassId, selectedTeacherId);
      } else {
        onSave('', '', '');
      }
    }
    onClose();
  };

  const handleClear = () => {
    if (mode === 'teacher') {
      onSave('', '');
    } else {
      onSave('', '', '');
    }
    onClose();
  };

  // Sınıfları A'dan Z'ye sırala
  const sortedClasses = [...classes].sort((a, b) => a.name.localeCompare(b.name, 'tr'));
  const classOptions = sortedClasses.map(cls => ({
    value: cls.id,
    label: cls.name
  }));

  // Öğretmenleri A'dan Z'ye sırala
  const sortedTeachers = [...teachers].sort((a, b) => a.name.localeCompare(b.name, 'tr'));
  const teacherOptions = sortedTeachers.map(teacher => ({
    value: teacher.id,
    label: `${teacher.name} (${teacher.branch})`
  }));

  // Dersleri A'dan Z'ye sırala
  const sortedSubjects = [...subjects].sort((a, b) => a.name.localeCompare(b.name, 'tr'));
  const subjectOptions = sortedSubjects.map(subject => ({
    value: subject.id,
    label: subject.name
  }));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
        
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {day} - {period}. Ders
              </h3>
              <button
                onClick={onClose}
                className="rounded-md text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <X size={24} />
              </button>
            </div>

            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${mode === 'teacher' ? 'bg-blue-500' : 'bg-emerald-500'}`} />
                <span className="text-sm font-medium text-gray-700">
                  {mode === 'teacher' ? 'Öğretmen Modu: Sınıf Seçin' : 'Sınıf Modu: Öğretmen Seçin'}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              {/* Subject selection - only show if there are multiple subjects */}
              {subjects.length > 1 && (
                <Select
                  label="Ders Seçin"
                  value={selectedSubjectId}
                  onChange={setSelectedSubjectId}
                  options={subjectOptions}
                />
              )}

              {mode === 'teacher' ? (
                <Select
                  label="Sınıf Seçin (A-Z Sıralı)"
                  value={selectedClassId}
                  onChange={setSelectedClassId}
                  options={classOptions}
                  required
                />
              ) : (
                <Select
                  label="Öğretmen Seçin (A-Z Sıralı)"
                  value={selectedTeacherId}
                  onChange={setSelectedTeacherId}
                  options={teacherOptions}
                  required
                />
              )}
            </div>

            <div className="flex justify-between mt-6">
              <Button
                onClick={handleClear}
                variant="danger"
                size="sm"
              >
                Temizle
              </Button>
              
              <div className="flex space-x-2">
                <Button
                  onClick={onClose}
                  variant="secondary"
                >
                  İptal
                </Button>
                <Button
                  onClick={handleSave}
                  variant="primary"
                  disabled={mode === 'teacher' ? !selectedClassId : !selectedTeacherId}
                >
                  Kaydet
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleSlotModal;