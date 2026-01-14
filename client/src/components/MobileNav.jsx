import React from 'react';
import { BookOpen, GraduationCap, Calendar, Utensils, User } from 'lucide-react';

const MobileNav = ({ activeTab, setActiveTab, tabs }) => {
    const defaultTabs = [
        { id: 'homework', label: 'Home', icon: <BookOpen className="w-5 h-5" /> },
        { id: 'marks', label: 'Marks', icon: <GraduationCap className="w-5 h-5" /> },
        { id: 'timetable', label: 'Time', icon: <Calendar className="w-5 h-5" /> },
        { id: 'mess', label: 'Mess', icon: <Utensils className="w-5 h-5" /> },
        { id: 'profile', label: 'Profile', icon: <User className="w-5 h-5" /> },
    ];

    const navTabs = tabs || defaultTabs;

    return (
        <div className="fixed bottom-4 left-4 right-4 z-[90] md:hidden">
            <div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex justify-between items-center p-2">
                {navTabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex flex-col items-center justify-center w-full py-2 rounded-xl transition-all duration-300 ${activeTab === tab.id ? 'bg-white/10 text-[rgb(var(--accent-color))]' : 'text-slate-400 hover:text-white'}`}
                    >
                        <div className={`transition-transform duration-300 ${activeTab === tab.id ? '-translate-y-1 scale-110' : ''}`}>
                            {tab.icon}
                        </div>
                        {activeTab === tab.id && (
                            <span className="text-[10px] font-bold mt-1 opacity-100 animate-fade-in">{tab.label}</span>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default MobileNav;
