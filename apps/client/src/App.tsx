import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SocketProvider } from './context/SocketContext';
import { useGameStore } from './store/useGameStore';
import Lobby from './views/Lobby';
import GameView from './views/GameView';
import './App.css';

function ThemeHandler({ children }: { children: React.ReactNode }) {
  const theme = useGameStore((state) => state.theme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
  }, [theme]);

  return <>{children}</>;
}

function App() {
  return (
    <SocketProvider>
      <ThemeHandler>
        <div className="min-h-screen transition-colors duration-300 bg-gray-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Lobby />} />
              <Route path="/room/:roomId" element={<GameView />} />
            </Routes>
          </BrowserRouter>
        </div>
      </ThemeHandler>
    </SocketProvider>
  );
}

export default App;
