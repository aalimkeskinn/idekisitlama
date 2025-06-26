// --- START OF FILE src/pages/Classes.tsx ---

import React, { useState } from 'react';
import { Plus, Edit, Trash2, Building, Eye, Calendar, Users, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Class, EDUCATION_LEVELS, Schedule, Teacher, Subject, TeacherAssignment } from '../types';
import { useFirestore } from '../hooks/useFirestore';
import { useToast } from '../hooks/useToast';
import { useConfirmation } from '../hooks/useConfirmation';
import Button from '../components/UI/Button';
import Modal from '../components/UI/Modal';
import Input from '../components/UI/Input';
import Select from '../components/UI/Select';
import ConfirmationModal from '../components/UI/ConfirmationModal';

const Classes = () => {
  const navigate = useNavigate();
  const { data: classes, loading, add: addClass, update: updateClass, remove: removeClass } = useFirestore<Class>('classes');
  const { data: schedules } = useFirestore<Schedule>('schedules');
  const { data: teachers } = useFirestore<Teacher>('teachers');
  const { data: subjects } = useFirestore<Subject>('subjects');
  const { success, error } = useToast();
  const { confirmation, confirmDelete, hideConfirmation } = useConfirmation();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [levelFilter, setLevelFilter] = useState('');
  
  const [formData, setFormData] = useState<{
    name: string;
    levels: ('Anaokulu' | 'İlkokul' | 'Ortaokul')[];
    classTeacherId: string;
    assignments: TeacherAssignment[];
  }>({ name: '', levels: [], classTeacherId: '', assignments: [] });
  
  const [expandedClass, setExpandedClass] = useState<string | null>(null);

  const getFilteredClasses = () => classes.filter(c => !levelFilter || (c.levels || [c.level]).includes(levelFilter as any)).sort((a, b) => a.name.localeCompare(b.name, 'tr'));

  const calculateProgrammedHoursForClass = (classId: string): number => {
    let totalHours = 0;
    schedules.forEach(schedule => {
        Object.values(schedule.schedule).forEach(daySlots => {
            Object.values(daySlots).forEach(slot => {
                if (slot?.classId === classId && !slot.isFixed) {
                    totalHours++;
                }
            });
        });
    });
    return totalHours;
  };

  const getTeacherHoursInClass = (teacherId: string, classId: string): number => {
      const teacherSchedule = schedules.find(s => s.teacherId === teacherId);
      if (!teacherSchedule) return 0;
      let hours = 0;
      Object.values(teacherSchedule.schedule).forEach(day => {
          Object.values(day).forEach(slot => {
              if(slot?.classId === classId && !slot.isFixed) {
                  hours++;
              }
          });
      });
      return hours;
  };
  
  const getTeacherTargetHoursInClass = (teacherId: string, classAssignments: TeacherAssignment[]): number => {
      const assignment = classAssignments.find(a => a.teacherId === teacherId);
      if (!assignment) return 0;
      return assignment.subjectIds.reduce((total, subjectId) => {
          const subject = subjects.find(s => s.id === subjectId);
          return total + (subject?.weeklyHours || 0);
      }, 0);
  };

  const handleViewSchedule = (classId: string) => navigate(`/class-schedules?classId=${classId}`);
  const handleCreateSchedule = (classId: string) => navigate(`/schedules?mode=class&classId=${classId}`);
  
  const resetForm = () => {
    setFormData({ name: '', levels: [], classTeacherId: '', assignments: [] });
    setEditingClass(null);
    setIsModalOpen(false);
    setExpandedClass(null);
  };
  
  const handleEdit = (classItem: Class) => {
    setFormData({
      name: classItem.name,
      levels: classItem.levels || (classItem.level ? [classItem.level] : []),
      classTeacherId: classItem.classTeacherId || '',
      assignments: classItem.assignments || []
    });
    setEditingClass(classItem);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    const classItem = classes.find(c => c.id === id);
    if (classItem) {
        confirmDelete(classItem.name, async () => {
            await removeClass(id);
            success('🗑️ Sınıf Silindi', `${classItem.name} başarıyla silindi`);
        });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.levels.length === 0) { error("Seviye seçimi zorunludur."); return; }
    
    const finalAssignments = formData.assignments.filter(a => a.subjectIds.length > 0);
    
    const classData = { 
        name: formData.name, 
        levels: formData.levels, 
        level: formData.levels[0],
        classTeacherId: formData.classTeacherId,
        assignments: finalAssignments,
        teacherIds: [...new Set(finalAssignments.map(a => a.teacherId))]
    };
    
    try {
        if (editingClass) {
            await updateClass(editingClass.id, classData);
            success("✅ Sınıf güncellendi.", `${formData.name} sınıfının bilgileri güncellendi.`);
        } else {
            await addClass(classData as any);
            success("✅ Sınıf eklendi.", `${formData.name} sınıfı başarıyla oluşturuldu.`);
        }
        resetForm();
    } catch (err) {
        error("❌ Kayıt Hatası", "İşlem sırasında bir hata oluştu.");
    }
  };

  const handleLevelToggle = (level: 'Anaokulu' | 'İlkokul' | 'Ortaokul') => {
    setFormData(prev => {
      const newLevels = prev.levels.includes(level) ? prev.levels.filter(l => l !== level) : [...prev.levels, level];
      return { ...prev, levels: newLevels, assignments: [] };
    });
  };
  
  const handleAssignmentChange = (teacherId: string, subjectId: string, checked: boolean) => {
    setFormData(prev => {
      const newAssignments = JSON.parse(JSON.stringify(prev.assignments)) as TeacherAssignment[];
      let teacherAssignment = newAssignments.find(a => a.teacherId === teacherId);

      if (!teacherAssignment) {
        teacherAssignment = { teacherId, subjectIds: [] };
        newAssignments.push(teacherAssignment);
      }

      const subjectIds = new Set(teacherAssignment.subjectIds);
      if (checked) {
        subjectIds.add(subjectId);
      } else {
        subjectIds.delete(subjectId);
      }
      teacherAssignment.subjectIds = Array.from(subjectIds);
      
      const finalAssignments = newAssignments.filter(a => a.subjectIds.length > 0);
      
      return { ...prev, assignments: finalAssignments };
    });
  };

  // *** DÜZELTME: Öğretmen listesi artık sınıfın seviyesine göre filtreleniyor. ***
  const getFilteredTeachersForModal = () => {
    if (formData.levels.length === 0) return [];
    return teachers
      .filter(t => (t.levels || [t.level]).some(level => formData.levels.includes(level)))
      .sort((a,b) => a.name.localeCompare(b.name, 'tr'));
  };
  
  const sortedClasses = getFilteredClasses();

  return (
    <div className="container-mobile">
      <div className="header-mobile">
          <div className="flex items-center"><Building className="w-8 h-8 text-emerald-600 mr-3" /><div><h1 className="text-responsive-xl font-bold text-gray-900">Sınıflar</h1><p className="text-responsive-sm text-gray-600">{classes.length} sınıf kayıtlı ({sortedClasses.length} gösteriliyor)</p></div></div>
          <div className="button-group-mobile"><Button onClick={() => setIsModalOpen(true)} icon={Plus} variant="primary">Yeni Sınıf</Button></div>
      </div>
      <div className="mobile-card mobile-spacing mb-6"><Select label="Seviye Filtresi" value={levelFilter} onChange={setLevelFilter} options={[{ value: '', label: 'Tüm Seviyeler' }, ...EDUCATION_LEVELS.map(l => ({value: l, label: l}))]} /></div>

      {loading ? <div className="text-center py-12">Yükleniyor...</div> : sortedClasses.length === 0 ? (
        <div className="text-center py-12 mobile-card"><Building className="w-16 h-16 text-gray-300 mx-auto mb-4" /><h3 className="text-lg font-medium">Henüz Sınıf Eklenmemiş</h3></div>
      ) : (
        <div className="responsive-grid gap-responsive">
          {sortedClasses.map((classItem) => {
            const weeklyHours = calculateProgrammedHoursForClass(classItem.id);
            const classTeacher = teachers.find(t => t.id === classItem.classTeacherId);
            const assignedTeachers = teachers.filter(t => classItem.assignments?.some(a => a.teacherId === t.id));
            const isExpanded = expandedClass === classItem.id;

            return (
              <div key={classItem.id} className="mobile-card mobile-spacing hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">{classItem.name}</h3>
                  <div className="flex flex-wrap gap-1">{(classItem.levels || [classItem.level]).map((level, index) => (<span key={index} className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${level === 'Anaokulu' ? 'bg-green-100 text-green-800' : level === 'İlkokul' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>{level}</span>))}</div>
                </div>
                
                {classTeacher && (<div className="mb-4 p-3 bg-blue-50 rounded-lg"><div className="flex items-start"><Users className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-1" /><div><p className="text-sm font-medium text-blue-800"><span className="font-bold">Sınıf Öğrt:</span> {classTeacher.name}</p></div></div></div>)}
                <div className="mb-4 p-3 bg-gray-50 rounded-lg"><div className="flex items-center justify-between"><div><p className="text-sm font-medium text-gray-700">Program Durumu</p><div className="flex items-center mt-1"><div className={`w-2 h-2 rounded-full mr-2 ${weeklyHours > 0 ? 'bg-green-500' : 'bg-gray-400'}`} /><span className={`text-sm font-bold ${weeklyHours > 0 ? 'text-green-700' : 'text-gray-500'}`}>{weeklyHours > 0 ? `${weeklyHours} ders saati` : 'Program yok'}</span></div></div>{weeklyHours > 0 && <Button onClick={() => handleViewSchedule(classItem.id)} icon={Eye} size="sm" variant="secondary" />}</div></div>
                <div className="mb-4"><button onClick={() => setExpandedClass(isExpanded ? null : classItem.id)} className="w-full text-left flex justify-between items-center p-2 bg-gray-100 rounded-md"><span className="text-sm font-medium text-gray-800">Öğretmen Ders Yükleri</span>{isExpanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}</button>{isExpanded && (<div className="mt-2 space-y-2 p-3 border-l-2 border-gray-200">{assignedTeachers.length > 0 ? assignedTeachers.map(teacher => { const target = getTeacherTargetHoursInClass(teacher.id, classItem.assignments || []); const actual = getTeacherHoursInClass(teacher.id, classItem.id); const isMismatch = target !== actual; return ( <div key={teacher.id} className="flex justify-between items-center text-sm"><span className="text-gray-700">{teacher.name}</span><span className={`font-semibold px-2 py-1 rounded-full text-xs flex items-center gap-1 ${isMismatch ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}><Clock size={12}/>{actual} / {target}</span></div> )}) : <p className="text-xs text-gray-500">Bu sınıfa atanmış öğretmen yok.</p>}</div>)}</div>
                <div className="flex justify-between items-center"><div className="flex space-x-1"><Button onClick={() => handleEdit(classItem)} icon={Edit} size="sm" variant="secondary">Düzenle</Button><Button onClick={() => handleDelete(classItem.id)} icon={Trash2} size="sm" variant="danger">Sil</Button></div><Button onClick={() => handleCreateSchedule(classItem.id)} icon={Calendar} size="sm" variant={weeklyHours > 0 ? "secondary" : "primary"}>{weeklyHours > 0 ? "Programı Düzenle" : "Program Oluştur"}</Button></div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={resetForm} title={editingClass ? 'Sınıf Düzenle' : 'Yeni Sınıf Ekle'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Sınıf Adı" value={formData.name} onChange={v => setFormData(p=>({...p, name:v}))} required />
          <div className="mb-4"><label className="block text-sm font-semibold text-gray-800 mb-2">Eğitim Seviyeleri <span className="text-red-500">*</span></label><div className="flex flex-wrap gap-3">{EDUCATION_LEVELS.map(level => (<label key={level} className={`flex items-center p-3 border-2 rounded-lg cursor-pointer ${formData.levels.includes(level) ? 'bg-emerald-50 border-emerald-500' : 'bg-white border-gray-300'}`}><input type="checkbox" checked={formData.levels.includes(level)} onChange={() => handleLevelToggle(level)} className="sr-only" /><span className="text-sm font-medium">{level}</span>{formData.levels.includes(level) && <span className="ml-2 text-emerald-600">✓</span>}</label>))}</div></div>
          {formData.levels.length > 0 && (
            <div className="mt-4">
              <Select label="Sınıf Öğretmeni" value={formData.classTeacherId} onChange={v => setFormData(p=>({...p, classTeacherId: v}))} options={[{value: '', label: 'Sınıf Öğretmeni Yok'}, ...getFilteredTeachersForModal().map(t=>({value: t.id, label: t.name}))]} />
              <h3 className="font-medium mb-2 mt-4">Öğretmen ve Ders Atamaları</h3>
              <div className="space-y-2 max-h-80 overflow-y-auto border p-2 rounded-lg bg-gray-50">
                  {getFilteredTeachersForModal().length > 0 ? getFilteredTeachersForModal().map(teacher => {
                      const teacherSubjects = subjects.filter(s => (s.levels || [s.level]).some(l=>formData.levels.includes(l)) && teacher.subjectIds?.includes(s.id));
                      if (teacherSubjects.length === 0) return null;
                      return (
                          <div key={teacher.id} className="bg-white p-2 rounded-md shadow-sm">
                              <p className="font-semibold p-1">{teacher.name} <span className="text-xs text-gray-500">({teacher.branch})</span></p>
                              <div className="mt-2 pl-4 border-l-2 space-y-1 pt-2">
                                  {teacherSubjects.map(subject => {
                                      const isChecked = formData.assignments.find(a=>a.teacherId === teacher.id)?.subjectIds.includes(subject.id) || false;
                                      return (<label key={subject.id} className="flex items-center p-1 rounded hover:bg-gray-100"><input type="checkbox" checked={isChecked} onChange={e => handleAssignmentChange(teacher.id, subject.id, e.target.checked)} className="mr-2 h-4 w-4"/>{subject.name}</label>)
                                  })}
                              </div>
                          </div>
                      )
                  }) : <div className="text-center p-4 text-sm text-gray-500">Seçilen seviyelere uygun öğretmen bulunamadı.</div>}
              </div>
            </div>
          )}
          <div className="flex justify-end space-x-3 pt-4"><Button type="submit" disabled={formData.levels.length === 0}>Kaydet</Button></div>
        </form>
      </Modal>

      <ConfirmationModal isOpen={confirmation.isOpen} onClose={hideConfirmation} onConfirm={confirmation.onConfirm} {...confirmation} />
    </div>
  );
};
export default Classes;

// --- END OF FILE src/pages/Classes.tsx ---