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
  const { players, phase, currentDrawer, hints, chat, word, wordOptions, waitingForWord, theme, toggleTheme, settings, currentRound } = useGameStore();
  
  const [guess, setGuess] = useState('');
  const [copied, setCopied] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const isMeDrawing = currentDrawer === socket.id;
  const isHost = players[0]?.id === socket.id;

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

  return (
    <div className="h-screen bg-slate-50 dark:bg-slate-950 flex flex-col p-4 md:p-6 overflow-hidden transition-colors duration-500">
      {/* Modern Header */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white dark:border-slate-800 p-4 rounded-3xl shadow-xl flex items-center justify-between mb-6">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Room Code</span>
            <div className="flex items-center gap-2">
                <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">{roomId}</span>
                <button onClick={copyInviteLink} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                    {copied ? <Check size={14} className="text-green-500" /> : <Link2 size={14} className="text-slate-400" />}
                </button>
            </div>
          </div>
          
          <div className="h-10 w-px bg-slate-100 dark:bg-slate-800" />

          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Progress</span>
            <div className="flex items-center gap-2">
                <span className="text-xl font-black text-slate-700 dark:text-white">
                    Round <span className="text-indigo-600 dark:text-indigo-400">{currentRound}</span>
                    <span className="text-slate-400 dark:text-slate-600 ml-1">/ {settings.totalRounds}</span>
                </span>
            </div>
          </div>
          
          <div className="h-10 w-px bg-slate-100 dark:bg-slate-800" />

          <div className="flex flex-col items-center">
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Hidden Word</span>
            <div className="text-2xl font-mono tracking-[0.3em] font-black text-slate-700 dark:text-white">
                {hints || '_ _ _ _ _'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {phase === 'playing' && <Timer />}
          {phase === 'lobby' && (
            isHost ? (
              <button 
                onClick={startGame}
                disabled={players.length < 2}
                title={players.length < 2 ? "Need at least 2 players to start" : ""}
                className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black shadow-lg shadow-indigo-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
              >
                {players.length < 2 ? "WAITING FOR PLAYERS" : "START MATCH"}
              </button>
            ) : (
              <div className="px-6 py-3 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-500 dark:text-slate-400 font-bold flex items-center gap-2">
                <Crown size={16} className="text-yellow-500" />
                WAITING FOR HOST
              </div>
            )
          )}
          <button 
            onClick={toggleTheme}
            className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:scale-105 transition-all"
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
        </div>
      </div>

      <div className="flex-grow flex gap-6 overflow-hidden">
        {/* Advanced Players List - Always visible to track progress */}
        <div className="w-72 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md rounded-[2rem] border border-white dark:border-slate-800 p-5 flex flex-col gap-3 overflow-hidden transition-all duration-500">
          <h2 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2 px-2">
            <Trophy size={14} /> Leaderboard
          </h2>
          <div className="flex-grow overflow-y-auto pr-2 space-y-3 custom-scrollbar">
            {players.sort((a,b) => b.score - a.score).map((player, idx) => (
                <div 
                key={player.id} 
                className={cn(
                    "relative group p-4 rounded-2xl border-2 transition-all duration-300",
                    player.id === currentDrawer 
                        ? "bg-indigo-50/50 dark:bg-indigo-900/20 border-indigo-200/50 dark:border-indigo-500/30 scale-[1.02] shadow-lg shadow-indigo-500/5" 
                        : "bg-white/50 dark:bg-slate-800/50 border-transparent dark:border-slate-800/50"
                )}
                >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className={cn(
                            "w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs",
                            idx === 0 ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600" :
                            idx === 1 ? "bg-slate-200 dark:bg-slate-700 text-slate-500" :
                            idx === 2 ? "bg-orange-100 dark:bg-orange-900/30 text-orange-600" :
                            "bg-slate-50 dark:bg-slate-900 text-slate-400"
                        )}>
                            {idx + 1}
                        </div>
                        <div className="flex flex-col overflow-hidden">
                            <span className="font-bold text-slate-700 dark:text-slate-200 truncate leading-tight">{player.name}</span>
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">{player.score} PTS</span>
                        </div>
                    </div>
                    {player.id === currentDrawer && (
                        <div className="p-1.5 bg-indigo-100 dark:bg-indigo-500 rounded-lg text-indigo-600 dark:text-white animate-bounce">
                            <Palette size={14} />
                        </div>
                    )}
                </div>
                </div>
            ))}
          </div>
        </div>

        {/* Dynamic Canvas Area */}
        <div className="flex-grow flex flex-col gap-6 transition-all duration-500">
          <div className="flex-grow bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border-8 border-white dark:border-slate-800 overflow-hidden relative">
            {phase === 'lobby' ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-sm">
                    <div className="w-20 h-20 bg-indigo-600 rounded-[2rem] flex items-center justify-center text-white mb-6 shadow-2xl shadow-indigo-500/20 rotate-3">
                        <Monitor size={40} />
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight">Game Lobby</h2>
                    <p className="text-slate-500 dark:text-slate-400 font-bold mb-10">Wait for more players or start the match now!</p>

                    <div className="w-full max-w-md grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 text-left">Total Rounds</label>
                            <div className="flex items-center gap-4">
                                <button 
                                    disabled={!isHost}
                                    onClick={() => updateSettings({ totalRounds: Math.max(1, settings.totalRounds - 1) })}
                                    className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-black hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
                                >-</button>
                                <span className="flex-grow text-2xl font-black text-slate-700 dark:text-slate-200">{settings.totalRounds}</span>
                                <button 
                                    disabled={!isHost}
                                    onClick={() => updateSettings({ totalRounds: Math.min(10, settings.totalRounds + 1) })}
                                    className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-black hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
                                >+</button>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 text-left">Draw Time (s)</label>
                            <div className="flex items-center gap-4">
                                <button 
                                    disabled={!isHost}
                                    onClick={() => updateSettings({ drawTime: Math.max(30, settings.drawTime - 10) })}
                                    className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-black hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
                                >-</button>
                                <span className="flex-grow text-2xl font-black text-slate-700 dark:text-slate-200">{settings.drawTime}</span>
                                <button 
                                    disabled={!isHost}
                                    onClick={() => updateSettings({ drawTime: Math.min(180, settings.drawTime + 10) })}
                                    className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-black hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
                                >+</button>
                            </div>
                        </div>
                    </div>

                    {!isHost && (
                        <div className="flex items-center gap-3 px-6 py-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-2xl font-bold animate-pulse">
                            <Crown size={18} />
                            Waiting for host to start...
                        </div>
                    )}
                </div>
            ) : (
                <Canvas />
            )}
          </div>
          
          {/* Smart Guess Input - Hidden for Drawer */}
          {!isMeDrawing && (
              <form onSubmit={handleSendGuess} className="flex gap-4 items-end animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex-grow relative group">
                    <input 
                        type="text"
                        value={guess}
                        onChange={(e) => setGuess(e.target.value)}
                        disabled={phase !== 'playing'}
                        placeholder="Type your guess here..."
                        className="w-full pl-6 pr-14 py-5 bg-white dark:bg-slate-900 rounded-3xl border-2 border-transparent focus:border-indigo-500 dark:focus:border-indigo-600 shadow-xl dark:shadow-none text-slate-900 dark:text-white font-bold transition-all disabled:opacity-50 outline-none"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-300 dark:text-slate-600">
                        <Zap size={20} />
                    </div>
                </div>
                <button 
                  type="submit"
                  disabled={phase !== 'playing'}
                  className="bg-indigo-600 dark:bg-indigo-500 text-white p-5 rounded-3xl hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-all shadow-xl shadow-indigo-500/20 active:scale-95 disabled:grayscale"
                >
                  <Send size={24} />
                </button>
              </form>
          )}
        </div>

        {/* Immersive Chat - Hidden for Drawer during play */}
        {(!isMeDrawing || phase !== 'playing') && (
            <div className="w-80 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md rounded-[2rem] border border-white dark:border-slate-800 flex flex-col overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="p-5 border-b border-white dark:border-slate-800 flex items-center gap-3">
                  <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-500">
                    <MessageSquare size={18} />
                  </div>
                  <span className="font-black text-xs uppercase tracking-widest text-slate-400 dark:text-slate-500">Match Chat</span>
              </div>
              <div className="flex-grow p-5 overflow-y-auto space-y-3 custom-scrollbar">
                {chat.map((msg) => (
                  <div key={msg.id} className={cn(
                    "p-3 rounded-2xl text-sm transition-all animate-in fade-in slide-in-from-bottom-2",
                    msg.isSystem 
                        ? "bg-green-100/50 dark:bg-green-900/20 text-green-700 dark:text-green-400 font-bold text-center border border-green-200/50 dark:border-green-800/30" 
                        : "bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-white dark:border-slate-700/50 shadow-sm"
                  )}>
                    {!msg.isSystem && (
                        <div className="flex items-center gap-2 mb-1">
                            <span className="font-black text-[10px] uppercase text-indigo-500">{msg.playerName}</span>
                        </div>
                    )}
                    <p className={cn(msg.isSystem ? "" : "font-medium")}>{msg.text}</p>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
            </div>
        )}
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
