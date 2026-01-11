import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { Bell, LogOut, BookOpen, Clock, AlertCircle, CheckCircle, GraduationCap, Lock, Save, Calendar, BarChart2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Helper to convert VAPID key
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

const StudentDashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('homework');

    const [homeworks, setHomeworks] = useState([]);
    const [marks, setMarks] = useState([]);
    const [timetable, setTimetable] = useState([]);
    const [isSubscribed, setIsSubscribed] = useState(false);

    // CGPA State
    const [cgpaCredits, setCgpaCredits] = useState({});
    const [calculatedCGPA, setCalculatedCGPA] = useState(null);

    const calculateGradePoint = (score, max) => {
        const percentage = (score / max) * 100;
        if (percentage >= 90) return 10;
        if (percentage >= 80) return 9;
        if (percentage >= 70) return 8;
        if (percentage >= 60) return 7;
        if (percentage >= 50) return 6;
        if (percentage >= 40) return 5;
        return 0;
    };

    const getUniqueSubjects = () => {
        const subjects = {};
        marks.forEach(m => {
            if (!subjects[m.subject]) {
                subjects[m.subject] = { totalScore: 0, totalMax: 0, count: 0 };
            }
            subjects[m.subject].totalScore += parseFloat(m.score);
            subjects[m.subject].totalMax += parseFloat(m.max_marks);
            subjects[m.subject].count++;
        });
        return Object.keys(subjects).map(sub => {
            const s = subjects[sub];
            const avgPercentage = (s.totalScore / s.totalMax) * 100;
            return {
                subject: sub,
                percentage: avgPercentage.toFixed(1),
                gradePoint: calculateGradePoint(s.totalScore, s.totalMax)
            };
        });
    };

    const handleCalculateCGPA = () => {
        const subjects = getUniqueSubjects();
        let totalPoints = 0;
        let totalCredits = 0;

        subjects.forEach(s => {
            const credit = parseFloat(cgpaCredits[s.subject] || 0);
            if (credit > 0) {
                totalPoints += s.gradePoint * credit;
                totalCredits += credit;
            }
        });

        setCalculatedCGPA(totalCredits === 0 ? 0 : (totalPoints / totalCredits).toFixed(2));
    };

    // Profile Lock State
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [mobile, setMobile] = useState('');
    const [section, setSection] = useState('');
    const [regNo, setRegNo] = useState('');
    const [studentProfile, setStudentProfile] = useState(null);

    useEffect(() => {
        const newSocket = io(API_URL);
        newSocket.emit('login', user);

        newSocket.on('new_homework', (hw) => setHomeworks(prev => [hw, ...prev]));
        newSocket.on('delete_homework', (id) => setHomeworks(prev => prev.filter(h => h.id != id)));

        fetchStudentProfile();
        fetchHomeworks();
        fetchMarks();
        fetchTimetable();

        return () => newSocket.close();
    }, [user]);

    const fetchStudentProfile = async () => {
        try {
            const res = await fetch(`${API_URL}/api/marks/profile`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.ok) {
                const data = await res.json();
                setStudentProfile(data);
                if (!data.is_locked) {
                    setShowProfileModal(true);
                }
            }
        } catch (e) { console.error(e); }
    }

    const handleProfileSave = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_URL}/api/marks/profile`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ mobile, section, register_number: regNo })
            });

            if (res.ok) {
                setShowProfileModal(false);
                fetchStudentProfile(); // Refresh to get updated data
                alert("Profile Locked. Contact Admin for changes.");
            } else {
                const d = await res.json();
                alert(d.message || "Error saving profile.");
            }
        } catch (err) { console.error(err); }
    };

    const fetchHomeworks = async () => {
        try {
            const res = await fetch(`${API_URL}/api/homework`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            setHomeworks(await res.json());
        } catch (e) { console.error(e); }
    };

    const fetchMarks = async () => {
        try {
            const res = await fetch(`${API_URL}/api/marks`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            setMarks(await res.json());
        } catch (e) { console.error(e); }
    };

    const fetchTimetable = async () => {
        try {
            const res = await fetch(`${API_URL}/api/timetable`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
            setTimetable(await res.json());
        } catch (e) { console.error(e); }
    };

    const subscribeToPush = async () => {
        if ('serviceWorker' in navigator) {
            try {
                const register = await navigator.serviceWorker.ready;
                const publicVapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
                const subscription = await register.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
                });
                await fetch(`${API_URL}/api/notifications/subscribe`, {
                    method: 'POST',
                    body: JSON.stringify({ ...subscription, user_email: user.email }),
                    headers: { 'Content-Type': 'application/json' }
                });
                setIsSubscribed(true);
            } catch (error) { console.error(error); }
        }
    };

    return (
        <div className="min-h-screen mesh-gradient p-6 font-sans">
            {/* Profile Lock Modal */}
            {showProfileModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl border-t-4 border-indigo-600 animate-slide-up">
                        <div className="text-center mb-6">
                            <div className="bg-indigo-100 p-4 rounded-full w-fit mx-auto mb-4">
                                <Lock className="w-8 h-8 text-indigo-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800">Complete Your Profile</h2>
                            <p className="text-gray-500 text-sm mt-2">
                                Please provide your details to continue. <br />
                                <span className="text-red-500 font-medium">Note: These details will be LOCKED after saving.</span>
                            </p>
                        </div>

                        <form onSubmit={handleProfileSave} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Full Name (From Google)</label>
                                <input type="text" value={user.name} disabled className="w-full bg-gray-100 border border-gray-200 rounded-lg px-4 py-3 text-gray-500 cursor-not-allowed" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Register Number <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. RA25..."
                                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={regNo}
                                    onChange={e => setRegNo(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Section <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. A, B, CS-1"
                                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={section}
                                    onChange={e => setSection(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Mobile Number <span className="text-red-500">*</span></label>
                                <input
                                    type="tel"
                                    required
                                    placeholder="e.g. 9876543210"
                                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={mobile}
                                    onChange={e => setMobile(e.target.value)}
                                />
                            </div>
                            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl shadow-lg transition flex items-center justify-center gap-2 mt-2">
                                <Save className="w-5 h-5" /> Save & Lock Profile
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <div className="max-w-6xl mx-auto">
                <header className="flex flex-col md:flex-row justify-between items-center mb-10 glass-card p-6 rounded-2xl animate-fade-in gap-4">
                    <div className="flex items-center gap-4">
                        <div className="bg-indigo-600 rounded-full p-3 shadow-lg">
                            <BookOpen className="text-white w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight">Student Portal</h1>
                            <p className="text-gray-500 text-sm">
                                Welcome, <span className="font-semibold text-indigo-600">{user.name}</span>
                                {studentProfile?.section && <span className="ml-2 bg-indigo-100 text-indigo-800 text-xs px-2 py-0.5 rounded-full">{studentProfile.section}</span>}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="bg-white/50 p-1 rounded-full flex gap-1 border border-white/60">
                            <button onClick={() => setActiveTab('homework')} className={`px-4 py-2 rounded-full text-sm font-bold transition ${activeTab === 'homework' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:bg-white/40'}`}>Assignments</button>
                            <button onClick={() => setActiveTab('marks')} className={`px-4 py-2 rounded-full text-sm font-bold transition ${activeTab === 'marks' ? 'bg-fuchsia-600 text-white shadow-md' : 'text-gray-600 hover:bg-white/40'}`}>My Grades</button>
                            <button onClick={() => setActiveTab('analytics')} className={`px-4 py-2 rounded-full text-sm font-bold transition ${activeTab === 'analytics' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-white/40'}`}>Analytics</button>
                            <button onClick={() => setActiveTab('timetable')} className={`px-4 py-2 rounded-full text-sm font-bold transition ${activeTab === 'timetable' ? 'bg-orange-500 text-white shadow-md' : 'text-gray-600 hover:bg-white/40'}`}>TimeTable</button>
                            <button onClick={() => setActiveTab('cgpa')} className={`px-4 py-2 rounded-full text-sm font-bold transition ${activeTab === 'cgpa' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-600 hover:bg-white/40'}`}>CGPA</button>
                        </div>

                        <button onClick={subscribeToPush} className={`p-3 rounded-full shadow-md transition ${isSubscribed ? 'bg-green-100 text-green-700' : 'bg-white text-indigo-600 hover:bg-indigo-50'}`}>
                            {isSubscribed ? <CheckCircle className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
                        </button>
                        <button onClick={() => { logout(); navigate('/'); }} className="bg-white text-gray-400 hover:text-red-500 p-3 rounded-full shadow-md transition">
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </header>

                <main className="animate-slide-up">
                    {activeTab === 'homework' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {homeworks.map((hw, i) => (
                                <div key={i} className="glass-card rounded-2xl p-6 hover:-translate-y-1 transition duration-300 group flex flex-col h-full bg-white/80">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="bg-indigo-100 text-indigo-700 p-2 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition">
                                            <BookOpen className="w-6 h-6" />
                                        </div>
                                        <span className="flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                            <Clock className="w-3 h-3" /> {new Date(hw.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-800 mb-2 leading-tight group-hover:text-indigo-600 transition">{hw.title}</h3>
                                    <p className="text-gray-600 text-sm leading-relaxed mb-6 flex-grow">{hw.description}</p>
                                </div>
                            ))}
                            {homeworks.length === 0 && (
                                <div className="col-span-full py-20 text-center glass-card rounded-2xl bg-white/60">
                                    <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                    <h3 className="text-lg font-medium text-gray-800">No Assignments yet</h3>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'marks' && (
                        <div className="glass-card rounded-2xl p-8 bg-white/80 min-h-[500px]">
                            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2"><GraduationCap className="w-6 h-6 text-fuchsia-600" /> Academic Performance</h2>
                            <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
                                <table className="w-full text-left">
                                    <thead className="bg-fuchsia-50">
                                        <tr>
                                            <th className="p-4 font-bold text-fuchsia-800">Subject</th>
                                            <th className="p-4 font-bold text-fuchsia-800">Exam</th>
                                            <th className="p-4 font-bold text-fuchsia-800">Score</th>
                                            <th className="p-4 font-bold text-fuchsia-800">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 bg-white">
                                        {marks.map((m) => (
                                            <tr key={m.id} className="hover:bg-fuchsia-50/30 transition">
                                                <td className="p-4 font-semibold text-gray-700">{m.subject}</td>
                                                <td className="p-4 text-gray-500 font-medium">{m.exam_type || '-'}</td>
                                                <td className="p-4"><span className="bg-fuchsia-100 text-fuchsia-700 px-3 py-1 rounded-full font-bold text-sm">{m.score} / {m.max_marks}</span></td>
                                                <td className="p-4 text-gray-500 text-sm">{new Date(m.created_at).toLocaleDateString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {marks.length === 0 && <p className="text-center text-gray-400 py-10">No grades available yet.</p>}
                        </div>
                    )}

                    {activeTab === 'timetable' && (
                        <div className="glass-card rounded-2xl p-6 bg-white/80 min-h-[500px]">
                            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2"><Calendar className="w-6 h-6 text-orange-500" /> Class Schedule</h2>
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse min-w-[800px]">
                                    <thead>
                                        <tr>
                                            <th className="p-3 border-b border-gray-200 bg-gray-50 text-gray-500 font-bold uppercase text-xs w-32">Day</th>
                                            {[1, 2, 3, 4, 5, 6, 7, 8].map(p => <th key={p} className="p-3 border-b border-gray-200 bg-gray-50 text-gray-500 font-bold uppercase text-xs">Period {p}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
                                            <tr key={day} className="hover:bg-gray-50/50">
                                                <td className="p-3 border-b border-gray-100 font-bold text-indigo-600">{day}</td>
                                                {[1, 2, 3, 4, 5, 6, 7, 8].map(period => {
                                                    const entry = timetable.find(t => t.day === day && t.period == period);
                                                    return (
                                                        <td key={period} className="p-3 border-b border-gray-100 text-center relative border-l border-gray-100">
                                                            {entry ? (
                                                                <div className="py-2">
                                                                    <div className="font-bold text-gray-800 text-sm">{entry.subject}</div>
                                                                    <div className="text-xs text-gray-500">{entry.time_range}</div>
                                                                    <div className="text-xs text-orange-500 font-medium">{entry.teacher}</div>
                                                                </div>
                                                            ) : <span className="text-gray-300">-</span>}
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

                    {activeTab === 'analytics' && (
                        <div className="glass-card rounded-2xl p-8 bg-white/80 min-h-[500px]">
                            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2"><BarChart2 className="w-6 h-6 text-blue-600" /> Performance Analytics</h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                    <h3 className="text-lg font-bold text-gray-700 mb-4">Subject Average (%)</h3>
                                    <div className="h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={getUniqueSubjects()}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                                <XAxis dataKey="subject" tick={{ fontSize: 12 }} />
                                                <YAxis domain={[0, 100]} />
                                                <Tooltip />
                                                <Bar dataKey="percentage" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                    <h3 className="text-lg font-bold text-gray-700 mb-4">Marks History</h3>
                                    <div className="h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={marks}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                                <XAxis dataKey="subject" tick={{ fontSize: 10 }} />
                                                <YAxis domain={[0, 100]} />
                                                <Tooltip />
                                                <Line type="monotone" dataKey="score" stroke="#db2777" strokeWidth={2} dot={{ r: 4 }} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'cgpa' && (
                        <div className="glass-card rounded-2xl p-8 bg-white/80 min-h-[500px]">
                            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2"><GraduationCap className="w-6 h-6 text-emerald-600" /> CGPA Estimator</h2>
                            <div className="mb-6 bg-emerald-50 border border-emerald-100 p-4 rounded-xl text-emerald-800 text-sm">
                                <p><strong>How it works:</strong> We calculate your average score percentage for each subject. You assign the credit value (e.g., 3 or 4) for each subject. We then use a standard 10-point grading scale to estimate your CGPA.</p>
                            </div>

                            <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm mb-6">
                                <table className="w-full text-left">
                                    <thead className="bg-emerald-50">
                                        <tr>
                                            <th className="p-4 font-bold text-emerald-800">Subject</th>
                                            <th className="p-4 font-bold text-emerald-800">Avg %</th>
                                            <th className="p-4 font-bold text-emerald-800">Grade Point</th>
                                            <th className="p-4 font-bold text-emerald-800 w-32">Credits</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 bg-white">
                                        {getUniqueSubjects().map((sub, i) => (
                                            <tr key={i} className="hover:bg-emerald-50/30 transition">
                                                <td className="p-4 font-semibold text-gray-700">{sub.subject}</td>
                                                <td className="p-4 text-gray-500">{sub.percentage}%</td>
                                                <td className="p-4 font-bold text-emerald-600">{sub.gradePoint}</td>
                                                <td className="p-4">
                                                    <input
                                                        type="number"
                                                        min="1" max="10"
                                                        className="w-full border border-gray-300 rounded px-2 py-1 focus:ring-emerald-500 focus:border-emerald-500"
                                                        value={cgpaCredits[sub.subject] || ''}
                                                        onChange={(e) => setCgpaCredits({ ...cgpaCredits, [sub.subject]: e.target.value })}
                                                        placeholder="e.g 4"
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-6 bg-emerald-900 rounded-2xl text-white shadow-xl">
                                <div className="text-center md:text-left">
                                    <h3 className="text-xl font-bold opacity-90">Estimated CGPA</h3>
                                    <div className="text-4xl font-extrabold mt-1 text-emerald-400">
                                        {calculatedCGPA !== null ? calculatedCGPA : '-.--'}
                                    </div>
                                </div>
                                <button
                                    onClick={handleCalculateCGPA}
                                    className="bg-white text-emerald-900 font-bold py-3 px-8 rounded-xl hover:bg-emerald-100 transition shadow-lg"
                                >
                                    Calculate Now
                                </button>
                            </div>
                            {getUniqueSubjects().length === 0 && <p className="text-center text-gray-400 py-10 mt-4">No marks recorded to calculate CGPA.</p>}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default StudentDashboard;
