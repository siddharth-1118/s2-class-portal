import React from 'react';
import { BookOpen, GraduationCap, Calendar, Utensils, User, Grid, X, ChevronRight, LogOut, Bell, Award, BarChart2 } from 'lucide-react';

const MobileNav = ({ activeTab, setActiveTab, tabs, isOpen, onClose, onLogout }) => {

    // Default tabs in case none passed
    const defaultTabs = [
        { id: 'homework', label: 'Home', icon: <BookOpen className="w-5 h-5" /> },
        { id: 'marks', label: 'Marks', icon: <GraduationCap className="w-5 h-5" /> },
    ];
    const navTabs = tabs || defaultTabs;

    // We no longer need separate "more" logic, as the sidebar can scroll

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm transition-opacity duration-300 md:hidden ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            />

            {/* Sidebar Drawer */}
            <div className={`fixed inset-y-0 right-0 z-[100] w-[280px] bg-slate-900 border-l border-white/10 shadow-2xl transform transition-transform duration-300 md:hidden flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>

                {/* Header */}
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-slate-950/50">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        Menu
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Nav Items */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                    {navTabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => {
                                setActiveTab(tab.id);
                                onClose();
                            }}
                            className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all duration-300 group ${activeTab === tab.id ? 'bg-[rgb(var(--accent-color))]/10 border border-[rgb(var(--accent-color))]/20' : 'hover:bg-white/5 border border-transparent'}`}
                        >
                            <div className={`p-2 rounded-lg transition-colors ${activeTab === tab.id ? 'bg-[rgb(var(--accent-color))] text-white shadow-lg' : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700 group-hover:text-white'}`}>
                                {React.cloneElement(tab.icon, { className: "w-5 h-5" })}
                            </div>
                            <div className="flex-1 text-left">
                                <span className={`font-semibold block ${activeTab === tab.id ? 'text-[rgb(var(--accent-color))]' : 'text-slate-300 group-hover:text-white'}`}>
                                    {tab.label}
                                </span>
                            </div>
                            {activeTab === tab.id && <ChevronRight className="w-4 h-4 text-[rgb(var(--accent-color))]" />}
                        </button>
                    ))}
                </div>

                {/* Footer / Logout */}
                {onLogout && (
                    <div className="p-4 border-t border-white/10 bg-slate-950/30">
                        <button
                            onClick={onLogout}
                            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition"
                        >
                            <LogOut className="w-5 h-5" />
                            <span className="font-semibold">Logout</span>
                        </button>
                    </div>
                )}
            </div>
        </>
    );
};

export default MobileNav;
