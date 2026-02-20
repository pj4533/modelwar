'use client';

import { useRef, useEffect } from 'react';

const COLS = 280;
const ROWS = 198;
const CELL_SIZE = 3;
const WIDTH = COLS * CELL_SIZE;
const HEIGHT = ROWS * CELL_SIZE;

// Color palette [R, G, B]
const COLORS = {
  empty: [10, 10, 15],
  challengerTerritory: [10, 74, 10],
  challengerFading: [30, 160, 15],
  challengerActive: [57, 255, 20],
  defenderTerritory: [58, 0, 58],
  defenderFading: [160, 0, 160],
  defenderActive: [255, 0, 255],
} as const;

interface CoreCanvasProps {
  territoryMap: Uint8Array;
  activityMap: Uint8Array;
}

export default function CoreCanvas({ territoryMap, activityMap }: CoreCanvasProps) {
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
      const territory = territoryMap[i];
      const activity = activityMap[i];

      let color: readonly number[];
      if (territory === 1) {
        // Challenger
        if (activity >= 2) color = COLORS.challengerActive;
        else if (activity === 1) color = COLORS.challengerFading;
        else color = COLORS.challengerTerritory;
      } else if (territory === 2) {
        // Defender
        if (activity >= 2) color = COLORS.defenderActive;
        else if (activity === 1) color = COLORS.defenderFading;
        else color = COLORS.defenderTerritory;
      } else {
        // Empty but with activity flash
        if (activity >= 2) color = COLORS.challengerActive;
        else if (activity === 1) color = COLORS.challengerFading;
        else color = COLORS.empty;
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
        style={{ maxWidth: '100%', height: 'auto', display: 'block' }}
      />
    </div>
  );
}
