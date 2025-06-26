import React, { useState, useRef } from 'react';
import { FileText, Download, Eye } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Teacher, Class, Subject, Schedule } from '../types';
import { useFirestore } from '../hooks/useFirestore';
import Button from '../components/UI/Button';
import Select from '../components/UI/Select';
import SchedulePrintView from '../components/UI/SchedulePrintView';

const PDFExport = () => {
  const { data: teachers } = useFirestore<Teacher>('teachers');
  const { data: classes } = useFirestore<Class>('classes');
  const { data: subjects } = useFirestore<Subject>('subjects');
  const { data: schedules } = useFirestore<Schedule>('schedules');

  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const sortedTeachers = [...teachers].sort((a, b) => a.name.localeCompare(b.name, 'tr'));

  const generatePDF = async () => {
    if (!selectedTeacherId || !printRef.current) return;

    const teacher = teachers.find(t => t.id === selectedTeacherId);
    const schedule = schedules.find(s => s.teacherId === selectedTeacherId);

    if (!teacher || !schedule) {
      alert('Seçilen öğretmen için program bulunamadı');
      return;
    }

    setIsGenerating(true);

    try {
      // Show preview temporarily for screenshot
      const wasPreviewVisible = showPreview;
      if (!wasPreviewVisible) {
        setShowPreview(true);
        // Wait for DOM to update
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Generate canvas from the print view
      const canvas = await html2canvas(printRef.current, {
        scale: 2, // Higher quality
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: printRef.current.scrollWidth,
        height: printRef.current.scrollHeight,
        scrollX: 0,
        scrollY: 0,
        logging: false,
        removeContainer: true,
        imageTimeout: 0
      });

      // Create PDF
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      const imgWidth = 297; // A4 landscape width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Center the image if it's smaller than the page
      const yOffset = imgHeight < 210 ? (210 - imgHeight) / 2 : 0;

      pdf.addImage(imgData, 'PNG', 0, yOffset, imgWidth, imgHeight);

      // Generate filename with Turkish character conversion for file system
      let teacherName = teacher.name
        .replace(/ğ/g, 'g').replace(/Ğ/g, 'G')
        .replace(/ü/g, 'u').replace(/Ü/g, 'U')
        .replace(/ş/g, 's').replace(/Ş/g, 'S')
        .replace(/ı/g, 'i').replace(/İ/g, 'I')
        .replace(/ö/g, 'o').replace(/Ö/g, 'O')
        .replace(/ç/g, 'c').replace(/Ç/g, 'C')
        .replace(/[^a-zA-Z\s]/g, '')
        .replace(/\s+/g, '_');
      
      const fileName = `${teacherName}_Ders_Programi_${new Date().getFullYear()}.pdf`;
      pdf.save(fileName);

      // Hide preview if it wasn't visible before
      if (!wasPreviewVisible) {
        setShowPreview(false);
      }
    } catch (error) {
      console.error('PDF oluşturma hatası:', error);
      alert('PDF oluşturulurken bir hata oluştu');
    } finally {
      setIsGenerating(false);
    }
  };

  const teacherOptions = sortedTeachers.map(teacher => ({
    value: teacher.id,
    label: `${teacher.name} (${teacher.branch} - ${teacher.level})`
  }));

  const selectedTeacher = teachers.find(t => t.id === selectedTeacherId);
  const teacherSchedule = schedules.find(s => s.teacherId === selectedTeacherId);

  return (
    <div className="container-mobile">
      {/* FIXED: Mobile-optimized header with consistent spacing */}
      <div className="header-mobile">
        <div className="flex items-center">
          <FileText className="w-8 h-8 text-orange-600 mr-3" />
          <div>
            <h1 className="text-responsive-xl font-bold text-gray-900">PDF Çıktı</h1>
            <p className="text-responsive-sm text-gray-600">Öğretmen ders programlarını PDF olarak indirin</p>
          </div>
        </div>
      </div>

      {/* FIXED: Perfect vertical alignment for all elements */}
      <div className="mobile-card mobile-spacing">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Öğretmen Seçimi - 4 kolon */}
          <div className="lg:col-span-4">
            <Select
              label="Öğretmen Seçin"
              value={selectedTeacherId}
              onChange={setSelectedTeacherId}
              options={teacherOptions}
              required
            />
          </div>
          
          {/* Önizleme Butonu - 4 kolon - PERFECT CENTER ALIGNMENT */}
          <div className="lg:col-span-4 flex items-end justify-center">
            {selectedTeacher && teacherSchedule && (
              <Button
                onClick={() => setShowPreview(!showPreview)}
                icon={Eye}
                variant="secondary"
                className="w-full"
              >
                {showPreview ? 'Önizlemeyi Gizle' : 'Önizleme Göster'}
              </Button>
            )}
          </div>
          
          {/* PDF İndir Butonu - 4 kolon - PERFECT CENTER ALIGNMENT */}
          <div className="lg:col-span-4 flex items-end justify-end">
            {selectedTeacher && teacherSchedule && (
              <Button
                onClick={generatePDF}
                icon={Download}
                variant="primary"
                disabled={isGenerating}
                className="w-full"
              >
                {isGenerating ? 'PDF Oluşturuluyor...' : 'PDF İndir'}
              </Button>
            )}
          </div>
        </div>

        {/* Status Messages */}
        <div className="mt-6">
          {selectedTeacher && !teacherSchedule && (
            <div className="ide-notification ide-notification-warning">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <FileText className="w-5 h-5 text-ide-accent-600 mt-0.5" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-ide-accent-800">Program Bulunamadı</h3>
                  <p className="text-sm text-ide-accent-700 mt-1">
                    <strong>{selectedTeacher.name}</strong> için henüz program oluşturulmamış.
                    Önce "Program Oluştur\" bölümünden program oluşturun, sonra PDF olarak indirebilirsiniz.
                  </p>
                </div>
              </div>
            </div>
          )}

          {selectedTeacher && teacherSchedule && (
            <div className="ide-notification ide-notification-success">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <FileText className="w-5 h-5 text-ide-secondary-600 mt-0.5" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-ide-secondary-800">Program Hazır</h3>
                  <p className="text-sm text-ide-secondary-700 mt-1">
                    <strong>{selectedTeacher.name}</strong> için program hazır. 
                    Önizleme gösterip PDF olarak indirebilirsiniz.
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-4 text-xs text-ide-secondary-600">
                    <div>
                      <p>✓ Gerçek ekran görüntüsü</p>
                      <p>✓ Tam Türkçe karakter desteği</p>
                      <p>✓ Yüksek çözünürlük</p>
                      <p>✓ Renkli görünüm</p>
                    </div>
                    <div>
                      <p>✓ Profesyonel tasarım</p>
                      <p>✓ Yazdırma dostu</p>
                      <p>✓ Okul logosu</p>
                      <p>✓ İmza alanları</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {!selectedTeacher && (
        <div className="text-center py-12 mobile-card mt-6">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">PDF İndirmek İçin Öğretmen Seçin</h3>
          <p className="text-gray-500 mb-4">
            Bir öğretmen seçerek ders programını PDF olarak indirebilirsiniz
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-400 max-w-md mx-auto">
            <div className="space-y-1">
              <p>✓ Gerçek ekran görüntüsü</p>
              <p>✓ Tam Türkçe karakter desteği</p>
              <p>✓ Yüksek çözünürlük</p>
              <p>✓ Renkli görünüm</p>
            </div>
            <div className="space-y-1">
              <p>✓ Profesyonel tasarım</p>
              <p>✓ Yazdırma dostu</p>
              <p>✓ Okul logosu</p>
              <p>✓ İmza alanları</p>
            </div>
          </div>
        </div>
      )}

      {/* Print View - Hidden by default */}
      {selectedTeacher && teacherSchedule && (
        <div className={`mt-8 ${showPreview ? 'block' : 'hidden'}`}>
          <div className="bg-gray-100 p-4 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Program Önizlemesi</h3>
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div ref={printRef}>
                <SchedulePrintView
                  teacher={selectedTeacher}
                  schedule={teacherSchedule}
                  subjects={subjects}
                  classes={classes}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PDFExport;