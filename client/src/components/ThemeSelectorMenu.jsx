import { useState } from 'react';

const ThemeSelectorMenu = ({ currentTheme, currentAccent, onApply, onClose }) => {
    const [tempTheme, setTempTheme] = useState(currentTheme);
    const [tempAccent, setTempAccent] = useState(currentAccent);

    return (
        <>
            <div className="fixed inset-0 z-40" onClick={onClose}></div>
            <div className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-2xl p-4 w-60 z-50 border border-gray-100 animate-fade-in">
                <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Theme Mode</h3>
                <div className="flex gap-2 mb-4">
                    <button onClick={() => setTempTheme('light')} className={`w-8 h-8 rounded-full border flex items-center justify-center ${tempTheme === 'light' ? 'border-2 border-primary ring-2 ring-primary/20' : 'border-gray-200'} bg-white transition`} title="Light">☀️</button>
                    <button onClick={() => setTempTheme('dark')} className={`w-8 h-8 rounded-full border flex items-center justify-center ${tempTheme === 'dark' ? 'border-2 border-primary ring-2 ring-primary/20' : 'border-gray-700'} bg-slate-900 text-white transition`} title="Dark">🌙</button>
                    <button onClick={() => setTempTheme('color-blind')} className={`w-8 h-8 rounded-full border flex items-center justify-center ${tempTheme === 'color-blind' ? 'border-2 border-primary ring-2 ring-primary/20' : 'border-gray-200'} bg-blue-100 text-blue-800 transition`} title="High Contrast">👁️</button>
                </div>

                <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Accent Color</h3>
                <div className="grid grid-cols-4 gap-2 mb-4">
                    {['violet', 'indigo', 'blue', 'emerald', 'orange', 'pink', 'red', 'cyan'].map(c => (
                        <button
                            key={c}
                            onClick={() => setTempAccent(c)}
                            className={`w-6 h-6 rounded-full bg-${c}-500 transition hover:scale-105 ${tempAccent === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''}`}
                        ></button>
                    ))}
                </div>

                <div className="mb-4">
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Custom Hex</label>
                    <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-200">
                        <input
                            type="color"
                            className="w-6 h-6 rounded cursor-pointer border-none p-0 bg-transparent flex-shrink-0"
                            value={tempAccent.startsWith('#') ? tempAccent : '#7c3aed'}
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

                <div className="flex gap-2 pt-2 border-t border-gray-100">
                    <button onClick={onClose} className="flex-1 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-lg transition">Cancel</button>
                    <button
                        onClick={() => onApply(tempTheme, tempAccent)}
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
