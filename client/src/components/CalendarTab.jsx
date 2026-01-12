import React, { useState, useEffect } from 'react';
import { Trash2, Edit2, Plus, Calendar as CalendarIcon, Save, X } from 'lucide-react';
import axios from 'axios';

const CalendarTab = ({ user }) => {
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
            setEvents(res.data);
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
            // Auto calculate day if possible
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

    const getRowColor = (type) => {
        switch (type) {
            case 'holiday': return 'bg-red-500/20 text-red-200 border-l-4 border-red-500';
            case 'exam': return 'bg-yellow-500/20 text-yellow-200 border-l-4 border-yellow-500';
            default: return 'bg-slate-800/50 border-l-4 border-slate-600';
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent flex items-center gap-2">
                    <CalendarIcon className="w-6 h-6 text-blue-400" />
                    Academic Calendar
                </h2>
                {isAdmin && (
                    <button
                        onClick={() => setShowAddForm(!showAddForm)}
                        className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-green-900/20"
                    >
                        {showAddForm ? <X size={18} /> : <Plus size={18} />}
                        {showAddForm ? 'Cancel' : 'Add Event'}
                    </button>
                )}
            </div>

            {/* ADD FORM */}
            {showAddForm && isAdmin && (
                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-xl mb-4">
                    <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <input
                            type="date"
                            value={newEvent.date}
                            onChange={e => setNewEvent({ ...newEvent, date: e.target.value })}
                            className="bg-slate-900 border border-slate-700 rounded p-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            required
                        />
                        <input
                            type="text"
                            placeholder="Day (e.g. Mon)"
                            value={newEvent.day}
                            onChange={e => setNewEvent({ ...newEvent, day: e.target.value })}
                            className="bg-slate-900 border border-slate-700 rounded p-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <input
                            type="text"
                            placeholder="Description"
                            value={newEvent.description}
                            onChange={e => setNewEvent({ ...newEvent, description: e.target.value })}
                            className="bg-slate-900 border border-slate-700 rounded p-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            required
                        />
                        <select
                            value={newEvent.type}
                            onChange={e => setNewEvent({ ...newEvent, type: e.target.value })}
                            className="bg-slate-900 border border-slate-700 rounded p-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="regular">Regular</option>
                            <option value="holiday">Holiday</option>
                            <option value="exam">Exam</option>
                        </select>
                        <button type="submit" className="col-span-1 md:col-span-4 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded font-bold transition-all">
                            Save Event
                        </button>
                    </form>
                </div>
            )}

            {/* CALENDAR LIST */}
            <div className="bg-slate-900/50 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="grid grid-cols-12 gap-2 p-4 bg-slate-800/80 font-bold text-slate-300 border-b border-white/10">
                    <div className="col-span-3">Date</div>
                    <div className="col-span-2">Day</div>
                    <div className={isAdmin ? "col-span-5" : "col-span-7"}>Description</div>
                    {isAdmin && <div className="col-span-2 text-right">Actions</div>}
                </div>

                {loading ? (
                    <div className="p-8 text-center text-slate-400">Loading calendar...</div>
                ) : events.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">No events scheduled.</div>
                ) : (
                    <div className="divide-y divide-white/5">
                        {events.map((event) => (
                            <div key={event.id} className={`grid grid-cols-12 gap-2 p-4 items-center transition-colors hover:bg-white/5 ${getRowColor(event.type)}`}>
                                {isEditing === event.id ? (
                                    // EDIT MODE
                                    <>
                                        <div className="col-span-3">
                                            <input
                                                type="date"
                                                value={editForm.date}
                                                onChange={e => setEditForm({ ...editForm, date: e.target.value })}
                                                className="w-full bg-slate-900 border border-slate-600 rounded p-1 text-sm text-white"
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <input
                                                type="text"
                                                value={editForm.day}
                                                onChange={e => setEditForm({ ...editForm, day: e.target.value })}
                                                className="w-full bg-slate-900 border border-slate-600 rounded p-1 text-sm text-white"
                                            />
                                        </div>
                                        <div className="col-span-5 flex gap-2">
                                            <input
                                                type="text"
                                                value={editForm.description}
                                                onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                                                className="w-full bg-slate-900 border border-slate-600 rounded p-1 text-sm text-white"
                                            />
                                            <select
                                                value={editForm.type}
                                                onChange={e => setEditForm({ ...editForm, type: e.target.value })}
                                                className="bg-slate-900 border border-slate-600 rounded p-1 text-sm text-white"
                                            >
                                                <option value="regular">Reg</option>
                                                <option value="holiday">Hol</option>
                                                <option value="exam">Exm</option>
                                            </select>
                                        </div>
                                        <div className="col-span-2 flex justify-end gap-2">
                                            <button onClick={() => handleEditSave(event.id)} className="p-1 bg-green-600 rounded hover:bg-green-500 text-white"><Save size={16} /></button>
                                            <button onClick={() => setIsEditing(null)} className="p-1 bg-gray-600 rounded hover:bg-gray-500 text-white"><X size={16} /></button>
                                        </div>
                                    </>
                                ) : (
                                    // VIEW MODE
                                    <>
                                        <div className="col-span-3 font-medium opacity-90">{new Date(event.date).toLocaleDateString('en-GB')}</div>
                                        <div className="col-span-2 opacity-75">{event.day}</div>
                                        <div className={isAdmin ? "col-span-5" : "col-span-7"}>{event.description}</div>
                                        {isAdmin && (
                                            <div className="col-span-2 flex justify-end gap-2 text-right">
                                                <button onClick={() => startEdit(event)} className="text-blue-400 hover:text-blue-300 transition-colors"><Edit2 size={16} /></button>
                                                <button onClick={() => handleDelete(event.id)} className="text-red-400 hover:text-red-300 transition-colors"><Trash2 size={16} /></button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CalendarTab;
