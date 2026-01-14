import React, { useState, useEffect } from 'react';
import { Trash2, Edit2, Plus, Calendar as CalendarIcon, Save, X, Coffee, FileText, CheckCircle, Clock } from 'lucide-react';
import axios from 'axios';

const CalendarTab = ({ user, onDateSelect }) => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(null);
    const [showAddForm, setShowAddForm] = useState(false);

    const [newEvent, setNewEvent] = useState({ date: '', day: '', description: '', type: 'regular' });
    const [editForm, setEditForm] = useState({ date: '', day: '', description: '', type: 'regular' });

    const isAdmin = user?.role === 'admin';

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        try {
            const res = await axios.get(`${API_URL}/api/calendar`);
            // Sort events by date
            const sorted = res.data.sort((a, b) => new Date(a.date) - new Date(b.date));
            setEvents(sorted);
            setLoading(false);
        } catch (error) {
            console.error("Failed to fetch calendar", error);
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this event?')) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_URL}/api/calendar/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchEvents();
        } catch (error) {
            alert('Failed to delete event');
        }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const dayName = new Date(newEvent.date).toLocaleDateString('en-US', { weekday: 'short' });
            await axios.post(`${API_URL}/api/calendar`, { ...newEvent, day: newEvent.day || dayName }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNewEvent({ date: '', day: '', description: '', type: 'regular' });
            setShowAddForm(false);
            fetchEvents();
        } catch (error) {
            alert('Failed to add event');
        }
    };

    const startEdit = (event) => {
        setIsEditing(event.id);
        setEditForm(event);
    };

    const handleEditSave = async (id) => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(`${API_URL}/api/calendar/${id}`, editForm, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setIsEditing(null);
            fetchEvents();
        } catch (error) {
            alert('Failed to update event');
        }
    };

    const getEventIcon = (type) => {
        switch (type) {
            case 'holiday': return <Coffee className="w-5 h-5 text-orange-400" />;
            case 'exam': return <FileText className="w-5 h-5 text-yellow-400" />;
            default: return <Clock className="w-5 h-5 text-blue-400" />;
        }
    };

    const getGradient = (type) => {
        switch (type) {
            case 'holiday': return 'from-orange-500/20 to-red-500/20 border-orange-500/50';
            case 'exam': return 'from-yellow-500/20 to-amber-500/20 border-yellow-500/50';
            default: return 'from-blue-500/20 to-indigo-500/20 border-blue-500/50';
        }
    };

    // Group events by Month
    const groupedEvents = events.reduce((acc, event) => {
        const date = new Date(event.date);
        const monthYear = date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
        if (!acc[monthYear]) acc[monthYear] = [];
        acc[monthYear].push(event);
        return acc;
    }, {});

    // Helper: Calculate Day Order (1-5) based on Anchor
    // Anchor: Jan 13, 2026 (Tuesday) = Day 4
    const determineDayOrder = (dateString, type) => {
        if (type === 'holiday') return null;

        const date = new Date(dateString);
        const anchorDate = new Date('2026-01-13T00:00:00'); // Day 4

        // Reset hours
        date.setHours(0, 0, 0, 0);
        anchorDate.setHours(0, 0, 0, 0);

        // Count weekdays
        let currentDate = new Date(anchorDate);
        let daysDiff = 0;
        const isFuture = date >= anchorDate;

        while (currentDate.getTime() !== date.getTime()) {
            if (isFuture) {
                currentDate.setDate(currentDate.getDate() + 1);
                const day = currentDate.getDay();
                if (day !== 0 && day !== 6) daysDiff++;
            } else {
                const day = currentDate.getDay();
                if (day !== 0 && day !== 6) daysDiff--;
                currentDate.setDate(currentDate.getDate() - 1);
            }
        }

        let calculated = (4 + daysDiff) % 5;
        if (calculated <= 0) calculated += 5;

        return calculated;
    };

    // Refs for scrolling
    const todayRef = React.useRef(null);

    useEffect(() => {
        // Scroll to today after a short delay to ensure rendering
        if (!loading && events.length > 0) {
            setTimeout(() => {
                todayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 500);
        }
    }, [loading, events]);

    return (
        <div className="space-y-8 animate-fade-in pb-20">
            {/* Header */}
            <div className="flex justify-between items-center sticky top-0 bg-slate-900/90 backdrop-blur z-20 p-4 border-b border-white/10 -mx-4 md:mx-0 md:rounded-xl md:top-4">
                <h2 className="text-3xl font-extrabold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent flex items-center gap-3">
                    <CalendarIcon className="w-8 h-8 text-purple-400" />
                    Timeline
                </h2>
                {isAdmin && (
                    <button
                        onClick={() => setShowAddForm(!showAddForm)}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-all shadow-lg hover:shadow-indigo-500/25"
                    >
                        {showAddForm ? <X size={20} /> : <Plus size={20} />}
                        <span className="hidden md:inline">{showAddForm ? 'Cancel' : 'Add Event'}</span>
                    </button>
                )}
            </div>

            {/* ADD FORM */}
            {showAddForm && isAdmin && (
                <div className="bg-slate-800/80 backdrop-blur p-6 rounded-2xl border border-slate-700 shadow-2xl animate-slide-up">
                    <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="col-span-1 md:col-span-1">
                            <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Date</label>
                            <input
                                type="date"
                                value={newEvent.date}
                                onChange={e => setNewEvent({ ...newEvent, date: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                required
                            />
                        </div>
                        <div className="col-span-1 md:col-span-2">
                            <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Description</label>
                            <input
                                type="text"
                                placeholder="Event details..."
                                value={newEvent.description}
                                onChange={e => setNewEvent({ ...newEvent, description: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                required
                            />
                        </div>
                        <div className="col-span-1 md:col-span-1">
                            <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Type</label>
                            <select
                                value={newEvent.type}
                                onChange={e => setNewEvent({ ...newEvent, type: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value="regular">Regular</option>
                                <option value="holiday">Holiday</option>
                                <option value="exam">Exam</option>
                            </select>
                        </div>
                        <button type="submit" className="col-span-1 md:col-span-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white py-3 rounded-xl font-bold transition-all shadow-lg transform hover:scale-[1.01]">
                            Save to Calendar
                        </button>
                    </form>
                </div>
            )}

            {/* TIMELINE VIEW */}
            <div className="relative space-y-16 pl-4 md:pl-8 before:absolute before:inset-0 before:ml-4 md:before:ml-8 before:-translate-x-px md:before:w-0.5 before:bg-gradient-to-b from-transparent via-slate-700 to-transparent">
                {loading ? (
                    <div className="text-center text-slate-400 py-10">Loading timeline...</div>
                ) : Object.keys(groupedEvents).length === 0 ? (
                    <div className="text-center text-slate-500 py-10">No upcoming events found.</div>
                ) : (
                    Object.entries(groupedEvents).map(([month, monthEvents]) => (
                        <div key={month} className="relative">
                            {/* Month Marker */}
                            <div className="sticky top-20 z-10 mb-6">
                                <span className="relative inline-block bg-slate-900 border border-indigo-500/30 text-indigo-400 px-4 py-1 rounded-full text-sm font-bold shadow-xl">
                                    {month}
                                </span>
                            </div>

                            <div className="space-y-6">
                                {monthEvents.map((event) => {
                                    const calculatedDayOrder = determineDayOrder(event.date, event.type);

                                    // Check if Today
                                    const today = new Date();
                                    const eventDate = new Date(event.date);
                                    const isToday = eventDate.getDate() === today.getDate() &&
                                        eventDate.getMonth() === today.getMonth() &&
                                        eventDate.getFullYear() === today.getFullYear();

                                    return (
                                        <div
                                            key={event.id}
                                            ref={isToday ? todayRef : null}
                                            className="relative pl-8 md:pl-12 group"
                                        >
                                            {/* Dot on Timeline */}
                                            <div className={`absolute left-0 top-6 w-3 h-3 rounded-full border-2 border-slate-900 shadow-[0_0_0_4px_rgba(30,41,59,1)] z-10 transition-colors ${isToday ? 'bg-green-400 animate-pulse shadow-[0_0_15px_rgba(74,222,128,0.5)]' :
                                                event.type === 'holiday' ? 'bg-orange-400' : event.type === 'exam' ? 'bg-yellow-400' : 'bg-blue-400'
                                                } -translate-x-[5px] md:-translate-x-[5px]`}></div>

                                            {/* Card */}
                                            <div
                                                onClick={() => onDateSelect && onDateSelect(event.date)}
                                                className={`
                                                    ${isToday ? 'bg-gradient-to-r from-emerald-900/40 to-teal-900/40 border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.15)] scale-[1.03] ring-1 ring-emerald-500/30' : `bg-gradient-to-br ${getGradient(event.type)}`}
                                                    backdrop-blur-xl border p-5 rounded-2xl shadow-lg transition-transform hover:scale-[1.02] flex flex-col md:flex-row gap-4 items-start md:items-center justify-between cursor-pointer hover:shadow-xl
                                                `}>

                                                {isToday && (
                                                    <div className="absolute -top-3 left-6 px-3 py-1 bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-full shadow-lg z-20">
                                                        Today
                                                    </div>
                                                )}

                                                {isEditing === event.id ? (
                                                    <div className="w-full grid gap-4 p-2">
                                                        <input type="date" value={editForm.date} onChange={e => setEditForm({ ...editForm, date: e.target.value })} className="bg-slate-900/50 border border-white/10 rounded p-2 text-white" />
                                                        <input type="text" value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} className="bg-slate-900/50 border border-white/10 rounded p-2 text-white" />
                                                        <div className="flex justify-end gap-2">
                                                            <button onClick={() => handleEditSave(event.id)} className="px-3 py-1 bg-green-600 rounded text-sm">Save</button>
                                                            <button onClick={() => setIsEditing(null)} className="px-3 py-1 bg-slate-600 rounded text-sm">Cancel</button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-slate-900/50 border border-white/5`}>
                                                                <div className="text-center">
                                                                    <div className="text-xs font-bold text-slate-400 uppercase">{new Date(event.date).toLocaleDateString('en-US', { weekday: 'short' })}</div>
                                                                    <div className="text-lg font-black text-white leading-none">{new Date(event.date).getDate()}</div>
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <h3 className="text-lg font-bold text-white leading-tight">{event.description}</h3>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border border-white/10 ${event.type === 'holiday' ? 'bg-orange-500/20 text-orange-200' : 'bg-slate-800 text-slate-400'}`}>{event.type}</span>
                                                                    {calculatedDayOrder && (
                                                                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border flex items-center gap-1 ${isToday ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300' : 'bg-blue-500/20 border-blue-500/30 text-blue-200'}`}>
                                                                            <Clock size={10} /> Day Order {calculatedDayOrder}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        {isAdmin && (
                                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity self-end md:self-center">
                                                                <button onClick={() => startEdit(event)} className="p-2 hover:bg-slate-800 rounded-lg text-blue-300"><Edit2 size={16} /></button>
                                                                <button onClick={() => handleDelete(event.id)} className="p-2 hover:bg-slate-800 rounded-lg text-red-300"><Trash2 size={16} /></button>
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default React.memo(CalendarTab);
