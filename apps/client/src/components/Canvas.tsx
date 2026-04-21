import React, { useRef, useEffect, useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { useGameStore } from '../store/useGameStore';
import { Undo2, Trash2, Eraser, Circle } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface DrawData {
  x: number;
  y: number;
  color: string;
  size: number;
  end?: boolean;
}

interface Stroke {
  color: string;
  size: number;
  points: { x: number; y: number }[];
}

const COLORS = [
  '#000000', '#475569', '#ef4444', '#f97316', '#f59e0b', 
  '#22c55e', '#06b6d4', '#3b82f6', '#6366f1', '#a855f7', 
  '#ec4899', '#ffffff'
];

const SIZES = [
  { label: 'S', value: 3, iconSize: 12 },
  { label: 'M', value: 8, iconSize: 18 },
  { label: 'L', value: 16, iconSize: 24 },
];

export const Canvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const socket = useSocket();
  const currentDrawer = useGameStore((state) => state.currentDrawer);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(3);
  
  const strokeHistory = useRef<Stroke[]>([]);
  const currentStroke = useRef<Stroke | null>(null);

  const isMeDrawing = currentDrawer === socket.id;

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resizeCanvas = () => {
      const { width, height } = container.getBoundingClientRect();
      canvas.width = width;
      canvas.height = height;
      redrawAll();
    };

    const obs = new ResizeObserver(resizeCanvas);
    obs.observe(container);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const handleDrawData = (data: DrawData) => {
      if (isMeDrawing) return;
      drawNormalized(data);
    };

    const handleDrawUndo = () => {
      strokeHistory.current.pop();
      redrawAll();
    };

    const handleCanvasClear = () => {
      strokeHistory.current = [];
      clearCanvasUI();
    };

    const handleRoundStart = () => {
      strokeHistory.current = [];
      clearCanvasUI();
    };

    socket.on('draw_data', handleDrawData);
    socket.on('draw_undo', handleDrawUndo);
    socket.on('canvas_clear', handleCanvasClear);
    socket.on('round_start', handleRoundStart);

    return () => {
      socket.off('draw_data', handleDrawData);
      socket.off('draw_undo', handleDrawUndo);
      socket.off('canvas_clear', handleCanvasClear);
      socket.off('round_start', handleRoundStart);
    };
  }, [isMeDrawing, socket]);

  const lastPoint = useRef<{ x: number, y: number } | null>(null);

  const drawNormalized = (data: DrawData) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const x = data.x * canvas.width;
    const y = data.y * canvas.height;

    ctx.strokeStyle = data.color;
    ctx.lineWidth = data.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (data.end) {
      lastPoint.current = null;
      ctx.beginPath(); // Reset path for next stroke
      return;
    }

    if (!lastPoint.current) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        lastPoint.current = { x, y };
    } else {
        const midX = (lastPoint.current.x + x) / 2;
        const midY = (lastPoint.current.y + y) / 2;
        ctx.quadraticCurveTo(lastPoint.current.x, lastPoint.current.y, midX, midY);
        ctx.stroke();
        lastPoint.current = { x, y };
    }
  };

  const emitAndDraw = (event: React.MouseEvent | React.TouchEvent, isEnd = false) => {
    if (!isMeDrawing || (!isDrawing && !isEnd)) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in event) {
      clientX = (event as React.TouchEvent).touches[0]?.clientX || 0;
      clientY = (event as React.TouchEvent).touches[0]?.clientY || 0;
    } else {
      clientX = (event as React.MouseEvent).clientX;
      clientY = (event as React.MouseEvent).clientY;
    }

    const x = (clientX - rect.left) / canvas.width;
    const y = (clientY - rect.top) / canvas.height;

    const drawData: DrawData = { x, y, color, size: brushSize, end: isEnd };
    socket.emit('draw_event', drawData);
    drawNormalized(drawData);

    if (isEnd) {
      if (currentStroke.current) {
        strokeHistory.current.push(currentStroke.current);
        currentStroke.current = null;
      }
    } else {
      if (!currentStroke.current) {
         currentStroke.current = { color, size: brushSize, points: [] };
      }
      currentStroke.current.points.push({ x, y });
    }
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isMeDrawing) return;
    setIsDrawing(true);
    const ctx = canvasRef.current?.getContext('2d');
    ctx?.beginPath();
    emitAndDraw(e);
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    emitAndDraw(e);
  };

  const handleEnd = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isMeDrawing || !isDrawing) return;
    setIsDrawing(false);
    emitAndDraw(e, true);
  };

  const handleUndo = () => {
    if (!isMeDrawing) return;
    strokeHistory.current.pop();
    redrawAll();
    socket.emit('draw_undo');
  };

  const handleClear = () => {
    if (!isMeDrawing) return;
    strokeHistory.current = [];
    clearCanvasUI();
    socket.emit('canvas_clear');
  };

  const clearCanvasUI = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const redrawAll = () => {
    clearCanvasUI();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    strokeHistory.current.forEach(stroke => {
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      stroke.points.forEach((point, i) => {
        const x = point.x * canvas.width;
        const y = point.y * canvas.height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.closePath();
    });
  };

  return (
    <div className="flex flex-col h-full w-full bg-white relative">
      <div 
        ref={containerRef} 
        className={cn(
            "flex-grow relative overflow-hidden",
            isMeDrawing ? "cursor-crosshair" : "cursor-default"
        )}
      >
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full touch-none"
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onMouseOut={handleEnd}
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
        />
      </div>

      {isMeDrawing && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-xl p-4 rounded-[2rem] border border-white/10 shadow-2xl flex items-center gap-6 animate-in slide-in-from-bottom-5">
            {/* Color Palette */}
            <div className="grid grid-cols-6 gap-2 pr-6 border-r border-white/10">
                {COLORS.map(c => (
                    <button
                        key={c}
                        onClick={() => setColor(c)}
                        className={cn(
                            "w-6 h-6 rounded-lg transition-transform hover:scale-125 border border-white/10",
                            color === c && "scale-125 ring-2 ring-indigo-500 ring-offset-2 ring-offset-slate-900"
                        )}
                        style={{ backgroundColor: c }}
                    />
                ))}
            </div>

            {/* Brush Sizes */}
            <div className="flex items-center gap-3 pr-6 border-r border-white/10">
                {SIZES.map(s => (
                    <button
                        key={s.value}
                        onClick={() => setBrushSize(s.value)}
                        className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                            brushSize === s.value 
                                ? "bg-indigo-500 text-white" 
                                : "text-slate-400 hover:bg-white/5"
                        )}
                    >
                        <Circle size={s.iconSize} fill="currentColor" />
                    </button>
                ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
                <button 
                    onClick={() => setColor('#ffffff')} 
                    className={cn(
                        "p-3 rounded-xl transition-all",
                        color === '#ffffff' ? "bg-indigo-500 text-white" : "text-slate-400 hover:bg-white/5"
                    )}
                    title="Eraser"
                >
                    <Eraser size={20} />
                </button>
                <button 
                    onClick={handleUndo} 
                    className="p-3 text-slate-400 hover:bg-white/5 rounded-xl transition-all"
                    title="Undo"
                >
                    <Undo2 size={20} />
                </button>
                <button 
                    onClick={handleClear} 
                    className="p-3 text-red-400 hover:bg-red-500/20 rounded-xl transition-all"
                    title="Clear Canvas"
                >
                    <Trash2 size={20} />
                </button>
            </div>
        </div>
      )}
    </div>
  );
};
