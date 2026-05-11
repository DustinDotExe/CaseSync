import { useRef, useState, useEffect, useCallback } from 'react';
import { Signature } from '../types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { PenLine, Type, Trash2 } from 'lucide-react';

interface SignaturePadProps {
  onSign: (sig: Signature) => void;
  disabled?: boolean;
  defaultName?: string;
}

export default function SignaturePad({ onSign, disabled, defaultName = '' }: SignaturePadProps) {
  const [mode, setMode] = useState<'drawn' | 'typed'>('typed');
  const [typedName, setTypedName] = useState(defaultName);
  const [hasDrawn, setHasDrawn] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const hasDrawnRef = useRef(false);

  const configureCanvas = useCallback((clear = true) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(rect.width, 200);
    const height = Math.max(rect.height, 150);
    const pixelRatio = window.devicePixelRatio || 1;

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (clear) {
      ctx.clearRect(0, 0, width, height);
      setHasDrawn(false);
      hasDrawnRef.current = false;
    }
  }, []);

  const initCanvas = useCallback(() => {
    configureCanvas(true);
  }, [configureCanvas]);

  const drawLine = useCallback((from: { x: number; y: number }, to: { x: number; y: number }) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    hasDrawnRef.current = true;
    setHasDrawn(true);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    configureCanvas(true);

    const resizeObserver = new ResizeObserver(() => {
      if (!hasDrawnRef.current) configureCanvas(true);
    });
    resizeObserver.observe(canvas);

    return () => resizeObserver.disconnect();
  }, [configureCanvas]);

  // Re-init canvas ctx settings when switching back to drawn mode
  useEffect(() => {
    if (mode === 'drawn') initCanvas();
  }, [mode, initCanvas]);

  const getPoint = (e: MouseEvent | Touch, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  useEffect(() => {
    if (mode !== 'drawn') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onMouseDown = (e: MouseEvent) => {
      isDrawingRef.current = true;
      lastPointRef.current = getPoint(e, canvas);
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDrawingRef.current) return;
      const pt = getPoint(e, canvas);
      if (lastPointRef.current) {
        drawLine(lastPointRef.current, pt);
      }
      lastPointRef.current = pt;
    };
    const onPointerUp = () => {
      isDrawingRef.current = false;
      lastPointRef.current = null;
    };
    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      isDrawingRef.current = true;
      lastPointRef.current = getPoint(e.touches[0], canvas);
    };
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (!isDrawingRef.current) return;
      const pt = getPoint(e.touches[0], canvas);
      if (lastPointRef.current) {
        drawLine(lastPointRef.current, pt);
      }
      lastPointRef.current = pt;
    };
    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      isDrawingRef.current = false;
      lastPointRef.current = null;
    };

    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onPointerUp);
    canvas.addEventListener('mouseleave', onPointerUp);
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: false });

    return () => {
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseup', onPointerUp);
      canvas.removeEventListener('mouseleave', onPointerUp);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
    };
  }, [drawLine, mode]);

  const handleSign = () => {
    if (disabled) return;
    if (mode === 'drawn') {
      if (!hasDrawn) return;
      const imageData = canvasRef.current?.toDataURL('image/png');
      onSign({ name: typedName || 'Participant', signedAt: new Date().toISOString(), type: 'drawn', imageData });
    } else {
      if (!typedName.trim()) return;
      onSign({ name: typedName.trim(), signedAt: new Date().toISOString(), type: 'typed' });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 w-fit">
        <button
          onClick={() => setMode('typed')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${mode === 'typed' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
        >
          <Type className="w-3 h-3" /> Type
        </button>
        <button
          onClick={() => setMode('drawn')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${mode === 'drawn' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
        >
          <PenLine className="w-3 h-3" /> Draw
        </button>
      </div>

      {mode === 'drawn' ? (
        <div className="relative">
          <canvas
            ref={canvasRef}
            className="w-full border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-950 cursor-crosshair touch-none"
            style={{ height: '150px', display: 'block' }}
          />
          {!hasDrawn && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-slate-300 dark:text-slate-700 text-sm font-medium select-none">Sign here</span>
            </div>
          )}
          {hasDrawn && (
            <button
              onClick={initCanvas}
              className="absolute top-2 right-2 text-slate-400 hover:text-slate-600 dark:text-slate-600 dark:hover:text-slate-400 transition-colors"
              title="Clear signature"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-1.5">
          <Input
            value={typedName}
            onChange={e => setTypedName(e.target.value)}
            placeholder="Type your full name"
            className="signature-script text-[2rem]! h-14 bg-white dark:bg-slate-950 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl text-center"
            disabled={disabled}
          />
          <p className="text-[11px] text-slate-400 dark:text-slate-500">By typing your name, you are providing a digital signature.</p>
        </div>
      )}

      <Button
        onClick={handleSign}
        disabled={disabled || (mode === 'drawn' ? !hasDrawn : !typedName.trim())}
        className="bg-burnt-peach-600 dark:bg-burnt-peach-500 text-white font-bold w-full"
      >
        Sign & Submit
      </Button>
    </div>
  );
}
