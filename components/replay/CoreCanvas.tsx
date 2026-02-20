'use client';

import { useRef, useEffect } from 'react';

interface GridDimensions {
  cols: number;
  rows: number;
  cellSize: number;
}

function computeGrid(coreSize: number): GridDimensions {
  if (coreSize === 55440) {
    return { cols: 280, rows: 198, cellSize: 2 };
  }
  if (coreSize === 8000) {
    return { cols: 100, rows: 80, cellSize: 5 };
  }
  if (coreSize === 1000000) {
    return { cols: 1000, rows: 1000, cellSize: 1 };
  }
  // Fallback: try to make a reasonable grid
  const cols = Math.ceil(Math.sqrt(coreSize * 1.4));
  const rows = Math.ceil(coreSize / cols);
  return { cols, rows, cellSize: 3 };
}

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
  coreSize?: number;
}

export default function CoreCanvas({ territoryMap, activityMap, coreSize = 55440 }: CoreCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageDataRef = useRef<ImageData | null>(null);
  const gridRef = useRef<GridDimensions>(computeGrid(coreSize));

  // Update grid when coreSize changes
  useEffect(() => {
    gridRef.current = computeGrid(coreSize);
    imageDataRef.current = null; // Reset so it's recreated
  }, [coreSize]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { cols, rows, cellSize } = gridRef.current;
    const width = cols * cellSize;
    const height = rows * cellSize;

    canvas.width = width;
    canvas.height = height;

    if (!imageDataRef.current || imageDataRef.current.width !== width || imageDataRef.current.height !== height) {
      imageDataRef.current = ctx.createImageData(width, height);
    }

    const data = imageDataRef.current.data;

    for (let i = 0; i < cols * rows; i++) {
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

      const col = i % cols;
      const row = Math.floor(i / cols);

      for (let dy = 0; dy < cellSize; dy++) {
        for (let dx = 0; dx < cellSize; dx++) {
          const px = (row * cellSize + dy) * width + (col * cellSize + dx);
          const offset = px * 4;
          data[offset] = color[0];
          data[offset + 1] = color[1];
          data[offset + 2] = color[2];
          data[offset + 3] = 255;
        }
      }
    }

    ctx.putImageData(imageDataRef.current, 0, 0);
  }, [territoryMap, activityMap, coreSize]);

  const { cols, rows, cellSize } = gridRef.current;
  const width = cols * cellSize;
  const height = rows * cellSize;

  return (
    <div className="replay-canvas-container">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ width: '100%', height: 'auto', display: 'block' }}
      />
    </div>
  );
}
