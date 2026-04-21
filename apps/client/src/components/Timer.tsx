import React from 'react';
import { useGameStore } from '../store/useGameStore';

export const Timer: React.FC = () => {
  const timeLeft = useGameStore((state) => state.timeLeft);
  const initialTime = useGameStore((state) => state.initialTime);

  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = initialTime > 0 ? circumference - (timeLeft / initialTime) * circumference : circumference;

  let color = '#22c55e'; // Green
  if (timeLeft < initialTime * 0.5) color = '#f59e0b'; // Amber
  if (timeLeft < initialTime * 0.2) color = '#ef4444'; // Red

  return (
    <div className="relative flex items-center justify-center w-12 h-12">
      <svg className="transform -rotate-90 w-12 h-12">
        <circle
          cx="24" cy="24" r={radius}
          stroke="currentColor" strokeWidth="4" fill="transparent"
          className="text-gray-200 dark:text-slate-800"
        />
        <circle
          cx="24" cy="24" r={radius}
          stroke={color} strokeWidth="4" fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-linear"
        />
      </svg>
      <span className="absolute text-sm font-black text-slate-700 dark:text-slate-200">{timeLeft}</span>
    </div>
  );
};
