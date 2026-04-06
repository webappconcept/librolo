"use client";

import { useState } from "react";
import MobileMenuButton from "./mobile-menu-button";
import AdminSidebar from "./sidebar";

export default function AdminShellClient({
  children,
  header,
}: {
  children: React.ReactNode;
  header: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-[#f1f5f9]">
      {/* Sidebar — desktop sempre visibile, mobile drawer */}
      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        {/* Header con bottone hamburger iniettato */}
        <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 shrink-0">
          <div className="flex items-center gap-3">
            <MobileMenuButton onClick={() => setSidebarOpen(true)} />
            <h1 className="text-sm font-semibold text-gray-800 hidden lg:block">
              Pannello Amministratore
            </h1>
            <h1 className="text-sm font-semibold text-gray-800 lg:hidden">
              Admin
            </h1>
          </div>
          {/* Destra header (avatar, bell, ecc.) */}
          {header}
        </div>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
