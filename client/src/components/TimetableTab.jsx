import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Clock, Calendar, User, Edit2, Save, X } from 'lucide-react';

const TimetableTab = ({ user }) => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const [schedule, setSchedule] = useState([]);
    const [meta, setMeta] = useState(null);
    const [loading, setLoading] = useState(true);
    const [adminBatch, setAdminBatch] = useState('BATCH_1'); // Default for admin view

    // Edit State
    const [editingSlot, setEditingSlot] = useState(null);
    const [editForm, setEditForm] = useState({ subject: '', staff: '', type: 'Theory' });

    const isAdmin = user?.role === 'admin';

    useEffect(() => {
        fetchTimetable();
    }, [adminBatch]); // Refetch when admin changes batch

    const fetchTimetable = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const params = isAdmin ? { batch: adminBatch } : {};
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

    // Helper to organize by day
    const organizeByDay = () => {
        const days = {};
        // Initialize empty arrays for 5 days to ensure order
        ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5'].forEach(d => days[d] = []);

        schedule.forEach(entry => {
            if (!days[entry.day]) days[entry.day] = [];
            days[entry.day].push(entry);
        });
        return days;
    };

    const daysData = organizeByDay();
    const sortedDays = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5'];

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Clock className="w-6 h-6 text-blue-400" />
                        {isAdmin ? 'Manage Timetable' : 'My Time Table'}
                    </h2>
                    {meta && (
                        <div className="text-sm text-slate-400 mt-1 flex items-center gap-3">
                            {!isAdmin && (
                                <span className="bg-slate-800 px-2 py-1 rounded border border-slate-700">
                                    Reg: <span className="text-white font-mono">{meta.regNo}</span>
                                </span>
                            )}
                            <span className="bg-blue-900/30 text-blue-200 px-2 py-1 rounded border border-blue-500/30">
                                {meta.batch}
                            </span>
                        </div>
                    )}
                </div>

                {isAdmin && (
                    <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
                        <button
                            onClick={() => setAdminBatch('BATCH_1')}
                            className={`px-4 py-1.5 rounded-md text-sm font-bold transition ${adminBatch === 'BATCH_1' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                        >
                            Batch 1
                        </button>
                        <button
                            onClick={() => setAdminBatch('BATCH_2')}
                            className={`px-4 py-1.5 rounded-md text-sm font-bold transition ${adminBatch === 'BATCH_2' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                        >
                            Batch 2
                        </button>
                    </div>
                )}
            </div>

            {loading ? (
                <div className="p-10 text-center text-slate-400">Loading schedule...</div>
            ) : schedule.length === 0 ? (
                <div className="p-10 text-center text-slate-400 bg-slate-900/50 rounded-xl border border-white/5">
                    No timetable data found.
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {sortedDays.map(day => (
                        <div key={day} className="bg-slate-900/50 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden">
                            <div className="bg-slate-800/80 px-4 py-2 border-b border-white/10 font-bold text-slate-200">
                                {day}
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="text-xs text-slate-500 uppercase tracking-wider border-b border-white/5 bg-slate-800/30">
                                            <th className="p-3">Period</th>
                                            <th className="p-3">Time</th>
                                            <th className="p-3">Subject</th>
                                            <th className="p-3">Staff</th>
                                            {isAdmin && <th className="p-3">Action</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {daysData[day]?.sort((a, b) => parseInt(a.period) - parseInt(b.period)).map((slot, idx) => (
                                            <tr key={idx} className={`transition-colors ${isAdmin ? 'hover:bg-white/5 cursor-pointer' : ''}`}>
                                                <td className="p-3 text-slate-400 font-mono text-sm">{slot.period}</td>
                                                <td className="p-3 text-slate-500 text-xs whitespace-nowrap">{slot.time_range}</td>
                                                <td className="p-3">
                                                    <div className={`font-bold ${slot.type === 'Lab' ? 'text-green-400' : 'text-blue-200'}`}>
                                                        {slot.subject}
                                                    </div>
                                                    {slot.type === 'Lab' && <span className="text-[10px] bg-green-900/30 text-green-300 px-1 rounded border border-green-500/30">LAB</span>}
                                                </td>
                                                <td className="p-3 text-slate-400 text-sm flex items-center gap-1">
                                                    {slot.teacher || slot.staff ? <User size={12} /> : null}
                                                    {slot.teacher || slot.staff || 'TBD'}
                                                </td>
                                                {isAdmin && (
                                                    <td className="p-3">
                                                        <button
                                                            onClick={() => handleEditClick(slot)}
                                                            className="text-slate-500 hover:text-blue-400 p-1"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
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

export default TimetableTab;
