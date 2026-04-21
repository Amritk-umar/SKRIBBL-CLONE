import React, { createContext, useContext, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { useGameStore } from '../store/useGameStore';
import type { ChatMessage, Player } from '../store/useGameStore';
import { soundManager } from '../utils/soundManager';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

export const socket: Socket = io(SERVER_URL, { 
  autoConnect: false,
  reconnection: true
});

const SocketContext = createContext<Socket | null>(null);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { setGameState, addChatMessage, updatePlayerScore } = useGameStore();

  useEffect(() => {
    socket.on('connect', () => {
        const roomId = window.location.pathname.split('/room/')[1];
        const name = sessionStorage.getItem('playerName') || localStorage.getItem('playerName');
        const playerId = localStorage.getItem('playerId');
        
        if (roomId && name && playerId) {
            socket.emit('join_room', { roomId, name, playerId });
        }
    });

    socket.on('room_state', (data: any) => {
      setGameState({ 
        players: data.players, 
        settings: {
            ...data.settings,
            customWords: data.settings.customWords || []
        },
        phase: data.phase,
        currentRound: data.currentRound,
        currentDrawer: data.currentDrawer,
        hostId: data.hostId,
        word: data.phase === 'playing' ? undefined : '',
        hints: data.phase === 'playing' ? undefined : '',
        timeLeft: data.timeLeft,
        initialTime: data.initialTime
      });
    });

    socket.on('waiting_for_word', (data: { drawerId: string, drawerName: string, round: number }) => {
      soundManager.playNotification();
      setGameState({ 
        phase: 'selecting', 
        waitingForWord: data,
        currentDrawer: data.drawerId,
        wordOptions: [],
        timeLeft: 15,
        initialTime: 15,
        currentRound: data.round
      });
    });

    socket.on('word_options', (options: string[]) => {
      setGameState({ wordOptions: options });
    });

    socket.on('round_start', (data: { drawerId: string, round: number, hint: string, time: number }) => {
      setGameState({ 
        currentDrawer: data.drawerId, 
        phase: 'playing',
        hints: data.hint,
        waitingForWord: null,
        wordOptions: [],
        timeLeft: data.time,
        initialTime: data.time,
        currentRound: data.round
      });
    });

    socket.on('timer_update', (time: number) => {
      setGameState({ timeLeft: time });
    });

    socket.on('canvas_state', (history: any[]) => {
      setGameState({ canvasState: history });
    });

    socket.on('hint', (data: { hint: string }) => {
      setGameState({ hints: data.hint });
    });

    socket.on('chat_message', (msg: ChatMessage) => {
      addChatMessage(msg);
    });

    socket.on('guess_result', (data: { correct: boolean, playerId: string, points: number }) => {
        if (data.correct) {
            soundManager.playSuccess();
            updatePlayerScore(data.playerId, data.points);
        }
    });

    socket.on('round_end', (data: { word: string, scores: { id: string, score: number }[] }) => {
        setGameState({ word: data.word });
        data.scores.forEach(s => updatePlayerScore(s.id, s.score));
    });

    socket.on('game_over', (data: { leaderboard: Player[] }) => {
        soundManager.playFanfare();
        setGameState({ phase: 'game_over', players: data.leaderboard });
    });

    return () => {
      socket.off('room_state');
      socket.off('round_start');
      socket.off('hint');
      socket.off('chat_message');
      socket.off('guess_result');
      socket.off('round_end');
    };
  }, []);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
