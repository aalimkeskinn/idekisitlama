import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Users, Building, BookOpen, Calendar, LogOut, Eye, Menu, X, GraduationCap, Home, ChevronRight, Zap, Database, MapPin } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const Sidebar = () => {
  const { logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
  };

  const navItems = [
    { 
      to: '/', 
      icon: Home, 
      label: 'Anasayfa', 
      color: 'ide-primary',
      description: 'Ana kontrol paneli'
    },
    { 
      to: '/schedule-wizard', 
      icon: Zap, 
      label: 'Program Sihirbazı', 
      color: 'ide-accent',
      description: 'Otomatik program oluştur'
    },
    { 
      to: '/schedules', 
      icon: Calendar, 
      label: 'Manuel Program', 
      color: 'ide-accent',
      description: 'Manuel program oluştur'
    },
    { 
      to: '/class-schedules', 
      icon: GraduationCap, 
      label: 'Sınıf Programları', 
      color: 'ide-secondary',
      description: 'Sınıf bazlı görünüm'
    },
    { 
      to: '/all-schedules', 
      icon: Eye, 
      label: 'Öğretmen Programları', 
      color: 'ide-primary',
      description: 'Öğretmen bazlı görünüm'
    },
    { 
      to: '/data-management', 
      icon: Database, 
      label: 'Veri Yönetimi', 
      color: 'ide-primary',
      description: 'Sistem verilerini yönet'

    },
    { 

      to: '/pdf', 
      icon: Calendar, 
      label: 'PDF Çıktı', 
      color: 'ide-orange',
      description: 'Rapor ve çıktılar'
    }
  ];

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* CRITICAL: Mobile Menu Button - Professional Design */}
      <div className="lg:hidden fixed top-4 left-4 z-50 safe-top safe-left">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-3 bg-white rounded-xl shadow-lg border border-gray-200 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-ide-primary-500 focus:ring-offset-2 transition-all duration-300 btn-touch touch-enhanced group"
          aria-label="Menüyü aç/kapat"
        >
          {isMobileMenuOpen ? (
            <X size={24} className="text-ide-gray-700 group-hover:text-ide-primary-600 transition-colors" />
          ) : (
            <Menu size={24} className="text-ide-gray-700 group-hover:text-ide-primary-600 transition-colors" />
          )}
        </button>
      </div>

      {/* CRITICAL: Mobile Overlay - Enhanced */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-60 z-40 transition-opacity duration-300 backdrop-blur-sm"
          onClick={closeMobileMenu}
        />
      )}

      {/* CRITICAL: Professional Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-40 bg-white shadow-2xl lg:shadow-xl h-screen flex flex-col
        transform transition-all duration-500 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        
        /* PROFESSIONAL DESIGN */
        w-80 lg:w-72 xl:w-80
        safe-top safe-bottom safe-left
        border-r border-gray-200
      `}>
        
        {/* PROFESSIONAL HEADER */}
        <div className="relative p-6 bg-gradient-to-br from-ide-primary-600 via-ide-primary-700 to-ide-primary-800 border-b border-ide-primary-500">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-16 translate-x-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12"></div>
          
          <div className="relative z-10 flex items-center justify-between lg:justify-start">
            <div className="flex items-center space-x-4">
              {/* Logo */}
              <div className="w-12 h-12 bg-white rounded-xl shadow-lg flex items-center justify-center flex-shrink-0">
                <img 
                  src="https://cv.ide.k12.tr/images/ideokullari_logo.png" 
                  alt="İDE Okulları Logo"
                  className="w-8 h-8 object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = '<div class="w-8 h-8 text-ide-primary-600 flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg></div>';
                    }
                  }}
                />
              </div>
              
              {/* Title */}
              <div>
                <h1 className="text-xl font-bold text-white leading-tight">İDE Okulları</h1>
                <p className="text-sm text-ide-primary-100 font-medium">Ders Programı Sistemi</p>
              </div>
            </div>
            
            {/* CRITICAL: Mobile close button */}
            <button
              onClick={closeMobileMenu}
              className="lg:hidden p-2 rounded-lg hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all duration-200 btn-touch touch-enhanced"
              aria-label="Menüyü kapat"
            >
              <X size={20} className="text-white" />
            </button>
          </div>
        </div>
        
        {/* PROFESSIONAL NAVIGATION */}
        <nav className="flex-1 p-4 overflow-y-auto bg-gray-50">
          <div className="space-y-2">
            {navItems.map(({ to, icon: Icon, label, color, description }) => (
              <NavLink
                key={to}
                to={to}
                onClick={closeMobileMenu}
                className={({ isActive }) =>
                  `group relative flex items-center p-4 rounded-xl transition-all duration-300 ${
                    isActive
                      ? 'bg-ide-primary-50 text-ide-primary-700 shadow-lg border-2 border-ide-primary-200 transform scale-[1.02]'
                      : 'text-ide-gray-700 hover:bg-white hover:text-ide-primary-600 hover:shadow-md border-2 border-transparent hover:border-ide-primary-100'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {/* Active Indicator */}
                    {isActive && (
                      <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-ide-primary-600 rounded-r-full"></div>
                    )}
                    
                    {/* Icon Container */}
                    <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${
                      isActive 
                        ? 'bg-ide-primary-100 text-ide-primary-600' 
                        : 'bg-gray-100 text-gray-500 group-hover:bg-ide-primary-100 group-hover:text-ide-primary-600'
                    }`}>
                      <Icon size={24} className="transition-transform duration-300 group-hover:scale-110" />
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 ml-4 min-w-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className={`font-semibold text-base leading-tight transition-colors duration-300 ${
                            isActive ? 'text-ide-primary-700' : 'text-gray-900 group-hover:text-ide-primary-600'
                          }`}>
                            {label}
                          </p>
                          <p className={`text-sm mt-1 transition-colors duration-300 ${
                            isActive ? 'text-ide-primary-600' : 'text-gray-500 group-hover:text-ide-primary-500'
                          }`}>
                            {description}
                          </p>
                        </div>
                        
                        {/* Arrow */}
                        <ChevronRight 
                          size={18} 
                          className={`flex-shrink-0 transition-all duration-300 ${
                            isActive 
                              ? 'text-ide-primary-600 transform translate-x-1' 
                              : 'text-gray-400 group-hover:text-ide-primary-500 group-hover:transform group-hover:translate-x-1'
                          }`} 
                        />
                      </div>
                    </div>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
        
        {/* PROFESSIONAL LOGOUT SECTION */}
        <div className="p-4 border-t border-gray-200 bg-white safe-bottom">
          <button
            onClick={handleLogout}
            className="w-full group flex items-center p-4 rounded-xl text-ide-gray-700 hover:bg-ide-accent-50 hover:text-ide-accent-700 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-ide-accent-500 focus:ring-offset-2 border-2 border-transparent hover:border-ide-accent-200"
          >
            {/* Icon Container */}
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gray-100 group-hover:bg-ide-accent-100 flex items-center justify-center transition-all duration-300">
              <LogOut size={24} className="text-gray-500 group-hover:text-ide-accent-600 transition-all duration-300 group-hover:scale-110" />
            </div>
            
            {/* Content */}
            <div className="flex-1 ml-4 text-left">
              <p className="font-semibold text-base text-gray-900 group-hover:text-ide-accent-700 transition-colors duration-300">
                Güvenli Çıkış
              </p>
              <p className="text-sm text-gray-500 group-hover:text-ide-accent-600 transition-colors duration-300 mt-1">
                Oturumu sonlandır
              </p>
            </div>
            
            {/* Arrow */}
            <ChevronRight 
              size={18} 
              className="flex-shrink-0 text-gray-400 group-hover:text-ide-accent-500 group-hover:transform group-hover:translate-x-1 transition-all duration-300" 
            />
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;