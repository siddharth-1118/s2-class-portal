import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Trash2 } from 'lucide-react';

const MarksTab = ({ user }) => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const [marks, setMarks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMarks();
    }, []);

    const fetchMarks = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/api/marks`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMarks(res.data);
            setLoading(false);
        } catch (error) {
            console.error("Failed to fetch marks", error);
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Chart Section */}
            <div className="bg-slate-900/50 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-xl">
                <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
                    Performance Analytics
                </h3>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={marks}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                            <XAxis dataKey="subject" stroke="#94a3b8" tick={{ fontSize: 12 }} interval={0} angle={-15} textAnchor="end" />
                            <YAxis stroke="#94a3b8" />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }}
                                itemStyle={{ color: '#60a5fa' }}
                            />
                            <Bar dataKey="score" fill="url(#colorGradient)" radius={[4, 4, 0, 0]} />
                            <defs>
                                <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.2} />
                                </linearGradient>
                            </defs>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* List Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {marks.map((m) => (
                    <div key={m.id} className="bg-slate-800/80 p-4 rounded-xl border border-white/5 flex justify-between items-center">
                        <div>
                            <div className="font-bold text-white">{m.subject}</div>
                            <div className="text-xs text-slate-400">{m.exam_type}</div>
                        </div>
                        <div className="text-right">
                            <div className="text-2xl font-bold text-blue-400">{m.score}/{m.max_marks}</div>
                            <div className="text-xs text-slate-500">{new Date(m.created_at).toLocaleDateString()}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MarksTab;
