import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { useToast } from './hooks/useToast';
import Layout from './components/Layout/Layout';
import Login from './components/Auth/Login';
import Home from './pages/Home';
import Teachers from './pages/Teachers';
import Classes from './pages/Classes';
import Subjects from './pages/Subjects';
import Schedules from './pages/Schedules';
import ScheduleWizard from './pages/ScheduleWizard';
import AllSchedules from './pages/AllSchedules';
import ClassSchedules from './pages/ClassSchedules';
import PDFExport from './pages/PDFExport';
import DataManagement from './pages/DataManagement';
import Classrooms from './pages/Classrooms';
import ToastContainer from './components/UI/ToastContainer';

function App() {
  const { user, loading } = useAuth();
  const { toasts, removeToast } = useToast();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <div className="text-gray-600 font-medium">Yükleniyor...</div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* GLOBAL TOAST PORTAL - MAXIMUM Z-INDEX */}
      <div 
        id="toast-portal-root"
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 2147483647, // Maximum possible z-index
          pointerEvents: 'none',
          width: '420px',
          maxWidth: '90vw'
        }}
      >
        <ToastContainer toasts={toasts} onClose={removeToast} />
      </div>

      {!user ? (
        <Login />
      ) : (
        <Router>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="teachers" element={<Teachers />} />
              <Route path="classes" element={<Classes />} />
              <Route path="subjects" element={<Subjects />} />
              <Route path="schedules" element={<Schedules />} />
              <Route path="schedule-wizard" element={<ScheduleWizard />} />
              <Route path="class-schedules" element={<ClassSchedules />} />
              <Route path="all-schedules" element={<AllSchedules />} />
              <Route path="pdf" element={<PDFExport />} />
              <Route path="data-management" element={<DataManagement />} />
              <Route path="classrooms" element={<Classrooms />} />
            </Route>
          </Routes>
        </Router>
      )}
    </>
  );
}

export default App;