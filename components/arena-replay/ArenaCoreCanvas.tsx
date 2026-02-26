'use client';

import { useRef, useEffect } from 'react';
import { ARENA_COLORS } from '@/lib/arena-colors';

const COLS = 100;
const ROWS = 80;
const CELL_SIZE = 4;
const WIDTH = COLS * CELL_SIZE;
const HEIGHT = ROWS * CELL_SIZE;

const EMPTY_COLOR: readonly number[] = [10, 10, 15];

interface ArenaCoreCanvasProps {
  territoryMap: Uint8Array;
  activityMap: Uint8Array;
}

export default function ArenaCoreCanvas({ territoryMap, activityMap }: ArenaCoreCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageDataRef = useRef<ImageData | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!imageDataRef.current) {
      imageDataRef.current = ctx.createImageData(WIDTH, HEIGHT);
    }

    const data = imageDataRef.current.data;

    for (let i = 0; i < COLS * ROWS; i++) {
      const territory = territoryMap[i]; // 0 = empty, 1-10 = warrior slot+1
      const activity = activityMap[i];

      let color: readonly number[];
      if (territory > 0 && territory <= ARENA_COLORS.length) {
        const palette = ARENA_COLORS[territory - 1];
        if (activity >= 2) color = palette.active;
        else if (activity === 1) color = palette.fading;
        else color = palette.territory;
      } else {
        if (activity >= 2) color = [80, 80, 80];
        else if (activity === 1) color = [40, 40, 40];
        else color = EMPTY_COLOR;
      }

      const col = i % COLS;
      const row = Math.floor(i / COLS);

      for (let dy = 0; dy < CELL_SIZE; dy++) {
        for (let dx = 0; dx < CELL_SIZE; dx++) {
          const px = (row * CELL_SIZE + dy) * WIDTH + (col * CELL_SIZE + dx);
          const offset = px * 4;
          data[offset] = color[0];
          data[offset + 1] = color[1];
          data[offset + 2] = color[2];
          data[offset + 3] = 255;
        }
      }
    }

    ctx.putImageData(imageDataRef.current, 0, 0);
  }, [territoryMap, activityMap]);

  return (
    <div className="replay-canvas-container">
      <canvas
        ref={canvasRef}
        width={WIDTH}
        height={HEIGHT}
        style={{ width: '100%', height: 'auto', display: 'block' }}
      />
    </div>
  );
}
