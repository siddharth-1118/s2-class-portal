import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Clock, Calendar, User, Edit2, Save, X, ChevronRight, ChevronLeft, RefreshCcw } from 'lucide-react';

const TimetableTab = ({ user, initialDay }) => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005';
    const [schedule, setSchedule] = useState([]);
    const [meta, setMeta] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [adminBatch, setAdminBatch] = useState('GROUP_2'); // Default: Batch 2 Only
    const [activeDay, setActiveDay] = useState('Day 1');

    // Day Colors
    const dayColors = {
        'Day 1': 'from-blue-500 to-indigo-600',
        'Day 2': 'from-purple-500 to-pink-600',
        'Day 3': 'from-emerald-500 to-teal-600',
        'Day 4': 'from-orange-500 to-red-600',
        'Day 5': 'from-cyan-500 to-blue-600'
    };

    // Edit State
    const [editingSlot, setEditingSlot] = useState(null);
    const [editForm, setEditForm] = useState({ subject: '', staff: '', type: 'Theory' });

    const isAdmin = user?.role === 'admin';

    useEffect(() => {
        fetchTimetable();
    }, [adminBatch]);

    // ... (useEffect for initialDay)

    // ... (calculateDayOrder)

    const fetchTimetable = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            // Fix: Send batch param for students too, allowing them to switch views
            const params = adminBatch ? { batch: adminBatch } : {};

            // Special handling for "Personal" request if explicit
            if (adminBatch === '' && !isAdmin) {
                // If empty, backend defaults to auto-detect or personal.
                // We can explicitly send 'PERSONAL' if we want to force it, but empty works for "Default behavior"
            }

            const res = await axios.get(`${API_URL}/api/timetable`, {
                headers: { Authorization: `Bearer ${token}` },
                params
            });

            if (res.data.schedule) {
                setSchedule(res.data.schedule);
                setMeta(res.data.meta);
            } else {
                setSchedule(res.data);
            }
            setLoading(false);
        } catch (error) {
            console.error("Failed to fetch timetable", error);
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/api/academia/auto-sync`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            await fetchTimetable();
            alert("Timetable refreshed successfully!");
        } catch (error) {
            console.error("Refresh failed", error);
            alert("Refresh failed. Ensure you have synced manually at least once.");
        } finally {
            setRefreshing(false);
        }
    };

    const handleEditClick = (slot) => {
        if (!isAdmin) return;
        setEditingSlot(slot);
        setEditForm({
            subject: slot.subject,
            staff: slot.teacher || slot.staff || '',
            type: slot.type || 'Theory'
        });
    };

    const handleSave = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(`${API_URL}/api/timetable`, {
                id: editingSlot.id,
                ...editForm
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setEditingSlot(null);
            fetchTimetable(); // Refresh
        } catch (error) {
            alert("Failed to update slot");
            console.error(error);
        }
    };

    // Helper to organize by day with normalization
    const organizeByDay = () => {
        const days = {};
        ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5'].forEach(d => days[d] = []);

        schedule.forEach(entry => {
            // Normalize Period (1.0 -> 1)
            let pStr = entry.period.toString();
            if (pStr.endsWith('.0')) pStr = pStr.replace('.0', '');

            // Normalize Time Range if missing
            let tRange = entry.time_range;
            if (!tRange || tRange.trim() === '') {
                tRange = defaultTimeRanges[pStr] || '';
            }

            const cleanEntry = {
                ...entry,
                period: pStr,
                time_range: tRange,
                // If subject is just "A" or similar short code and fetch failed, showing it is better than nothing, 
                // but we can make it look nicer.
                subject: entry.subject
            };

            if (!days[entry.day]) days[entry.day] = [];
            days[entry.day].push(cleanEntry);
        });
        return days;
    };

    // Default Time Slots for Empty/Default View (SRM Standard)
    const defaultTimeRanges = {
        1: '08:00 - 08:50',
        2: '08:50 - 09:40',
        3: '09:45 - 10:35',
        4: '10:40 - 11:30',
        5: '11:35 - 12:25',
        6: '12:30 - 01:20',
        7: '01:25 - 02:15',
        8: '02:20 - 03:10',
        9: '03:10 - 04:00',
        10: '04:00 - 04:50'
    };

    const getDefaultSchedule = (day) => {
        return Array.from({ length: 10 }, (_, i) => ({
            day: day,
            period: (i + 1).toString(),
            time_range: defaultTimeRanges[i + 1],
            subject: 'Free Slot',
            type: 'Theory',
            teacher: '-',
            room: '-',
            code: ''
        }));
    };

    const daysData = organizeByDay();
    const sortedDays = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5'];

    // Use fetched data if available, otherwise fallback to default structure
    const fetchedSchedule = daysData[activeDay]?.sort((a, b) => parseInt(a.period) - parseInt(b.period)) || [];
    const currentDaySchedule = fetchedSchedule.length > 0 ? fetchedSchedule : getDefaultSchedule(activeDay);

    return (
        <div className="space-y-6 animate-fade-in text-[var(--text-primary)]">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Clock className="w-6 h-6" style={{ color: 'rgb(var(--accent-color))' }} />
                        {isAdmin ? 'Manage Timetable' : 'Class Schedule'}
                        {!isAdmin && (
                            <button
                                onClick={handleRefresh}
                                disabled={refreshing}
                                className="ml-4 p-2 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition"
                                title="Refresh Timetable from Academia"
                            >
                                <RefreshCcw size={18} className={refreshing ? "animate-spin" : ""} />
                            </button>
                        )}
                    </h2>
                    {meta && (
                        <div className="text-sm opacity-60 mt-1 flex items-center gap-3">
                            {!isAdmin && (
                                <span className="bg-white/10 px-2 py-1 rounded">
                                    Reg: <span className="font-mono font-bold">{meta.regNo}</span>
                                </span>
                            )}
                            <span className="bg-white/10 px-2 py-1 rounded">
                                {meta.batch}
                            </span>
                        </div>
                    )}
                </div>

                <div className="flex bg-white/5 backdrop-blur-sm rounded-lg p-1 border border-white/10">
                    <div className="px-3 py-1.5 rounded-md text-xs font-bold bg-purple-600 text-white shadow cursor-default">
                        Batch 2
                    </div>
                </div>
            </div>

            {/* Day Selector Tabs */}
            <div className="flex overflow-x-auto pb-2 gap-2 custom-scrollbar md:justify-center">
                {sortedDays.map(day => (
                    <button
                        key={day}
                        onClick={() => setActiveDay(day)}
                        className={`px-6 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all duration-300 border ${activeDay === day
                            ? `bg-gradient-to-r ${dayColors[day]} text-white border-transparent shadow-lg scale-105`
                            : 'bg-white/5 text-[var(--text-primary)] border-white/10 hover:bg-white/10 hover:border-white/20'
                            }`}
                    >
                        {day}
                    </button>
                ))}
            </div>

            {/* Timetable Content */}
            {loading ? (
                <div className="p-20 text-center opacity-60 animate-pulse">Checking schedule...</div>
            ) : schedule.length === 0 ? (
                <div className="p-10 text-center opacity-60 bg-white/5 rounded-2xl border border-white/10">
                    No timetable data found.
                </div>
            ) : (
                <div className="animate-slide-up">
                    <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden shadow-xl">
                        <div className="bg-white/10 px-6 py-4 border-b border-white/10 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-[var(--text-primary)]">{activeDay}</h3>
                            <div className="text-xs opacity-50 uppercase tracking-widest font-bold">
                                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                            </div>
                        </div>

                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="text-xs opacity-60 uppercase tracking-wider border-b border-white/10 bg-white/5">
                                        <th className="p-4 w-20">Period</th>
                                        <th className="p-4 w-32">Time</th>
                                        <th className="p-4">Subject</th>
                                        <th className="p-4 w-48">Staff</th>
                                        {isAdmin && <th className="p-4 w-20">Edit</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {currentDaySchedule.length > 0 ? (
                                        currentDaySchedule.map((slot, idx) => (
                                            <tr key={idx} className={`transition-colors hover:bg-white/5 ${isAdmin ? 'cursor-pointer' : ''}`}>
                                                <td className="p-4 font-mono text-sm opacity-80 border-r border-white/5 text-center bg-white/5">{slot.period}</td>
                                                <td className="p-4 text-xs font-bold opacity-60 whitespace-nowrap">{slot.time_range}</td>
                                                <td className="p-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-mono opacity-50 mb-0.5">{slot.code}</span>
                                                        <div className={`font-bold text-lg mb-1 leading-tight ${slot.type === 'Lab' ? 'text-emerald-400' : 'text-[var(--text-primary)]'}`}>
                                                            {slot.subject}
                                                        </div>
                                                    </div>
                                                    {slot.type !== 'Theory' && (
                                                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${slot.type === 'Lab' ? 'bg-emerald-500/20 text-emerald-300' :
                                                            slot.type === 'Online' ? 'bg-amber-500/20 text-amber-300' : 'bg-white/20'
                                                            }`}>
                                                            {slot.type}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-4 opacity-80 text-sm">
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center gap-2">
                                                            {slot.teacher && <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px]"><User size={10} /></div>}
                                                            <span className="truncate max-w-[150px]">{slot.teacher || slot.staff || '-'}</span>
                                                        </div>
                                                        {slot.room && (
                                                            <div className="flex items-center gap-2 text-xs font-mono text-amber-400/80">
                                                                <span className="bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">Room: {slot.room}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                {isAdmin && (
                                                    <td className="p-4">
                                                        <button
                                                            onClick={() => handleEditClick(slot)}
                                                            className="text-white/60 hover:text-[rgb(var(--accent-color))] p-2 rounded-full hover:bg-white/10 transition"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="5" className="p-10 text-center opacity-50">No classes scheduled for {activeDay}.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile List View */}
                        <div className="md:hidden cursor-default">
                            {currentDaySchedule.length > 0 ? (
                                currentDaySchedule.map((slot, idx) => (
                                    <div
                                        key={idx}
                                        className={`p-4 border-b border-white/5 last:border-0 ${isAdmin ? 'cursor-pointer active:bg-white/5' : ''}`}
                                        onClick={() => isAdmin && handleEditClick(slot)}
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center gap-3">
                                                <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-white/5 border border-white/10">
                                                    <span className="text-[10px] uppercase opacity-50 font-bold">Per</span>
                                                    <span className="text-xl font-bold font-mono">{slot.period}</span>
                                                </div>
                                                <div>
                                                    {slot.code && <div className="text-[10px] font-mono opacity-50">{slot.code}</div>}
                                                    <div className={`font-bold text-lg leading-tight ${slot.type === 'Lab' ? 'text-emerald-400' : 'text-[var(--text-primary)]'}`}>
                                                        {slot.subject}
                                                    </div>
                                                    <div className="text-xs opacity-60 font-mono mt-1 font-bold">
                                                        {slot.time_range}
                                                    </div>
                                                </div>
                                            </div>
                                            {isAdmin && <Edit2 size={16} className="text-white/40" />}
                                        </div>

                                        <div className="flex items-center justify-between pl-[60px]"> {/* Indent to align with text */}
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2 text-sm opacity-70">
                                                    <User size={14} className="opacity-50" />
                                                    {slot.teacher || slot.staff || 'No Staff'}
                                                </div>
                                                {slot.room && (
                                                    <div className="flex items-center gap-2 text-xs font-mono text-amber-400/80">
                                                        <span className="bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">Room: {slot.room}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {slot.type !== 'Theory' && (
                                                <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${slot.type === 'Lab' ? 'bg-emerald-500/20 text-emerald-300' :
                                                    slot.type === 'Online' ? 'bg-amber-500/20 text-amber-300' : 'bg-white/20'
                                                    }`}>
                                                    {slot.type}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-10 text-center opacity-50">No classes scheduled for {activeDay}.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal Overlay */}
            {editingSlot && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white">Edit Slot</h3>
                            <button onClick={() => setEditingSlot(null)} className="text-slate-400 hover:text-white"><X /></button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Subject</label>
                                <input
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-blue-500 outline-none"
                                    value={editForm.subject}
                                    onChange={e => setEditForm({ ...editForm, subject: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Staff / Teacher</label>
                                <input
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-blue-500 outline-none"
                                    value={editForm.staff}
                                    onChange={e => setEditForm({ ...editForm, staff: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Type</label>
                                <select
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-blue-500 outline-none"
                                    value={editForm.type}
                                    onChange={e => setEditForm({ ...editForm, type: e.target.value })}
                                >
                                    <option value="Theory">Theory</option>
                                    <option value="Lab">Lab</option>
                                    <option value="Online">Online</option>
                                </select>
                            </div>
                        </div>

                        <div className="mt-6 flex gap-3">
                            <button onClick={() => setEditingSlot(null)} className="flex-1 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 font-bold transition">Cancel</button>
                            <button onClick={handleSave} className="flex-1 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 font-bold transition flex items-center justify-center gap-2">
                                <Save size={18} /> Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default React.memo(TimetableTab);
