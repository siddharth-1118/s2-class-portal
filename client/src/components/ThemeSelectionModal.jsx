import React from 'react';

const ThemeSelectionModal = ({ show, onClose, onSelect, currentCharacterId }) => {
    if (!show) return null;

    const themes = [
        // EXISTING THEMES
        { id: 'cyberpunk', name: 'Neon Glitch', emoji: '👾', desc: 'Futuristic hacker bot.', theme: 'cyberpunk', accent: 'neon', anim: 'creature-glitch', entryAnim: 'anim-glitch' },
        { id: 'fantasy', name: 'Golden Dragon', emoji: '🐉', desc: 'Guardian of treasure.', theme: 'fantasy', accent: 'gold', anim: 'creature-float', entryAnim: 'anim-spin' },
        { id: 'space', name: 'Cosmic Rocket', emoji: '🚀', desc: 'Voyager of stars.', theme: 'space', accent: 'starlight', anim: 'creature-pulse', entryAnim: 'anim-rocket-launch' },
        { id: 'ocean', name: 'Abyss Squid', emoji: '🦑', desc: 'Deep sea mystery.', theme: 'ocean', accent: 'teal', anim: 'creature-float', entryAnim: 'anim-bubble' },
        { id: 'jungle', name: 'Wild Tiger', emoji: '🐯', desc: 'King of the wild.', theme: 'jungle', accent: 'leaf', anim: 'creature-bounce', entryAnim: 'anim-pounce' },
        { id: 'candy', name: 'Sugar Bear', emoji: '🧸', desc: 'Sweet and cuddly.', theme: 'candy', accent: 'pink', anim: 'creature-bounce', entryAnim: 'anim-bounce-in' },
        { id: 'steampunk', name: 'Gear Golem', emoji: '⚙️', desc: 'Steam-powered giant.', theme: 'steampunk', accent: 'bronze', anim: 'creature-spin', entryAnim: 'anim-steam' },
        { id: 'horror', name: 'Night Ghost', emoji: '👻', desc: 'Haunter of shadows.', theme: 'horror', accent: 'blood', anim: 'creature-ghost', entryAnim: 'anim-ghost' },
        { id: 'pixel', name: '8-Bit Hero', emoji: '🕹️', desc: 'Retro gamer saving the world.', theme: 'pixel', accent: '8bit', anim: 'creature-bounce', entryAnim: 'anim-glitch' },
        { id: 'samurai', name: 'Ronin Blade', emoji: '⚔️', desc: 'Honor bound warrior.', theme: 'samurai', accent: 'crimson', anim: 'creature-pulse', entryAnim: 'anim-slash' },
        { id: 'superhero', name: 'Captain Bolt', emoji: '⚡', desc: 'Faster than light.', theme: 'superhero', accent: 'hero', anim: 'creature-float', entryAnim: 'anim-lightning' },
        { id: 'magic', name: 'Mystic Orb', emoji: '🔮', desc: 'Seer of futures.', theme: 'magic', accent: 'magic-purple', anim: 'creature-pulse', entryAnim: 'anim-pop' },

        // NEW THEMES (8)
        { id: 'western', name: 'Sheriff Star', emoji: '🤠', desc: 'Law of the land.', theme: 'western', accent: 'bronze', anim: 'creature-bounce', entryAnim: 'anim-western' },
        { id: 'music', name: 'Beat Master', emoji: '🎧', desc: 'Rhythm of the soul.', theme: 'music', accent: 'music-pink', anim: 'creature-pulse', entryAnim: 'anim-beat' },
        { id: 'sports', name: 'Ace striker', emoji: '⚽', desc: 'Champion of the field.', theme: 'sports', accent: 'grass', anim: 'creature-bounce', entryAnim: 'anim-bounce-in' },
        { id: 'winter', name: 'Frosty', emoji: '☃️', desc: 'Cold but friendly.', theme: 'winter', accent: '8bit', anim: 'creature-bounce', entryAnim: 'anim-snow-drop' },
        { id: 'dino', name: 'T-Rex', emoji: '🦖', desc: 'Ancient predator.', theme: 'dino', accent: 'swamp', anim: 'creature-bounce', entryAnim: 'anim-stomp' },
        { id: 'robot', name: 'Mecha-Z', emoji: '🤖', desc: 'Future intelligence.', theme: 'robot', accent: 'electric', anim: 'creature-glitch', entryAnim: 'anim-glitch' },
        { id: 'pirate', name: 'Skull King', emoji: '☠️', desc: 'Terror of the seas.', theme: 'pirate', accent: 'gold', anim: 'creature-float', entryAnim: 'anim-ghost' },
        { id: 'alien', name: 'Zorg', emoji: '👽', desc: 'Visitor from beyond.', theme: 'alien', accent: 'leaf', anim: 'creature-float', entryAnim: 'anim-ufo-land' },
        { id: 'sunset', name: 'Golden Hour', emoji: '🌅', desc: 'Warm glow.', theme: 'sunset', accent: 'orange', anim: 'creature-float', entryAnim: 'anim-fade' },
        { id: 'midnight', name: 'Deep Night', emoji: '🌚', desc: 'Silent shadows.', theme: 'midnight', accent: 'indigo', anim: 'creature-float', entryAnim: 'anim-fade' },
        { id: 'forest', name: 'Enchanted', emoji: '🌲', desc: 'Nature spirits.', theme: 'forest', accent: 'green', anim: 'creature-bounce', entryAnim: 'anim-grow' },
        { id: 'retro', name: 'Vintage', emoji: '📼', desc: 'Old school cool.', theme: 'retro', accent: 'yellow', anim: 'creature-glitch', entryAnim: 'anim-glitch' },
    ];

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md p-2 md:p-4 animate-fade-in overflow-y-auto">
            <div className="bg-slate-900 rounded-2xl md:rounded-3xl p-4 md:p-8 max-w-6xl w-full shadow-2xl border-2 border-slate-700 relative my-auto">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500"></div>
                <h2 className="text-2xl md:text-4xl font-extrabold text-white text-center mb-2 tracking-tight">Choose Your Companion</h2>
                <p className="text-gray-400 text-center mb-4 md:mb-8 text-sm md:text-base">Each creature unlocks a unique realm. Select wisely!</p>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 max-h-[75vh] overflow-y-auto p-1 custom-scrollbar">
                    {themes.map((char) => (
                        <button
                            key={char.id}
                            onClick={() => onSelect(char)}
                            className={`group relative bg-slate-800 rounded-2xl p-4 transition-all duration-300 hover:scale-105 flex flex-col items-center text-center ${currentCharacterId === char.id ? 'border-4 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.5)] bg-slate-700' : 'border border-slate-700 hover:border-blue-400 hover:bg-slate-700'}`}
                        >
                            <div className={`text-5xl md:text-6xl mb-3 drop-shadow-lg transition-transform duration-500 group-hover:scale-110 ${char.anim}`}>
                                {char.emoji}
                            </div>
                            <h3 className="text-white font-bold text-lg">{char.name}</h3>
                            <p className="text-gray-400 text-xs mt-1 line-clamp-2">{char.desc}</p>
                            <div className={`mt-3 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors ${currentCharacterId === char.id ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-gray-300 group-hover:bg-white group-hover:text-black'}`}>
                                {currentCharacterId === char.id ? 'Active' : 'Select'}
                            </div>
                        </button>
                    ))}
                </div>
                <button onClick={onClose} className="mt-6 w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl font-bold transition border border-red-500/20">Cancel Selection</button>
            </div>
        </div>
    );
};

export default React.memo(ThemeSelectionModal);
