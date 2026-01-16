import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from "jwt-decode";


const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005';

const Login = () => {
    const [isRegister, setIsRegister] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    // Removed unused Academia specific states as we use main fields now
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        const endpoint = isRegister ? `${API_URL}/api/auth/register` : `${API_URL}/api/auth/login`;
        // Send email/password as academia fallback automatically
        const body = isRegister
            ? { email, password, name, academiaEmail: email, academiaPassword: password }
            : { email, password };

        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message);

            if (isRegister) {
                setIsRegister(false);
                setError('Registration successful! Please login.');
            } else {
                login(data);
                navigate(data.user.role === 'admin' ? '/admin' : '/student');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };


    // Removed Google Handlers

    const [forgotMode, setForgotMode] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [resetMsg, setResetMsg] = useState('');

    const handleForgot = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: resetEmail })
            });
            const data = await res.json();
            if (res.ok) {
                setResetMsg('Reset link sent! (Check Server Console for Dev)');
            } else {
                setError(data.message);
            }
        } catch (e) { setError('Failed to request reset'); }
    }

    if (forgotMode) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 animate-gradient-xy p-4">
                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl p-8 max-w-md w-full animate-fade-in">
                    <h2 className="text-3xl font-extrabold text-center text-white mb-6">Reset Password</h2>
                    <p className="text-white/70 text-sm mb-6 text-center">Enter your email to receive a reset link.</p>
                    {error && <div className="bg-red-500/20 text-red-100 p-3 rounded mb-4 text-center text-sm">{error}</div>}
                    {resetMsg && <div className="bg-green-500/20 text-green-100 p-3 rounded mb-4 text-center text-sm">{resetMsg}</div>}

                    <form onSubmit={handleForgot} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-white/80 mb-1">Email Address</label>
                            <input
                                type="email"
                                required
                                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-pink-400"
                                value={resetEmail}
                                onChange={e => setResetEmail(e.target.value)}
                            />
                        </div>
                        <button type="submit" className="w-full py-3 bg-gradient-to-r from-pink-500 to-violet-600 rounded-lg text-white font-bold shadow-lg hover:shadow-xl transform transition hover:-translate-y-0.5">
                            Send Link
                        </button>
                        <button type="button" onClick={() => { setForgotMode(false); setError(''); setResetMsg(''); }} className="w-full text-white/70 hover:text-white text-sm transition">
                            Back to Login
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 animate-gradient-xy p-4">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl p-8 max-w-md w-full">
                <h2 className="text-3xl font-extrabold text-center text-white mb-6">
                    {isRegister ? 'Join Class' : 'Welcome Back'}
                </h2>
                {error && <div className="bg-red-500/20 text-red-100 p-3 rounded mb-4 text-center text-sm">{error}</div>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {isRegister && (
                        <div>
                            <label className="block text-sm font-medium text-white/80 mb-1">Full Name</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-pink-400"
                                placeholder="John Doe"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                disabled={isLoading}
                            />
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-1">Academia NetID (Email)</label>
                        <input
                            type="email"
                            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-pink-400"
                            placeholder="xx1234@srmist.edu.in"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={isLoading}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-1">Academia Password</label>
                        <input
                            type="password"
                            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-pink-400"
                            placeholder="Your Academia Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            disabled={isLoading}
                        />
                    </div>

                    {!isRegister && (
                        <div className="flex justify-end">
                            <button type="button" onClick={() => setForgotMode(true)} className="text-sm text-pink-200 hover:text-white transition">Forgot Password?</button>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className={`w-full py-3 bg-gradient-to-r from-pink-500 to-violet-600 rounded-lg text-white font-bold shadow-lg transform transition ${isLoading ? 'opacity-70 cursor-wait' : 'hover:shadow-xl hover:-translate-y-0.5'}`}
                    >
                        {isLoading
                            ? (isRegister ? 'Creating...' : 'Verifying...')
                            : (isRegister ? 'Register' : 'Login')
                        }
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => { setIsRegister(!isRegister); setError(''); }}
                        className="text-white/70 hover:text-white text-sm underline"
                        disabled={isLoading}
                    >
                        {isRegister ? 'Already have an account? Login' : 'Need an account? Register'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Login;
