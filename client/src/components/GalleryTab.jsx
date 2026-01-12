import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, BookOpen, Layers, Monitor, Beaker, User, Clock, X, Trash2 } from 'lucide-react';
import Tilt from 'react-parallax-tilt';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const GalleryTab = ({ externalDate, isAdmin }) => {
    // Single Unified View
    const [schedule, setSchedule] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeGroup, setActiveGroup] = useState(null); // 'GROUP_1' or 'GROUP_2'

    const [viewMode, setViewMode] = useState('daily'); // 'weekly' | 'daily'
    const [selectedDate, setSelectedDate] = useState(() => {
        const d = new Date();
        const offset = d.getTimezoneOffset() * 60000;
        return new Date(d.getTime() - offset).toISOString().split('T')[0];
    });
    const [dayOrderInfo, setDayOrderInfo] = useState(null);

    // Watch for external date changes (from Calendar navigation)
    useEffect(() => {
        if (externalDate) {
            setSelectedDate(externalDate);
            setViewMode('daily'); // Ensure we switch to daily view
        }
    }, [externalDate]);

    // Fetch initial data (auto-detect)
    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (viewMode === 'daily') {
            fetchDayOrder(selectedDate);
        }
    }, [viewMode, selectedDate]);

    const fetchData = async (groupOverride = null) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            // If overriding (switching tabs), append ?batch=GROUP_1 etc.
            const url = groupOverride
                ? `${API_URL}/api/timetable?batch=${groupOverride}`
                : `${API_URL}/api/timetable`;

            const [schedRes, subjRes] = await Promise.all([
                axios.get(url, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${API_URL}/api/timetable/subjects`, { headers: { Authorization: `Bearer ${token}` } })
            ]);

            const schedData = schedRes.data.schedule || schedRes.data;
            const detected = schedRes.data.detectedGroup || (schedRes.data.meta && schedRes.data.meta.activeBatch) || 'GROUP_2';

            setSchedule(schedData);
            setSubjects(subjRes.data);
            if (!activeGroup || groupOverride) {
                setActiveGroup(groupOverride || detected);
            }
            setLoading(false);
        } catch (error) {
            console.error("Gallery fetch error", error);
            setLoading(false);
        }
    };

    const fetchDayOrder = async (date) => {
        try {
            // Fetch calendar to find day order (client side filter for now or new API)
            // For efficiency, we really should have an API endpoint, but we can reuse the list for now
            const res = await axios.get(`${API_URL}/api/calendar`);
            const event = res.data.find(e => e.date === date);
            if (event) {
                setDayOrderInfo(event);
            } else {
                setDayOrderInfo(null);
            }
        } catch (e) { console.error("Day Order Error", e); }
    };

    const handleSwitchBatch = (group) => {
        setActiveGroup(group);
        fetchData(group);
    };

    // Organize by Day
    const days = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5'];
    const periods = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    const TIME_SLOTS = [
        '08:00 - 08:50', '08:50 - 09:40', '09:45 - 10:35', '10:40 - 11:30',
        '11:35 - 12:25', '12:30 - 01:20', '01:25 - 02:15', '02:20 - 03:10',
        '03:10 - 04:00', '04:00 - 04:50'
    ];

    const getSlot = (day, period) => {
        return schedule.find(s => s.day === day && s.period == period);
    };

    const getSlotColor = (type) => {
        if (type === 'Lab') return 'bg-emerald-500/20 border-emerald-500/50 text-emerald-100';
        if (type === 'Online') return 'bg-purple-500/20 border-purple-500/50 text-purple-100';
        return 'bg-blue-500/10 border-blue-500/30 text-blue-100';
    };

    const [editModal, setEditModal] = useState(null); // { id, subject, staff, type, batch, day, period }

    const handleEditClick = (day, period, slot) => {
        if (!isAdmin) return;
        if (slot) {
            setEditModal(slot);
        } else {
            // New Entry Template
            setEditModal({
                batch: activeGroup || 'GROUP_1', // Default to Group 1 if null, though it should be set
                day,
                period,
                subject: '',
                code: '',
                staff: '',
                type: 'Theory'
            });
        }
    };

    const handleSaveEdit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            // Ensure batch is set if it was missing from existing slot (though existing slot doesn't need it for update)
            const payload = { ...editModal };
            if (!payload.batch && activeGroup) payload.batch = activeGroup;

            await axios.put(`${API_URL}/api/timetable`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setEditModal(null);
            fetchData(activeGroup); // Refresh
        } catch (error) {
            console.error("Update failed", error);
            alert("Failed to update timetable entry");
        }
    };

    // Matrix View Helper
    const renderMatrix = () => {
        return (
            <div className="overflow-x-auto pb-4">
                <table className="w-full border-collapse">
                    <thead>
                        <tr>
                            <th className="p-4 text-left text-slate-400 font-bold border-b border-white/10 sticky left-0 bg-slate-900 z-10 w-28">Time</th>
                            {days.map(d => (
                                <th key={d} className="p-4 text-center text-slate-300 font-bold border-b border-white/10 min-w-[140px]">{d}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {periods.map(p => (
                            <tr key={p} className="group hover:bg-white/5 transition">
                                <th className="p-4 text-left border-b border-white/5 sticky left-0 bg-slate-900 z-10 align-middle">
                                    <div className="text-xs text-slate-500 font-bold">Period {p}</div>
                                    <div className="text-[10px] text-slate-600 font-mono mt-1">{TIME_SLOTS[p - 1]}</div>
                                </th>
                                {days.map(d => {
                                    const slot = getSlot(d, p);
                                    return (
                                        <td key={`${d}-${p}`} className="p-2 border-b border-white/5 relative">
                                            <div
                                                onClick={() => handleEditClick(d, p, slot)}
                                                className={`h-24 rounded-xl p-2 flex flex-col justify-center items-center text-center transition-all ${slot ? getSlotColor(slot.type) : 'bg-slate-800/30'} ${isAdmin ? 'cursor-pointer hover:ring-2 ring-indigo-500 hover:bg-slate-800' : ''}`}
                                            >
                                                {slot ? (
                                                    <>
                                                        <div className="text-[10px] font-mono text-slate-300 opacity-60 mb-1">{slot.code !== 'TBD' ? slot.code : ''}</div>
                                                        <div className="font-bold text-xs line-clamp-2">{slot.subject}</div>
                                                        <div className="text-[10px] opacity-70 mt-1">{slot.staff}</div>
                                                        {isAdmin && <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100"><Layers size={10} /></div>}
                                                    </>
                                                ) : <span className="opacity-10">-</span>}
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="space-y-8 animate-fade-in pb-20">
            {/* HER0 / INTRO */}
            <div className="text-center space-y-4">
                <h1 className="text-4xl md:text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
                    My Timetable
                </h1>
                <p className="text-slate-400 max-w-2xl mx-auto">
                    View your daily schedule and day orders.
                </p>
            </div>
            {/* Header Controls */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-900/50 p-4 rounded-2xl border border-white/5 backdrop-blur-xl">
                <div className="flex items-center gap-4">
                    <span className="text-slate-400 font-bold text-sm uppercase tracking-wider">Date:</span>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => { setSelectedDate(e.target.value); setViewMode('daily'); }}
                        className="bg-slate-900 border border-slate-700 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
                    />
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => setViewMode('daily')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'daily' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                    >
                        Daily View
                    </button>
                    <button
                        onClick={() => setViewMode('matrix')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'matrix' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                    >
                        Full Timetable
                    </button>
                </div>

                <div className="flex bg-slate-800 rounded-lg p-1">
                    <button
                        onClick={() => handleSwitchBatch('GROUP_1')}
                        className={`px-4 py-2 rounded-md text-xs font-bold uppercase transition-all ${activeGroup === 'GROUP_1' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        Group 1 {activeGroup === 'GROUP_1' && <span className="ml-1 opacity-50 text-[10px]">(869-906)</span>}
                    </button>
                    <button
                        onClick={() => handleSwitchBatch('GROUP_2')}
                        className={`px-4 py-2 rounded-md text-xs font-bold uppercase transition-all ${activeGroup === 'GROUP_2' ? 'bg-pink-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        Group 2 {activeGroup === 'GROUP_2' && <span className="ml-1 opacity-50 text-[10px]">(907-940)</span>}
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div></div>
            ) : (
                <>
                    {viewMode === 'matrix' ? (
                        <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
                            <h2 className="text-2xl font-bold text-white mb-6 pl-2 border-l-4 border-purple-500">Master Schedule</h2>
                            {renderMatrix()}
                        </div>
                    ) : (
                        /* MASTER DAILY VIEW */
                        <div className="relative group perspective-1000">
                            {/* Decorative background glow */}
                            <div className={`absolute -inset-4 bg-gradient-to-r ${activeGroup === 'GROUP_1' ? 'from-blue-600/20 to-purple-600/20' : 'from-pink-600/20 to-orange-600/20'} rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition duration-1000`}></div>

                            <div className="relative bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl transform transition-transform duration-500 hover:scale-[1.01] print:transform-none print:shadow-none print:border-none print:bg-white print:text-black">
                                {/* Same Daily View Content as Before */}
                                <div className="p-4 border-b border-white/10 flex justify-between items-center print:border-slate-300">
                                    <h2 className="text-xl font-bold text-white flex items-center gap-3 print:text-black">
                                        <Calendar className="w-5 h-5 text-yellow-400 print:text-black" />
                                        {`Schedule for ${new Date(selectedDate).toDateString()}`}
                                        <span className="text-sm font-normal text-slate-400 bg-slate-800 px-2 py-1 rounded ml-2 print:bg-transparent print:text-slate-600 print:border print:border-slate-300">
                                            {activeGroup === 'GROUP_1' ? 'Group 1' : 'Group 2'}
                                        </span>
                                    </h2>

                                    {dayOrderInfo && (
                                        <div className="px-3 py-1 bg-indigo-500/20 border border-indigo-500/50 rounded-lg text-indigo-300 text-sm font-bold flex items-center gap-2">
                                            {dayOrderInfo.type === 'holiday' ? '🏖️ Holiday' : dayOrderInfo.day_order ? `📅 Day Order ${dayOrderInfo.day_order}` : '📝 No Day Order'}
                                        </div>
                                    )}

                                    <div className="flex gap-4 items-center">
                                        <button onClick={() => window.print()} className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition print:hidden" title="Print View">
                                            <Monitor className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="overflow-x-auto p-4">
                                    {dayOrderInfo ? (
                                        dayOrderInfo.type === 'holiday' ? (
                                            <div className="py-12 text-center">
                                                <div className="text-4xl mb-4">🏖️</div>
                                                <div className="text-2xl text-slate-300 font-bold mb-2">It's a Holiday!</div>
                                                <div className="text-xl text-slate-400">{dayOrderInfo.description}</div>
                                            </div>
                                        ) : dayOrderInfo.day_order ? (
                                            <div className="space-y-8 animate-slide-up">
                                                <div className="text-center">
                                                    <div className="inline-block px-6 py-2 bg-indigo-600 rounded-full text-white font-bold shadow-lg shadow-indigo-500/20">
                                                        Displaying Schedule for Day {dayOrderInfo.day_order}
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                                                    {periods.map(p => {
                                                        const slot = getSlot(`Day ${dayOrderInfo.day_order}`, p);
                                                        return (
                                                            <div key={p} className="relative group">
                                                                <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-600 to-purple-600 rounded-xl opacity-0 group-hover:opacity-75 transition duration-500 blur"></div>
                                                                <div
                                                                    onClick={() => handleEditClick(`Day ${dayOrderInfo.day_order}`, p, slot)}
                                                                    className={`relative h-24 rounded-xl p-3 border flex flex-col justify-center items-center text-center transition-all ${getSlotColor(slot?.type)} ${slot ? 'bg-slate-800' : 'bg-slate-900/50 border-slate-800'} ${isAdmin ? 'cursor-pointer hover:ring-2 ring-pink-500 hover:bg-slate-800 z-10' : ''}`}
                                                                >
                                                                    <div className="absolute top-2 left-2 text-[10px] font-bold opacity-50 uppercase tracking-widest">Period {p}</div>
                                                                    <div className="absolute top-2 right-2 text-[9px] font-mono opacity-40">{TIME_SLOTS[p - 1]}</div>
                                                                    {slot ? (
                                                                        <>
                                                                            <div className="font-bold text-sm text-white line-clamp-2">{slot.subject}</div>
                                                                            <div className="text-xs text-slate-400 mt-1">{slot.teacher}</div>
                                                                        </>
                                                                    ) : <span className="text-slate-700 text-xl font-black opacity-20">-</span>}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="py-12 text-center text-xl text-slate-400">No specific Day Order for this date.</div>
                                        )
                                    ) : <div className="py-12 text-center text-xl text-slate-500">Select a date.</div>}
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* EDIT MODAL */}
            {editModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl relative">
                        <button onClick={() => setEditModal(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X size={20} /></button>
                        <h2 className="text-xl font-bold text-white mb-6">Edit Period</h2>
                        <form onSubmit={handleSaveEdit} className="space-y-4">
                            <div>
                                <label className="text-xs text-slate-400 uppercase">Subject Code</label>
                                <input className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2 text-white font-mono" value={editModal.code || ''} onChange={e => setEditModal({ ...editModal, code: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 uppercase">Subject</label>
                                <input className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2 text-white" value={editModal.subject || ''} onChange={e => setEditModal({ ...editModal, subject: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 uppercase">Staff</label>
                                <input className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2 text-white" value={editModal.staff || ''} onChange={e => setEditModal({ ...editModal, staff: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 uppercase">Type</label>
                                <select className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2 text-white" value={editModal.type || 'Theory'} onChange={e => setEditModal({ ...editModal, type: e.target.value })}>
                                    <option value="Theory">Theory</option>
                                    <option value="Lab">Lab</option>
                                    <option value="Online">Online</option>
                                </select>
                            </div>
                            <div className="flex gap-2">
                                <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-lg transition-colors">Save</button>
                                {editModal.id && (
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            if (!confirm("Delete this entry?")) return;
                                            try {
                                                const token = localStorage.getItem('token');
                                                await axios.delete(`${API_URL}/api/timetable/${editModal.id}`, { headers: { Authorization: `Bearer ${token}` } });
                                                setEditModal(null);
                                                fetchData(activeGroup);
                                            } catch (e) { alert("Delete failed"); }
                                        }}
                                        className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GalleryTab;
