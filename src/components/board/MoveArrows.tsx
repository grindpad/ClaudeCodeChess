/**
 * MoveArrows — D1 + D2: SVG canvas overlays for last-move and engine-best-move arrows.
 *
 * Rendered as an absolutely-positioned canvas over the chess board.
 * Web-only (returns null on native). Uses HTML5 Canvas API directly since
 * react-native-svg is not a dependency.
 *
 * Colors:
 *   Last move:    semi-transparent yellow (#FFD700 at 50% opacity)
 *   Engine move:  semi-transparent light-grey (#B0B0C0 at 35% opacity)
 */

import React, { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

interface MoveArrowsProps {
  boardSize: number;
  lastMove: [string, string] | null;
  engineMove: [string, string] | null;
  boardFlipped?: boolean;
}

export default function MoveArrows(props: MoveArrowsProps) {
  if (Platform.OS !== 'web') return null;
  return <MoveArrowsCanvas {...props} />;
}

function MoveArrowsCanvas({ boardSize, lastMove, engineMove, boardFlipped = false }: MoveArrowsProps) {
  const canvasRef = useRef<any>(null);

  useEffect(() => {
    const canvas = canvasRef.current as HTMLCanvasElement | null;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, boardSize, boardSize);

    // Draw last-move arrow underneath engine arrow
    if (lastMove) {
      drawArrow(ctx, lastMove[0], lastMove[1], boardSize, 'rgba(255, 215, 0, 0.50)', boardFlipped);
    }
    if (engineMove) {
      drawArrow(ctx, engineMove[0], engineMove[1], boardSize, 'rgba(176, 176, 192, 0.45)', boardFlipped);
    }
  }, [lastMove, engineMove, boardSize, boardFlipped]);

  // React.createElement with a native HTML tag works in React Native Web
  return React.createElement('canvas', {
    ref: canvasRef,
    width: boardSize,
    height: boardSize,
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      pointerEvents: 'none',
      zIndex: 10,
    },
  });
}

// ── Arrow drawing helpers ─────────────────────────────────────────────────────

function squareToCenter(
  square: string,
  boardSize: number,
  flipped: boolean
): [number, number] {
  const file = square.charCodeAt(0) - 97; // 'a'=0 … 'h'=7
  const rank = parseInt(square[1], 10) - 1; // '1'=0 … '8'=7
  const sq = boardSize / 8;

  const col = flipped ? 7 - file : file;
  const row = flipped ? rank : 7 - rank;

  return [col * sq + sq / 2, row * sq + sq / 2];
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  from: string,
  to: string,
  boardSize: number,
  color: string,
  flipped: boolean
): void {
  if (from === to) return;

  const [x1, y1] = squareToCenter(from, boardSize, flipped);
  const [x2, y2] = squareToCenter(to, boardSize, flipped);

  const angle = Math.atan2(y2 - y1, x2 - x1);
  const sq = boardSize / 8;
  const headLen = sq * 0.42;
  const lineWidth = sq * 0.18;
  const headAngle = Math.PI / 6; // 30°

  // Shorten line so it doesn't poke through the arrowhead
  const dist = Math.hypot(x2 - x1, y2 - y1);
  const shortenBy = headLen * 0.7;
  const bodyEndX = x2 - Math.cos(angle) * shortenBy;
  const bodyEndY = y2 - Math.sin(angle) * shortenBy;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';

  // Shaft
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(bodyEndX, bodyEndY);
  ctx.stroke();

  // Arrowhead (filled triangle)
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(
    x2 - headLen * Math.cos(angle - headAngle),
    y2 - headLen * Math.sin(angle - headAngle)
  );
  ctx.lineTo(
    x2 - headLen * Math.cos(angle + headAngle),
    y2 - headLen * Math.sin(angle + headAngle)
  );
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}
