import { create } from 'zustand';

export interface Player {
  id: string;
  name: string;
  score: number;
  isDrawing: boolean;
  isConnected: boolean;
}

export interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  text: string;
  isSystem?: boolean;
}

interface GameState {
  players: Player[];
  phase: 'lobby' | 'selecting' | 'playing' | 'game_over';
  currentDrawer: string | null;
  word: string;
  hints: string;
  currentRound: number;
  chat: ChatMessage[];
  wordOptions: string[];
  waitingForWord: { drawerId: string, drawerName: string } | null;
  theme: 'light' | 'dark';
  timeLeft: number;
  initialTime: number;
  settings: {
      totalRounds: number;
      drawTime: number;
  };
  setGameState: (state: Partial<GameState>) => void;
  addChatMessage: (msg: ChatMessage) => void;
  updatePlayerScore: (playerId: string, score: number) => void;
  toggleTheme: () => void;
  resetGame: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  players: [],
  phase: 'lobby',
  currentDrawer: null,
  word: '',
  hints: '',
  currentRound: 1,
  chat: [],
  wordOptions: [],
  waitingForWord: null,
  theme: (localStorage.getItem('theme') as 'light' | 'dark') || 'light',
  timeLeft: 0,
  initialTime: 0,
  settings: {
      totalRounds: 3,
      drawTime: 80
  },
  setGameState: (state) => set((prev) => ({ ...prev, ...state })),
  addChatMessage: (msg) => set((prev) => ({ chat: [...prev.chat, msg] })),
  updatePlayerScore: (playerId, score) => set((prev) => ({
    players: prev.players.map(p => p.id === playerId ? { ...p, score } : p)
  })),
  toggleTheme: () => set((state) => {
    const newTheme = state.theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', newTheme);
    return { theme: newTheme };
  }),
  resetGame: () => set({
    phase: 'lobby',
    currentDrawer: null,
    word: '',
    hints: '',
    chat: []
  })
}));
