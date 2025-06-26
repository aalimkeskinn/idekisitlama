import React, { useState } from 'react';
import { 
  Users, 
  Building, 
  BookOpen, 
  Calendar, 
  FileText, 
  Eye,
  ArrowRight,
  Clock,
  Zap,
  Trash2,
  AlertTriangle,
  Edit,
  Plus,
  Database
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFirestore } from '../hooks/useFirestore';
import { useToast } from '../hooks/useToast';
import { useConfirmation } from '../hooks/useConfirmation';
import { Teacher, Class, Subject, Schedule } from '../types';
import Button from '../components/UI/Button';
import ConfirmationModal from '../components/UI/ConfirmationModal';

// Schedule Template interface
interface ScheduleTemplate {
  id: string;
  name: string;
  description: string;
  academicYear: string;
  semester: string;
  wizardData: any;
  createdAt: Date;
  updatedAt: Date;
  status: 'draft' | 'published' | 'archived';
}

const Home = () => {
  const navigate = useNavigate();
  const { data: teachers } = useFirestore<Teacher>('teachers');
  const { data: classes } = useFirestore<Class>('classes');
  const { data: subjects } = useFirestore<Subject>('subjects');
  const { data: schedules } = useFirestore<Schedule>('schedules');
  const { data: templates, remove: removeTemplate } = useFirestore<ScheduleTemplate>('schedule-templates');
  const { success, error, warning } = useToast();
  const { 
    confirmation, 
    showConfirmation, 
    hideConfirmation,
    confirmDelete 
  } = useConfirmation();

  const features = [
    {
      icon: BookOpen,
      title: 'Dersler',
      description: 'Dersleri branş ve seviyelerine göre organize edin',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      path: '/subjects'
    },
    {
      icon: Users,
      title: 'Öğretmenler',
      description: 'Öğretmenleri ekleyin ve branşlarına göre yönetin',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      path: '/teachers'
    },
    {
      icon: Building,
      title: 'Sınıflar',
      description: 'Sınıfları seviyelerine göre kategorize edin',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      path: '/classes'
    },
    {
      icon: Zap,
      title: 'Program Sihirbazı',
      description: 'Adım adım otomatik program oluşturun',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      path: '/schedule-wizard'
    },
    {
      icon: Calendar,
      title: 'Manuel Program',
      description: 'Öğretmen veya sınıf bazlı manuel program oluşturun',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      path: '/schedules'
    },
    {
      icon: Eye,
      title: 'Programları Görüntüle',
      description: 'Oluşturulan programları görüntüleyin ve inceleyin',
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
      path: '/all-schedules'
    },
    {
      icon: FileText,
      title: 'PDF İndir',
      description: 'Programları profesyonel PDF formatında indirin',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      path: '/pdf'
    },
    {
      icon: Database,
      title: 'Veri Yönetimi',
      description: 'Sistem verilerini yönetin ve temizleyin',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      path: '/data-management'
    }
  ];

  // Edit template
  const handleEditTemplate = (templateId: string) => {
    navigate(`/schedule-wizard?templateId=${templateId}`);
  };

  // Delete template
  const handleDeleteTemplate = (template: ScheduleTemplate) => {
    confirmDelete(
      template.name,
      async () => {
        try {
          await removeTemplate(template.id);
          success('🗑️ Program Silindi', `${template.name} başarıyla silindi`);
        } catch (err) {
          error('❌ Silme Hatası', 'Program silinirken bir hata oluştu');
        }
      }
    );
  };

  const sortedTemplates = [...templates].sort((a, b) => 
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Minimal Hero Section */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="text-center">
          <div className="flex justify-center mb-3">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <img 
                src="https://cv.ide.k12.tr/images/ideokullari_logo.png" 
                alt="İDE Okulları Logo"
                className="w-12 h-12 object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    parent.innerHTML = '<div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-blue-600"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg></div>';
                  }
                }}
              />
            </div>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
            İDE Okulları Ders Programı Sistemi
          </h1>
          <p className="text-sm md:text-base text-gray-600 mb-4 max-w-2xl mx-auto">
            Sihirbaz ile otomatik program oluşturun veya manuel olarak düzenleyin. 
            Çakışma kontrolü, zaman kısıtlamaları ve profesyonel PDF çıktıları.
          </p>
        </div>
      </div>

      {/* Program Templates Section */}
      {templates.length > 0 && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-gradient-to-br from-ide-primary-50 via-white to-ide-secondary-50 rounded-2xl shadow-lg border border-ide-primary-100 p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-extrabold text-ide-primary-800 flex items-center tracking-tight">
                  Oluşturulan Programlar
                </h2>
                <p className="text-sm text-ide-primary-600 mt-1 font-medium">
                  {templates.length} program • Düzenlemek için tıklayın
                </p>
              </div>
              <Button
                onClick={() => navigate('/schedule-wizard')}
                icon={Plus}
                variant="primary"
                size="md"
                className="shadow-md"
              >
                Yeni Program
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {sortedTemplates.map((template) => (
                <div
                  key={template.id}
                  className="group bg-white rounded-2xl p-6 border border-ide-primary-100 shadow-sm hover:shadow-lg hover:border-ide-primary-300 transition-all duration-200 cursor-pointer relative flex flex-col min-h-[210px]"
                  onClick={() => handleEditTemplate(template.id)}
                >
                  {/* Durum Rozeti */}
                  <span className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-semibold shadow-sm border
                    ${template.status === 'published' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      template.status === 'draft' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                      'bg-gray-50 text-gray-500 border-gray-200'}`}
                  >
                    {template.status === 'published' ? 'Yayınlandı' : template.status === 'draft' ? 'Taslak' : 'Arşivlendi'}
                  </span>
                  {/* Başlık ve Dönem */}
                  <div className="flex items-center space-x-3 mb-2">
                    <Calendar className="w-6 h-6 text-ide-primary-600 flex-shrink-0" />
                    <h3 className="font-bold text-lg text-ide-primary-900 truncate group-hover:text-ide-primary-700 transition-colors">
                      {template.name}
                    </h3>
                  </div>
                  <p className="text-xs text-ide-primary-500 mb-1 font-medium">
                    {template.academicYear} {template.semester} Dönemi
                  </p>
                  {template.description && (
                    <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                      {template.description}
                    </p>
                  )}
                  <div className="flex-1" />
                  {/* Alt Bilgi ve Aksiyonlar */}
                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-100">
                    <span className="text-xs text-gray-400 flex items-center">
                      {(() => {
                        const date = new Date(template.updatedAt);
                        if (!isNaN(date.getTime())) {
                          return <><Clock className="w-4 h-4 mr-1" />{date.toLocaleDateString('tr-TR')}</>;
                        }
                        return null;
                      })()}
                    </span>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={e => { e.stopPropagation(); handleEditTemplate(template.id); }}
                        className="p-2 rounded-lg bg-ide-primary-50 hover:bg-ide-primary-100 text-ide-primary-700 hover:text-ide-primary-900 shadow-sm border border-transparent hover:border-ide-primary-200 transition"
                        title="Düzenle"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); handleDeleteTemplate(template); }}
                        className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-800 shadow-sm border border-transparent hover:border-red-200 transition"
                        title="Sil"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Minimal Features Grid */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {features.map((feature, index) => (
            <div
              key={index}
              onClick={() => navigate(feature.path)}
              className="group cursor-pointer bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 hover:border-gray-200"
            >
              <div className={`${feature.bgColor} w-10 h-10 rounded-lg flex items-center justify-center mb-3 group-hover:scale-105 transition-transform duration-200`}>
                <feature.icon className={`w-5 h-5 ${feature.color}`} />
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                {feature.title}
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                {feature.description}
              </p>
              <div className="flex items-center text-blue-600 text-sm font-medium group-hover:translate-x-1 transition-transform duration-200">
                Başla <ArrowRight className="ml-1 w-3 h-3" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Data Statistics */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-blue-600">{teachers.length}</div>
              <div className="text-xs text-gray-600">Öğretmen</div>
            </div>
            <div>
              <div className="text-lg font-bold text-emerald-600">{classes.length}</div>
              <div className="text-xs text-gray-600">Sınıf</div>
            </div>
            <div>
              <div className="text-lg font-bold text-indigo-600">{subjects.length}</div>
              <div className="text-xs text-gray-600">Ders</div>
            </div>
            <div>
              <div className="text-lg font-bold text-purple-600">{schedules.length}</div>
              <div className="text-xs text-gray-600">Program</div>
            </div>
          </div>
        </div>
      </div>

      {/* Minimal Quick Info */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-gray-900">Sihirbaz Sistemi</div>
              <div className="text-xs text-gray-600">Adım adım otomatik oluşturma</div>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900">Zaman Kısıtlamaları</div>
              <div className="text-xs text-gray-600">Esnek kısıtlama yönetimi</div>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900">Çakışma Kontrolü</div>
              <div className="text-xs text-gray-600">Otomatik çakışma tespiti</div>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900">PDF Çıktı</div>
              <div className="text-xs text-gray-600">Profesyonel görünüm</div>
            </div>
          </div>
        </div>
      </div>

      {/* Minimal Footer */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="text-center">
          <p className="text-xs text-gray-500">
            Sihirbaz tabanlı otomatik program oluşturma sistemi
          </p>
        </div>
      </div>

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

export default Home;