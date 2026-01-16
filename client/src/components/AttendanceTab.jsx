import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaSync, FaExclamationTriangle, FaCheckCircle, FaUserLock, FaTimes } from 'react-icons/fa';
import { RefreshCcw } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005';

const AttendanceTab = ({ isBlocking = false, onSyncSuccess }) => {
    const [attendance, setAttendance] = useState([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [showSyncModal, setShowSyncModal] = useState(false);

    // Sync Creds
    const [creds, setCreds] = useState({ username: '', password: '' });

    useEffect(() => {
        if (!isBlocking) fetchAttendance();
    }, []);

    const fetchAttendance = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_URL}/api/academia/attendance`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAttendance(response.data);
            setLoading(false);
        } catch (err) {
            console.error(err);
            setError("Failed to load attendance");
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            const token = localStorage.getItem('token');
            // Trigger auto-sync
            await axios.post(`${API_URL}/api/academia/auto-sync`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Re-fetch data
            await fetchAttendance();
            // alert("Attendance refreshed from Academia!");
        } catch (error) {
            console.error("Refresh failed", error);
            setError("Refresh failed. Ensure you are logged in correctly.");
        } finally {
            setRefreshing(false);
        }
    };

    const handleSync = async (e) => {
        e.preventDefault();
        setSyncing(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/api/academia/sync`, creds, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setSyncing(false);
            setCreds({ username: '', password: '' });

            if (onSyncSuccess) {
                onSyncSuccess();
            } else {
                setShowSyncModal(false);
                await fetchAttendance();
            }

        } catch (err) {
            console.error(err);
            if (err.response && err.response.status === 401) {
                setError("Academia says: Invalid Credentials. Please check if your NetID/Password is correct.");
            } else {
                setError(err.response?.data?.message || "Sync failed. Connection to Academia failed.");
            }
            setSyncing(false);
        }
    };

    // If Blocking Mode, return just the form
    if (isBlocking) {
        return (
            <form onSubmit={handleSync} className="space-y-4">
                <div>
                    <label className="block text-gray-400 text-sm mb-1">NetID / Registration No.</label>
                    <input
                        type="text"
                        className="w-full bg-black/30 border border-white/10 rounded px-3 py-2 text-white focus:border-blue-500 outline-none transition-colors"
                        value={creds.username}
                        onChange={e => setCreds({ ...creds, username: e.target.value })}
                        required
                        placeholder="e.g. RA23..."
                    />
                </div>
                <div>
                    <label className="block text-gray-400 text-sm mb-1">Password</label>
                    <input
                        type="password"
                        className="w-full bg-black/30 border border-white/10 rounded px-3 py-2 text-white focus:border-blue-500 outline-none transition-colors"
                        value={creds.password}
                        onChange={e => setCreds({ ...creds, password: e.target.value })}
                        required
                    />
                </div>

                {error && (
                    <div className="text-red-400 text-sm bg-red-400/10 p-2 rounded">
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={syncing}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-3 rounded-lg transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 flex justify-center items-center gap-2"
                >
                    {syncing ? <>Connecting <FaSync className="animate-spin" /></> : "Connect Account"}
                </button>
            </form>
        );
    }

    // Color logic for attendance percentage
    const getColor = (pct) => {
        if (pct >= 80) return 'text-green-400';
        if (pct >= 75) return 'text-yellow-400';
        return 'text-red-400'; // Danger zone
    };

    return (
        <div className="space-y-6 pb-20 fade-in">
            {/* Header */}
            <div className="flex justify-between items-center glass-panel p-4 rounded-xl">
                <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent flex items-center gap-2">
                        My Attendance
                        <button
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className="ml-2 p-2 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition"
                            title="Refresh from Academia"
                        >
                            <RefreshCcw size={18} className={refreshing ? "animate-spin" : ""} />
                        </button>
                    </h2>
                    <p className="text-gray-400 text-sm">Synced from Academia</p>
                </div>
                {/* Manual Sync Removed as per request (Moved to Signup) */}
            </div>

            {loading ? (
                <div className="text-center py-10 text-gray-400 animate-pulse">Loading records...</div>
            ) : error && !showSyncModal ? (
                <div className="glass-panel p-4 border border-red-500/30 text-red-300 flex items-center gap-3">
                    <FaExclamationTriangle /> {error}
                </div>
            ) : attendance.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                    <FaUserLock className="mx-auto text-4xl mb-4 opacity-50" />
                    No attendance data found.
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2">
                    {attendance.map((record, idx) => (
                        <div key={idx} className="glass-panel p-5 relative overflow-hidden group hover:scale-[1.01] transition-transform">
                            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                <span className="text-6xl font-bold">{record.attendance_percentage}%</span>
                            </div>

                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-lg text-white truncate w-4/5" title={record.course_title}>
                                        {record.course_code}
                                    </h3>
                                    <span className={`font-mono font-bold text-xl ${getColor(record.attendance_percentage)}`}>
                                        {record.attendance_percentage}%
                                    </span>
                                </div>
                                <p className="text-gray-400 text-sm mb-4 truncate">{record.course_title}</p>

                                <div className="grid grid-cols-2 gap-2 text-sm bg-black/20 p-3 rounded-lg">
                                    <div>
                                        <span className="text-gray-500 block text-xs">Conducted</span>
                                        <span className="text-gray-200">{record.hours_conducted} hrs</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 block text-xs">Absent</span>
                                        <span className="text-red-300">{record.hours_absent} hrs</span>
                                    </div>
                                    <div className="col-span-2 mt-1 pt-1 border-t border-white/5 flex justify-between">
                                        <span className="text-gray-500 text-xs">Safe Limit: 75%</span>
                                        {record.attendance_percentage < 75 && (
                                            <span className="text-red-400 text-xs font-bold animate-pulse">Low Attendance!</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Sync Modal */}
            {showSyncModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="glass-panel w-full max-w-sm p-6 relative animate-in fade-in zoom-in duration-200">
                        <button
                            onClick={() => setShowSyncModal(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white"
                        >
                            <FaTimes />
                        </button>

                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <FaUserLock className="text-blue-400" />
                            Academia Login
                        </h3>

                        <p className="text-sm text-blue-200/80 mb-4 bg-blue-500/10 p-3 rounded border border-blue-500/20">
                            Your credentials will be <strong>encrypted and saved securely</strong> to keep your timetable and attendance up to date automatically.
                        </p>

                        <form onSubmit={handleSync} className="space-y-4">
                            <div>
                                <label className="block text-gray-400 text-sm mb-1">Email / NetID</label>
                                <input
                                    type="text"
                                    className="w-full bg-black/30 border border-white/10 rounded px-3 py-2 text-white focus:border-blue-500 outline-none transition-colors"
                                    value={creds.username}
                                    onChange={e => setCreds({ ...creds, username: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-1">Password</label>
                                <input
                                    type="password"
                                    className="w-full bg-black/30 border border-white/10 rounded px-3 py-2 text-white focus:border-blue-500 outline-none transition-colors"
                                    value={creds.password}
                                    onChange={e => setCreds({ ...creds, password: e.target.value })}
                                    required
                                />
                            </div>

                            {error && (
                                <div className="text-red-400 text-sm bg-red-400/10 p-2 rounded">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={syncing}
                                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-2 rounded-lg transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 flex justify-center items-center gap-2"
                            >
                                {syncing ? <>Connecting <FaSync className="animate-spin" /></> : "Sync Data"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AttendanceTab;
