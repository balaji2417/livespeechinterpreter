import { useEffect, useRef, useState } from "react";

interface Star {
  x: number;
  y: number;
  size: number;
  phase: number;
  speed: number;
  baseAlpha: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  phase: number;
}

interface Shooter {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

const StarfieldBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const mouseRef = useRef({ x: -9999, y: -9999 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let w = 0;
    let h = 0;

    const resize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // ── Static twinkling stars ──
    const stars: Star[] = Array.from({ length: 200 }, () => ({
      x: Math.random(),
      y: Math.random(),
      size: Math.random() * 2.5 + 0.8,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.015 + 0.005,
      baseAlpha: Math.random() * 0.7 + 0.3,
    }));

    // ── Floating connected particles ──
    const particles: Particle[] = Array.from({ length: 60 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      size: Math.random() * 3 + 1.5,
      alpha: Math.random() * 0.6 + 0.3,
      phase: Math.random() * Math.PI * 2,
    }));

    // ── Shooting stars ──
    const shooters: Shooter[] = [];
    let shootTimer = 0;

    const handleMouse = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("mousemove", handleMouse);

    let t = 0;

    const draw = () => {
      t++;
      ctx.clearRect(0, 0, w, h);

      const dark = document.documentElement.classList.contains("dark");

      // Colors
      const sR = dark ? 255 : 220;
      const sG = dark ? 170 : 130;
      const sB = dark ? 30 : 20;

      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      // ── Draw twinkling stars ──
      for (const star of stars) {
        const sx = star.x * w;
        const sy = star.y * h;
        const pulse = Math.sin(t * star.speed + star.phase);
        const alpha = star.baseAlpha * (0.5 + 0.5 * pulse);

        // Glow
        const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, star.size * 4);
        grad.addColorStop(0, `rgba(${sR}, ${sG}, ${sB}, ${alpha * 0.8})`);
        grad.addColorStop(0.3, `rgba(${sR}, ${sG}, ${sB}, ${alpha * 0.3})`);
        grad.addColorStop(1, `rgba(${sR}, ${sG}, ${sB}, 0)`);
        ctx.beginPath();
        ctx.arc(sx, sy, star.size * 4, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Core
        ctx.beginPath();
        ctx.arc(sx, sy, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${sR}, ${sG}, ${sB}, ${alpha})`;
        ctx.fill();

        // Cross sparkle for bigger stars
        if (star.size > 1.8 && alpha > 0.5) {
          const len = star.size * 6 * alpha;
          ctx.strokeStyle = `rgba(${sR}, ${sG}, ${sB}, ${alpha * 0.4})`;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(sx - len, sy);
          ctx.lineTo(sx + len, sy);
          ctx.moveTo(sx, sy - len);
          ctx.lineTo(sx, sy + len);
          ctx.stroke();
        }
      }

      // ── Floating particles + connections ──
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Move
        p.x += p.vx;
        p.y += p.vy;

        // Wrap
        if (p.x < -20) p.x = w + 20;
        if (p.x > w + 20) p.x = -20;
        if (p.y < -20) p.y = h + 20;
        if (p.y > h + 20) p.y = -20;

        // Mouse interaction
        const dx = p.x - mx;
        const dy = p.y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 150) {
          const force = ((150 - dist) / 150) * 0.03;
          p.vx += dx * force;
          p.vy += dy * force;
        }
        p.vx *= 0.995;
        p.vy *= 0.995;

        // Pulse
        const pulse = Math.sin(t * 0.02 + p.phase);
        const alpha = p.alpha * (0.6 + 0.4 * pulse);

        // Draw particle glow
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 5);
        grad.addColorStop(0, `rgba(${sR}, ${sG}, ${sB}, ${alpha * 0.6})`);
        grad.addColorStop(0.4, `rgba(${sR}, ${sG}, ${sB}, ${alpha * 0.15})`);
        grad.addColorStop(1, `rgba(${sR}, ${sG}, ${sB}, 0)`);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 5, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Core dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${sR}, ${sG}, ${sB}, ${alpha})`;
        ctx.fill();

        // Connection lines between particles
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const ddx = p.x - p2.x;
          const ddy = p.y - p2.y;
          const d = Math.sqrt(ddx * ddx + ddy * ddy);
          if (d < 180) {
            const lineAlpha = (1 - d / 180) * 0.25;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(${sR}, ${sG}, ${sB}, ${lineAlpha})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }

        // Mouse attraction lines
        if (dist < 250 && dist > 10) {
          const lineAlpha = (1 - dist / 250) * 0.3;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mx, my);
          ctx.strokeStyle = `rgba(${sR}, ${sG}, ${sB}, ${lineAlpha})`;
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
      }

      // ── Shooting stars ──
      shootTimer++;
      if (shootTimer > 120 + Math.random() * 200) {
        shootTimer = 0;
        const startX = Math.random() * w;
        const speed = 3 + Math.random() * 4;
        shooters.push({
          x: startX,
          y: -10,
          vx: (Math.random() - 0.3) * speed,
          vy: speed,
          life: 0,
          maxLife: 60 + Math.random() * 40,
        });
      }

      for (let i = shooters.length - 1; i >= 0; i--) {
        const s = shooters[i];
        s.x += s.vx;
        s.y += s.vy;
        s.life++;
        const progress = s.life / s.maxLife;
        const alpha = progress < 0.5 ? progress * 2 : (1 - progress) * 2;

        // Trail
        const trailLen = 25;
        const grad = ctx.createLinearGradient(
          s.x, s.y, s.x - s.vx * trailLen, s.y - s.vy * trailLen
        );
        grad.addColorStop(0, `rgba(${sR}, ${sG}, ${sB}, ${alpha * 0.9})`);
        grad.addColorStop(1, `rgba(${sR}, ${sG}, ${sB}, 0)`);
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x - s.vx * trailLen, s.y - s.vy * trailLen);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Head glow
        const headGrad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, 8);
        headGrad.addColorStop(0, `rgba(255, 220, 100, ${alpha * 0.8})`);
        headGrad.addColorStop(1, `rgba(${sR}, ${sG}, ${sB}, 0)`);
        ctx.beginPath();
        ctx.arc(s.x, s.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = headGrad;
        ctx.fill();

        if (s.life >= s.maxLife) shooters.splice(i, 1);
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouse);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 1 }}
    />
  );
};

export default StarfieldBackground;