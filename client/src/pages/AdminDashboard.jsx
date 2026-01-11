import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { LayoutDashboard, Users, Send, Trash2, LogOut, PlusCircle, Activity, GraduationCap, Search, FileText, Check, Save, Edit2, X, RotateCcw, Calendar, BarChart2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const AdminDashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [activeTab, setActiveTab] = useState('homework');

    // Homework State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [homeworks, setHomeworks] = useState([]);

    // Marks State
    const [students, setStudents] = useState([]);
    const [marksList, setMarksList] = useState([]);

    // Bulk Grading State
    const [bulkSubject, setBulkSubject] = useState('');
    const [bulkMaxMarks, setBulkMaxMarks] = useState('100');
    const [bulkExamType, setBulkExamType] = useState('Internal 1');
    const [searchTerm, setSearchTerm] = useState('');
    const [gradingStatus, setGradingStatus] = useState({});

    // Profile Edit State
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editForm, setEditForm] = useState({ register_number: '', name: '', mobile: '', section: '' });

    // Timetable State
    const [timetable, setTimetable] = useState([]);
    const [ttForm, setTtForm] = useState({ day: 'Monday', period: '1', time_range: '09:00 - 10:00', subject: '', teacher: '' });

    // Edit Mark State
    const [editMarkModalOpen, setEditMarkModalOpen] = useState(false);
    const [markToEdit, setMarkToEdit] = useState(null);

    const [msg, setMsg] = useState('');


    const [socket, setSocket] = useState(null);


    useEffect(() => {
        const newSocket = io(API_URL);
        setSocket(newSocket);
        newSocket.emit('login', user);
        newSocket.on('online_users', setOnlineUsers);
        newSocket.on('new_homework', (hw) => setHomeworks(prev => [hw, ...prev]));
        newSocket.on('delete_homework', (id) => setHomeworks(prev => prev.filter(h => h.id != id)));

        fetchHomeworks();
        fetchStudents();
        fetchMarks();
        fetchTimetable();

        return () => newSocket.close();
    }, [user]);

    const fetchHomeworks = async () => {
        try {
            const res = await fetch(`${API_URL}/api/homework`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            setHomeworks(await res.json());
        } catch (err) { console.error(err); }
    };

    const fetchStudents = async () => {
        try {
            const res = await fetch(`${API_URL}/api/marks/students`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            setStudents(await res.json());
        } catch (e) { console.error(e); }
    }

    const fetchMarks = async () => {
        try {
            const res = await fetch(`${API_URL}/api/marks`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            setMarksList(await res.json());
        } catch (e) { console.error(e); }
    }

    const fetchTimetable = async () => {
        try {
            const res = await fetch(`${API_URL}/api/timetable`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
            setTimetable(await res.json());
        } catch (e) { console.error(e); }
    }

    const handleTimetableSubmit = async (e) => {
        e.preventDefault();
        try {
            await fetch(`${API_URL}/api/timetable`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                body: JSON.stringify(ttForm)
            });
            alert('Schedule Updated');
            fetchTimetable();
        } catch (e) { console.error(e); }
    }

    const handleDeleteHomework = async (id) => {
        if (!confirm('Delete assignment?')) return;
        try {
            await fetch(`${API_URL}/api/homework/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            setHomeworks(prev => prev.filter(h => h.id !== id));
            setMsg('Homework deleted');
            setTimeout(() => setMsg(''), 3000);
        } catch (err) { console.error(err); }
    };

    const handleDeleteMark = async (id) => {
        if (!confirm('Delete mark?')) return;
        try {
            await fetch(`${API_URL}/api/marks/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            setMarksList(prev => prev.filter(m => m.id !== id));
        } catch (err) { console.error(err); }
    };

    const handleCreateHomework = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_URL}/api/homework`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                body: JSON.stringify({ title, description })
            });
            if (res.ok) {
                setMsg('Posted!');
                setTitle(''); setDescription('');
            }
            setTimeout(() => setMsg(''), 3000);
        } catch (err) { console.error(err); }
    };

    const submitGrade = async (regNo, scoreInput) => {
        if (!bulkSubject || !scoreInput) return;

        try {
            const res = await fetch(`${API_URL}/api/marks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                body: JSON.stringify({ student_reg_no: regNo, subject: bulkSubject, score: scoreInput, max_marks: bulkMaxMarks, exam_type: bulkExamType })
            });

            if (res.ok) {
                setGradingStatus(prev => ({ ...prev, [regNo]: 'saved' }));
                fetchMarks();
                setTimeout(() => setGradingStatus(prev => ({ ...prev, [regNo]: null })), 2000);
            } else {
                setGradingStatus(prev => ({ ...prev, [regNo]: 'error' }));
            }
        } catch (e) {
            console.error(e);
            setGradingStatus(prev => ({ ...prev, [regNo]: 'error' }));
        }
    }

    const openEditModal = async (regNo) => {
        // Fetch student details from marks API (which checks students_list)
        try {
            const res = await fetch(`${API_URL}/api/marks/student/${regNo}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.ok) {
                const data = await res.json();
                setEditForm({
                    register_number: data.register_number,
                    name: data.name,
                    mobile: data.mobile || '',
                    section: data.section || ''
                });
                setEditModalOpen(true);
            } else {
                alert("Could not load student details");
            }
        } catch (e) { console.error(e); }
    };

    const handleEditSave = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_URL}/api/marks/student/${editForm.register_number}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                body: JSON.stringify(editForm)
            });
            if (res.ok) {
                alert("Profile Updated!");
                setEditModalOpen(false);
                fetchStudents(); // Refresh list to see name changes if any
            }
        } catch (e) {
            console.error(e); alert("Failed to update");
        }
    }

    const handleMarkUpdate = async (e) => {
        e.preventDefault();
        try {
            await fetch(`${API_URL}/api/marks/${markToEdit.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                body: JSON.stringify(markToEdit)
            });
            setEditMarkModalOpen(false);
            fetchMarks();
            alert("Mark Updated");
        } catch (e) { console.error(e); }
    };

    const getSubjectPerformance = () => {
        const subjects = {};
        marksList.forEach(m => {
            if (!subjects[m.subject]) subjects[m.subject] = { total: 0, count: 0, max: 0 };
            subjects[m.subject].total += parseFloat(m.score);
            subjects[m.subject].max += parseFloat(m.max_marks);
            subjects[m.subject].count++;
        });
        return Object.keys(subjects).map(s => ({
            name: s,
            avg: (subjects[s].total / subjects[s].max * 100).toFixed(1)
        }));
    };

    const filteredStudents = students.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.register_number.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 p-6 font-sans selection:bg-violet-500 selection:text-white">
            {editModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-fade-in relative">
                        <button onClick={() => setEditModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
                        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><Edit2 className="w-5 h-5 text-violet-400" /> Edit Student Profile</h2>
                        <form onSubmit={handleEditSave} className="space-y-4">
                            <div>
                                <label className="text-xs text-slate-400 uppercase">Register Number</label>
                                <input type="text" disabled className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-2 text-slate-400 cursor-not-allowed" value={editForm.register_number} />
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 uppercase">Name</label>
                                <input type="text" className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-violet-500" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 uppercase">Section</label>
                                <input type="text" className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-violet-500" value={editForm.section} onChange={e => setEditForm({ ...editForm, section: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 uppercase">Mobile</label>
                                <input type="text" className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-violet-500" value={editForm.mobile} onChange={e => setEditForm({ ...editForm, mobile: e.target.value })} />
                            </div>
                            <button type="submit" className="w-full bg-violet-600 text-white font-bold py-3 rounded-xl hover:bg-violet-700 transition">Save Changes</button>
                        </form>
                    </div>
                </div>
            )}

            <div className="max-w-7xl mx-auto">
                <header className="flex flex-col md:flex-row justify-between items-center mb-8 border-b border-slate-800 pb-6 animate-fade-in gap-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-br from-violet-600 to-fuchsia-600 p-2 rounded-lg shadow-lg shadow-violet-500/20">
                            <LayoutDashboard className="w-6 h-6 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-fuchsia-400">
                            Admin Console
                        </h1>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="flex gap-2 p-1 bg-slate-800 rounded-full border border-slate-700 overflow-x-auto max-w-[90vw]">
                            <button onClick={() => setActiveTab('homework')} className={`px-4 py-2 rounded-full text-sm font-medium transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'homework' ? 'bg-violet-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}><FileText className="w-4 h-4" /> Homework</button>
                            <button onClick={() => setActiveTab('students')} className={`px-4 py-2 rounded-full text-sm font-medium transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'students' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}><GraduationCap className="w-4 h-4" /> Grading Sheet</button>
                            <button onClick={() => setActiveTab('marks')} className={`px-4 py-2 rounded-full text-sm font-medium transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'marks' ? 'bg-fuchsia-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}><Activity className="w-4 h-4" /> History</button>
                            <button onClick={() => setActiveTab('timetable')} className={`px-4 py-2 rounded-full text-sm font-medium transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'timetable' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}><Calendar className="w-4 h-4" /> Timetable</button>
                            <button onClick={() => setActiveTab('analytics')} className={`px-4 py-2 rounded-full text-sm font-medium transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'analytics' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}><BarChart2 className="w-4 h-4" /> Analytics</button>
                        </div>
                        <div className="h-6 w-px bg-slate-700 hidden md:block"></div>
                        <div className="flex items-center gap-3">
                            <button onClick={() => { logout(); navigate('/'); }} className="group p-2 rounded-full hover:bg-red-500/10 transition-colors" title="Logout">
                                <LogOut className="w-5 h-5 text-slate-400 group-hover:text-red-400 " />
                            </button>
                        </div>
                    </div>
                </header>

                {activeTab === 'homework' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="space-y-8 animate-slide-up">
                            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
                                <h2 className="text-lg font-semibold mb-6 text-violet-300 flex items-center gap-2">
                                    <PlusCircle className="w-5 h-5" /> Post Assignment
                                </h2>
                                {msg && (
                                    <div className="mb-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-3 rounded-lg text-sm flex items-center gap-2 animate-fade-in">
                                        <Activity className="w-4 h-4" /> {msg}
                                    </div>
                                )}
                                <form onSubmit={handleCreateHomework} className="space-y-5">
                                    <div className="space-y-1">
                                        <input type="text" placeholder="Title" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-violet-500" value={title} onChange={(e) => setTitle(e.target.value)} required />
                                    </div>
                                    <div className="space-y-1">
                                        <textarea placeholder="Instructions" rows="4" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-violet-500 resize-none" value={description} onChange={(e) => setDescription(e.target.value)} required></textarea>
                                    </div>
                                    <button type="submit" className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold py-3.5 rounded-xl hover:scale-[1.02] transition shadow-lg flex items-center justify-center gap-2">
                                        <Send className="w-4 h-4" /> Publish
                                    </button>
                                </form>
                            </div>

                            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6 shadow-xl h-fit">
                                <h2 className="text-xl font-semibold mb-4 text-pink-300 flex items-center justify-between">
                                    Active Users
                                    <span className="bg-pink-900/50 text-pink-200 text-xs px-2 py-1 rounded-full">{onlineUsers.length}</span>
                                </h2>
                                <ul className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                                    {onlineUsers.map((u, i) => (
                                        <li key={i} className="flex items-center gap-2 text-gray-300 bg-gray-700/50 p-2 rounded">
                                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                            <span className="truncate text-sm">{u}</span>
                                        </li>
                                    ))}
                                    {onlineUsers.length === 0 && <p className="text-gray-500 text-sm">No active users.</p>}
                                </ul>
                            </div>
                        </div>

                        <div className="lg:col-span-2 animate-slide-up [animation-delay:100ms]">
                            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6 shadow-xl min-h-[600px] flex flex-col">
                                <h2 className="text-xl font-semibold mb-6 text-blue-300 flex items-center gap-2">
                                    <Activity className="w-5 h-5" /> Assignments
                                </h2>
                                <div className="flex-1 space-y-4 overflow-y-auto max-h-[600px] custom-scrollbar pr-2">
                                    {homeworks.map((hw) => (
                                        <div key={hw.id} className="bg-slate-900/50 p-5 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center border border-slate-700/50 hover:border-slate-600 transition group">
                                            <div className="mb-2 sm:mb-0">
                                                <h3 className="font-bold text-lg text-slate-200">{hw.title}</h3>
                                                <p className="text-slate-400 text-xs mb-1">{new Date(hw.created_at).toLocaleString()}</p>
                                                <p className="text-slate-500 text-sm line-clamp-1">{hw.description}</p>
                                            </div>
                                            <button onClick={() => handleDeleteHomework(hw.id)} className="text-red-400 hover:bg-red-500/10 p-2 rounded self-end sm:self-center">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                    {homeworks.length === 0 && <p className="text-center text-slate-500 mt-10">No assignments.</p>}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'marks' && (
                    <div className="animate-slide-up">
                        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6 shadow-xl min-h-[600px]">
                            <h2 className="text-xl font-semibold mb-6 text-pink-300 flex items-center gap-2">
                                <Activity className="w-5 h-5" /> Detailed Grading History
                            </h2>
                            <div className="overflow-x-auto custom-scrollbar">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="text-slate-400 border-b border-slate-700 text-sm">
                                            <th className="pb-3 pl-2">Student</th>
                                            <th className="pb-3">Subject</th>
                                            <th className="pb-3">Exam</th>
                                            <th className="pb-3">Score</th>
                                            <th className="pb-3 text-right pr-2">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-700/50">
                                        {marksList.map((m) => (
                                            <tr key={m.id} className="text-slate-300 hover:bg-slate-700/30 transition">
                                                <td className="py-4 pl-2">
                                                    <div className="font-semibold text-white">{m.student_name}</div>
                                                    <div className="text-xs text-slate-500">{m.student_reg_no}</div>
                                                </td>
                                                <td className="py-4">{m.subject}</td>
                                                <td className="py-4 text-sm text-slate-400">{m.exam_type || '-'}</td>
                                                <td className="py-4">
                                                    <span className="bg-fuchsia-500/20 text-fuchsia-300 px-2 py-1 rounded text-sm font-bold">
                                                        {m.score} / {m.max_marks}
                                                    </span>
                                                </td>
                                                <td className="py-4 text-right pr-2 flex justify-end gap-2">
                                                    <button onClick={() => { setMarkToEdit(m); setEditMarkModalOpen(true); }} className="text-blue-400 hover:bg-blue-500/10 p-2 rounded">
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => handleDeleteMark(m.id)} className="text-red-400 hover:bg-red-500/10 p-2 rounded">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {marksList.length === 0 && <p className="text-center text-slate-500 py-10">No grades recorded.</p>}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'students' && (
                    <div className="animate-slide-up">
                        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6 shadow-xl min-h-[600px]">
                            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 gap-6">
                                <div>
                                    <h2 className="text-xl font-semibold text-emerald-300 flex items-center gap-2 mb-2">
                                        <GraduationCap className="w-6 h-6" /> Bulk Grade Entry
                                    </h2>
                                    <p className="text-slate-400 text-sm">Set the subject and max marks, then enter scores rapidly.</p>
                                </div>

                                <div className="flex flex-col md:flex-row gap-4 w-full xl:w-auto bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Subject</label>
                                        <input type="text" placeholder="e.g. Physics" className="bg-slate-800 border-none rounded-lg px-3 py-2 text-white w-full md:w-32 focus:ring-1 focus:ring-emerald-500" value={bulkSubject} onChange={e => setBulkSubject(e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Max</label>
                                        <input type="number" placeholder="100" className="bg-slate-800 border-none rounded-lg px-3 py-2 text-white w-full md:w-20 focus:ring-1 focus:ring-emerald-500" value={bulkMaxMarks} onChange={e => setBulkMaxMarks(e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Exam Type</label>
                                        <select className="bg-slate-800 border-none rounded-lg px-3 py-2 text-white w-full md:w-32 focus:ring-1 focus:ring-emerald-500" value={bulkExamType} onChange={e => setBulkExamType(e.target.value)}>
                                            <option>Internal 1</option>
                                            <option>Internal 2</option>
                                            <option>Internal 3</option>
                                            <option>Model Exam</option>
                                            <option>Semester</option>
                                            <option>Assignment</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1 flex-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Search Student</label>
                                        <div className="relative">
                                            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                                            <input type="text" placeholder="Filter list..." className="bg-slate-800 border-none rounded-lg pl-9 pr-3 py-2 text-white w-full focus:ring-1 focus:ring-emerald-500" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="overflow-hidden rounded-xl border border-slate-700 shadow-lg relative bg-slate-900">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-slate-950/50 border-b border-slate-700">
                                            <tr>
                                                <th className="p-4 w-40 font-semibold text-xs uppercase text-slate-400">Reg No</th>
                                                <th className="p-4 font-semibold text-xs uppercase text-slate-400">Name</th>
                                                <th className="p-4 w-40 font-semibold text-xs uppercase text-slate-400">Score Entry</th>
                                                <th className="p-4 w-24 text-center font-semibold text-xs uppercase text-slate-400">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-700/50">
                                            {filteredStudents.map((s) => (
                                                <tr key={s.register_number} className="hover:bg-slate-800/50 transition">
                                                    <td className="p-4 font-mono text-emerald-400 text-sm">{s.register_number}</td>
                                                    <td className="p-4 text-slate-200 font-medium flex items-center gap-2">
                                                        {s.name}
                                                        <div className="flex gap-1">
                                                            <button onClick={() => openEditModal(s.register_number)} className="text-slate-500 hover:text-violet-400 transition" title="Edit Profile">
                                                                <Edit2 className="w-3 h-3" />
                                                            </button>
                                                            <button
                                                                onClick={async () => {
                                                                    if (confirm(`Reset/Unlink profile for ${s.name}? This allows them to claim it again.`)) {
                                                                        await fetch(`${API_URL}/api/marks/student/${s.register_number}/unlink`, {
                                                                            method: 'POST',
                                                                            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                                                                        });
                                                                        alert("Profile Unlinked/Reset");
                                                                    }
                                                                }}
                                                                className="text-slate-500 hover:text-red-400 transition"
                                                                title="Unlink/Reset Profile"
                                                            >
                                                                <RotateCcw className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="number"
                                                                placeholder="-"
                                                                className="bg-slate-800 border border-slate-600 rounded px-3 py-1.5 text-white w-20 text-center focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') {
                                                                        submitGrade(s.register_number, e.target.value);
                                                                    }
                                                                }}
                                                                id={`input-${s.register_number}`}
                                                            />
                                                            <button
                                                                onClick={() => {
                                                                    const val = document.getElementById(`input-${s.register_number}`).value;
                                                                    submitGrade(s.register_number, val);
                                                                }}
                                                                className="bg-emerald-600 hover:bg-emerald-700 text-white p-1.5 rounded transition shadow-lg"
                                                                title="Submit Grade"
                                                            >
                                                                <Save className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        {gradingStatus[s.register_number] === 'saved' && <span className="text-emerald-400 flex justify-center animate-bounce"><Check className="w-5 h-5" /></span>}
                                                        {gradingStatus[s.register_number] === 'error' && <span className="text-red-400 text-xs font-bold">Error</span>}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'timetable' && (
                    <div className="animate-slide-up space-y-8">
                        {/* Timetable Form */}
                        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6 shadow-xl">
                            <h2 className="text-xl font-semibold mb-6 text-orange-400 flex items-center gap-2"><Calendar className="w-5 h-5" /> Manage Class Schedule</h2>
                            <form onSubmit={handleTimetableSubmit} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Day</label>
                                    <select className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" value={ttForm.day} onChange={e => setTtForm({ ...ttForm, day: e.target.value })}>
                                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(d => <option key={d}>{d}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Period</label>
                                    <select className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" value={ttForm.period} onChange={e => setTtForm({ ...ttForm, period: e.target.value })}>
                                        {[1, 2, 3, 4, 5, 6, 7, 8].map(p => <option key={p}>{p}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Time</label>
                                    <input type="text" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" value={ttForm.time_range} onChange={e => setTtForm({ ...ttForm, time_range: e.target.value })} />
                                </div>
                                <div className="md:col-span-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Subject</label>
                                    <input type="text" placeholder="Maths" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" required value={ttForm.subject} onChange={e => setTtForm({ ...ttForm, subject: e.target.value })} />
                                </div>
                                <div className="md:col-span-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Teacher</label>
                                    <input type="text" placeholder="Mr. X" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" value={ttForm.teacher} onChange={e => setTtForm({ ...ttForm, teacher: e.target.value })} />
                                </div>
                                <button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 rounded-lg transition h-[42px]">Save</button>
                            </form>
                        </div>

                        {/* Timetable Grid */}
                        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6 shadow-xl overflow-x-auto">
                            <table className="w-full border-collapse min-w-[800px]">
                                <thead>
                                    <tr>
                                        <th className="p-3 border border-slate-700 bg-slate-900 text-slate-400 w-32">Day / Period</th>
                                        {[1, 2, 3, 4, 5, 6, 7, 8].map(p => <th key={p} className="p-3 border border-slate-700 bg-slate-900 text-slate-400">Period {p}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
                                        <tr key={day}>
                                            <td className="p-3 border border-slate-700 bg-slate-900/50 font-bold text-orange-400">{day}</td>
                                            {[1, 2, 3, 4, 5, 6, 7, 8].map(period => {
                                                const entry = timetable.find(t => t.day === day && t.period == period);
                                                return (
                                                    <td key={period} className="p-3 border border-slate-700 text-center relative group min-h-[80px]">
                                                        {entry ? (
                                                            <div>
                                                                <div className="font-bold text-white text-sm">{entry.subject}</div>
                                                                <div className="text-xs text-slate-500">{entry.time_range}</div>
                                                                <div className="text-xs text-slate-400 italic">{entry.teacher}</div>
                                                                <button
                                                                    onClick={async () => {
                                                                        if (confirm('Delete?')) {
                                                                            await fetch(`${API_URL}/api/timetable/${entry.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
                                                                            fetchTimetable();
                                                                        }
                                                                    }}
                                                                    className="absolute top-1 right-1 text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 p-1 rounded"
                                                                >
                                                                    <Trash2 className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                        ) : <span className="text-slate-700">-</span>}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

            </div>

            {editMarkModalOpen && markToEdit && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-fade-in relative">
                        <h2 className="text-xl font-bold text-white mb-6">Edit Mark</h2>
                        <form onSubmit={handleMarkUpdate} className="space-y-4">
                            <div>
                                <label className="text-xs text-slate-400 uppercase">Exam Type</label>
                                <select className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white" value={markToEdit.exam_type} onChange={e => setMarkToEdit({ ...markToEdit, exam_type: e.target.value })}>
                                    <option>Internal 1</option>
                                    <option>Internal 2</option>
                                    <option>Internal 3</option>
                                    <option>Model Exam</option>
                                    <option>Semester</option>
                                    <option>Assignment</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 uppercase">Score</label>
                                <input type="number" className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white" value={markToEdit.score} onChange={e => setMarkToEdit({ ...markToEdit, score: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 uppercase">Max Marks</label>
                                <input type="number" className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white" value={markToEdit.max_marks} onChange={e => setMarkToEdit({ ...markToEdit, max_marks: e.target.value })} />
                            </div>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setEditMarkModalOpen(false)} className="flex-1 bg-slate-700 text-white font-bold py-3 rounded-xl hover:bg-slate-600 transition">Cancel</button>
                                <button type="submit" className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition">Update</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {activeTab === 'analytics' && (
                <div className="animate-slide-up">
                    <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-8 shadow-xl min-h-[600px]">
                        <h2 className="text-xl font-semibold mb-6 text-blue-300 flex items-center gap-2">
                            <BarChart2 className="w-5 h-5" /> Class Performance Analytics
                        </h2>
                        <div className="h-96">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={getSubjectPerformance()}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                    <XAxis dataKey="name" stroke="#94a3b8" />
                                    <YAxis stroke="#94a3b8" domain={[0, 100]} />
                                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155' }} />
                                    <Bar dataKey="avg" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Avg %" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: rgba(30, 41, 59, 0.5); }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(71, 85, 105, 0.8); border-radius: 4px; }
            `}</style>
        </div>
    );
};

export default AdminDashboard;
