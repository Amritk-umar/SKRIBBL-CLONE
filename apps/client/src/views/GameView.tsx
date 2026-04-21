import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useGameStore } from '../store/useGameStore';
import { Canvas } from '../components/Canvas';
import { Timer } from '../components/Timer';
import { Send, Crown, Link2, Check, MessageSquare, Trophy, Moon, Sun, Zap, Palette, Monitor } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import confetti from 'canvas-confetti';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function GameView() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const socket = useSocket();
  const { players, phase, currentDrawer, hostId, hints, chat, word, wordOptions, waitingForWord, theme, toggleTheme, settings, currentRound } = useGameStore();
  
  const [guess, setGuess] = useState('');
  const [copied, setCopied] = useState(false);
  const [recentPoints, setRecentPoints] = useState<Record<string, { points: number, id: number }>>({});
  const chatEndRef = useRef<HTMLDivElement>(null);

  const isMeDrawing = currentDrawer === socket.id;
  const isHost = hostId === localStorage.getItem('playerId');

  // Track score changes for animations
  const prevScores = useRef<Record<string, number>>({});
  
  useEffect(() => {
    players.forEach(p => {
        const prevScore = prevScores.current[p.id] || 0;
        if (p.score > prevScore) {
            const diff = p.score - prevScore;
            const animId = Date.now();
            setRecentPoints(prev => ({ ...prev, [p.id]: { points: diff, id: animId } }));
            
            // Cleanup after animation
            setTimeout(() => {
                setRecentPoints(prev => {
                    if (prev[p.id]?.id === animId) {
                        const next = { ...prev };
                        delete next[p.id];
                        return next;
                    }
                    return prev;
                });
            }, 2000);
        }
        prevScores.current[p.id] = p.score;
    });
  }, [players]);

  const updateSettings = (newSettings: any) => {
    socket.emit('update_settings', newSettings);
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSelectWord = (selectedWord: string) => {
    socket.emit('choose_word', selectedWord);
  };

  useEffect(() => {
    const name = sessionStorage.getItem('playerName');
    if (!name) {
      navigate('/');
      return;
    }

    if (!socket.connected) {
      socket.connect();
      socket.emit('join_room', { roomId, name });
    }
  }, [roomId, socket, navigate]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat]);

  useEffect(() => {
    if (phase === 'game_over') {
        const duration = 5 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 300 };

        const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

        const interval: any = setInterval(function() {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                return clearInterval(interval);
            }

            const particleCount = 50 * (timeLeft / duration);
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
        }, 250);
    }
  }, [phase]);

  const handleSendGuess = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guess.trim()) return;
    if (isMeDrawing) {
        setGuess('');
        return;
    }
    socket.emit('guess', guess);
    setGuess('');
  };

  const startGame = () => {
    socket.emit('start_game');
  };

  const [activeTab, setActiveTab] = useState<'game' | 'players' | 'chat'>('game');

  return (
    <div className="h-screen bg-slate-50 dark:bg-slate-950 flex flex-col p-2 md:p-4 lg:p-6 overflow-hidden transition-colors duration-500">
      {/* Modern Header - More compact on mobile */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white dark:border-slate-800 p-3 md:p-4 rounded-2xl md:rounded-3xl shadow-xl flex items-center justify-between mb-4 md:mb-6">
        <div className="flex items-center gap-3 md:gap-6">
          <div className="flex flex-col">
            <span className="text-[8px] md:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Room</span>
            <div className="flex items-center gap-1">
                <span className="text-sm md:text-xl font-black text-indigo-600 dark:text-indigo-400">{roomId}</span>
                <button onClick={copyInviteLink} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                    {copied ? <Check size={12} className="text-green-500" /> : <Link2 size={12} className="text-slate-400" />}
                </button>
            </div>
          </div>
          
          <div className="h-8 md:h-10 w-px bg-slate-100 dark:bg-slate-800" />

          <div className="flex flex-col">
            <span className="text-[8px] md:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Progress</span>
            <div className="flex items-center gap-2">
                <span className="text-sm md:text-xl font-black text-slate-700 dark:text-white">
                    R <span className="text-indigo-600 dark:text-indigo-400">{currentRound}</span>
                    <span className="text-slate-400 dark:text-slate-600 ml-0.5 md:ml-1">/{settings.totalRounds}</span>
                </span>
            </div>
          </div>
          
          <div className="h-8 md:h-10 w-px bg-slate-100 dark:bg-slate-800" />

          <div className="flex flex-col items-center flex-grow md:flex-initial px-2">
            <span className="text-[8px] md:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-0.5 md:mb-1">Hidden Word</span>
            <div className="text-xs sm:text-sm md:text-2xl font-mono tracking-[0.1em] sm:tracking-[0.2em] md:tracking-[0.3em] font-black text-slate-700 dark:text-white whitespace-nowrap overflow-x-auto no-scrollbar max-w-[120px] sm:max-w-[200px] md:max-w-none">
                {hints || '_ _ _ _ _'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          {phase === 'playing' && <Timer />}
          {phase === 'lobby' && isHost && (
              <button 
                onClick={startGame}
                disabled={players.length < 2}
                className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white px-3 md:px-8 py-2 md:py-3 rounded-xl md:rounded-2xl font-black text-xs md:text-base shadow-lg transition-all active:scale-95 disabled:opacity-50"
              >
                {players.length < 2 ? "WAITING" : "START"}
              </button>
          )}
          <button 
            onClick={toggleTheme}
            className="p-2 md:p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </button>
        </div>
      </div>

      {/* Main Content Area - Fluid Grid */}
      <div className="flex-grow flex flex-col md:flex-row gap-4 lg:gap-6 overflow-hidden relative">
        
        {/* Mobile Tab Switcher - Only shows when screen is tight */}
        <div className="flex md:hidden bg-white dark:bg-slate-900 p-1 rounded-xl mb-2 border border-slate-200 dark:border-slate-800 shrink-0">
            <button 
                onClick={() => setActiveTab('players')}
                className={cn("flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", activeTab === 'players' ? "bg-indigo-500 text-white" : "text-slate-500")}
            >Players ({players.length})</button>
            <button 
                onClick={() => setActiveTab('game')}
                className={cn("flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", activeTab === 'game' ? "bg-indigo-500 text-white" : "text-slate-500")}
            >Canvas</button>
            <button 
                onClick={() => setActiveTab('chat')}
                className={cn("flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", activeTab === 'chat' ? "bg-indigo-500 text-white" : "text-slate-500")}
            >Chat ({chat.length})</button>
        </div>

        {/* Players List - Flexible width */}
        <div className={cn(
            "flex-none md:flex-[0.8] lg:flex-[0.6] min-w-0 md:min-w-[200px] lg:min-w-[240px] max-w-full md:max-w-[280px] lg:max-w-[320px] bg-white/50 dark:bg-slate-900/50 backdrop-blur-md rounded-2xl md:rounded-[2rem] border border-white dark:border-slate-800 p-3 md:p-5 flex flex-col gap-3 overflow-hidden transition-all duration-500",
            activeTab !== 'players' && "hidden md:flex"
        )}>
          <h2 className="text-[10px] md:text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 md:mb-2 flex items-center gap-2 px-2">
            <Trophy size={14} /> Leaderboard
          </h2>
          <div className="flex-grow overflow-y-auto pr-1 md:pr-2 space-y-2 md:space-y-3 custom-scrollbar">
            {players.sort((a,b) => b.score - a.score).map((player, idx) => (
                <div 
                key={player.id} 
                className={cn(
                    "relative group p-3 md:p-4 rounded-xl md:rounded-2xl border-2 transition-all duration-300",
                    player.id === currentDrawer 
                        ? "bg-indigo-50/50 dark:bg-indigo-900/20 border-indigo-200/50 dark:border-indigo-500/30 scale-[1.02] shadow-lg shadow-indigo-500/5" 
                        : "bg-white/50 dark:bg-slate-800/50 border-transparent dark:border-slate-800/50",
                    recentPoints[player.id] && "scale-105 border-green-500/50 bg-green-50/10 dark:bg-green-900/10"
                )}
                >
                {/* Floating Points Indicator */}
                {recentPoints[player.id] && (
                    <div className="absolute -right-2 -top-2 bg-green-500 text-white text-[10px] md:text-xs font-black px-2 py-1 rounded-full shadow-lg animate-bounce z-20">
                        +{recentPoints[player.id].points}
                    </div>
                )}
                
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 md:gap-3 overflow-hidden">
                        <div className={cn(
                            "w-6 h-6 md:w-8 md:h-8 rounded-lg md:rounded-xl flex items-center justify-center font-black text-[10px] md:text-xs",
                            idx === 0 ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600" :
                            idx === 1 ? "bg-slate-200 dark:bg-slate-700 text-slate-500" :
                            idx === 2 ? "bg-orange-100 dark:bg-orange-900/30 text-orange-600" :
                            "bg-slate-50 dark:bg-slate-900 text-slate-400"
                        )}>
                            {idx + 1}
                        </div>
                        <div className="flex flex-col overflow-hidden">
                            <div className="flex items-center gap-1">
                                <span className="font-bold text-xs md:text-sm text-slate-700 dark:text-slate-200 truncate leading-tight">{player.name}</span>
                                {player.id === hostId && <Crown size={12} className="text-yellow-500 fill-yellow-500 flex-shrink-0" />}
                            </div>
                            <span className="text-[8px] md:text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">{player.score} PTS</span>
                        </div>
                    </div>
                    {player.id === currentDrawer && (
                        <div className="p-1 md:p-1.5 bg-indigo-100 dark:bg-indigo-500 rounded-lg text-indigo-600 dark:text-white animate-bounce">
                            <Palette size={12} />
                        </div>
                    )}
                </div>
                </div>
            ))}
          </div>
        </div>

        {/* Dynamic Canvas Area - High Priority for space */}
        <div className={cn(
            "flex-[3] flex flex-col gap-3 md:gap-4 lg:gap-6 transition-all duration-500 min-w-0 h-full",
            activeTab !== 'game' && "hidden md:flex"
        )}>
          <div className="flex-grow bg-white dark:bg-slate-900 rounded-2xl md:rounded-[2.5rem] shadow-2xl border-4 md:border-8 border-white dark:border-slate-800 overflow-hidden relative">
            {phase === 'lobby' ? (
                // ... lobby code ...
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 md:p-8 text-center bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-sm">
                    <div className="w-12 h-12 md:w-20 md:h-20 bg-indigo-600 rounded-xl md:rounded-[2rem] flex items-center justify-center text-white mb-4 md:mb-6 shadow-2xl rotate-3">
                        <Monitor size={24} className="md:w-10 md:h-10" />
                    </div>
                    <h2 className="text-xl md:text-3xl font-black text-slate-900 dark:text-white mb-1 md:mb-2 uppercase tracking-tight">Game Lobby</h2>
                    <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-bold mb-6 md:mb-10">Wait for more players or start the match!</p>

                    <div className="w-full max-w-2xl grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-10">
                        <div className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-2xl md:rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
                            <label className="block text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 md:mb-3 text-left">Total Rounds</label>
                            <div className="flex items-center gap-3 md:gap-4">
                                <button 
                                    disabled={!isHost}
                                    onClick={() => updateSettings({ totalRounds: Math.max(1, settings.totalRounds - 1) })}
                                    className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-black"
                                >-</button>
                                <span className="flex-grow text-lg md:text-2xl font-black text-slate-700 dark:text-slate-200">{settings.totalRounds}</span>
                                <button 
                                    disabled={!isHost}
                                    onClick={() => updateSettings({ totalRounds: Math.min(10, settings.totalRounds + 1) })}
                                    className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-black"
                                >+</button>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-2xl md:rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
                            <label className="block text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 md:mb-3 text-left">Draw Time (s)</label>
                            <div className="flex items-center gap-3 md:gap-4">
                                <button 
                                    disabled={!isHost}
                                    onClick={() => updateSettings({ drawTime: Math.max(30, settings.drawTime - 10) })}
                                    className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-black"
                                >-</button>
                                <span className="flex-grow text-lg md:text-2xl font-black text-slate-700 dark:text-slate-200">{settings.drawTime}</span>
                                <button 
                                    disabled={!isHost}
                                    onClick={() => updateSettings({ drawTime: Math.min(180, settings.drawTime + 10) })}
                                    className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-black"
                                >+</button>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-2xl md:rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
                            <label className="block text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 md:mb-3 text-left">Canvas Ratio</label>
                            <div className="flex items-center gap-2">
                                {(['16:9', '4:3', '1:1'] as const).map(ratio => (
                                    <button
                                        key={ratio}
                                        disabled={!isHost}
                                        onClick={() => updateSettings({ aspectRatio: ratio })}
                                        className={cn(
                                            "flex-1 py-2 rounded-lg font-black text-[10px] md:text-xs transition-all",
                                            settings.aspectRatio === ratio 
                                                ? "bg-indigo-500 text-white" 
                                                : "bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600"
                                        )}
                                    >
                                        {ratio}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="w-full max-w-2xl bg-white dark:bg-slate-800 p-4 md:p-6 rounded-2xl md:rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm mb-6 md:mb-10">
                        <label className="block text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 md:mb-3 text-left">Custom Words (Optional)</label>
                        <textarea 
                            disabled={!isHost}
                            value={settings.customWords.join(', ')}
                            onChange={(e) => {
                                const words = e.target.value.split(',').map(w => w.trim()).filter(w => w.length > 0);
                                updateSettings({ customWords: words });
                            }}
                            placeholder="word1, word2, word3..."
                            className="w-full h-20 md:h-24 bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 rounded-xl md:rounded-2xl p-3 md:p-4 text-xs md:text-sm font-bold outline-none resize-none transition-all"
                        />
                        <p className="text-[8px] md:text-[10px] text-slate-400 mt-2 text-left italic">Separate words with commas. Custom words will be mixed with default ones.</p>
                    </div>

                    {!isHost && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl font-bold text-xs animate-pulse">
                            <Crown size={14} />
                            Waiting for host...
                        </div>
                    )}
                </div>
            ) : (
                <>
                    <Canvas />
                    {/* Live Activity Feed Overlay for Mobile/Drawer */}
                    <div className="absolute top-4 left-4 right-4 pointer-events-none flex flex-col gap-2 items-start">
                        {chat.filter(m => m.isSystem).slice(-3).map((msg) => (
                            <div 
                                key={msg.id} 
                                className="bg-slate-900/80 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-[10px] font-bold border border-white/10 shadow-lg animate-in slide-in-from-left-5 duration-300"
                            >
                                ✨ {msg.text}
                            </div>
                        ))}
                    </div>
                </>
            )}
          </div>
          
          {/* Smart Guess Input - Hidden for Drawer or when not playing */}
          {!isMeDrawing && phase === 'playing' && (
              <form onSubmit={handleSendGuess} className="flex gap-2 md:gap-4 items-end pb-2 md:pb-0">
                <div className="flex-grow relative group">
                    <input 
                        type="text"
                        value={guess}
                        onChange={(e) => setGuess(e.target.value)}
                        disabled={phase !== 'playing'}
                        placeholder="Type guess..."
                        className="w-full pl-4 md:pl-6 pr-10 md:pr-14 py-3 md:py-5 bg-white dark:bg-slate-900 rounded-xl md:rounded-3xl border-2 border-transparent focus:border-indigo-500 shadow-xl text-xs md:text-base font-bold outline-none"
                    />
                    <div className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 p-1 text-slate-300 dark:text-slate-600">
                        <Zap size={16} />
                    </div>
                </div>
                <button 
                  type="submit"
                  disabled={phase !== 'playing'}
                  className="bg-indigo-600 dark:bg-indigo-500 text-white p-3 md:p-5 rounded-xl md:rounded-3xl shadow-xl active:scale-95 disabled:grayscale"
                >
                  <Send size={20} className="md:w-6 md:h-6" />
                </button>
              </form>
          )}
        </div>

        {/* Immersive Chat - Flexible width */}
        <div className={cn(
            "flex-none md:flex-[1] lg:flex-[0.8] min-w-0 md:min-w-[240px] lg:min-w-[280px] max-w-full md:max-w-[320px] lg:max-w-[360px] bg-white/50 dark:bg-slate-900/50 backdrop-blur-md rounded-2xl md:rounded-[2rem] border border-white dark:border-slate-800 flex flex-col overflow-hidden animate-in duration-500",
            activeTab !== 'chat' && "hidden md:flex"
        )}>
          <div className="p-3 md:p-5 border-b border-white dark:border-slate-800 flex items-center gap-2 md:gap-3">
              <div className="p-1.5 md:p-2 bg-slate-100 dark:bg-slate-800 rounded-lg md:rounded-xl text-slate-500">
                <MessageSquare size={14} className="md:w-18 md:h-18" />
              </div>
              <span className="font-black text-[10px] md:text-xs uppercase tracking-widest text-slate-400 dark:text-slate-500">Match Chat</span>
          </div>
          <div className="flex-grow p-3 md:p-5 overflow-y-auto space-y-2 md:space-y-3 custom-scrollbar">
            {chat.map((msg) => (
              <div key={msg.id} className={cn(
                "p-2 md:p-3 rounded-lg md:rounded-2xl text-[10px] md:text-sm transition-all",
                msg.isSystem 
                    ? "bg-green-100/50 dark:bg-green-900/20 text-green-700 dark:text-green-400 font-bold text-center border border-green-200/50" 
                    : "bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-white dark:border-slate-700/50 shadow-sm"
              )}>
                {!msg.isSystem && (
                    <div className="flex items-center gap-1 md:gap-2 mb-0.5 md:mb-1">
                        <span className="font-black text-[8px] md:text-[10px] uppercase text-indigo-500">{msg.playerName}</span>
                    </div>
                )}
                <p className={cn(msg.isSystem ? "" : "font-medium")}>{msg.text}</p>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
        </div>
      </div>

      {/* High-Impact Overlays */}
      {word && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[100] p-6">
              <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] shadow-2xl text-center max-w-sm w-full animate-in zoom-in duration-300">
                  <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <Trophy size={40} />
                  </div>
                  <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Round Over</h2>
                  <div className="text-4xl font-black text-slate-900 dark:text-white mb-8 uppercase tracking-widest">{word}</div>
                  <button 
                    onClick={() => useGameStore.getState().setGameState({ word: '' })}
                    className="w-full py-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-bold transition-colors"
                  >
                    CONTINUE
                  </button>
              </div>
          </div>
      )}

      {/* Elegant Word Selection */}
      {phase === 'selecting' && (
          <div className="fixed inset-0 bg-indigo-950/90 backdrop-blur-xl flex items-center justify-center z-[100] p-6">
              <div className="max-w-xl w-full text-center">
                  {isMeDrawing ? (
                      <div className="animate-in slide-in-from-bottom-10 duration-500">
                        <div className="inline-flex p-4 bg-white/10 rounded-3xl mb-8 text-white">
                            <Palette size={48} />
                        </div>
                        <h2 className="text-4xl font-black text-white mb-10 tracking-tight">Your Turn! Pick a Word.</h2>
                        <div className="grid grid-cols-1 gap-4">
                            {wordOptions.map((opt, i) => (
                                <button
                                    key={opt}
                                    onClick={() => handleSelectWord(opt)}
                                    className="group relative py-6 px-8 bg-white hover:bg-indigo-500 rounded-[2rem] font-black text-2xl transition-all hover:scale-[1.05] active:scale-95 shadow-2xl overflow-hidden"
                                    style={{ transitionDelay: `${i * 100}ms` }}
                                >
                                    <span className="relative z-10 text-slate-900 group-hover:text-white transition-colors">{opt}</span>
                                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>
                            ))}
                        </div>
                      </div>
                  ) : (
                      <div className="space-y-8 animate-pulse">
                        <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mx-auto text-white/50">
                            <Monitor size={48} />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-3xl font-black text-white uppercase tracking-widest">
                                {waitingForWord?.drawerName}
                            </h2>
                            <p className="text-indigo-300 font-bold text-lg">is choosing a masterpiece...</p>
                        </div>
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* Epic Game Over */}
      {phase === 'game_over' && (
          <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center z-[200] p-6 overflow-y-auto">
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-[100px] animate-pulse" />
                  <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[100px] animate-pulse delay-1000" />
              </div>

              <div className="w-full max-w-2xl z-10 text-center">
                  <h1 className="text-7xl md:text-8xl font-black text-white mb-4 italic tracking-tighter drop-shadow-2xl">GGWP!</h1>
                  <p className="text-indigo-400 font-bold text-xl mb-12 uppercase tracking-[0.4em]">Final Results</p>
                  
                  <div className="bg-white/5 dark:bg-slate-900/50 backdrop-blur-3xl rounded-[3rem] border border-white/10 p-8 space-y-4 shadow-2xl mb-12">
                      {players.map((p, i) => (
                          <div 
                            key={p.id} 
                            className={cn(
                                "flex items-center justify-between p-6 rounded-3xl border-2 transition-all duration-700",
                                i === 0 ? "bg-gradient-to-r from-yellow-400 to-orange-500 border-transparent text-white scale-110 shadow-2xl shadow-yellow-500/20" : 
                                i === 1 ? "bg-white/10 border-slate-700 text-slate-300" :
                                i === 2 ? "bg-white/5 border-slate-800 text-slate-400" :
                                "bg-transparent border-slate-900 text-slate-500"
                            )}
                            style={{ transitionDelay: `${i * 150}ms`, animation: 'in slide-in-from-bottom-10' }}
                          >
                              <div className="flex items-center gap-6">
                                  <span className="text-3xl font-black italic opacity-50">
                                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                                  </span>
                                  <span className="text-2xl font-black uppercase tracking-tight">{p.name}</span>
                              </div>
                              <span className="text-3xl font-black">{p.score}</span>
                          </div>
                      ))}
                  </div>

                  <button 
                    onClick={() => {
                        useGameStore.getState().resetGame();
                        navigate('/');
                    }}
                    className="group bg-white hover:bg-indigo-600 py-6 px-12 rounded-[2rem] font-black text-2xl text-slate-950 hover:text-white transition-all shadow-2xl hover:scale-105 active:scale-95"
                  >
                    PLAY AGAIN
                  </button>
              </div>
          </div>
      )}
    </div>
  );
}
