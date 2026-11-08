import { useEffect, useRef } from 'react';

interface NodeParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  colorType: 'forest' | 'olive' | 'caramel' | 'cornsilk';
  alpha: number;
  pulsePhase: number;
}

export function AegisFieldCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const isMobile = width < 768;
    const nodeCount = isMobile ? 24 : 44;

    const palette = {
      forest: { base: '#283618', highlight: '#455d2a', glow: 'rgba(40, 54, 24, 0.25)' },
      olive: { base: '#606c38', highlight: '#8b9c52', glow: 'rgba(96, 108, 56, 0.28)' },
      caramel: { base: '#dda15e', highlight: '#f3c792', glow: 'rgba(221, 161, 94, 0.35)' },
      cornsilk: { base: '#fefae0', highlight: '#ffffff', glow: 'rgba(254, 250, 224, 0.4)' },
    };

    const types: ('forest' | 'olive' | 'caramel' | 'cornsilk')[] = [
      'forest', 'forest', 'olive', 'olive', 'caramel', 'cornsilk'
    ];

    const nodes: NodeParticle[] = [];
    for (let i = 0; i < nodeCount; i++) {
      const radius = isMobile ? 8 + Math.random() * 12 : 11 + Math.random() * 18;
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * Math.min(width, height) * 0.4;
      nodes.push({
        x: width / 2 + Math.cos(angle) * dist,
        y: height / 2 + Math.sin(angle) * dist,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius,
        colorType: types[i % types.length],
        alpha: 0.75 + Math.random() * 0.25,
        pulsePhase: Math.random() * Math.PI * 2,
      });
    }

    const mouse = { x: -9999, y: -9999, prevX: -9999, prevY: -9999, speed: 0, isDown: false };

    const handlePointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const newX = e.clientX - rect.left;
      const newY = e.clientY - rect.top;
      const dx = newX - mouse.prevX;
      const dy = newY - mouse.prevY;
      mouse.speed = Math.min(Math.sqrt(dx * dx + dy * dy), 24);
      mouse.prevX = mouse.x = newX;
      mouse.prevY = mouse.y = newY;
    };

    const handlePointerDown = () => { mouse.isDown = true; };
    const handlePointerUp = () => { mouse.isDown = false; };
    const handlePointerLeave = () => { mouse.x = -9999; mouse.y = -9999; };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    window.addEventListener('pointerup', handlePointerUp, { passive: true });
    window.addEventListener('pointerleave', handlePointerLeave, { passive: true });

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.parentElement.clientWidth;
      height = canvas.parentElement.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    };

    window.addEventListener('resize', handleResize);

    let animationFrameId = 0;
    let lastTime = performance.now();

    const render = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;

      ctx.clearRect(0, 0, width, height);

      const centerX = width * 0.52;
      const centerY = height * 0.48;

      // Draw faint connections between nearby nodes
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x;
          const dy = nodes[j].y - nodes[i].y;
          const distSq = dx * dx + dy * dy;
          const maxDist = isMobile ? 85 : 125;
          if (distSq < maxDist * maxDist) {
            const dist = Math.sqrt(distSq);
            const lineAlpha = (1 - dist / maxDist) * 0.22;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(96, 108, 56, ${lineAlpha})`;
            ctx.lineWidth = 1;
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      // Physics update and render nodes
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];

        if (!prefersReducedMotion) {
          // Center attraction
          const toCenterX = centerX - n.x;
          const toCenterY = centerY - n.y;
          const attractStrength = 0.0018;
          n.vx += toCenterX * attractStrength;
          n.vy += toCenterY * attractStrength;

          // Gentle ambient drift
          n.pulsePhase += dt * 0.8;
          n.vx += Math.sin(time * 0.001 + i) * 0.025;
          n.vy += Math.cos(time * 0.0012 + i * 1.5) * 0.025;

          // Mouse repulsion with momentum boost
          const mdx = n.x - mouse.x;
          const mdy = n.y - mouse.y;
          const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
          const repelRadius = mouse.isDown ? (isMobile ? 140 : 220) : (isMobile ? 100 : 160);

          if (mDist < repelRadius && mDist > 0.1) {
            const ratio = 1 - mDist / repelRadius;
            const force = ratio * ratio * (mouse.isDown ? 0.35 : 0.18);
            const speedBoost = 1 + mouse.speed * 0.12;
            n.vx += (mdx / mDist) * force * speedBoost * 14;
            n.vy += (mdy / mDist) * force * speedBoost * 14;
          }

          // Pairwise soft collision / repulsion
          for (let j = i + 1; j < nodes.length; j++) {
            const other = nodes[j];
            const cdx = other.x - n.x;
            const cdy = other.y - n.y;
            const cDist = Math.sqrt(cdx * cdx + cdy * cdy);
            const minDist = n.radius + other.radius + 6;
            if (cDist < minDist && cDist > 0.001) {
              const overlap = (minDist - cDist) / cDist;
              const push = overlap * 0.08;
              n.vx -= cdx * push;
              n.vy -= cdy * push;
              other.vx += cdx * push;
              other.vy += cdy * push;
            }
          }

          // Damping and position integration
          n.vx *= 0.93;
          n.vy *= 0.93;
          n.x += n.vx;
          n.y += n.vy;

          // Screen edge boundaries
          const pad = n.radius + 10;
          if (n.x < pad) { n.x = pad; n.vx *= -0.5; }
          else if (n.x > width - pad) { n.x = width - pad; n.vx *= -0.5; }
          if (n.y < pad) { n.y = pad; n.vy *= -0.5; }
          else if (n.y > height - pad) { n.y = height - pad; n.vy *= -0.5; }
        }

        // Render glossy physical 3D orb
        const colors = palette[n.colorType];
        const pulse = 1 + Math.sin(n.pulsePhase) * 0.04;
        const currentRadius = n.radius * pulse;

        // Ambient glow
        ctx.beginPath();
        ctx.arc(n.x, n.y, currentRadius * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = colors.glow;
        ctx.fill();

        // 3D Spherical Radial Gradient
        const grad = ctx.createRadialGradient(
          n.x - currentRadius * 0.32,
          n.y - currentRadius * 0.36,
          currentRadius * 0.1,
          n.x,
          n.y,
          currentRadius
        );
        grad.addColorStop(0, colors.highlight);
        grad.addColorStop(0.5, colors.base);
        grad.addColorStop(1, colors.base);

        ctx.beginPath();
        ctx.arc(n.x, n.y, currentRadius, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.shadowColor = 'rgba(40, 54, 24, 0.15)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 4;
        ctx.fill();
        ctx.shadowColor = 'transparent';

        // Specular highlight gleam
        ctx.beginPath();
        ctx.ellipse(
          n.x - currentRadius * 0.28,
          n.y - currentRadius * 0.32,
          currentRadius * 0.35,
          currentRadius * 0.2,
          Math.PI / 4,
          0,
          Math.PI * 2
        );
        ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.fill();
      }

      if (!prefersReducedMotion) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    render(performance.now());

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointerleave', handlePointerLeave);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="aegis-field-wrapper" aria-hidden="true">
      <canvas ref={canvasRef} className="aegis-field-canvas" />
    </div>
  );
}
