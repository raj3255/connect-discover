import { useEffect, useRef } from 'react';

type Node = {
  x: number; // normalized 0..1
  y: number;
  vx: number;
  vy: number;
};

const AnimatedWorldMap = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId: number;
    let time = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);

    /* ---------- CONFIG (SAFE VALUES) ---------- */
    const NODE_COUNT = 80;            // keep low → UI wins
    const LINK_DISTANCE = 140;
    const BASE_PURPLE = 187;          // neon violet hue
    const PULSE_SPEED = 0.8;          // slow rhythm
    const DRIFT_STRENGTH = 0.000035;  // gentle system motion

    /* ---------- NODES ---------- */
    const nodes: Node[] = Array.from({ length: NODE_COUNT }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.00018,
      vy: (Math.random() - 0.5) * 0.00018,
    }));

    /* ---------- DRAW LOOP ---------- */
    const draw = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;

      /* Background (deep violet, absorbs glow) */
      const bg = ctx.createLinearGradient(0, 0, w, h);
      bg.addColorStop(0, '#0b0614');
      bg.addColorStop(1, '#1b0d33');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      /* Global drift (slow, cohesive) */
      const driftX = Math.sin(time * 0.15) * DRIFT_STRENGTH;
      const driftY = Math.cos(time * 0.12) * DRIFT_STRENGTH;

      /* Pulse (very subtle) */
      const pulse = 0.55 + Math.sin(time * PULSE_SPEED) * 0.25;

      /* Update nodes */
      nodes.forEach(n => {
        n.x += n.vx + driftX;
        n.y += n.vy + driftY;

        if (n.x < 0 || n.x > 1) n.vx *= -1;
        if (n.y < 0 || n.y > 1) n.vy *= -1;
      });

      /* Connections + flow */
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];

          const ax = a.x * w;
          const ay = a.y * h;
          const bx = b.x * w;
          const by = b.y * h;

          const dx = ax - bx;
          const dy = ay - by;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < LINK_DISTANCE) {
            const alpha = (1 - dist / LINK_DISTANCE) * 0.12;

            /* Base line (dim, background only) */
            ctx.strokeStyle = `rgba(${BASE_PURPLE},120,255,${alpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.lineTo(bx, by);
            ctx.stroke();

            /* Directional flow (small, soft) */
            const t = (time * 0.25 + i * 0.11 + j * 0.17) % 1;
            const fx = ax + (bx - ax) * t;
            const fy = ay + (by - ay) * t;

            ctx.fillStyle = 'rgba(210,185,255,0.65)';
            ctx.beginPath();
            ctx.arc(fx, fy, 1.1, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      /* Nodes */
      nodes.forEach(n => {
        const x = n.x * w;
        const y = n.y * h;

        // center bias for depth (subtle)
        const cx = Math.abs(n.x - 0.5);
        const cy = Math.abs(n.y - 0.5);
        const focus = Math.max(0, 1 - (cx + cy));

        const radius = 6 + focus * 4;

        const glow = ctx.createRadialGradient(x, y, 0, x, y, radius * 1.6);
        glow.addColorStop(
          0,
          `rgba(${BASE_PURPLE},120,255,${0.45 + pulse * 0.25})`
        );
        glow.addColorStop(0.4, `rgba(${BASE_PURPLE},120,255,0.18)`);
        glow.addColorStop(1, 'transparent');

        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, radius * 1.6, 0, Math.PI * 2);
        ctx.fill();

        /* Core (very small, never dominant) */
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.beginPath();
        ctx.arc(x, y, 1.6, 0, Math.PI * 2);
        ctx.fill();
      });

      time += 0.016;
      rafId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  );
};

export default AnimatedWorldMap;
