import React, { useRef, useEffect, useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { useGameStore } from '../store/useGameStore';
import { Undo2, Trash2, Eraser, Circle, PaintBucket, Brush } from 'lucide-react';
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

interface FillData {
  x: number;
  y: number;
  color: string;
}

interface Stroke {
  type: 'brush' | 'fill';
  color: string;
  size?: number;
  points?: { x: number; y: number }[];
  x?: number;
  y?: number;
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

const REFERENCE_WIDTH = 800;

export const Canvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const socket = useSocket();
  const { currentDrawer, myPlayerId, canvasState, setGameState, settings } = useGameStore();
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(3);
  const [tool, setTool] = useState<'brush' | 'bucket'>('brush');
  
  const strokeHistory = useRef<Stroke[]>([]);
  const currentStroke = useRef<Stroke | null>(null);

  const isMeDrawing = currentDrawer === myPlayerId;

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resizeCanvas = () => {
      const { width: containerWidth, height: containerHeight } = container.getBoundingClientRect();
      
      const [w, h] = settings.aspectRatio.split(':').map(Number);
      const targetRatio = w / (h || 1);
      
      let canvasWidth = containerWidth;
      let canvasHeight = containerWidth / targetRatio;

      if (canvasHeight > containerHeight) {
        canvasHeight = containerHeight;
        canvasWidth = containerHeight * targetRatio;
      }

      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvasWidth * dpr;
      canvas.height = canvasHeight * dpr;
      
      canvas.style.width = `${canvasWidth}px`;
      canvas.style.height = `${canvasHeight}px`;

      const ctx = canvas.getContext('2d');
      if (ctx) ctx.scale(dpr, dpr);

      redrawAll();
    };

    const obs = new ResizeObserver(resizeCanvas);
    obs.observe(container);
    return () => obs.disconnect();
  }, [settings.aspectRatio]);

  useEffect(() => {
    const handleDrawData = (data: DrawData) => {
      if (isMeDrawing) return;
      drawNormalized(data);
    };

    const handleFillData = (data: FillData) => {
        if (isMeDrawing) return;
        fillNormalized(data);
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
    socket.on('draw_fill', handleFillData);
    socket.on('draw_undo', handleDrawUndo);
    socket.on('canvas_clear', handleCanvasClear);
    socket.on('round_start', handleRoundStart);

    return () => {
      socket.off('draw_data', handleDrawData);
      socket.off('draw_fill', handleFillData);
      socket.off('draw_undo', handleDrawUndo);
      socket.off('canvas_clear', handleCanvasClear);
      socket.off('round_start', handleRoundStart);
    };
  }, [isMeDrawing, socket]);

  useEffect(() => {
    if (canvasState && canvasState.length > 0) {
      // Reconstruct strokeHistory from flat draw events
      const history: Stroke[] = [];
      let current: Stroke | null = null;

      canvasState.forEach((event: any) => {
        if (event.type === 'draw') {
          const data = event.data;
          if (!current) {
            current = { type: 'brush', color: data.color, size: data.size, points: [] };
          }
          current.points?.push({ x: data.x, y: data.y });
          if (data.end) {
            history.push(current);
            current = null;
          }
        } else if (event.type === 'fill') {
            history.push({ type: 'fill', color: event.data.color, x: event.data.x, y: event.data.y });
        }
      });

      strokeHistory.current = history;
      redrawAll();
      // Clear canvasState from store after processing to avoid re-runs
      setGameState({ canvasState: null });
    }
  }, [canvasState, setGameState]);

  const lastPoint = useRef<{ x: number, y: number } | null>(null);

  const drawNormalized = (data: DrawData) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // Dimensions are logical here because of scale(dpr, dpr)
    const logicalWidth = canvas.width / (window.devicePixelRatio || 1);
    const logicalHeight = canvas.height / (window.devicePixelRatio || 1);

    const x = data.x * logicalWidth;
    const y = data.y * logicalHeight;

    ctx.strokeStyle = data.color;
    // Scale brush size relative to logical width
    const scale = logicalWidth / REFERENCE_WIDTH;
    ctx.lineWidth = data.size * scale;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (data.end) {
      lastPoint.current = null;
      ctx.beginPath();
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

  const fillNormalized = (data: FillData) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    
    const x = Math.round(data.x * canvas.width);
    const y = Math.round(data.y * canvas.height);
    
    floodFill(ctx, x, y, data.color);
    
    if (!isMeDrawing) {
        strokeHistory.current.push({ type: 'fill', color: data.color, x: data.x, y: data.y });
    }
  };

  const floodFill = (ctx: CanvasRenderingContext2D, startX: number, startY: number, fillHex: string) => {
    const canvas = ctx.canvas;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    const targetR = data[(startY * canvas.width + startX) * 4];
    const targetG = data[(startY * canvas.width + startX) * 4 + 1];
    const targetB = data[(startY * canvas.width + startX) * 4 + 2];
    const targetA = data[(startY * canvas.width + startX) * 4 + 3];

    // Convert hex to RGB
    const fillR = parseInt(fillHex.slice(1, 3), 16);
    const fillG = parseInt(fillHex.slice(3, 5), 16);
    const fillB = parseInt(fillHex.slice(5, 7), 16);

    if (targetR === fillR && targetG === fillG && targetB === fillB && targetA === 255) return;

    const stack: [number, number][] = [[startX, startY]];
    
    while (stack.length > 0) {
      const [x, y] = stack.pop()!;
      let pixelPos = (y * canvas.width + x) * 4;

      if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) continue;
      if (data[pixelPos] !== targetR || data[pixelPos+1] !== targetG || data[pixelPos+2] !== targetB || data[pixelPos+3] !== targetA) continue;

      data[pixelPos] = fillR;
      data[pixelPos+1] = fillG;
      data[pixelPos+2] = fillB;
      data[pixelPos+3] = 255;

      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }

    ctx.putImageData(imageData, 0, 0);
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

    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;

    if (tool === 'bucket' && !isEnd) {
        const fillData: FillData = { x, y, color };
        socket.emit('draw_fill', fillData);
        fillNormalized(fillData);
        strokeHistory.current.push({ type: 'fill', color, x, y });
        setIsDrawing(false); // Only fill once per click
        return;
    }

    if (tool === 'brush') {
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
                currentStroke.current = { type: 'brush', color, size: brushSize, points: [] };
            }
            currentStroke.current.points?.push({ x, y });
        }
    }
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isMeDrawing) return;
    setIsDrawing(true);
    if (tool === 'brush') {
        const ctx = canvasRef.current?.getContext('2d');
        ctx?.beginPath();
    }
    emitAndDraw(e);
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (tool === 'brush') {
        emitAndDraw(e);
    }
  };

  const handleEnd = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    if (!isMeDrawing || !isDrawing) return;
    setIsDrawing(false);
    if (tool === 'brush') {
        emitAndDraw(e as any, true);
    }
  };

  useEffect(() => {
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchend', handleEnd);
    return () => {
        window.removeEventListener('mouseup', handleEnd);
        window.removeEventListener('touchend', handleEnd);
    };
  }, [isMeDrawing, isDrawing, tool]);

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
      const logicalWidth = canvas.width / (window.devicePixelRatio || 1);
      const logicalHeight = canvas.height / (window.devicePixelRatio || 1);
      ctx.clearRect(0, 0, logicalWidth, logicalHeight);
    }
  };

  const redrawAll = () => {
    clearCanvasUI();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const logicalWidth = canvas.width / (window.devicePixelRatio || 1);
    const logicalHeight = canvas.height / (window.devicePixelRatio || 1);
    const scale = logicalWidth / REFERENCE_WIDTH;

    strokeHistory.current.forEach(stroke => {
      if (stroke.type === 'brush') {
        ctx.beginPath();
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = (stroke.size || 3) * scale;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        let prevPoint: { x: number, y: number } | null = null;
        stroke.points?.forEach((point, i) => {
            const x = point.x * logicalWidth;
            const y = point.y * logicalHeight;
            if (i === 0) {
                ctx.moveTo(x, y);
                prevPoint = { x, y };
            } else if (prevPoint) {
                const midX = (prevPoint.x + x) / 2;
                const midY = (prevPoint.y + y) / 2;
                ctx.quadraticCurveTo(prevPoint.x, prevPoint.y, midX, midY);
                prevPoint = { x, y };
            }
        });
        ctx.stroke();
        ctx.closePath();
      } else if (stroke.type === 'fill') {
          const x = Math.round((stroke.x || 0) * canvas.width);
          const y = Math.round((stroke.y || 0) * canvas.height);
          floodFill(ctx, x, y, stroke.color);
      }
    });
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-50 dark:bg-slate-950 relative">
      <div 
        ref={containerRef} 
        className={cn(
            "flex-grow relative overflow-hidden",
            isMeDrawing ? "cursor-crosshair" : "cursor-default"
        )}
      >
        <canvas
          ref={canvasRef}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 touch-none bg-white shadow-lg"
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
            {/* Tool Toggle */}
            <div className="flex items-center gap-2 pr-6 border-r border-white/10">
                <button 
                    onClick={() => setTool('brush')}
                    className={cn(
                        "p-3 rounded-xl transition-all",
                        tool === 'brush' ? "bg-indigo-500 text-white" : "text-slate-400 hover:bg-white/5"
                    )}
                    title="Brush Tool"
                >
                    <Brush size={20} />
                </button>
                <button 
                    onClick={() => setTool('bucket')}
                    className={cn(
                        "p-3 rounded-xl transition-all",
                        tool === 'bucket' ? "bg-indigo-500 text-white" : "text-slate-400 hover:bg-white/5"
                    )}
                    title="Fill Bucket"
                >
                    <PaintBucket size={20} />
                </button>
            </div>

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
            <div className={cn("flex items-center gap-3 pr-6 border-r border-white/10 transition-opacity", tool === 'bucket' && "opacity-20 pointer-events-none")}>
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
                    onClick={() => {
                        setColor('#ffffff');
                        setTool('brush');
                    }} 
                    className={cn(
                        "p-3 rounded-xl transition-all",
                        (color === '#ffffff' && tool === 'brush') ? "bg-indigo-500 text-white" : "text-slate-400 hover:bg-white/5"
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
