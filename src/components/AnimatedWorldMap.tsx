import { useEffect, useRef } from 'react';

const AnimatedWorldMap = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resize();
    window.addEventListener('resize', resize);

    // Simplified world map coordinates (longitude, latitude) -> normalized 0-1
    const continents = [
      // North America
      [
        [0.12, 0.25], [0.08, 0.35], [0.05, 0.45], [0.1, 0.5], [0.15, 0.48],
        [0.2, 0.52], [0.25, 0.45], [0.28, 0.38], [0.22, 0.3], [0.18, 0.22],
        [0.15, 0.18], [0.12, 0.25]
      ],
      // South America
      [
        [0.22, 0.55], [0.18, 0.6], [0.2, 0.7], [0.22, 0.78], [0.25, 0.85],
        [0.28, 0.8], [0.3, 0.7], [0.28, 0.6], [0.25, 0.55], [0.22, 0.55]
      ],
      // Europe
      [
        [0.45, 0.25], [0.42, 0.3], [0.45, 0.35], [0.5, 0.38], [0.55, 0.35],
        [0.52, 0.28], [0.48, 0.25], [0.45, 0.25]
      ],
      // Africa
      [
        [0.45, 0.42], [0.42, 0.5], [0.45, 0.6], [0.5, 0.7], [0.55, 0.65],
        [0.58, 0.55], [0.55, 0.45], [0.5, 0.4], [0.45, 0.42]
      ],
      // Asia
      [
        [0.55, 0.2], [0.6, 0.25], [0.7, 0.22], [0.8, 0.28], [0.85, 0.35],
        [0.82, 0.45], [0.75, 0.42], [0.7, 0.38], [0.65, 0.4], [0.6, 0.35],
        [0.55, 0.3], [0.55, 0.2]
      ],
      // Australia
      [
        [0.78, 0.6], [0.75, 0.65], [0.78, 0.72], [0.85, 0.7], [0.88, 0.65],
        [0.85, 0.58], [0.8, 0.58], [0.78, 0.6]
      ],
    ];

    // Particles along the boundaries
    const particles: { x: number; y: number; continent: number; progress: number; speed: number }[] = [];
    
    // Create particles for each continent
    continents.forEach((_, i) => {
      for (let j = 0; j < 8; j++) {
        particles.push({
          x: 0,
          y: 0,
          continent: i,
          progress: Math.random(),
          speed: 0.0005 + Math.random() * 0.001
        });
      }
    });

    const getPointOnPath = (continent: number[][], progress: number) => {
      const totalPoints = continent.length;
      const scaledProgress = progress * (totalPoints - 1);
      const index = Math.floor(scaledProgress);
      const t = scaledProgress - index;
      
      const p1 = continent[index];
      const p2 = continent[(index + 1) % totalPoints];
      
      return {
        x: p1[0] + (p2[0] - p1[0]) * t,
        y: p1[1] + (p2[1] - p1[1]) * t
      };
    };

    const draw = () => {
      ctx.fillStyle = 'rgba(10, 10, 15, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const scale = Math.min(canvas.width, canvas.height) * 0.9;

      // Draw continent boundaries with glow
      continents.forEach((continent, ci) => {
        ctx.beginPath();
        
        const waveOffset = Math.sin(time * 0.5 + ci) * 0.005;
        
        continent.forEach((point, i) => {
          const x = centerX + (point[0] - 0.5 + waveOffset) * scale;
          const y = centerY + (point[1] - 0.5) * scale * 0.8;
          
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        });

        ctx.closePath();
        
        // Gradient stroke
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        const hue = (time * 20 + ci * 40) % 360;
        gradient.addColorStop(0, `hsla(${hue}, 70%, 60%, 0.3)`);
        gradient.addColorStop(0.5, `hsla(${(hue + 30) % 360}, 80%, 50%, 0.5)`);
        gradient.addColorStop(1, `hsla(${(hue + 60) % 360}, 70%, 60%, 0.3)`);
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Inner glow
        ctx.strokeStyle = `hsla(${hue}, 60%, 70%, 0.15)`;
        ctx.lineWidth = 6;
        ctx.stroke();
      });

      // Update and draw particles
      particles.forEach((particle) => {
        particle.progress += particle.speed;
        if (particle.progress > 1) particle.progress = 0;

        const point = getPointOnPath(continents[particle.continent], particle.progress);
        const waveOffset = Math.sin(time * 0.5 + particle.continent) * 0.005;
        
        particle.x = centerX + (point.x - 0.5 + waveOffset) * scale;
        particle.y = centerY + (point.y - 0.5) * scale * 0.8;

        // Particle glow
        const hue = (time * 20 + particle.continent * 40) % 360;
        const gradient = ctx.createRadialGradient(
          particle.x, particle.y, 0,
          particle.x, particle.y, 8
        );
        gradient.addColorStop(0, `hsla(${hue}, 80%, 70%, 0.8)`);
        gradient.addColorStop(0.5, `hsla(${hue}, 70%, 60%, 0.3)`);
        gradient.addColorStop(1, 'transparent');

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Core
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue}, 90%, 80%, 1)`;
        ctx.fill();
      });

      // Draw connecting lines between nearby particles
      particles.forEach((p1, i) => {
        particles.slice(i + 1).forEach((p2) => {
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < 150) {
            const alpha = (1 - dist / 150) * 0.2;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `hsla(280, 60%, 60%, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        });
      });

      time += 0.016;
      animationFrameId = requestAnimationFrame(draw);
    };

    // Initial clear
    ctx.fillStyle = 'rgb(10, 10, 15)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10"
      style={{ background: 'linear-gradient(135deg, hsl(240 10% 5%) 0%, hsl(260 15% 8%) 100%)' }}
    />
  );
};

export default AnimatedWorldMap;
