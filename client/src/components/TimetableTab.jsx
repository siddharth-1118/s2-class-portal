import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Clock, Calendar, User } from 'lucide-react';

const TimetableTab = ({ user }) => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const [schedule, setSchedule] = useState([]);
    const [meta, setMeta] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTimetable();
    }, []);

    const fetchTimetable = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/api/timetable`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Handle both legacy array and new object format
            if (Array.isArray(res.data)) {
                setSchedule(res.data);
            } else {
                setSchedule(res.data.schedule);
                setMeta(res.data.meta);
            }
            setLoading(false);
        } catch (error) {
            console.error("Failed to fetch timetable", error);
            setLoading(false);
        }
    };

    // Helper to organize by day
    const organizeByDay = () => {
        const days = {};
        schedule.forEach(entry => {
            if (!days[entry.day]) days[entry.day] = [];
            days[entry.day].push(entry);
        });
        return days;
    };

    const daysData = organizeByDay();
    const sortedDays = Object.keys(daysData).sort(); // Day 1, Day 2...

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Clock className="w-6 h-6 text-blue-400" />
                        My Time Table
                    </h2>
                    {meta && (
                        <div className="text-sm text-slate-400 mt-1 flex items-center gap-3">
                            <span className="bg-slate-800 px-2 py-1 rounded border border-slate-700">
                                Reg: <span className="text-white font-mono">{meta.regNo}</span>
                            </span>
                            <span className="bg-blue-900/30 text-blue-200 px-2 py-1 rounded border border-blue-500/30">
                                {meta.batch}
                            </span>
                        </div>
                    )}
                </div>
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
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {daysData[day].sort((a, b) => parseInt(a.period) - parseInt(b.period)).map((slot, idx) => (
                                            <tr key={idx} className="hover:bg-white/5 transition-colors">
                                                <td className="p-3 text-slate-400 font-mono text-sm">{slot.period}</td>
                                                <td className="p-3 text-slate-500 text-xs whitespace-nowrap">{slot.time_range}</td>
                                                <td className="p-3">
                                                    <div className={`font-bold ${slot.type === 'Lab' ? 'text-green-400' : 'text-blue-200'}`}>
                                                        {slot.subject}
                                                    </div>
                                                    {slot.type === 'Lab' && <span className="text-[10px] bg-green-900/30 text-green-300 px-1 rounded border border-green-500/30">LAB</span>}
                                                </td>
                                                <td className="p-3 text-slate-400 text-sm flex items-center gap-1">
                                                    {slot.teacher && <User size={12} />}
                                                    {slot.teacher || 'TBD'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TimetableTab;
