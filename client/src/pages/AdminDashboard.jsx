import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { LayoutDashboard, Users, Send, Trash2, LogOut, PlusCircle, Activity, GraduationCap, Search, FileText, Check, Save, Edit2, X, RotateCcw, Calendar, BarChart2, Zap, BookOpen, Utensils } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import CalendarTab from '../components/CalendarTab';
import TimetableTab from '../components/TimetableTab';
import MessTab from '../components/MessTab';
import MobileNav from '../components/MobileNav';
// import GalleryTab from '../components/GalleryTab';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005';

const AdminDashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [activeTab, setActiveTab] = useState(() => localStorage.getItem('activeAdminTab') || 'homework');

    useEffect(() => {
        localStorage.setItem('activeAdminTab', activeTab);
    }, [activeTab]);

    // User Management State
    const [userList, setUserList] = useState([]);

    // Notice State
    const [noticeMsg, setNoticeMsg] = useState('');
    const [targetStudent, setTargetStudent] = useState('all'); // 'all' or specific email
    const [notices, setNotices] = useState([]);

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

    // Timetable State - REMOVED legacy form state, using TimetableTab component instead


    // Edit Mark State
    const [editMarkModalOpen, setEditMarkModalOpen] = useState(false);
    const [markToEdit, setMarkToEdit] = useState(null);

    // Single Mark Entry State
    const [addMarkModalOpen, setAddMarkModalOpen] = useState(false);
    const [singleMarkForm, setSingleMarkForm] = useState({ student_reg_no: '', subject: '', score: '', max_marks: '100', exam_type: 'Internal 1' });

    // Smart Import State
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [rawImportText, setRawImportText] = useState('');
    const [stagedMarks, setStagedMarks] = useState({});
    const [msg, setMsg] = useState('');

    // Exam Type Filter State
    const [activeExamTab, setActiveExamTab] = useState('All');


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
        // fetchTimetable(); // Handled by TimetableTab component


        // Initial Fetch for Users or Notices (to populate student list)
        // Initial Fetch for Users or Notices (to populate student list)
        if (activeTab === 'users') {
            fetch(`${API_URL}/api/auth/users`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }).then(res => res.json()).then(setUserList);
        }

        return () => newSocket.close();
    }, [user, activeTab]);

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

    // const fetchTimetable = async () => { ... } // Removed legacy fetch


    // handleTimetableSubmit removed


    const handleDeleteHomework = async (id) => {
        if (!confirm('Delete assignment?')) return;
        try {
            await fetch(`${API_URL}/api/homework/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            setHomeworks(prev => prev.filter(h => h.id !== id));
            setMsg('Homework deleted');
            setTimeout(() => setMsg(''), 8000);
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

    const handleSingleMarkSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_URL}/api/marks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                body: JSON.stringify(singleMarkForm)
            });
            if (res.ok) {
                alert('Mark Added');
                setAddMarkModalOpen(false);
                setSingleMarkForm({ student_reg_no: '', subject: '', score: '', max_marks: '100', exam_type: 'Internal 1' });
                fetchMarks();
            } else {
                alert('Failed to add mark');
            }
        } catch (e) { console.error(e); }
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
            setTimeout(() => setMsg(''), 8000);
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

    const handleBulkSubmit = async () => {
        if (!confirm(`Submit grades for all ${filteredStudents.length} students?`)) return;

        // Collect all entered grades
        const marksToSubmit = [];
        filteredStudents.forEach(s => {
            const val = document.getElementById(`input-${s.register_number}`)?.value;
            if (val) {
                marksToSubmit.push({
                    student_reg_no: s.register_number,
                    subject: bulkSubject,
                    score: val,
                    max_marks: bulkMaxMarks,
                    exam_type: bulkExamType
                });
            }
        });

        if (marksToSubmit.length === 0) return alert("No scores entered!");

        try {
            const res = await fetch(`${API_URL}/api/marks/bulk`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                body: JSON.stringify({ marks: marksToSubmit })
            });
            if (res.ok) {
                alert(`Successfully saved ${marksToSubmit.length} marks!`);
                marksToSubmit.forEach(m => {
                    setGradingStatus(prev => ({ ...prev, [m.student_reg_no]: 'saved' }));
                    // clear input
                    const el = document.getElementById(`input-${m.student_reg_no}`);
                    if (el) el.value = '';
                });
                fetchMarks();
            }
        } catch (e) { console.error(e); alert("Bulk save failed"); }
    };

    const handleSmartImport = () => {
        const lines = rawImportText.split('\n');
        let count = 0;
        const newStaged = { ...stagedMarks };

        lines.forEach(line => {
            // 1. Find RegNo
            const regMatch = line.match(/(RA\d+)/i);
            if (regMatch) {
                const regNo = regMatch[1].toUpperCase();

                // 2. Remove RegNo from line to avoid matching its digits as score
                const restOfLine = line.replace(regMatch[0], '');

                // 3. Find Score (Number or 'ab'/'absent')
                // Matches: "23", "23.5", "ab", "AB", "absent"
                // \b ensures we don't match partial words, but allow simple numbers
                const scoreMatch = restOfLine.match(/\b(ab|absent|\d+(\.\d+)?)\b/i);

                if (scoreMatch) {
                    let score = scoreMatch[0];
                    if (score.toLowerCase().startsWith('ab')) score = 'AB'; // Standardize Absent

                    newStaged[regNo] = score;
                    count++;
                }
            }
        });

        setStagedMarks(newStaged);
        alert(`Parsed and staged ${count} scores! Review them in the table before clicking 'Save All'.`);
        setImportModalOpen(false);
    };

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
                    {/* ... existing edit modal ... */}
                </div>
            )}

            {importModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-2xl w-full shadow-2xl animate-fade-in relative">
                        <button onClick={() => setImportModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><Zap className="w-5 h-5 text-yellow-400" /> AI / Smart Import</h2>
                        <p className="text-slate-400 text-sm mb-4">Paste raw text (e.g., from Excel, WhatsApp, or Doc). We'll try to find "Register Number" and "Score" patterns and fill the table for you.</p>
                        <textarea
                            className="w-full h-64 bg-slate-900 border border-slate-700 rounded-xl p-4 text-white font-mono text-sm focus:outline-none focus:border-violet-500"
                            placeholder="Example:
RA2411003010001 - 95
RA2411003010002 scored 88
Student RA2411003010003 got 45 marks"
                            value={rawImportText}
                            onChange={e => setRawImportText(e.target.value)}
                        ></textarea>
                        <button onClick={handleSmartImport} className="w-full bg-yellow-600 text-white font-bold py-3 mt-4 rounded-xl hover:bg-yellow-700 transition">Analyze & Fill Table</button>
                    </div>
                </div>
            )}

            <MobileNav
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                tabs={[
                    { id: 'homework', label: 'Home', icon: <FileText className="w-5 h-5" /> },
                    { id: 'users', label: 'Users', icon: <Users className="w-5 h-5" /> },
                    { id: 'notices', label: 'Notices', icon: <Send className="w-5 h-5" /> },
                    { id: 'mess', label: 'Mess', icon: <Utensils className="w-5 h-5" /> },
                    { id: 'calendar', label: 'Calendar', icon: <Calendar className="w-5 h-5" /> },
                    { id: 'timetable', label: 'Timetable', icon: <Calendar className="w-5 h-5" /> },
                    { id: 'students', label: 'Grading', icon: <GraduationCap className="w-5 h-5" /> },
                ]}
            />
            <div className="max-w-7xl mx-auto pb-24">
                <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md flex flex-col md:flex-row justify-between items-center mb-8 border-b border-slate-800 pb-6 pt-6 animate-fade-in gap-4 -mx-6 px-6 shadow-lg transition-all duration-300">
                    <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-br from-violet-600 to-fuchsia-600 p-2 rounded-lg shadow-lg shadow-violet-500/20">
                            <LayoutDashboard className="w-6 h-6 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-fuchsia-400">
                            Admin Console
                        </h1>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="flex gap-2 p-1 bg-slate-800 rounded-full border border-slate-700">
                            <button onClick={() => setActiveTab('homework')} className={`px-4 py-2 rounded-full text-sm font-medium transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'homework' ? 'bg-violet-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}><FileText className="w-4 h-4" /> Homework</button>
                            <button onClick={() => setActiveTab('notices')} className={`px-4 py-2 rounded-full text-sm font-medium transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'notices' ? 'bg-yellow-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}><Send className="w-4 h-4" /> Notices</button>
                            <button onClick={() => setActiveTab('mess')} className={`px-4 py-2 rounded-full text-sm font-medium transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'mess' ? 'bg-pink-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}><Utensils className="w-4 h-4" /> Mess</button>
                            <button onClick={() => setActiveTab('calendar')} className={`px-4 py-2 rounded-full text-sm font-medium transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'calendar' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}><Calendar className="w-4 h-4" /> Calendar</button>
                            <button onClick={() => setActiveTab('timetable')} className={`px-4 py-2 rounded-full text-sm font-medium transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'timetable' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}><Calendar className="w-4 h-4" /> Timetable</button>
                            <button onClick={() => setActiveTab('analytics')} className={`px-4 py-2 rounded-full text-sm font-medium transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'analytics' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}><BarChart2 className="w-4 h-4" /> Student Analytics</button>
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
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-slide-up">
                        <div className="space-y-8">
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

                        <div className="lg:col-span-2">
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

                {activeTab === 'notices' && (
                    <div className="animate-slide-up grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6 shadow-xl h-fit">
                            <h2 className="text-xl font-semibold mb-6 text-yellow-300 flex items-center gap-2">
                                <Send className="w-5 h-5" /> Broadcast Notice
                            </h2>

                            <div className="mb-4 space-y-2">
                                <label className="text-sm font-bold text-slate-400 uppercase">Target Audience</label>
                                <select
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-yellow-500"
                                    value={targetStudent}
                                    onChange={(e) => setTargetStudent(e.target.value)}
                                >
                                    <option value="all">📢 All Students</option>
                                    <optgroup label="Class List">
                                        {students.map(s => (
                                            <option key={s.register_number} value={s.register_number}>{s.name} ({s.register_number})</option>
                                        ))}
                                    </optgroup>
                                </select>
                            </div>

                            <textarea
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white focus:outline-none focus:ring-1 focus:ring-yellow-500 h-40 resize-none mb-4"
                                placeholder="Type your message here..."
                                value={noticeMsg}
                                onChange={e => setNoticeMsg(e.target.value)}
                            ></textarea>

                            <div className="flex gap-4">
                                <button
                                    onClick={async () => {
                                        if (!noticeMsg) return;
                                        try {
                                            await fetch(`${API_URL}/api/notices`, {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                                                body: JSON.stringify({ message: noticeMsg, category: 'general', target: targetStudent })
                                            });
                                            alert('Notice Sent!');
                                            setNoticeMsg('');
                                        } catch (e) { console.error(e); alert('Failed'); }
                                    }}
                                    className="flex-1 bg-yellow-600 text-white font-bold py-3 rounded-xl hover:bg-yellow-700 transition"
                                >
                                    {targetStudent === 'all' ? 'Send to All' : 'Send to Student'}
                                </button>
                            </div>
                        </div>

                        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6 shadow-xl h-fit">
                            <h2 className="text-xl font-semibold mb-6 text-slate-300">Previous Notices</h2>
                            <div className="text-center text-slate-500 py-10">
                                Notices are delivered to student dashboards.
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'analytics' && (
                    <div className="animate-slide-up grid grid-cols-1 lg:grid-cols-4 gap-8">
                        {/* Student Selector */}
                        <div className="lg:col-span-1 bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6 shadow-xl min-h-[600px] flex flex-col">
                            <h2 className="text-xl font-semibold mb-4 text-blue-300 flex items-center gap-2">
                                <Users className="w-5 h-5" /> Select Student
                            </h2>
                            <div className="relative mb-4">
                                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                                <input
                                    type="text"
                                    placeholder="Search Name/RegNo"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                                {students
                                    .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.register_number.toLowerCase().includes(searchTerm.toLowerCase()))
                                    .map(s => (
                                        <div
                                            key={s.register_number}
                                            onClick={() => setTargetStudent(s.register_number)}
                                            className={`p-3 rounded-xl cursor-pointer transition border border-transparent ${targetStudent === s.register_number ? 'bg-blue-600/20 border-blue-500 text-white' : 'hover:bg-slate-700 text-slate-300'}`}
                                        >
                                            <div className="font-bold text-sm truncate">{s.name}</div>
                                            <div className="text-xs opacity-70 font-mono">{s.register_number}</div>
                                        </div>
                                    ))
                                }
                            </div>
                        </div>

                        {/* Analytics Detail */}
                        <div className="lg:col-span-3 space-y-6">
                            {targetStudent && targetStudent !== 'all' ? (
                                <>
                                    {(() => {
                                        const s = students.find(st => st.register_number === targetStudent);
                                        const sMarks = marksList.filter(m => m.student_reg_no === targetStudent);
                                        // Calc Avgs
                                        const avg = sMarks.length > 0 ? (sMarks.reduce((acc, curr) => acc + (parseFloat(curr.score) / parseFloat(curr.max_marks) * 100), 0) / sMarks.length).toFixed(1) : 0;

                                        // Chart Data
                                        const chartData = sMarks.map(m => ({
                                            subject: m.subject.substring(0, 10) + '...',
                                            fullSubject: m.subject,
                                            score: (parseFloat(m.score) / parseFloat(m.max_marks) * 100).toFixed(1),
                                            raw: m.score,
                                            max: m.max_marks
                                        }));

                                        return (
                                            <>
                                                {/* Profile Header */}
                                                <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                                    <div>
                                                        <h2 className="text-2xl font-bold text-white mb-1">{s?.name || 'Unknown Student'}</h2>
                                                        <div className="flex flex-wrap gap-4 text-sm text-slate-400 font-mono">
                                                            <span className="bg-slate-900 px-2 py-1 rounded border border-slate-700">{s?.register_number}</span>
                                                            <span className="bg-slate-900 px-2 py-1 rounded border border-slate-700">{s?.section ? `Sec: ${s.section}` : 'No Section'}</span>
                                                            <span className="bg-slate-900 px-2 py-1 rounded border border-slate-700">{s?.mobile || 'No Mobile'}</span>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">{avg}%</div>
                                                        <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Overall Perf.</div>
                                                    </div>
                                                </div>

                                                {/* Charts */}
                                                <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6 shadow-xl h-80">
                                                    <h3 className="text-sm font-bold text-slate-400 uppercase mb-4">Performance Trend</h3>
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <BarChart data={chartData}>
                                                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                                            <XAxis dataKey="subject" stroke="#94a3b8" fontSize={10} />
                                                            <YAxis stroke="#94a3b8" domain={[0, 100]} />
                                                            <Tooltip
                                                                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155' }}
                                                                formatter={(val, name, props) => [`${props.payload.raw}/${props.payload.max}`, props.payload.fullSubject]}
                                                            />
                                                            <Bar dataKey="score" fill="#3b82f6" radius={[4, 4, 0, 0]} name="%" />
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                </div>

                                                {/* Details Table */}
                                                <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6 shadow-xl">
                                                    <h3 className="text-sm font-bold text-slate-400 uppercase mb-4">Detailed Marks</h3>
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-left">
                                                            <thead className="bg-slate-950/30 text-xs uppercase text-slate-500">
                                                                <tr>
                                                                    <th className="p-3">Subject</th>
                                                                    <th className="p-3">Exam</th>
                                                                    <th className="p-3">Score</th>
                                                                    <th className="p-3 text-right">Max</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-slate-700/50 text-sm text-slate-300">
                                                                {sMarks.map((m, i) => (
                                                                    <tr key={i} className="hover:bg-slate-700/50">
                                                                        <td className="p-3 font-medium">{m.subject}</td>
                                                                        <td className="p-3 opacity-70">{m.exam_type}</td>
                                                                        <td className="p-3 font-bold text-emerald-400">{m.score}</td>
                                                                        <td className="p-3 text-right opacity-70">{m.max_marks}</td>
                                                                    </tr>
                                                                ))}
                                                                {sMarks.length === 0 && <tr><td colSpan="4" className="p-6 text-center text-slate-500">No marks recorded.</td></tr>}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-50">
                                    <BarChart2 className="w-16 h-16 mb-4" />
                                    <p className="text-lg">Select a student to view analytics</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                {activeTab === 'timetable' && (
                    <div className="animate-slide-up">
                        <TimetableTab user={user} />
                    </div>
                )}

                {activeTab === 'mess' && (
                    <div className="animate-slide-up">
                        <MessTab isAdmin={true} />
                    </div>
                )}

                {activeTab === 'calendar' && (
                    <div className="animate-slide-up">
                        <CalendarTab user={user} />
                    </div>
                )}
            </div >


            {
                editMarkModalOpen && markToEdit && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-fade-in relative">
                            <h2 className="text-xl font-bold text-white mb-6">Edit Mark</h2>
                            <form onSubmit={handleMarkUpdate} className="space-y-4">
                                <div>
                                    <label className="text-xs text-slate-400 uppercase">Exam Type</label>
                                    <input type="text" placeholder="e.g. Cycle Test 1" className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white" value={markToEdit.exam_type} onChange={e => setMarkToEdit({ ...markToEdit, exam_type: e.target.value })} />
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
                )
            }

            {
                activeTab === 'analytics' && (
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
                )
            }

            {activeTab === 'timetable' && (
                <div className="animate-slide-up">
                    <TimetableTab user={user} />
                </div>
            )}

        </div >
    );
};

export default AdminDashboard;
