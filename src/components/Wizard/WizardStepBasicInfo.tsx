import React from 'react';
import { Calendar, FileText, Clock, GraduationCap } from 'lucide-react';
import Input from '../UI/Input';
import Select from '../UI/Select';

interface BasicInfoData {
  name: string;
  academicYear: string;
  semester: string;
  startDate: string;
  endDate: string;
  description: string;
  institutionTitle: string;
  dailyHours: number;
  weekDays: number;
  weekendClasses: boolean;
}

interface WizardStepBasicInfoProps {
  data: BasicInfoData;
  onUpdate: (data: BasicInfoData) => void;
}

const WizardStepBasicInfo: React.FC<WizardStepBasicInfoProps> = ({ data, onUpdate }) => {
  // Generate academic years from 2024/2025 to 2030/2031
  const generateAcademicYears = () => {
    const years = [];
    for (let startYear = 2024; startYear <= 2030; startYear++) {
      const endYear = startYear + 1;
      const yearLabel = `${startYear}/${endYear}`;
      
      // Calculate dates for each academic year
      const startDate = `${startYear}-09-01`;
      const endDate = `${endYear}-08-31`;
      
      years.push({
        value: yearLabel,
        label: yearLabel,
        startDate,
        endDate
      });
    }
    return years;
  };

  const academicYears = generateAcademicYears();

  const semesterOptions = [
    { value: '', label: 'Seçiniz (İsteğe bağlı)' },
    { value: 'Güz', label: 'Güz Dönemi' },
    { value: 'Bahar', label: 'Bahar Dönemi' },
    { value: 'Yaz', label: 'Yaz Dönemi' }
  ];

  const dailyHoursOptions = [
    { value: '6', label: '6 Ders Saati' },
    { value: '7', label: '7 Ders Saati' },
    { value: '8', label: '8 Ders Saati' },
    { value: '9', label: '9 Ders Saati' },
    { value: '10', label: '10 Ders Saati' }
  ];

  const weekDaysOptions = [
    { value: '5', label: '5 Gün (Pazartesi-Cuma)' },
    { value: '6', label: '6 Gün (Pazartesi-Cumartesi)' }
  ];

  const handleChange = (field: keyof BasicInfoData, value: string | number | boolean) => {
    const updatedData = {
      ...data,
      [field]: value
    };

    // Auto-update dates when academic year changes
    if (field === 'academicYear') {
      const selectedYear = academicYears.find(year => year.value === value);
      if (selectedYear) {
        updatedData.startDate = selectedYear.startDate;
        updatedData.endDate = selectedYear.endDate;
      }
    }

    onUpdate(updatedData);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Calendar className="w-8 h-8 text-blue-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Program Temel Bilgileri</h3>
        <p className="text-gray-600">
          Oluşturacağınız ders programının temel bilgilerini girin
        </p>
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto space-y-6">
        <Input
          label="Program Başlığı"
          value={data.name || ''}
          onChange={(value) => handleChange('name', value)}
          placeholder="Örn: 2024-2025 Güz Dönemi Ders Programı"
          required
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Eğitim Dönemi"
            value={data.academicYear || '2024/2025'}
            onChange={(value) => handleChange('academicYear', value)}
            options={academicYears.map(year => ({ value: year.value, label: year.label }))}
            required
          />

          <Select
            label="Dönem"
            value={data.semester || ''}
            onChange={(value) => handleChange('semester', value)}
            options={semesterOptions}
          />
        </div>

        <Input
          label="Kurum Yetkilisi Ünvanı"
          value={data.institutionTitle || ''}
          onChange={(value) => handleChange('institutionTitle', value)}
          placeholder="Örn: Okul Müdürü, Müdür Yardımcısı"
          required
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Günlük Ders Saati"
            value={data.dailyHours?.toString() || '8'}
            onChange={(value) => handleChange('dailyHours', parseInt(value))}
            options={dailyHoursOptions}
            required
          />

          <Select
            label="Haftalık Gün Sayısı"
            value={data.weekDays?.toString() || '5'}
            onChange={(value) => handleChange('weekDays', parseInt(value))}
            options={weekDaysOptions}
            required
          />
        </div>

        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            id="weekendClasses"
            checked={data.weekendClasses || false}
            onChange={(e) => handleChange('weekendClasses', e.target.checked)}
            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="weekendClasses" className="text-sm font-medium text-gray-700">
            Hafta sonu dersleri var
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Başlangıç Tarihi"
            type="date"
            value={data.startDate || ''}
            onChange={(value) => handleChange('startDate', value)}
            required
          />

          <Input
            label="Bitiş Tarihi"
            type="date"
            value={data.endDate || ''}
            onChange={(value) => handleChange('endDate', value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-2">
            Açıklama <span className="text-gray-500">(İsteğe bağlı)</span>
          </label>
          <textarea
            value={data.description || ''}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Program hakkında ek bilgiler..."
            rows={4}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
          />
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <FileText className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-700">
              <h4 className="font-medium mb-1">💡 Eğitim Dönemleri:</h4>
              <ul className="space-y-1 text-xs">
                <li>• <strong>2024/2025:</strong> 1 Eylül 2024 - 31 Ağustos 2025</li>
                <li>• <strong>2025/2026:</strong> 1 Eylül 2025 - 31 Ağustos 2026</li>
                <li>• <strong>2026/2027:</strong> 1 Eylül 2026 - 31 Ağustos 2027</li>
                <li>• Dönem seçildiğinde tarihler otomatik güncellenir</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Preview */}
        {data.name && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2 flex items-center">
              <GraduationCap className="w-4 h-4 mr-2 text-blue-600" />
              Program Önizlemesi:
            </h4>
            <div className="text-sm text-gray-700 space-y-1">
              <p><strong>Program:</strong> {data.name}</p>
              <p><strong>Dönem:</strong> {data.academicYear} {data.semester ? `${data.semester} Dönemi` : ''}</p>
              <p><strong>Yetkilisi:</strong> {data.institutionTitle || 'Belirtilmemiş'}</p>
              <p><strong>Ders Saati:</strong> Günde {data.dailyHours || 8} saat, Haftada {data.weekDays || 5} gün</p>
              {data.weekendClasses && (
                <p><strong>Hafta Sonu:</strong> Hafta sonu dersleri dahil</p>
              )}
              {data.startDate && data.endDate && (
                <p><strong>Süre:</strong> {new Date(data.startDate).toLocaleDateString('tr-TR')} - {new Date(data.endDate).toLocaleDateString('tr-TR')}</p>
              )}
              {data.description && (
                <p><strong>Açıklama:</strong> {data.description}</p>
              )}
            </div>
          </div>
        )}

        {/* Academic Year Info */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Clock className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-green-700">
              <h4 className="font-medium mb-1">⏰ Ders Saatleri:</h4>
              <ul className="space-y-1 text-xs">
                <li>• <strong>Günlük Ders Saati:</strong> Bir günde kaç ders saati olacağını belirler</li>
                <li>• <strong>Haftalık Gün Sayısı:</strong> Haftada kaç gün ders olacağını belirler</li>
                <li>• <strong>Hafta Sonu Dersleri:</strong> Cumartesi ve/veya Pazar günleri ders olup olmayacağını belirler</li>
                <li>• Bu bilgiler program oluşturma algoritmasında kullanılacaktır</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WizardStepBasicInfo;