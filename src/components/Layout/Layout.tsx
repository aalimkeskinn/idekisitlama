import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const Layout = () => {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto lg:ml-0">
        {/* FIXED: Normal content spacing - no special mobile adjustments */}
        <div className="pt-20 lg:pt-0">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;