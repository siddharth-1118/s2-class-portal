import { useState, useEffect } from 'react';

const ThemeSelectorMenu = ({ currentTheme = 'light', currentAccent = 'violet', currentFont = 'sans', onApply, onClose }) => {
    // Defensive initializers to prevent crashes
    const [tempTheme, setTempTheme] = useState(currentTheme);
    const [tempAccent, setTempAccent] = useState(currentAccent || 'violet');
    const [tempFont, setTempFont] = useState(currentFont || 'sans');

    // Safe helper for hex check
    const isHex = (val) => typeof val === 'string' && val.startsWith('#');

    const colorClasses = {
        violet: 'bg-violet-500',
        indigo: 'bg-indigo-500',
        blue: 'bg-blue-500',
        emerald: 'bg-emerald-500',
        orange: 'bg-orange-500',
        pink: 'bg-pink-500',
        red: 'bg-red-500',
        cyan: 'bg-cyan-500'
    };

    return (
        <>
            <div className="fixed inset-0 z-40" onClick={onClose}></div>
            <div className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-2xl p-4 w-60 z-50 border border-gray-100 animate-fade-in">

                {/* Theme Mode */}
                <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Theme Mode</h3>
                <div className="flex gap-2 mb-4">
                    <button onClick={() => setTempTheme('light')} className={`w-8 h-8 rounded-full border flex items-center justify-center ${tempTheme === 'light' ? 'border-2 border-primary ring-2 ring-primary/20' : 'border-gray-200'} bg-white text-yellow-500 transition`} title="Light">☀️</button>
                    <button onClick={() => setTempTheme('dark')} className={`w-8 h-8 rounded-full border flex items-center justify-center ${tempTheme === 'dark' ? 'border-2 border-primary ring-2 ring-primary/20' : 'border-gray-700'} bg-slate-900 text-white transition`} title="Dark">🌙</button>
                    <button onClick={() => setTempTheme('color-blind')} className={`w-8 h-8 rounded-full border flex items-center justify-center ${tempTheme === 'color-blind' ? 'border-2 border-primary ring-2 ring-primary/20' : 'border-gray-200'} bg-blue-100 text-blue-800 transition`} title="High Contrast">👁️</button>
                </div>

                {/* Accent Color */}
                <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Accent Color</h3>
                <div className="grid grid-cols-4 gap-2 mb-4">
                    {Object.keys(colorClasses).map(c => (
                        <button
                            key={c}
                            onClick={() => setTempAccent(c)}
                            className={`w-6 h-6 rounded-full transition hover:scale-110 ${colorClasses[c]} ${tempAccent === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''}`}
                        ></button>
                    ))}
                </div>

                {/* Custom Hex */}
                <div className="mb-4">
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Custom Hex</label>
                    <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-200">
                        <input
                            type="color"
                            className="w-6 h-6 rounded cursor-pointer border-none p-0 bg-transparent flex-shrink-0"
                            value={isHex(tempAccent) ? tempAccent : '#7c3aed'}
                            onChange={(e) => setTempAccent(e.target.value)}
                        />
                        <input
                            type="text"
                            className="text-xs text-gray-600 font-mono bg-transparent border-none focus:outline-none w-full uppercase"
                            value={tempAccent}
                            onChange={(e) => setTempAccent(e.target.value)}
                        />
                    </div>
                </div>

                {/* Font Selection */}
                <div className="mb-4">
                    <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Font Style</label>
                    <div className="flex gap-2">
                        {['sans', 'serif', 'mono'].map(f => (
                            <button
                                key={f}
                                onClick={() => setTempFont(f)}
                                className={`flex-1 py-1.5 text-xs border rounded transition ${tempFont === f ? 'bg-black text-white border-black dark:bg-slate-700' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}
                                style={{ fontFamily: f === 'sans' ? 'ui-sans-serif, system-ui' : f === 'serif' ? 'ui-serif, Georgia' : 'ui-monospace, SFMono-Regular' }}
                            >
                                {f === 'sans' ? 'Aa' : f === 'serif' ? 'Ag' : 'Code'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t border-gray-100">
                    <button onClick={onClose} className="flex-1 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-lg transition">Cancel</button>
                    <button
                        onClick={() => onApply(tempTheme, tempAccent, tempFont)}
                        className="flex-1 py-2 text-xs font-bold text-white bg-black dark:bg-slate-700 rounded-lg shadow-lg hover:opacity-90 transition active:scale-95"
                    >
                        Okay Apply
                    </button>
                </div>
            </div>
        </>
    );
};

export default ThemeSelectorMenu;
