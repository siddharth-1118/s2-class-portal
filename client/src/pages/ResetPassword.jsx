import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Lock, Save } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();

    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [msg, setMsg] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMsg(''); setError('');

        if (password !== confirm) {
            setError("Passwords don't match");
            return;
        }

        try {
            const res = await fetch(`${API_URL}/api/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, newPassword: password })
            });
            const data = await res.json();
            if (res.ok) {
                setMsg('Password updated! Redirecting to login...');
                setTimeout(() => navigate('/'), 2000);
            } else {
                setError(data.message || 'Failed to reset password');
            }
        } catch (err) {
            console.error(err);
            setError('Something went wrong');
        }
    };

    if (!token) return <div className="text-white text-center p-10">Invalid Link</div>;

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 font-sans">
            <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl max-w-md w-full border border-slate-700">
                <div className="text-center mb-6">
                    <div className="bg-violet-600 p-3 rounded-full w-fit mx-auto mb-4 shadow-lg shadow-violet-500/30">
                        <Lock className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-white">Reset Password</h2>
                    <p className="text-slate-400 text-sm mt-2">Enter your new password below.</p>
                </div>

                {msg && <div className="bg-green-500/20 text-green-400 p-3 rounded-lg mb-4 text-center text-sm font-bold">{msg}</div>}
                {error && <div className="bg-red-500/20 text-red-400 p-3 rounded-lg mb-4 text-center text-sm font-bold">{error}</div>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">New Password</label>
                        <input
                            type="password"
                            required
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Confirm Password</label>
                        <input
                            type="password"
                            required
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
                            value={confirm}
                            onChange={e => setConfirm(e.target.value)}
                        />
                    </div>
                    <button type="submit" className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-3.5 rounded-xl shadow-lg transition flex items-center justify-center gap-2">
                        <Save className="w-4 h-4" /> Update Password
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ResetPassword;
