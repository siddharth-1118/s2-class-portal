import { useState, useEffect } from 'react';
import { Clock, Coffee, Utensils, Moon, Sun, ChevronLeft, ChevronRight, Calendar, Edit2, X, Save, Timer, Sparkles } from 'lucide-react';

const MessTab = ({ isAdmin }) => {
    const [activeDay, setActiveDay] = useState(new Date().getDay() === 0 ? 6 : new Date().getDay() - 1); // Default to current day (Mon=0, Sun=6)
    const [activeMeal, setActiveMeal] = useState(null);
    const [timeToNextMeal, setTimeToNextMeal] = useState('');

    useEffect(() => {
        const updateStatus = () => {
            const now = new Date();
            const hour = now.getHours();
            const currentDayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

            if (activeDay === currentDayIndex) {
                if (hour >= 7 && hour < 10) setActiveMeal('breakfast');
                else if (hour >= 12 && hour < 14) setActiveMeal('lunch');
                else if (hour >= 16 && hour < 18) setActiveMeal('snacks');
                else if (hour >= 19 && hour < 21) setActiveMeal('dinner');
                else setActiveMeal(null);

                // Calculate Time to Next Meal
                let targetTime = null;
                let nextMealName = '';
                if (hour < 7) { targetTime = 7; nextMealName = 'Breakfast'; }
                else if (hour < 12) { targetTime = 12; nextMealName = 'Lunch'; }
                else if (hour < 16) { targetTime = 16; nextMealName = 'Snacks'; }
                else if (hour < 19) { targetTime = 19; nextMealName = 'Dinner'; }
                else { targetTime = 7 + 24; nextMealName = 'Breakfast Tomorrow'; } // Next day breakfast

                if (targetTime) {
                    const targetDate = new Date();
                    if (targetTime >= 24) {
                        targetDate.setDate(targetDate.getDate() + 1);
                        targetTime -= 24;
                    }
                    targetDate.setHours(targetTime, 0, 0, 0);
                    const diff = targetDate - now;
                    const hours = Math.floor(diff / (1000 * 60 * 60));
                    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    setTimeToNextMeal(`${hours}h ${mins}m to ${nextMealName}`);
                }
            } else {
                setActiveMeal(null);
                setTimeToNextMeal('');
            }
        };

        updateStatus();
        const interval = setInterval(updateStatus, 60000); // Update every minute
        return () => clearInterval(interval);
    }, [activeDay]);

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const [menu, setMenu] = useState([]);

    useEffect(() => {
        fetch(`${API_URL}/api/mess`)
            .then(res => res.json())
            .then(data => setMenu(data))
            .catch(err => console.error("Error fetching mess menu:", err));
    }, []);

    // Helper to get menu for active day
    const currentMenu = menu.find(m => m.day === days[activeDay]) || {};

    const nextDay = () => setActiveDay((prev) => (prev + 1) % 7);
    const prevDay = () => setActiveDay((prev) => (prev - 1 + 7) % 7);

    // Admin Edit State
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editForm, setEditForm] = useState({ breakfast: '', lunch: '', snacks: '', dinner: '', specials: '' });

    const handleEditClick = () => {
        setEditForm({
            breakfast: currentMenu.breakfast || '',
            lunch: currentMenu.lunch || '',
            snacks: currentMenu.snacks || '',
            dinner: currentMenu.dinner || '',
            specials: currentMenu.specials || ''
        });
        setEditModalOpen(true);
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_URL}/api/mess/${days[activeDay]}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                body: JSON.stringify(editForm)
            });

            if (res.ok) {
                const updatedDay = days[activeDay];
                setMenu(prev => prev.map(m => m.day === updatedDay ? { ...m, ...editForm } : m));
                setEditModalOpen(false);
                alert("Menu Updated Successfully!");
            } else {
                alert("Failed to update menu");
            }
        } catch (err) {
            console.error(err);
            alert("Error updating menu");
        }
    };

    // Helper to parse menu items
    const parseItems = (text) => {
        if (!text) return [];
        // Split by comma, remove bold markers for display, trim
        return text.split(',').map(item => item.replace(/\*\*/g, '').trim()).filter(i => i);
    };

    const MealCard = ({ title, icon, color, data, isActive, time }) => {
        const items = parseItems(data || '');
        const colorClasses = {
            orange: 'from-orange-500/20 to-orange-600/5 text-orange-400 border-orange-500/30',
            yellow: 'from-yellow-500/20 to-yellow-600/5 text-yellow-400 border-yellow-500/30',
            rose: 'from-rose-500/20 to-rose-600/5 text-rose-400 border-rose-500/30',
            indigo: 'from-indigo-500/20 to-indigo-600/5 text-indigo-400 border-indigo-500/30',
        };

        const activeClass = isActive ? 'ring-2 ring-white/50 scale-[1.02] shadow-[0_0_30px_rgba(255,255,255,0.1)]' : 'opacity-80 hover:opacity-100 hover:scale-[1.01]';

        return (
            <div className={`relative overflow-hidden rounded-3xl border backdrop-blur-md bg-gradient-to-br transition-all duration-500 group ${colorClasses[color]} ${activeClass}`}>
                {isActive && (
                    <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                        <span className="text-[10px] font-bold tracking-wider text-white">LIVE</span>
                    </div>
                )}

                <div className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className={`p-3 rounded-2xl bg-white/5 border border-white/10 group-hover:rotate-12 transition-transform duration-300`}>
                            {icon}
                        </div>
                        <div>
                            <h3 className="text-xl font-black tracking-tight text-white mb-0.5">{title}</h3>
                            <p className="text-xs font-mono opacity-60 uppercase tracking-widest">{time}</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {items.length > 0 ? items.map((item, idx) => (
                            <span key={idx} className="px-3 py-1.5 rounded-lg bg-black/20 border border-white/5 text-sm font-medium text-slate-200 hover:bg-white/10 transition-colors cursor-default">
                                {item}
                            </span>
                        )) : (
                            <span className="text-sm opacity-50 italic px-2">Menu updating...</span>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-8 animate-fade-in pb-24 max-w-5xl mx-auto">
            {editModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 animate-fade-in">
                    <div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 max-w-2xl w-full shadow-2xl relative">
                        <button onClick={() => setEditModalOpen(false)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition"><X className="w-6 h-6" /></button>
                        <h2 className="text-2xl font-black text-white mb-8 flex items-center gap-3">
                            <Edit2 className="w-6 h-6 text-[rgb(var(--accent-color))]" />
                            Editing {days[activeDay]}
                        </h2>
                        <form onSubmit={handleEditSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {['breakfast', 'lunch', 'snacks', 'dinner'].map((meal) => (
                                    <div key={meal} className="space-y-2">
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">{meal}</label>
                                        <textarea
                                            className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-4 text-white focus:ring-2 focus:ring-[rgb(var(--accent-color))] focus:border-transparent transition-all min-h-[100px] text-sm resize-none"
                                            value={editForm[meal]}
                                            onChange={e => setEditForm({ ...editForm, [meal]: e.target.value })}
                                            placeholder={`Enter ${meal} items...`}
                                        />
                                    </div>
                                ))}
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-xs font-black text-pink-500/80 uppercase tracking-widest pl-1 flex items-center gap-2"><Sparkles className="w-3 h-3" /> Specials</label>
                                    <input
                                        type="text"
                                        className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-4 text-white focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                                        value={editForm.specials}
                                        onChange={e => setEditForm({ ...editForm, specials: e.target.value })}
                                        placeholder="e.g. Chicken Biryani"
                                    />
                                </div>
                            </div>
                            <button type="submit" className="w-full bg-[rgb(var(--accent-color))] hover:opacity-90 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all flex items-center justify-center gap-2 mt-4">
                                <Save className="w-5 h-5" /> Save Changes
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-6 pb-6 border-b border-white/10">
                <div>
                    <h2 className="text-4xl md:text-5xl font-black flex items-center gap-4 text-transparent bg-clip-text bg-gradient-to-r from-[rgb(var(--accent-color))] to-purple-400">
                        Mess Menu
                    </h2>
                    <p className="text-slate-400 mt-2 text-lg font-medium max-w-lg">
                        Fresh, nutritious meals served daily. Check out what's on the plate today!
                    </p>
                </div>

                {timeToNextMeal && (
                    <div className="bg-slate-900/50 backdrop-blur-md border border-white/10 px-5 py-3 rounded-2xl flex items-center gap-3 shadow-lg animate-fade-in">
                        <div className="p-2 rounded-lg bg-[rgb(var(--accent-color))]/10 text-[rgb(var(--accent-color))]">
                            <Timer className="w-5 h-5 animate-pulse" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Next Meal In</p>
                            <p className="text-lg font-bold text-white font-mono leading-none mt-0.5">{timeToNextMeal}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Day Navigation */}
            <div className="bg-slate-950/30 backdrop-blur-xl p-2 rounded-2xl border border-white/5 flex justify-between items-center sticky top-24 z-30 shadow-2xl">
                <button
                    onClick={prevDay}
                    className="p-4 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white transition-all active:scale-95"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>

                <div className="text-center group cursor-pointer" onClick={() => isAdmin && handleEditClick()}>
                    <h3 className="text-3xl font-black text-white group-hover:scale-105 transition-transform duration-300">
                        {days[activeDay]}
                    </h3>
                    <div className="flex items-center justify-center gap-2 mt-1 opacity-50 text-sm font-medium tracking-wide text-slate-300">
                        <span className="uppercase">Week {Math.ceil(new Date().getDate() / 7)}</span>
                        {isAdmin && <span className="text-[rgb(var(--accent-color))] flex items-center gap-1 bg-[rgb(var(--accent-color))]/10 px-2 rounded hover:bg-[rgb(var(--accent-color))]/20 transition"><Edit2 className="w-3 h-3" /> Edit</span>}
                    </div>
                </div>

                <button
                    onClick={nextDay}
                    className="p-4 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white transition-all active:scale-95"
                >
                    <ChevronRight className="w-6 h-6" />
                </button>
            </div>

            {/* Specials Banner */}
            {currentMenu.specials && (
                <div className="relative overflow-hidden rounded-3xl p-[1px] bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 animate-slide-up shadow-2xl">
                    <div className="absolute inset-0 bg-white/10 animate-pulse"></div>
                    <div className="relative bg-slate-900 rounded-[23px] p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden">

                        {/* Background Decoration */}
                        <div className="absolute -right-10 -top-10 w-40 h-40 bg-pink-500/20 blur-[100px] rounded-full pointing-events-none"></div>

                        <div className="flex items-center gap-6 z-10">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-lg shadow-pink-500/30 rotate-3">
                                <Sparkles className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-white mb-1">Today's Special</h3>
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded bg-pink-500/10 border border-pink-500/20 text-pink-400 text-[10px] font-bold uppercase tracking-wider">Limited Time</span>
                                    <span className="text-slate-400 text-sm">Served during Lunch/Dinner</span>
                                </div>
                            </div>
                        </div>

                        <div className="text-center md:text-right z-10">
                            <p className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-pink-200 drop-shadow-sm">
                                {currentMenu.specials}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Timeline Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-slide-up [animation-delay:100ms]">
                <MealCard
                    title="Breakfast"
                    icon={<Sun className="w-6 h-6" />}
                    color="orange"
                    time="7:00 AM - 9:00 AM"
                    data={currentMenu.breakfast}
                    isActive={activeMeal === 'breakfast'}
                />

                <MealCard
                    title="Lunch"
                    icon={<Sun className="w-6 h-6" />}
                    color="yellow"
                    time="12:00 PM - 2:00 PM"
                    data={currentMenu.lunch}
                    isActive={activeMeal === 'lunch'}
                />

                <MealCard
                    title="Snacks"
                    icon={<Coffee className="w-6 h-6" />}
                    color="rose"
                    time="4:30 PM - 5:30 PM"
                    data={currentMenu.snacks}
                    isActive={activeMeal === 'snacks'}
                />

                <MealCard
                    title="Dinner"
                    icon={<Moon className="w-6 h-6" />}
                    color="indigo"
                    time="7:30 PM - 9:00 PM"
                    data={currentMenu.dinner}
                    isActive={activeMeal === 'dinner'}
                />
            </div>

            <div className="text-center pt-8 opacity-40">
                <p className="text-xs font-mono uppercase tracking-widest text-slate-500">
                    Menu subject to change based on availability • SRM University
                </p>
            </div>
        </div>
    );
};

export default MessTab;
