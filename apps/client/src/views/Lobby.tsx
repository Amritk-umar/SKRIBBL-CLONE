import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/useGameStore';
import { Moon, Sun, Monitor, Shield, Zap, Palette } from 'lucide-react';

export default function Lobby() {
  const [name, setName] = useState('');
  const [roomId, setRoomId] = useState('');
  const { theme, toggleTheme } = useGameStore();
  const navigate = useNavigate();

  const generateRoomId = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    let playerId = localStorage.getItem('playerId');
    if (!playerId) {
        playerId = Math.random().toString(36).substring(2, 15);
        localStorage.setItem('playerId', playerId);
    }

    const finalRoomId = roomId.trim() || generateRoomId();
    sessionStorage.setItem('playerName', name);
    localStorage.setItem('playerName', name);
    navigate(`/room/${finalRoomId}`);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-500">
      {/* Decorative Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[120px] animate-pulse delay-700" />

      {/* Theme Toggle */}
      <button 
        onClick={toggleTheme}
        className="absolute top-8 right-8 p-3 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-xl text-slate-600 dark:text-slate-400 hover:scale-110 transition-all z-10"
      >
        {theme === 'light' ? <Moon size={22} /> : <Sun size={22} />}
      </button>

      <div className="w-full max-w-lg z-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-4 bg-indigo-600 rounded-3xl shadow-2xl shadow-indigo-500/40 mb-6 rotate-3 hover:rotate-0 transition-transform duration-500">
            <Palette size={48} className="text-white" />
          </div>
          <h1 className="text-5xl font-black tracking-tight text-slate-900 dark:text-white mb-2">
            SKRIBBL<span className="text-indigo-600">.CLONE</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Draw, Guess, Win. The classic game, reimagined.</p>
        </div>

        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-white dark:border-slate-800 rounded-[2.5rem] shadow-2xl p-8 md:p-10">
          <form onSubmit={handleJoin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">YOUR NICKNAME</label>
              <div className="relative group">
                <input 
                  type="text" 
                  required
                  maxLength={15}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 dark:focus:border-indigo-600 rounded-2xl px-5 py-4 text-slate-900 dark:text-white font-bold outline-none transition-all group-hover:bg-slate-200 dark:group-hover:bg-slate-700/50"
                  placeholder="e.g. Picasso"
                />
                <Zap size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">ROOM CODE (OPTIONAL)</label>
              <div className="relative group">
                <input 
                  type="text" 
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                  className="w-full bg-slate-100 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 dark:focus:border-indigo-600 rounded-2xl px-5 py-4 text-slate-900 dark:text-white font-bold outline-none transition-all group-hover:bg-slate-200 dark:group-hover:bg-slate-700/50"
                  placeholder="ENTER CODE TO JOIN FRIENDS"
                />
                <Shield size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              </div>
            </div>

            <button 
              type="submit" 
              className="w-full bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white py-5 rounded-[1.5rem] font-black text-lg shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-3"
            >
              <Monitor size={22} />
              {roomId ? 'JOIN GAME' : 'CREATE PRIVATE ROOM'}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-6">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mb-2">
                <Shield size={20} />
              </div>
              <span className="text-[10px] font-bold dark:text-slate-500 uppercase">Private</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-2xl flex items-center justify-center mb-2">
                <Zap size={20} />
              </div>
              <span className="text-[10px] font-bold dark:text-slate-500 uppercase">Fast</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
