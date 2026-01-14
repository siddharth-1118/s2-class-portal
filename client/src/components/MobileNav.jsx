import React, { useState } from 'react';
import { BookOpen, GraduationCap, Calendar, Utensils, User, Grid, X, ChevronDown, BarChart2, Bell } from 'lucide-react';

const MobileNav = ({ activeTab, setActiveTab, tabs }) => {
    const [showMore, setShowMore] = useState(false);

    const defaultTabs = [
        { id: 'homework', label: 'Home', icon: <BookOpen className="w-5 h-5" /> },
        { id: 'marks', label: 'Marks', icon: <GraduationCap className="w-5 h-5" /> },
        { id: 'timetable', label: 'Time', icon: <Calendar className="w-5 h-5" /> },
        { id: 'mess', label: 'Mess', icon: <Utensils className="w-5 h-5" /> },
        { id: 'profile', label: 'Profile', icon: <User className="w-5 h-5" /> },
    ];

    const allTabs = tabs || defaultTabs;

    // Logic: If <= 5 tabs, show all. If > 5, show 4 + More button.
    const showMoreButton = allTabs.length > 5;
    const mainTabs = showMoreButton ? allTabs.slice(0, 4) : allTabs;
    const hiddenTabs = showMoreButton ? allTabs.slice(4) : [];

    const handleTabClick = (id) => {
        setActiveTab(id);
        setShowMore(false);
    };

    return (
        <>
            {/* More Menu Overlay */}
            {showMore && (
                <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex flex-col justify-end pb-24 animate-fade-in" onClick={() => setShowMore(false)}>
                    <div className="mx-4 bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white">More Apps</h3>
                            <button onClick={() => setShowMore(false)} className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition">
                                <ChevronDown className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="grid grid-cols-4 gap-4">
                            {hiddenTabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => handleTabClick(tab.id)}
                                    className={`flex flex-col items-center gap-2 group ${activeTab === tab.id ? 'opacity-100' : 'opacity-70 hover:opacity-100'}`}
                                >
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-lg ${activeTab === tab.id ? 'bg-[rgb(var(--accent-color))] text-white scale-110 shadow-[rgb(var(--accent-color))]/30' : 'bg-slate-800 text-slate-300 group-hover:bg-slate-700'}`}>
                                        {React.cloneElement(tab.icon, { className: "w-6 h-6" })}
                                    </div>
                                    <span className={`text-xs font-medium text-center ${activeTab === tab.id ? 'text-[rgb(var(--accent-color))]' : 'text-slate-400'}`}>{tab.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom Bar */}
            <div className="fixed bottom-4 left-4 right-4 z-[90] md:hidden">
                <div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex justify-between items-center p-2 relative">

                    {mainTabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => handleTabClick(tab.id)}
                            className={`flex flex-col items-center justify-center w-full py-2 rounded-xl transition-all duration-300 ${activeTab === tab.id ? 'text-[rgb(var(--accent-color))]' : 'text-slate-400 hover:text-white'}`}
                        >
                            <div className={`transition-transform duration-300 ${activeTab === tab.id ? '-translate-y-1' : ''}`}>
                                {tab.icon}
                            </div>
                            {activeTab === tab.id && (
                                <span className="text-[10px] font-bold mt-1 opacity-100 animate-fade-in absolute bottom-1">{tab.label}</span>
                            )}
                        </button>
                    ))}

                    {showMoreButton && (
                        <button
                            onClick={() => setShowMore(!showMore)}
                            className={`flex flex-col items-center justify-center w-full py-2 rounded-xl transition-all duration-300 ${showMore ? 'text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                            <div className={`transition-transform duration-300 ${showMore ? '-translate-y-1' : ''}`}>
                                {showMore ? <X className="w-5 h-5" /> : <Grid className="w-5 h-5" />}
                            </div>
                            {showMore && (
                                <span className="text-[10px] font-bold mt-1 opacity-100 animate-fade-in absolute bottom-1">Close</span>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </>
    );
};

export default MobileNav;
