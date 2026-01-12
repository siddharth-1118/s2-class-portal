import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { Bell, LogOut, BookOpen, Clock, AlertCircle, CheckCircle, GraduationCap, Lock, Save, Calendar, BarChart2, Settings, Palette } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { useTheme } from '../context/ThemeContext';


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
    const { theme, toggleTheme, accentColor, setAccentColor, font, setFont, bgPattern, setBgPattern, character, setCharacter } = useTheme();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('homework');

    const [homeworks, setHomeworks] = useState([]);
    const [marks, setMarks] = useState([]);
    const [timetable, setTimetable] = useState([]);
    const [isSubscribed, setIsSubscribed] = useState(false);
    // CGPA State
    const [cgpaCredits, setCgpaCredits] = useState({});
    const [calculatedCGPA, setCalculatedCGPA] = useState(null);
    // SGPA State
    const [sgpaCredits, setSgpaCredits] = useState({});
    const [calculatedSGPA, setCalculatedSGPA] = useState(null);
    const [sgpaCourseCount, setSgpaCourseCount] = useState(5);
    const [showCharacterModal, setShowCharacterModal] = useState(false);



    useEffect(() => {
        if (!character) setShowCharacterModal(true);
    }, [character]);

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
        newSocket.on('new_mark', (mark) => {
            setMarks(prev => [mark, ...prev]);
        });
        newSocket.on('new_timetable', (entry) => {
            setTimetable(prev => {
                // Remove existing entry for same day/period if any
                const filtered = prev.filter(t => !(t.day === entry.day && t.period == entry.period));
                return [...filtered, entry];
            });
        });

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
            if (res.status === 403) { logout(); navigate('/'); return; }
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

            if (res.status === 403) { logout(); navigate('/'); return; }

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
            if (res.status === 403) { logout(); navigate('/'); return; }
            setHomeworks(await res.json());
        } catch (e) { console.error(e); }
    };

    const fetchMarks = async () => {
        try {
            const res = await fetch(`${API_URL}/api/marks`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.status === 403) {
                console.error("Token invalid (403). Redirecting to login.");
                logout();
                navigate('/');
                return;
            }
            setMarks(await res.json());
        } catch (e) { console.error(e); }
    };

    const fetchTimetable = async () => {
        try {
            const res = await fetch(`${API_URL}/api/timetable`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
            if (res.status === 403) { logout(); navigate('/'); return; }
            setTimetable(await res.json());
        } catch (e) { console.error(e); }
    };

    const subscribeToPush = async () => {
        if ('serviceWorker' in navigator) {
            try {
                const register = await navigator.serviceWorker.ready;
                const publicVapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
                if (!publicVapidKey) {
                    alert('Error: VITE_VAPID_PUBLIC_KEY is missing in client environment!');
                    console.error('VITE_VAPID_PUBLIC_KEY is missing');
                    return;
                }
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
                alert("Successfully subscribed to notifications!");
            } catch (error) {
                console.error("Subscription Error:", error);
                alert("Failed to subscribe to notifications: " + error.message);
            }
        }
    };

    return (
        <div className={`min-h-screen p-6 transition-all duration-300 ${!character ? (bgPattern || 'mesh-gradient') : 'bg-transparent'}`}>
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

            {/* Character Selection Modal */}
            {/* Character Selection Modal (Creature Gallery) */}
            {showCharacterModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md p-2 md:p-4 animate-fade-in overflow-y-auto">
                    <div className="bg-slate-900 rounded-2xl md:rounded-3xl p-4 md:p-8 max-w-6xl w-full shadow-2xl border border-slate-700 relative my-auto">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500"></div>
                        <h2 className="text-2xl md:text-4xl font-extrabold text-white text-center mb-2 tracking-tight">Choose Your Companion</h2>
                        <p className="text-gray-400 text-center mb-4 md:mb-8 text-sm md:text-base">Each creature unlocks a unique realm. Select wisely!</p>

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 max-h-[75vh] overflow-y-auto p-1 custom-scrollbar">
                            {[
                                { id: 'cyberpunk', name: 'Neon Glitch', emoji: '👾', desc: 'Futuristic hacker bot.', theme: 'cyberpunk', accent: 'neon', anim: 'creature-glitch' },
                                { id: 'fantasy', name: 'Golden Dragon', emoji: '🐉', desc: 'Guardian of treasure.', theme: 'fantasy', accent: 'gold', anim: 'creature-float' },
                                { id: 'space', name: 'Star Voyager', emoji: '🚀', desc: 'Explorer of galaxies.', theme: 'space', accent: 'starlight', anim: 'creature-float' },
                                { id: 'ocean', name: 'Abyss Diver', emoji: '🐙', desc: 'Master of the deep.', theme: 'ocean', accent: 'teal', anim: 'creature-swim' },
                                { id: 'jungle', name: 'Safari Guide', emoji: '🦜', desc: 'Wild nature spirit.', theme: 'jungle', accent: 'leaf', anim: 'creature-float' },
                                { id: 'candy', name: 'Sweet Dreams', emoji: '🦄', desc: 'Magical sugar rush.', theme: 'candy', accent: 'pink', anim: 'creature-bounce' },
                                { id: 'steampunk', name: 'Gear Grind', emoji: '🤖', desc: 'Brass & steam power.', theme: 'steampunk', accent: 'bronze', anim: 'creature-spin' },
                                { id: 'horror', name: 'Ghostly', emoji: '👻', desc: 'Spooky hauntings.', theme: 'horror', accent: 'blood', anim: 'creature-ghost' },
                                { id: 'pixel', name: '8-Bit Hero', emoji: '🕹️', desc: 'Retro arcade fun.', theme: 'pixel', accent: '8bit', anim: 'creature-bounce' },
                                { id: 'samurai', name: 'Ronin', emoji: '👹', desc: 'Honor and blade.', theme: 'samurai', accent: 'crimson', anim: 'creature-float' },
                                { id: 'superhero', name: 'Justice', emoji: '⚡', desc: 'Saving the day.', theme: 'superhero', accent: 'hero', anim: 'creature-pulse' },
                                { id: 'magic', name: 'Wizardry', emoji: '🧙‍♂️', desc: 'Arcane spells.', theme: 'magic', accent: 'magic-purple', anim: 'creature-float' },
                            ].map((char) => (
                                <button
                                    key={char.id}
                                    onClick={() => {
                                        setCharacter(char);
                                        toggleTheme(char.theme);
                                        setAccentColor(char.accent);
                                        setBgPattern(''); // Clear confusing background patterns
                                        setShowCharacterModal(false);
                                    }}
                                    className="group relative bg-slate-800 rounded-xl p-6 hover:bg-slate-700 transition-all duration-300 hover:scale-105 border border-slate-700 hover:border-white/20 text-left overflow-hidden"
                                >
                                    <div className={`text-5xl mb-4 transition-transform duration-300 group-hover:scale-110 ${char.anim} origin-center inline-block`}>{char.emoji}</div>
                                    <h3 className="text-lg font-bold text-white mb-1 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-400">{char.name}</h3>
                                    <p className="text-xs text-slate-400">{char.desc}</p>
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 rounded-xl transition-opacity"></div>
                                </button>
                            ))}
                        </div>
                        <button onClick={() => setShowCharacterModal(false)} className="mt-6 w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl font-bold transition">Close Gallery</button>
                    </div>
                </div>
            )}

            {/* Floating Creature */}
            {character && (
                <div className={`fixed bottom-10 right-10 z-40 pointer-events-none ${character.anim || 'creature-float'}`}>
                    <div className="text-6xl filter drop-shadow-2xl opacity-90 hover:scale-110 transition cursor-pointer pointer-events-auto" onClick={() => setShowCharacterModal(true)} title="Change Companion">
                        {character.emoji}
                    </div>
                </div>
            )}

            <div className="max-w-6xl mx-auto">
                <header className="flex flex-col md:flex-row justify-between items-center mb-10 glass-card p-6 rounded-2xl animate-fade-in gap-4 relative z-50">
                    <div className="flex items-center gap-4">
                        <div className="rounded-full p-3 shadow-lg" style={{ backgroundColor: 'rgba(var(--accent-color), 0.1)' }}>
                            <BookOpen className="w-6 h-6" style={{ color: 'rgb(var(--accent-color))' }} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">Student Portal</h1>
                            <p className="text-sm opacity-80 text-[var(--text-primary)]">
                                Welcome, <span className="font-semibold" style={{ color: 'rgb(var(--accent-color))' }}>{user.name}</span>
                                {studentProfile?.section && <span className="ml-2 text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(var(--accent-color), 0.1)', color: 'rgb(var(--accent-color))' }}>{studentProfile.section}</span>}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                        <div className="bg-white/10 p-1 rounded-3xl flex flex-wrap justify-center gap-1 border border-white/20 w-full md:w-auto">
                            {['homework', 'marks', 'analytics', 'timetable', 'cgpa'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-4 py-2 rounded-full text-sm font-bold transition capitalize ${activeTab === tab ? 'text-white shadow-md' : 'text-[var(--text-primary)] hover:bg-white/10'}`}
                                    style={activeTab === tab ? { backgroundColor: 'rgb(var(--accent-color))' } : {}}
                                >
                                    {tab === 'cgpa' ? 'CGPA & SGPA' : tab === 'marks' ? 'My Grades' : tab === 'homework' ? 'Assignments' : tab}
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Creature Gallery Toggle */}
                            <button
                                onClick={() => setShowCharacterModal(true)}
                                className="p-3 rounded-full shadow-md transition bg-white text-gray-600 hover:bg-gray-100 dark:bg-slate-800 dark:text-gray-300 dark:border-slate-700 border"
                                title="Change Theme/Creature"
                            >
                                <Palette className="w-5 h-5" />
                            </button>



                            <button onClick={subscribeToPush} className={`p-3 rounded-full shadow-md transition ${isSubscribed ? 'bg-green-100 text-green-700' : 'bg-white text-indigo-600 hover:bg-indigo-50'}`}>
                                {isSubscribed ? <CheckCircle className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
                            </button>
                            <button onClick={() => { logout(); navigate('/'); }} className="bg-white text-gray-400 hover:text-red-500 p-3 rounded-full shadow-md transition">
                                <LogOut className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </header>

                <main className="animate-slide-up">
                    {activeTab === 'homework' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {homeworks.map((hw, i) => (
                                <div key={i} className="glass-card rounded-2xl p-6 hover:-translate-y-1 transition duration-300 group flex flex-col h-full">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="bg-indigo-100 text-indigo-700 p-2 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition" style={{ backgroundColor: 'rgba(var(--accent-color), 0.1)', color: 'rgb(var(--accent-color))' }}>
                                            <BookOpen className="w-6 h-6" />
                                        </div>
                                        <span className="flex items-center gap-1 text-xs font-medium opacity-70 bg-white/20 px-2 py-1 rounded-full text-[var(--text-primary)]">
                                            <Clock className="w-3 h-3" /> {new Date(hw.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <h3 className="text-xl font-bold mb-2 leading-tight group-hover:opacity-80 transition text-[var(--text-primary)]">{hw.title}</h3>
                                    <p className="text-sm leading-relaxed mb-6 flex-grow opacity-80 text-[var(--text-primary)]">{hw.description}</p>
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
                        <div className="glass-card rounded-2xl p-4 md:p-8 min-h-[500px]">
                            <h2 className="text-xl md:text-2xl font-bold mb-6 flex items-center gap-2 text-[var(--text-primary)]"><GraduationCap className="w-6 h-6" style={{ color: 'rgb(var(--accent-color))' }} /> Academic Performance</h2>
                            <div className="overflow-x-auto rounded-xl border border-white/10 shadow-sm">
                                <table className="w-full text-left min-w-[600px]">
                                    <thead style={{ backgroundColor: 'rgba(var(--accent-color), 0.1)' }}>
                                        <tr>
                                            <th className="p-4 font-bold" style={{ color: 'rgb(var(--accent-color))' }}>Subject</th>
                                            <th className="p-4 font-bold" style={{ color: 'rgb(var(--accent-color))' }}>Exam</th>
                                            <th className="p-4 font-bold" style={{ color: 'rgb(var(--accent-color))' }}>Score</th>
                                            <th className="p-4 font-bold" style={{ color: 'rgb(var(--accent-color))' }}>Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/10">
                                        {marks.map((m) => (
                                            <tr key={m.id} className="hover:bg-white/5 transition">
                                                <td className="p-4 font-semibold text-[var(--text-primary)]">{m.subject}</td>
                                                <td className="p-4 font-medium opacity-80 text-[var(--text-primary)]">{m.exam_type || '-'}</td>
                                                <td className="p-4"><span className="px-3 py-1 rounded-full font-bold text-sm" style={{ backgroundColor: 'rgba(var(--accent-color), 0.15)', color: 'rgb(var(--accent-color))' }}>{m.score} / {m.max_marks}</span></td>
                                                <td className="p-4 text-sm opacity-60 text-[var(--text-primary)]">{new Date(m.created_at).toLocaleDateString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {marks.length === 0 && <p className="text-center py-10 opacity-50 text-[var(--text-primary)]">No grades available yet.</p>}
                        </div>
                    )}

                    {activeTab === 'timetable' && (
                        <div className="glass-card rounded-2xl p-6 min-h-[500px]">
                            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-[var(--text-primary)]"><Calendar className="w-6 h-6" style={{ color: 'rgb(var(--accent-color))' }} /> Class Schedule</h2>
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse min-w-[800px]">
                                    <thead>
                                        <tr>
                                            <th className="p-3 border-b border-white/10 font-bold uppercase text-xs w-32" style={{ backgroundColor: 'rgba(var(--accent-color), 0.05)', color: 'rgb(var(--accent-color))' }}>Day</th>
                                            {[1, 2, 3, 4, 5, 6, 7, 8].map(p => <th key={p} className="p-3 border-b border-white/10 font-bold uppercase text-xs opacity-70 text-[var(--text-primary)]" style={{ backgroundColor: 'rgba(var(--accent-color), 0.05)' }}>Period {p}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5'].map(day => (
                                            <tr key={day} className="hover:bg-white/5">
                                                <td className="p-3 border-b border-white/10 font-bold" style={{ color: 'rgb(var(--accent-color))' }}>{day}</td>
                                                {[1, 2, 3, 4, 5, 6, 7, 8].map(period => {
                                                    const entry = timetable.find(t => t.day === day && t.period == period);
                                                    return (
                                                        <td key={period} className="p-3 border-b border-white/10 text-center relative border-l border-white/5">
                                                            {entry ? (
                                                                <div className="py-2">
                                                                    <div className="font-bold text-[var(--text-primary)] text-sm">{entry.subject}</div>
                                                                    <div className="text-xs opacity-60 text-[var(--text-primary)]">{entry.time_range}</div>
                                                                    <div className="text-xs font-medium opacity-80" style={{ color: 'rgb(var(--accent-color))' }}>{entry.teacher}</div>
                                                                </div>
                                                            ) : <span className="opacity-20 text-[var(--text-primary)]">-</span>}
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
                        <div className="glass-card rounded-2xl p-8 min-h-[500px]">
                            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-[var(--text-primary)]"><BarChart2 className="w-6 h-6" style={{ color: 'rgb(var(--accent-color))' }} /> Performance Analytics</h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="p-6 rounded-2xl shadow-sm border border-white/10 glass">
                                    <h3 className="text-lg font-bold mb-4 opacity-90 text-[var(--text-primary)]">Subject Average (%)</h3>
                                    <div className="h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={getUniqueSubjects()}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                                <XAxis dataKey="subject" tick={{ fontSize: 12, fill: 'var(--text-primary)' }} stroke="var(--text-primary)" />
                                                <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-primary)' }} stroke="var(--text-primary)" />
                                                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'rgba(255,255,255,0.1)', color: 'var(--text-primary)' }} />
                                                <Bar dataKey="percentage" fill="rgb(var(--accent-color))" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                <div className="p-6 rounded-2xl shadow-sm border border-white/10 glass">
                                    <h3 className="text-lg font-bold mb-4 opacity-90 text-[var(--text-primary)]">Marks History</h3>
                                    <div className="h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={marks}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                                <XAxis dataKey="subject" tick={{ fontSize: 10, fill: 'var(--text-primary)' }} stroke="var(--text-primary)" />
                                                <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-primary)' }} stroke="var(--text-primary)" />
                                                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'rgba(255,255,255,0.1)', color: 'var(--text-primary)' }} />
                                                <Line type="monotone" dataKey="score" stroke="rgb(var(--accent-color))" strokeWidth={2} dot={{ r: 4, fill: 'var(--text-primary)' }} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'cgpa' && (
                        <div className="glass-card rounded-2xl p-4 md:p-8 min-h-[500px]">
                            <h2 className="text-xl md:text-2xl font-bold mb-6 flex items-center gap-2 text-[var(--text-primary)]"><GraduationCap className="w-6 h-6" style={{ color: 'rgb(var(--accent-color))' }} /> CGPA Estimator</h2>
                            <div className="mb-6 border border-white/10 p-4 rounded-xl text-sm opacity-80 text-[var(--text-primary)]" style={{ backgroundColor: 'rgba(var(--accent-color), 0.05)' }}>
                                <p><strong>How it works:</strong> We calculate your average score percentage for each subject. You assign the credit value (e.g., 3 or 4) for each subject.</p>
                            </div>

                            <div className="overflow-x-auto rounded-xl border border-white/10 shadow-sm mb-6">
                                <table className="w-full text-left min-w-[600px]">
                                    <thead style={{ backgroundColor: 'rgba(var(--accent-color), 0.1)' }}>
                                        <tr>
                                            <th className="p-4 font-bold" style={{ color: 'rgb(var(--accent-color))' }}>Subject</th>
                                            <th className="p-4 font-bold" style={{ color: 'rgb(var(--accent-color))' }}>Avg %</th>
                                            <th className="p-4 font-bold" style={{ color: 'rgb(var(--accent-color))' }}>Grade Point</th>
                                            <th className="p-4 font-bold w-32" style={{ color: 'rgb(var(--accent-color))' }}>Credits</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/10">
                                        {getUniqueSubjects().map((sub, i) => (
                                            <tr key={i} className="hover:bg-white/5 transition">
                                                <td className="p-4 font-semibold text-[var(--text-primary)]">{sub.subject}</td>
                                                <td className="p-4 opacity-80 text-[var(--text-primary)]">{sub.percentage}%</td>
                                                <td className="p-4 font-bold" style={{ color: 'rgb(var(--accent-color))' }}>{sub.gradePoint}</td>
                                                <td className="p-4">
                                                    <input
                                                        type="number"
                                                        min="1" max="10"
                                                        className="w-full border border-white/20 rounded px-2 py-1 bg-transparent text-[var(--text-primary)] focus:ring-2 focus:outline-none"
                                                        style={{ focusRing: 'rgb(var(--accent-color))' }}
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

                            <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-6 rounded-2xl text-white shadow-xl relative overflow-hidden">
                                <div className="absolute inset-0 opacity-90" style={{ backgroundColor: 'rgb(var(--accent-color))' }}></div>
                                <div className="text-center md:text-left relative z-10">
                                    <h3 className="text-xl font-bold opacity-90 text-white">Estimated CGPA</h3>
                                    <div className="text-4xl font-extrabold mt-1 text-white">
                                        {calculatedCGPA !== null ? calculatedCGPA : '-.--'}
                                    </div>
                                </div>
                                <button
                                    onClick={handleCalculateCGPA}
                                    className="bg-white/20 hover:bg-white/30 text-white font-bold py-3 px-8 rounded-xl transition shadow-lg backdrop-blur-sm border border-white/30 relative z-10"
                                >
                                    Calculate Now
                                </button>
                            </div>
                            {getUniqueSubjects().length === 0 && <p className="text-center py-10 mt-4 opacity-50 text-[var(--text-primary)]">No marks recorded to calculate CGPA.</p>}

                            {/* SGPA Section */}
                            <div className="mt-12 pt-8 border-t border-white/10">
                                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-[var(--text-primary)]"><GraduationCap className="w-6 h-6" style={{ color: 'rgb(var(--accent-color))' }} /> SGPA Calculator</h2>
                                <p className="text-sm opacity-60 mb-4 text-[var(--text-primary)]">Estimate GPA for a specific semester by manually entering expected grades and credits.</p>

                                <div className="space-y-4 mb-6 overflow-x-auto pb-2">
                                    {Array.from({ length: sgpaCourseCount }).map((_, i) => (
                                        <div key={i} className="flex gap-4 min-w-[300px]">
                                            <select className="flex-1 bg-transparent border border-white/20 rounded-lg px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:border-[rgb(var(--accent-color))]" onChange={e => {
                                                const val = parseInt(e.target.value);
                                                setSgpaCredits(prev => ({ ...prev, [`grade-${i}`]: val }));
                                            }}>
                                                <option className="bg-gray-800 text-white" value="0">Select Grade</option>
                                                <option className="bg-gray-800 text-white" value="10">O (10)</option>
                                                <option className="bg-gray-800 text-white" value="9">A+ (9)</option>
                                                <option className="bg-gray-800 text-white" value="8">A (8)</option>
                                                <option className="bg-gray-800 text-white" value="7">B+ (7)</option>
                                                <option className="bg-gray-800 text-white" value="6">B (6)</option>
                                                <option className="bg-gray-800 text-white" value="5">C (5)</option>
                                                <option className="bg-gray-800 text-white" value="0">RA (0)</option>
                                            </select>
                                            <input
                                                type="number"
                                                placeholder="Credits"
                                                className="w-24 bg-transparent border border-white/20 rounded-lg px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:border-[rgb(var(--accent-color))]"
                                                onChange={e => setSgpaCredits(prev => ({ ...prev, [`credit-${i}`]: parseFloat(e.target.value || 0) }))}
                                            />
                                        </div>
                                    ))}
                                    <button onClick={() => setSgpaCourseCount(c => c + 1)} className="text-sm font-bold hover:underline" style={{ color: 'rgb(var(--accent-color))' }}>+ Add Course</button>
                                </div>

                                <button onClick={() => {
                                    let totalPoints = 0;
                                    let totalCredits = 0;
                                    for (let i = 0; i < sgpaCourseCount; i++) {
                                        const g = sgpaCredits[`grade-${i}`] || 0;
                                        const c = sgpaCredits[`credit-${i}`] || 0;
                                        if (c > 0) {
                                            totalPoints += g * c;
                                            totalCredits += c;
                                        }
                                    }
                                    setCalculatedSGPA(totalCredits === 0 ? 0 : (totalPoints / totalCredits).toFixed(2));
                                }} className="w-full text-white font-bold py-3 rounded-xl transition shadow-lg opacity-90 hover:opacity-100" style={{ backgroundColor: 'rgb(var(--accent-color))' }}>
                                    Calculate SGPA
                                </button>

                                {calculatedSGPA && (
                                    <div className="mt-6 text-center rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
                                        <div className="absolute inset-0" style={{ backgroundColor: 'rgb(var(--accent-color))', opacity: 0.2 }}></div>
                                        <h3 className="text-xl font-bold opacity-90 relative z-10 text-[var(--text-primary)]">Estimated SGPA</h3>
                                        <div className="text-4xl font-extrabold mt-1 relative z-10" style={{ color: 'rgb(var(--accent-color))' }}>{calculatedSGPA}</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </main>
            </div >
        </div >
    );
};

export default StudentDashboard;
