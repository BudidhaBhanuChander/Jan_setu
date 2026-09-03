import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { LayoutDashboard, FileText, Map, LogOut, CheckCircle2, Users, Building2, UserCircle } from 'lucide-react';
import ProfileModal from './ProfileModal';

export default function Layout({ children, activeTab = 'dashboard', onTabChange }) {
    const { user, logout } = useContext(AuthContext);
    const [isProfileOpen, setIsProfileOpen] = useState(false);

    const handleTabClick = (tab) => {
        if (onTabChange) {
            onTabChange(tab);
        }
    };

    return (
        <div className="flex h-screen bg-gray-50 font-sans">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shadow-sm z-10">
                <div className="h-16 flex items-center px-6 border-b border-gray-200">
                    <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center mr-3">
                        <span className="text-white font-bold text-lg">J</span>
                    </div>
                    <span className="text-xl font-bold text-gray-800 tracking-tight">Jan Setu</span>
                </div>
                
                <nav className="flex-1 px-4 py-6 space-y-2">
                    <button 
                        onClick={() => handleTabClick('dashboard')}
                        className={`w-full flex items-center gap-3 px-4 py-3 font-medium rounded-lg transition-colors cursor-pointer ${
                            activeTab === 'dashboard' 
                            ? 'bg-blue-50 text-primary font-bold shadow-xs' 
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                    >
                        <LayoutDashboard size={20} />
                        {user?.role === 'ADMIN' ? 'Command Overview' : 'Dashboard'}
                    </button>
                    {user?.role === 'CITIZEN' && (
                        <button 
                            onClick={() => handleTabClick('grievances')}
                            className={`w-full flex items-center gap-3 px-4 py-3 font-medium rounded-lg transition-colors cursor-pointer ${
                                activeTab === 'grievances' 
                                ? 'bg-blue-50 text-primary font-bold shadow-xs' 
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                        >
                            <FileText size={20} />
                            My Grievances
                        </button>
                    )}
                    {user?.role === 'OFFICER_L1' && (
                        <button 
                            onClick={() => handleTabClick('history')}
                            className={`w-full flex items-center gap-3 px-4 py-3 font-medium rounded-lg transition-colors cursor-pointer ${
                                activeTab === 'history' 
                                ? 'bg-blue-50 text-primary font-bold shadow-xs' 
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                        >
                            <CheckCircle2 size={20} />
                            Resolution History
                        </button>
                    )}
                    {user?.role === 'COMMISSIONER_L2' && (
                        <button 
                            onClick={() => handleTabClick('map')}
                            className={`w-full flex items-center gap-3 px-4 py-3 font-medium rounded-lg transition-colors cursor-pointer ${
                                activeTab === 'map' 
                                ? 'bg-blue-50 text-primary font-bold shadow-xs' 
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                        >
                            <Map size={20} />
                            Territory Map
                        </button>
                    )}
                    {user?.role === 'ADMIN' && (
                        <>
                            <button 
                                onClick={() => handleTabClick('officers')}
                                className={`w-full flex items-center gap-3 px-4 py-3 font-medium rounded-lg transition-colors cursor-pointer ${
                                    activeTab === 'officers' 
                                    ? 'bg-blue-50 text-primary font-bold shadow-xs' 
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                }`}
                            >
                                <Users size={20} />
                                Officers & Staff
                            </button>
                            <button 
                                onClick={() => handleTabClick('departments')}
                                className={`w-full flex items-center gap-3 px-4 py-3 font-medium rounded-lg transition-colors cursor-pointer ${
                                    activeTab === 'departments' 
                                    ? 'bg-blue-50 text-primary font-bold shadow-xs' 
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                }`}
                            >
                                <Building2 size={20} />
                                Departments
                            </button>
                            <button 
                                onClick={() => handleTabClick('gis_heatmap')}
                                className={`w-full flex items-center gap-3 px-4 py-3 font-medium rounded-lg transition-colors cursor-pointer ${
                                    activeTab === 'gis_heatmap' 
                                    ? 'bg-blue-50 text-primary font-bold shadow-xs' 
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                }`}
                            >
                                <Map size={20} />
                                GIS Blackspot Heatmap
                            </button>
                        </>
                    )}
                </nav>

                <div className="p-4 border-t border-gray-200">
                    <button 
                        onClick={logout}
                        className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 font-medium rounded-lg transition-colors cursor-pointer"
                    >
                        <LogOut size={20} />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                {/* Header */}
                <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 z-10 shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-800">
                        {user?.role === 'OFFICER_L1' ? 'Officer Workspace' : 
                         user?.role === 'COMMISSIONER_L2' ? 'Commissioner Command Center' : 
                         user?.role === 'ADMIN' ? 'GHMC Super Admin Portal' :
                         'Citizen Portal'}
                    </h2>
                    
                    <div 
                        onClick={() => setIsProfileOpen(true)}
                        className="flex items-center gap-4 cursor-pointer hover:opacity-85 transition-all p-1.5 rounded-xl hover:bg-gray-100"
                        title="Click to view and edit profile"
                    >
                        <div className="text-right">
                            <div className="text-sm font-bold text-gray-900">{user?.name || 'Loading...'}</div>
                            <div className="text-xs text-gray-500 font-medium">{user?.role?.replace('_', ' ') || 'User'}</div>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold shadow-md">
                            {user?.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <div className="flex-1 overflow-auto p-8 bg-gray-50">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </div>
            </main>

            {/* Profile Modal */}
            <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
        </div>
    );
}

