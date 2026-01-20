import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from "jwt-decode";
import { User, Lock, Loader2 } from 'lucide-react';


const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        // We only use the LOGIN endpoint now.
        // The backend will handle "Auto-Register if Verified via Academia" logic.
        const endpoint = `${API_URL}/api/auth/login`;

        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    password,
                    // Send explicit instructions that this is a direct login attempt
                    isDirectLogin: true
                })
            });

            const data = await res.json();
            console.log("Login Response Data:", data); // DEBUG

            if (!res.ok) throw new Error(data.message || 'Login failed');

            if (!data.user) {
                console.error("Login successful but no user data:", data);
                throw new Error("Invalid server response: Missing user data");
            }

            login(data);
            navigate(data.user.role === 'admin' ? '/admin' : '/student');

        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

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
                setResetMsg('Reset link sent!');
            } else {
                setError(data.message);
            }
        } catch (e) { setError('Failed to request reset'); }
    }

    if (forgotMode) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 animate-gradient-xy p-4">
                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl p-8 max-w-md w-full animate-fade-in relative overflow-hidden">
                    {/* Decorative background elements */}
                    <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-purple-500/30 rounded-full blur-3xl"></div>
                        <div className="absolute top-20 -left-10 w-40 h-40 bg-blue-500/30 rounded-full blur-3xl"></div>
                    </div>

                    <div className="relative z-10">
                        <h2 className="text-3xl font-extrabold text-center text-white mb-6 font-['Outfit']">Reset Password</h2>
                        <p className="text-white/70 text-sm mb-6 text-center">Enter your email to receive a reset link.</p>
                        {error && <div className="bg-red-500/20 text-red-100 p-3 rounded mb-4 text-center text-sm backdrop-blur-sm border border-red-500/30">{error}</div>}
                        {resetMsg && <div className="bg-green-500/20 text-green-100 p-3 rounded mb-4 text-center text-sm backdrop-blur-sm border border-green-500/30">{resetMsg}</div>}

                        <form onSubmit={handleForgot} className="space-y-5">
                            <div className="relative group">
                                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 group-focus-within:text-pink-400 transition-colors" size={20} />
                                <input
                                    type="email"
                                    required
                                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-transparent transition-all hover:bg-white/10"
                                    placeholder="Enter your email"
                                    value={resetEmail}
                                    onChange={e => setResetEmail(e.target.value)}
                                />
                            </div>
                            <button type="submit" className="w-full py-3 bg-gradient-to-r from-pink-500 to-violet-600 rounded-xl text-white font-bold shadow-lg hover:shadow-pink-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200">
                                Send Link
                            </button>
                            <button type="button" onClick={() => { setForgotMode(false); setError(''); setResetMsg(''); }} className="w-full text-white/60 hover:text-white text-sm transition py-2">
                                Back to Login
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#09090b] relative overflow-hidden">
            {/* Dynamic Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 via-purple-600/20 to-pink-600/20"></div>
            <div className="absolute w-[500px] h-[500px] bg-purple-600/30 rounded-full blur-[100px] -top-20 -left-20 animate-pulse"></div>
            <div className="absolute w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[100px] bottom-0 right-0 animate-pulse delay-1000"></div>

            <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-8 max-w-md w-full m-4 relative z-10 animate-fade-in-up">
                <div className="text-center mb-8">
                    <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 mb-2 font-['Outfit']">
                        Welcome
                    </h2>
                    <p className="text-gray-400 text-sm">Login with your Academia Credentials</p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-200 p-4 rounded-xl mb-6 text-sm flex items-center gap-2 animate-shake">
                        <div className="w-1 h-1 rounded-full bg-red-400"></div>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-400 ml-1 uppercase tracking-wider">Academia NetID</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <User className="h-5 w-5 text-gray-500 group-focus-within:text-indigo-400 transition-colors" />
                            </div>
                            <input
                                type="email"
                                className="block w-full pl-10 pr-3 py-3 border border-white/10 rounded-xl leading-5 bg-white/5 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 sm:text-sm transition-all hover:bg-white/10"
                                placeholder="xx1234@srmist.edu.in"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-400 ml-1 uppercase tracking-wider">Password</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-gray-500 group-focus-within:text-pink-400 transition-colors" />
                            </div>
                            <input
                                type="password"
                                className="block w-full pl-10 pr-3 py-3 border border-white/10 rounded-xl leading-5 bg-white/5 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500/50 sm:text-sm transition-all hover:bg-white/10"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-end">
                        <button
                            type="button"
                            onClick={() => setForgotMode(true)}
                            className="text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                        >
                            Forgot Password?
                        </button>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-lg shadow-purple-500/30 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <span className="flex items-center gap-2">
                                <Loader2 className="animate-spin" size={18} />
                                Verifying with Academia...
                            </span>
                        ) : (
                            "Access Portal"
                        )}
                    </button>
                </form>

                <p className="mt-8 text-center text-xs text-gray-500">
                    Use your SRM Academia credentials to login. <br />
                    We verify directly with the university portal.
                </p>
            </div>
        </div>
    );
};

export default Login;
