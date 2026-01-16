import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { Bell, LogOut, BookOpen, Clock, AlertCircle, CheckCircle, GraduationCap, Lock, Save, Calendar, BarChart2, Settings, Palette, User, Utensils, Award, Menu } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { useTheme } from '../context/ThemeContext';
import CalendarTab from '../components/CalendarTab';
import TimetableTab from '../components/TimetableTab';
import MessTab from '../components/MessTab';
import AttendanceTab from '../components/AttendanceTab';
import VFXLayer from '../components/VFXLayer';
// import GalleryTab from '../components/GalleryTab';
import MobileNav from '../components/MobileNav';
import ThemeSelectionModal from '../components/ThemeSelectionModal';

const NoticesList = ({ API_URL }) => {
    const [notices, setNotices] = useState([]);
    useEffect(() => {
        fetch(`${API_URL}/api/notices`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } })
            .then(res => res.json())
            .then(data => setNotices(data))
            .catch(err => console.error(err));
    }, [API_URL]);

    if (notices.length === 0) return <div className="text-center opacity-50 py-10">No notices found.</div>;

    return (
        <>
            {notices.map((n) => (
                <div key={n.id} className="bg-white/5 border border-white/10 p-5 rounded-2xl relative overflow-hidden group hover:bg-white/10 transition">
                    <div className={`absolute top-0 left-0 w-1 h-full ${n.category === 'urgent' ? 'bg-red-500' : 'bg-[rgb(var(--accent-color))]'}`}></div>
                    <div className="flex justify-between items-start mb-2 pl-2">
                        <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded ${n.category === 'urgent' ? 'bg-red-500/20 text-red-300' : 'bg-white/10 text-[var(--text-primary)]'}`}>
                            {n.category}
                        </span>
                        <span className="text-xs opacity-50 font-mono">{new Date(n.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="pl-2 text-lg leading-relaxed text-[var(--text-primary)]">{n.message}</p>
                    <div className="mt-4 pl-2 flex items-center gap-2 text-xs opacity-50">
                        <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center font-bold">A</div>
                        Posted by {n.created_by || 'Admin'}
                    </div>
                </div>
            ))}
        </>
    );
};


const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005';

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

    // Tab Persistence
    const [activeTab, setActiveTab] = useState(() => localStorage.getItem('activeStudentTab') || 'homework');
    useEffect(() => {
        localStorage.setItem('activeStudentTab', activeTab);
    }, [activeTab]);

    const [timetableDate, setTimetableDate] = useState(null);
    const [timetableDay, setTimetableDay] = useState(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Helper: Calculate Day Order (1-5) based on Anchor
    // Anchor: Jan 13, 2026 (Tuesday) = Day 4
    const calculateDayOrder = (dateInput) => {
        const date = new Date(dateInput);
        const anchorDate = new Date('2026-01-13T00:00:00'); // Day 4

        // Reset hours for accurate diff
        date.setHours(0, 0, 0, 0);
        anchorDate.setHours(0, 0, 0, 0);

        // Count ONLY weekdays (Mon-Fri) between anchor and date
        let currentDate = new Date(anchorDate);
        let daysDiff = 0;

        // Direction
        const isFuture = date >= anchorDate;

        while (currentDate.getTime() !== date.getTime()) {
            if (isFuture) {
                currentDate.setDate(currentDate.getDate() + 1);
                const day = currentDate.getDay();
                if (day !== 0 && day !== 6) daysDiff++; // Skip Sun=0, Sat=6
            } else {
                const day = currentDate.getDay();
                if (day !== 0 && day !== 6) daysDiff--;
                currentDate.setDate(currentDate.getDate() - 1);
            }
        }

        // Anchor is Day 4. 
        // 4 + diff
        let calculated = (4 + daysDiff) % 5;
        if (calculated <= 0) calculated += 5; // Handle negative modulo or 0

        return `Day ${calculated}`;
    };

    const handleDateSelect = (date) => {
        setTimetableDate(date);
        const dayOrder = calculateDayOrder(date);
        setTimetableDay(dayOrder);
        setActiveTab('timetable');
    };

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
    const [showFontModal, setShowFontModal] = useState(false);
    const [selectionAnim, setSelectionAnim] = useState({ show: false, id: '', emoji: '', theme: '' });



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

    // Profile State
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

    // Check for Academia Sync Requirement
    const [showMandatorySync, setShowMandatorySync] = useState(false);

    useEffect(() => {
        // If we have loaded timetable/attendance status and it's empty, require sync
        if (timetable !== null && timetable.length === 0 && !loadingTimetable) {
            setShowMandatorySync(true);
        } else if (timetable && timetable.length > 0) {
            setShowMandatorySync(false);
        }
    }, [timetable]);

    // Loading state for initial checks
    const [loadingTimetable, setLoadingTimetable] = useState(true);
    useEffect(() => {
        if (timetable) setLoadingTimetable(false);
    }, [timetable]);


    const fetchStudentProfile = async () => {
        try {
            const res = await fetch(`${API_URL}/api/marks/profile`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.status === 403) { logout(); navigate('/'); return; }
            if (res.ok) {
                const data = await res.json();
                setStudentProfile(data);
                // No longer showing manual lock modal
            }
        } catch (e) { console.error(e); }
    }

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
            {/* Authentication/Sync Modal (Blocking) */}
            {showMandatorySync && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in zoom-in">
                    <div className="glass-panel w-full max-w-md p-8 relative rounded-2xl border border-blue-500/50 shadow-[0_0_50px_rgba(59,130,246,0.5)]">
                        <div className="text-center mb-8">
                            <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                                <span className="text-4xl">🏛️</span>
                            </div>
                            <h2 className="text-3xl font-bold text-white mb-2">Connect Academia</h2>
                            <p className="text-blue-200">
                                To access the Student Portal, you must link your Academia account.
                                We will generate your **Personal Timetable** and **Attendance** automatically.
                            </p>
                        </div>

                        <AttendanceTab isBlocking={true} onSyncSuccess={() => {
                            setShowMandatorySync(false);
                            // Refresh all data
                            fetchTimetable();
                            fetchStudentProfile();
                            fetchAttendance(); // Need access to this function or reload
                            window.location.reload(); // Simplest way to refresh everything including context if needed
                        }} />
                    </div>
                </div>
            )}



            {/* Background Pattern */}
            <div className={`fixed inset-0 z-0 pointer-events-none opacity-20 bg-pattern ${bgPattern}`}></div>
            <VFXLayer />

            {/* Selection Animation Overlay */}
            {selectionAnim.show && (
                <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center overflow-hidden">
                    <div className={`text-9xl ${selectionAnim.anim} relative`}>
                        {selectionAnim.emoji}
                        {selectionAnim.id === 'space' && <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-6xl animate-pulse">🔥</div>}
                    </div>
                    <div className="absolute bottom-10 w-full text-center">
                        <h2 className="text-4xl md:text-6xl font-black text-white bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600 animate-pulse">
                            ENTERING {selectionAnim.theme ? selectionAnim.theme.toUpperCase() : 'REALM'}...
                        </h2>
                    </div>
                </div>
            )}

            {/* Character Selection Modal (Creature Gallery) */}
            <ThemeSelectionModal
                show={showCharacterModal}
                onClose={() => setShowCharacterModal(false)}
                onSelect={(char) => {
                    // 1. Trigger Animation
                    setSelectionAnim({ show: true, id: char.id, emoji: char.emoji, theme: char.theme, anim: char.entryAnim || 'anim-pop' });
                    setShowCharacterModal(false);

                    // 2. Wait for animation, then set theme
                    setTimeout(() => {
                        setCharacter(char);
                        toggleTheme(char.theme);
                        setAccentColor(char.accent);
                        setBgPattern(''); // Clear explicit bg pattern to let theme show
                        setSelectionAnim({ show: false, id: '', emoji: '', theme: '', anim: '' });
                    }, 2800); // Wait for animation
                }}
                currentCharacterId={character?.id}
            />

            {/* Floating Creature - HIDDEN ON MOBILE */}
            {character && (
                <div className={`fixed bottom-24 right-4 md:bottom-10 md:right-10 z-40 pointer-events-none ${character.anim || 'creature-float'} hidden md:block`}>
                    <div className="text-6xl filter drop-shadow-2xl opacity-90 hover:scale-110 transition cursor-pointer pointer-events-auto" onClick={() => setShowCharacterModal(true)} title="Change Companion">
                        {character.emoji}
                    </div>
                </div>
            )}

            <div className="w-full md:max-w-6xl mx-auto px-4 md:px-0 relative z-10">
                <header className="sticky top-0 md:top-6 z-50 flex flex-row justify-between items-center mb-6 md:mb-10 glass-card p-4 md:p-6 rounded-none md:rounded-2xl animate-fade-in gap-4 shadow-xl transition-all duration-300 border-b border-white/5 md:border-transparent -mx-4 md:mx-0 px-6">
                    <div className="flex items-center gap-4">
                        {/* Mobile Menu Trigger */}
                        <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden p-2 -ml-2 rounded-full hover:bg-white/10 text-[var(--text-primary)]">
                            <Menu className="w-6 h-6" />
                        </button>

                        <div className="hidden md:flex rounded-full shadow-lg bg-white overflow-hidden w-12 h-12 items-center justify-center border-2 border-[rgba(var(--accent-color),0.3)]">
                            <img src="/logo.png" alt="Logo" className="w-full h-full object-cover" />
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
                        <div className="hidden md:flex bg-white/10 p-1 rounded-3xl flex-wrap justify-center gap-1 border border-white/20 w-full md:w-auto">
                            {['homework', 'marks', 'timetable', 'attendance', 'mess', 'analytics', 'calendar', 'cgpa', 'notices'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-4 py-2 rounded-full text-sm font-bold transition capitalize ${activeTab === tab ? 'text-white shadow-md' : 'text-[var(--text-primary)] hover:bg-white/10'}`}
                                    style={activeTab === tab ? { backgroundColor: 'rgb(var(--accent-color))' } : {}}
                                >
                                    {tab === 'cgpa' ? 'CGPA' : tab === 'marks' ? 'Grades' : tab === 'homework' ? 'Assignments' : tab}
                                </button>
                            ))}
                        </div>

                        {/* Profile Button */}
                        <button
                            onClick={() => setActiveTab('profile')}
                            className={`p-1 pl-2 pr-4 rounded-full flex items-center gap-3 transition border ${activeTab === 'profile' ? 'bg-white text-slate-900 border-transparent shadow-lg' : 'bg-white/10 border-white/20 text-[var(--text-primary)] hover:bg-white/20'}`}
                        >
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xs font-bold text-white uppercase">
                                {user.name.charAt(0)}
                            </div>
                            <div className="text-left hidden md:block">
                                <div className="text-xs opacity-60 font-bold uppercase tracking-wider">Profile</div>
                            </div>
                        </button>

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

                            {/* Font Studio Toggle */}
                            <button
                                onClick={() => setShowFontModal(true)}
                                className="p-3 rounded-full shadow-md transition bg-white text-gray-600 hover:bg-gray-100 dark:bg-slate-800 dark:text-gray-300 dark:border-slate-700 border"
                                title="Change Font Style"
                            >
                                <span className="text-lg font-serif italic">Aa</span>
                            </button>

                            <button onClick={() => { logout(); navigate('/'); }} className="bg-white text-gray-400 hover:text-red-500 p-3 rounded-full shadow-md transition">
                                <LogOut className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </header>

                {/* Font Studio Modal */}
                {showFontModal && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in overflow-y-auto">
                        <div className="bg-slate-900 rounded-3xl p-8 max-w-5xl w-full shadow-2xl border border-slate-700 relative my-auto">
                            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-teal-500 to-green-500"></div>
                            <h2 className="text-3xl font-extrabold text-white text-center mb-2">Font Studio</h2>
                            <p className="text-gray-400 text-center mb-8">Select a typography style to personalize your portal.</p>

                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 max-h-[60vh] overflow-y-auto p-2 custom-scrollbar">
                                {[
                                    { name: 'Inter', id: 'inter', type: 'Sans' },
                                    { name: 'Roboto', id: 'roboto', type: 'Sans' },
                                    { name: 'Open Sans', id: 'open-sans', type: 'Sans' },
                                    { name: 'Lato', id: 'lato', type: 'Sans' },
                                    { name: 'Montserrat', id: 'montserrat', type: 'Sans' },
                                    { name: 'Oswald', id: 'oswald', type: 'Sans' },
                                    { name: 'Raleway', id: 'raleway', type: 'Sans' },
                                    { name: 'Poppins', id: 'poppins', type: 'Sans' },
                                    { name: 'Nunito', id: 'nunito', type: 'Sans' },
                                    { name: 'Ubuntu', id: 'ubuntu', type: 'Sans' },
                                    { name: 'Merriweather', id: 'merriweather', type: 'Serif' },
                                    { name: 'Playfair', id: 'playfair', type: 'Serif' },
                                    { name: 'Lora', id: 'lora', type: 'Serif' },
                                    { name: 'Roboto Slab', id: 'roboto-slab', type: 'Serif' },
                                    { name: 'Arvo', id: 'arvo', type: 'Serif' },
                                    { name: 'Pacifico', id: 'pacifico', type: 'Handwriting' },
                                    { name: 'Dancing', id: 'dancing', type: 'Handwriting' },
                                    { name: 'Indie Flower', id: 'indie', type: 'Handwriting' },
                                    { name: 'Amatic SC', id: 'amatic', type: 'Handwriting' },
                                    { name: 'Shadows Into Light', id: 'shadows', type: 'Handwriting' },
                                    { name: 'Orbitron', id: 'orbitron', type: 'Display' },
                                    { name: 'Press Start', id: 'press-start', type: 'Display' },
                                    { name: 'Creepster', id: 'creepster', type: 'Display' },
                                    { name: 'Cinzel', id: 'cinzel', type: 'Display' },
                                    { name: 'Bangers', id: 'bangers', type: 'Display' },
                                    { name: 'Righteous', id: 'righteous', type: 'Display' },
                                    { name: 'Fredericka', id: 'fredericka', type: 'Display' },
                                ].map((f) => (
                                    <button
                                        key={f.id}
                                        onClick={() => {
                                            setFont(f.id);
                                            setShowFontModal(false);
                                        }}
                                        className={`group relative bg-slate-800 rounded-xl p-4 hover:bg-slate-700 transition-all duration-300 hover:scale-105 border border-slate-700 hover:border-white/20 text-center font-${f.id}`}
                                    >
                                        <span className="text-3xl block mb-2">Aa</span>
                                        <span className="text-sm font-bold text-gray-300 group-hover:text-white">{f.name}</span>
                                        <span className="text-[10px] text-gray-500 block uppercase mt-1">{f.type}</span>
                                    </button>
                                ))}
                            </div>
                            <button onClick={() => setShowFontModal(false)} className="mt-6 w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl font-bold transition">Close Studio</button>
                        </div>
                    </div>
                )}

                <MobileNav
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    isOpen={isMobileMenuOpen}
                    onClose={() => setIsMobileMenuOpen(false)}
                    onLogout={() => { logout(); navigate('/'); }}
                    tabs={[
                        { id: 'homework', label: 'Home', icon: <BookOpen className="w-6 h-6" /> },
                        { id: 'marks', label: 'Grades', icon: <GraduationCap className="w-6 h-6" /> },
                        { id: 'timetable', label: 'Time', icon: <Clock className="w-6 h-6" /> },
                        { id: 'attendance', label: 'Attendance', icon: <CheckCircle className="w-6 h-6" /> },
                        { id: 'mess', label: 'Mess', icon: <Utensils className="w-6 h-6" /> },
                        { id: 'analytics', label: 'Stats', icon: <BarChart2 className="w-6 h-6" /> },
                        { id: 'calendar', label: 'Calendar', icon: <Calendar className="w-6 h-6" /> },
                        { id: 'cgpa', label: 'CGPA', icon: <Award className="w-6 h-6" /> },
                        { id: 'notices', label: 'Notices', icon: <Bell className="w-6 h-6" /> },
                        { id: 'profile', label: 'Profile', icon: <User className="w-6 h-6" /> },
                    ]}
                />

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
                            {/* <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-[var(--text-primary)]"><Calendar className="w-6 h-6" style={{ color: 'rgb(var(--accent-color))' }} /> Class Schedule</h2> */}
                            <TimetableTab user={user} initialDay={timetableDay} />
                        </div>
                    )}

                    {activeTab === 'attendance' && <AttendanceTab />}

                    {activeTab === 'mess' && <MessTab />}

                    {activeTab === 'calendar' && <CalendarTab user={user} onDateSelect={handleDateSelect} />}

                    {activeTab === 'analytics' && (
                        <div className="glass-card rounded-2xl p-8 min-h-[500px]">
                            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-[var(--text-primary)]"><BarChart2 className="w-6 h-6" style={{ color: 'rgb(var(--accent-color))' }} /> Performance Analytics</h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="p-6 rounded-2xl shadow-sm border border-white/10 glass">
                                    <h3 className="text-lg font-bold mb-4 opacity-90 text-[var(--text-primary)]">Subject Average (%)</h3>
                                    <div style={{ width: '100%', height: 300 }}>
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
                                    <div style={{ width: '100%', height: 300 }}>
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

                    {activeTab === 'notices' && (
                        <div className="glass-card rounded-2xl p-6 min-h-[500px]">
                            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-[var(--text-primary)]"><Bell className="w-6 h-6" style={{ color: 'rgb(var(--accent-color))' }} /> Notices Board</h2>
                            <div className="space-y-4">
                                <NoticesList API_URL={API_URL} />
                            </div>
                        </div>
                    )}

                    {activeTab === 'profile' && (
                        <div className="glass-card max-w-2xl mx-auto rounded-3xl p-8 shadow-2xl animate-slide-up">
                            <div className="text-center mb-8">
                                <div className="w-24 h-24 mx-auto bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-full flex items-center justify-center text-4xl font-bold text-white mb-4 shadow-lg">
                                    {user.name.charAt(0)}
                                </div>
                                <h2 className="text-3xl font-extrabold text-[var(--text-primary)]">{user.name}</h2>
                                <p className="opacity-60 text-[var(--text-primary)]">{user.email}</p>
                            </div>

                            <div className="space-y-6">
                                <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                                    <h3 className="text-xs font-bold uppercase opacity-50 mb-4 tracking-widest text-[var(--text-primary)]">Academic Details</h3>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-xs opacity-60 mb-1 text-[var(--text-primary)]">Register Number</label>
                                            <div className="text-xl font-mono font-bold text-[var(--text-primary)]">{studentProfile?.register_number || 'Not Linked'}</div>
                                        </div>
                                        <div>
                                            <label className="block text-xs opacity-60 mb-1 text-[var(--text-primary)]">Section</label>
                                            <div className="text-xl font-bold text-[var(--text-primary)]">{studentProfile?.section || '-'}</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                                    <h3 className="text-xs font-bold uppercase opacity-50 mb-4 tracking-widest text-[var(--text-primary)]">Contact Info</h3>
                                    <div>
                                        <label className="block text-xs opacity-60 mb-1 text-[var(--text-primary)]">Mobile Number</label>
                                        <div className="text-lg font-medium text-[var(--text-primary)]">{studentProfile?.mobile || '-'}</div>
                                    </div>
                                </div>

                                {studentProfile?.is_locked ? (
                                    <div className="text-center text-sm opacity-50 py-4 text-[var(--text-primary)]">
                                        <Lock className="w-4 h-4 inline-block mr-1" /> Profile is managed by your Academia Sync.
                                    </div>
                                ) : (
                                    <div className="text-center text-sm opacity-50 py-4 text-[var(--text-primary)]">
                                        <FaSync className="w-3 h-3 inline-block mr-1" /> Details auto-synced from Academia.
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
