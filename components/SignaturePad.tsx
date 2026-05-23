'use client';

import { useRef, useEffect, useState } from 'react';

type Props = {
  onChange: (dataUrl: string | null) => void;
  className?: string;
};

export function SignaturePad({ onChange, className = '' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const getPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    const ctx = canvasRef.current!.getContext('2d')!;
    const { x, y } = getPoint(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext('2d')!;
    const { x, y } = getPoint(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    if (isEmpty) setIsEmpty(false);
  };

  const endDraw = () => {
    if (!drawing.current) return;
    drawing.current = false;
    const canvas = canvasRef.current;
    if (canvas) onChange(canvas.toDataURL('image/png'));
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
    onChange(null);
  };

  return (
    <div className={className}>
      <div className="border-2 border-dashed border-gray-200 rounded-2xl overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          width={600}
          height={180}
          className="w-full touch-none cursor-crosshair"
          onPointerDown={startDraw}
          onPointerMove={draw}
          onPointerUp={endDraw}
          onPointerLeave={endDraw}
        />
      </div>
      <div className="flex justify-between items-center mt-2">
        <p className="text-xs text-gray-400">Firma con el dedo o mouse</p>
        <button
          type="button"
          onClick={clear}
          className="text-xs font-semibold text-gray-500 hover:text-orange-600 transition-colors"
        >
          Borrar firma
        </button>
      </div>
    </div>
  );
}
