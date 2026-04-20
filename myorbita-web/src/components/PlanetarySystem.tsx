import { useEffect, useRef } from 'react';
import { useTransitionStore } from '../stores/transitionStore';

// ─── Layered canvas architecture ───────────────────────────────────────────
// Layer 0 (static)  — nebulae, drawn once + on resize
// Layer 1 (slow)    — stars twinkle + planets orbit, ~20fps
// Layer 2 (fast)    — warp starfield, 60fps
// Each layer is a separate <canvas> — only layers that change are redrawn

export default function PlanetarySystem() {
  const warpRef    = useRef<HTMLCanvasElement>(null);
  const staticRef  = useRef<HTMLCanvasElement>(null);
  const slowRef    = useRef<HTMLCanvasElement>(null);
  const animRef    = useRef<number>(0);
  const slowRef2   = useRef<number>(0); // frame counter for slow layer

  useEffect(() => {
    const warpCanvas   = warpRef.current;
    const staticCanvas = staticRef.current;
    const slowCanvas   = slowRef.current;
    if (!warpCanvas || !staticCanvas || !slowCanvas) return;

    const warpCtx   = warpCanvas.getContext('2d')!;
    const staticCtx = staticCanvas.getContext('2d')!;
    const slowCtx   = slowCanvas.getContext('2d')!;

    // DPR capped at 2 for performance
    const DPR = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      [warpCanvas, staticCanvas, slowCanvas].forEach(c => {
        c.width  = w * DPR;
        c.height = h * DPR;
        c.style.width  = `${w}px`;
        c.style.height = `${h}px`;
      });
      warpCtx.scale(DPR, DPR);
      staticCtx.scale(DPR, DPR);
      slowCtx.scale(DPR, DPR);
      drawStaticLayer();
    };

    // ─── STATIC LAYER — nebulae (drawn once) ───────────────────────────────
    const drawStaticLayer = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      staticCtx.clearRect(0, 0, w, h);

      // Nebula 1 — Purple, top-left, large diffuse
      staticCtx.save();
      staticCtx.globalAlpha = 0.09;
      const n1 = staticCtx.createRadialGradient(w*0.05, h*0.1, 0, w*0.05, h*0.1, w*0.32);
      n1.addColorStop(0, 'rgba(120,40,180,0.9)');
      n1.addColorStop(0.35, 'rgba(80,20,140,0.55)');
      n1.addColorStop(1, 'rgba(0,0,0,0)');
      staticCtx.beginPath();
      staticCtx.ellipse(w*0.05, h*0.1, w*0.32, h*0.26, 0.2, 0, Math.PI*2);
      staticCtx.fillStyle = n1;
      staticCtx.fill();
      // inner bright core
      const n1b = staticCtx.createRadialGradient(w*0.08, h*0.07, 0, w*0.05, h*0.1, w*0.11);
      n1b.addColorStop(0, 'rgba(180,100,255,0.35)');
      n1b.addColorStop(1, 'rgba(0,0,0,0)');
      staticCtx.beginPath();
      staticCtx.ellipse(w*0.08, h*0.07, w*0.11, h*0.09, -0.3, 0, Math.PI*2);
      staticCtx.fillStyle = n1b;
      staticCtx.fill();
      staticCtx.restore();

      // Nebula 2 — Teal, top-right, elongated vertical
      staticCtx.save();
      staticCtx.globalAlpha = 0.075;
      const n2 = staticCtx.createRadialGradient(w*0.92, h*0.15, 0, w*0.92, h*0.15, w*0.26);
      n2.addColorStop(0, 'rgba(0,180,200,0.9)');
      n2.addColorStop(0.4, 'rgba(0,110,150,0.5)');
      n2.addColorStop(1, 'rgba(0,0,0,0)');
      staticCtx.beginPath();
      staticCtx.ellipse(w*0.92, h*0.15, w*0.22, h*0.32, 0.6, 0, Math.PI*2);
      staticCtx.fillStyle = n2;
      staticCtx.fill();
      // filament
      const n2b = staticCtx.createRadialGradient(w*0.9, h*0.18, 0, w*0.9, h*0.18, w*0.08);
      n2b.addColorStop(0, 'rgba(100,220,240,0.4)');
      n2b.addColorStop(1, 'rgba(0,0,0,0)');
      staticCtx.beginPath();
      staticCtx.ellipse(w*0.9, h*0.18, w*0.06, h*0.11, 0.8, 0, Math.PI*2);
      staticCtx.fillStyle = n2b;
      staticCtx.fill();
      staticCtx.restore();

      // Nebula 3 — Red emission, bottom center, pillar shape
      staticCtx.save();
      staticCtx.globalAlpha = 0.065;
      const n3 = staticCtx.createRadialGradient(w*0.5, h*0.9, 0, w*0.5, h*0.9, w*0.22);
      n3.addColorStop(0, 'rgba(200,60,20,0.9)');
      n3.addColorStop(0.4, 'rgba(140,35,10,0.5)');
      n3.addColorStop(1, 'rgba(0,0,0,0)');
      staticCtx.beginPath();
      staticCtx.ellipse(w*0.5, h*0.9, w*0.18, h*0.28, 0.1, 0, Math.PI*2);
      staticCtx.fillStyle = n3;
      staticCtx.fill();
      // amber hot spot
      const n3b = staticCtx.createRadialGradient(w*0.51, h*0.86, 0, w*0.51, h*0.86, w*0.07);
      n3b.addColorStop(0, 'rgba(255,150,0,0.3)');
      n3b.addColorStop(1, 'rgba(0,0,0,0)');
      staticCtx.beginPath();
      staticCtx.ellipse(w*0.51, h*0.86, w*0.07, h*0.1, -0.2, 0, Math.PI*2);
      staticCtx.fillStyle = n3b;
      staticCtx.fill();
      staticCtx.restore();
    };

    // ─── SLOW LAYER DATA ───────────────────────────────────────────────────
    const STAR_COLORS = ['#FFFFFF','#B4FFFA','#FFF46E','#E081FF','#F89EFF','#4FC3F7'];
    // Pre-group stars by color for batch rendering
    const starsByColor: Record<string, {x:number,y:number,r:number,opacity:number,speed:number,dir:number}[]> = {};
    STAR_COLORS.forEach(c => { starsByColor[c] = []; });
    for (let i = 0; i < 250; i++) {
      const color = STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)];
      starsByColor[color].push({
        x: Math.random(),
        y: Math.random(),
        r: Math.random() * 1.5 + 0.2,
        opacity: Math.random() * 0.6 + 0.2,
        speed: Math.random() * 0.004 + 0.001,
        dir: Math.random() > 0.5 ? 1 : -1,
      });
    }

    const asteroids = Array.from({length:35}, (_,i) => ({
      angle: (i/35)*Math.PI*2 + Math.random()*0.3,
      r: Math.random()*1.3+0.4,
      opacity: Math.random()*0.25+0.08,
      speed: Math.random()*0.00007+0.00003,
    }));

    const drawPlanet = (
      ctx: CanvasRenderingContext2D,
      x:number, y:number, radius:number,
      center:string, highlight:string, shadow:string, glow:string, axis:number
    ) => {
      const g0 = ctx.createRadialGradient(x,y,radius*0.8,x,y,radius*2.0);
      g0.addColorStop(0, glow); g0.addColorStop(1,'rgba(0,0,0,0)');
      ctx.beginPath(); ctx.arc(x,y,radius*2.0,0,Math.PI*2);
      ctx.fillStyle = g0; ctx.fill();

      const hx = x - radius*0.3 + Math.cos(axis)*radius*0.15;
      const hy = y - radius*0.3 + Math.sin(axis)*radius*0.15;
      const gs = ctx.createRadialGradient(hx,hy,radius*0.04,x,y,radius);
      gs.addColorStop(0, highlight); gs.addColorStop(0.45, center); gs.addColorStop(1, shadow);
      ctx.beginPath(); ctx.arc(x,y,radius,0,Math.PI*2);
      ctx.fillStyle = gs; ctx.fill();

      ctx.save(); ctx.beginPath(); ctx.arc(x,y,radius,0,Math.PI*2); ctx.clip();
      for (let i=0;i<3;i++) {
        const by = y - radius*0.65 + i*radius*0.48;
        ctx.beginPath();
        ctx.ellipse(x, by+Math.sin(axis+i*0.9)*3, radius, radius*0.065, 0, 0, Math.PI*2);
        ctx.fillStyle='rgba(255,255,255,0.022)'; ctx.fill();
      }
      ctx.restore();
    };

    const drawRing = (ctx:CanvasRenderingContext2D, x:number, y:number, r:number, tilt:number, front:boolean) => {
      ctx.save(); ctx.translate(x,y); ctx.rotate(tilt); ctx.scale(1,0.22);
      ctx.beginPath();
      ctx.arc(0,0,r*1.8, front?0:Math.PI, front?Math.PI:Math.PI*2);
      ctx.strokeStyle = front ? 'rgba(180,150,255,0.28)' : 'rgba(180,150,255,0.13)';
      ctx.lineWidth = r*0.4; ctx.stroke();
      ctx.restore();
    };

    const drawGalaxy = (ctx:CanvasRenderingContext2D, cx:number, cy:number, r:number, angle:number) => {
      ctx.save(); ctx.translate(cx,cy); ctx.rotate(angle);
      const cg = ctx.createRadialGradient(0,0,0,0,0,r*0.3);
      cg.addColorStop(0,'rgba(255,240,200,0.2)');
      cg.addColorStop(0.5,'rgba(200,160,100,0.07)');
      cg.addColorStop(1,'rgba(0,0,0,0)');
      ctx.beginPath(); ctx.arc(0,0,r*0.3,0,Math.PI*2);
      ctx.fillStyle=cg; ctx.fill();
      for (let arm=0;arm<2;arm++) {
        const base=arm*Math.PI;
        for (let i=0;i<70;i++) {
          const t=i/70, rad=t*r, theta=base+t*Math.PI*3;
          ctx.beginPath();
          ctx.arc(Math.cos(theta)*rad, Math.sin(theta)*rad*0.35, Math.random()*1.1+0.2, 0, Math.PI*2);
          ctx.fillStyle=`rgba(200,180,255,${(1-t)*0.12})`; ctx.fill();
        }
      }
      ctx.restore();
    };

    const drawBlackHole = (ctx:CanvasRenderingContext2D, cx:number, cy:number, r:number, elapsed:number) => {
      const diskAngle = elapsed*0.4;
      const pulse = 1 + Math.sin(elapsed*1.2)*0.07;
      ctx.save(); ctx.translate(cx,cy); ctx.rotate(diskAngle); ctx.scale(1, 0.28*pulse);
      const dg = ctx.createRadialGradient(0,0,r,0,0,r*3.8);
      dg.addColorStop(0, `rgba(255,140,0,${0.30+Math.sin(elapsed*0.8)*0.05})`);
      dg.addColorStop(0.35,'rgba(255,70,0,0.12)');
      dg.addColorStop(1,'rgba(0,0,0,0)');
      ctx.beginPath(); ctx.arc(0,0,r*3.8,0,Math.PI*2);
      ctx.fillStyle=dg; ctx.fill();
      ctx.restore();

      const rp = 0.22 + Math.sin(elapsed*1.8)*0.055;
      const rg = ctx.createRadialGradient(cx,cy,r*0.9,cx,cy,r*1.7);
      rg.addColorStop(0,`rgba(255,180,50,${rp})`);
      rg.addColorStop(0.5,`rgba(255,100,0,${rp*0.4})`);
      rg.addColorStop(1,'rgba(0,0,0,0)');
      ctx.beginPath(); ctx.arc(cx,cy,r*1.7,0,Math.PI*2);
      ctx.fillStyle=rg; ctx.fill();

      ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2);
      ctx.fillStyle='#000000'; ctx.fill();

      const lg = ctx.createRadialGradient(cx,cy,r,cx,cy,r*2.3);
      lg.addColorStop(0,'rgba(0,0,0,0.65)');
      lg.addColorStop(1,'rgba(0,0,0,0)');
      ctx.beginPath(); ctx.arc(cx,cy,r*2.3,0,Math.PI*2);
      ctx.fillStyle=lg; ctx.fill();
    };

    // ─── WARP STARS ────────────────────────────────────────────────────────
    const warpStars = Array.from({length:200}, () => ({
      x: Math.random()*2-1, y: Math.random()*2-1,
      z: Math.random(), pz: 0,
    }));

    // ─── ANIMATION LOOPS ───────────────────────────────────────────────────
    const startTime = performance.now();
    let frameCount = 0;

    const drawSlowLayer = (elapsed: number) => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      slowCtx.clearRect(0, 0, w, h);

      // BATCH RENDER STARS — group by color, single fill per color
      Object.entries(starsByColor).forEach(([color, group]) => {
        slowCtx.beginPath();
        group.forEach(star => {
          star.opacity += star.speed * star.dir;
          if (star.opacity > 0.82) { star.opacity=0.82; star.dir=-1; }
          else if (star.opacity < 0.1) { star.opacity=0.1; star.dir=1; }
          slowCtx.globalAlpha = star.opacity;
          const sx = star.x * w;
          const sy = star.y * h;
          slowCtx.moveTo(sx + star.r, sy);
          slowCtx.arc(sx, sy, star.r, 0, Math.PI*2);
        });
        slowCtx.fillStyle = color;
        slowCtx.fill();
      });
      slowCtx.globalAlpha = 1;

      // Galaxy
      drawGalaxy(slowCtx, w*0.88, h*0.11, w*0.07, elapsed*0.005);

      // Animated black hole
      drawBlackHole(slowCtx, w*0.08, h*0.82, 18, elapsed);

      // Asteroids — batch by similar opacity
      slowCtx.beginPath();
      asteroids.forEach(a => {
        a.angle += a.speed;
        const ax = w*0.15 + Math.cos(a.angle)*w*0.12;
        const ay = h*0.5 + Math.sin(a.angle)*h*0.06;
        slowCtx.globalAlpha = a.opacity;
        slowCtx.moveTo(ax+a.r, ay);
        slowCtx.arc(ax, ay, a.r, 0, Math.PI*2);
      });
      slowCtx.fillStyle = 'rgba(180,160,140,1)';
      slowCtx.fill();
      slowCtx.globalAlpha = 1;

      // 7 Planets
      const p = (t:number) => (elapsed/t)*Math.PI*2;
      const e = elapsed;

      const p1x = w*0.14+Math.cos(p(25))*65, p1y = h*0.5+Math.sin(p(25))*22;
      drawRing(slowCtx,p1x,p1y,28,0.35,false);
      drawPlanet(slowCtx,p1x,p1y,28,'#2D1B69','rgba(147,112,219,0.85)','#0A0015','rgba(88,28,135,0.35)',e*0.25);
      drawRing(slowCtx,p1x,p1y,28,0.35,true);

      const p2x=w*0.85+Math.cos(p(18))*45, p2y=h*0.42+Math.sin(p(18))*15;
      drawPlanet(slowCtx,p2x,p2y,20,'#0D2137','rgba(79,195,247,0.65)','#020810','rgba(14,116,144,0.3)',e*0.4);

      const p3x=w*0.52+Math.cos(p(35))*30, p3y=h*0.1+Math.sin(p(35))*10;
      drawPlanet(slowCtx,p3x,p3y,11,'#3D1010','rgba(200,80,50,0.6)','#100505','rgba(150,40,20,0.2)',e*0.15);

      const p4x=w*0.77+Math.cos(p(22))*25, p4y=h*0.78+Math.sin(p(22))*8;
      drawPlanet(slowCtx,p4x,p4y,8,'#0A1F35','rgba(150,230,255,0.7)','#020810','rgba(100,200,240,0.2)',e*0.55);

      const p5x=w*0.22+Math.cos(p(30))*35, p5y=h*0.18+Math.sin(p(30))*12;
      drawPlanet(slowCtx,p5x,p5y,15,'#3D2800','rgba(255,183,3,0.65)','#1A1000','rgba(200,140,0,0.25)',e*0.3);

      const p6x=w*0.93+Math.cos(p(40))*18, p6y=h*0.64+Math.sin(p(40))*7;
      drawPlanet(slowCtx,p6x,p6y,10,'#0A2010','rgba(80,200,100,0.6)','#020A05','rgba(40,150,60,0.2)',e*0.45);

      const p7x=w*0.5+Math.cos(p(45))*55, p7y=h*0.89+Math.sin(p(45))*10;
      drawRing(slowCtx,p7x,p7y,22,-0.25,false);
      drawPlanet(slowCtx,p7x,p7y,22,'#1A0D35','rgba(120,80,220,0.7)','#08040F','rgba(70,30,150,0.3)',e*0.2);
      drawRing(slowCtx,p7x,p7y,22,-0.25,true);
    };

    const drawWarpLayer = (elapsed: number, speed: number) => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const cx = w/2, cy = h/2;
      warpCtx.clearRect(0, 0, w, h);

      warpStars.forEach(s => {
        s.pz = s.z;
        s.z -= speed;
        if (s.z <= 0) {
          s.x = Math.random()*2-1; s.y = Math.random()*2-1;
          s.z = 1; s.pz = 1;
        }
        const sx = (s.x/s.z)*cx + cx;
        const sy = (s.y/s.z)*cy + cy;
        const px = (s.x/s.pz)*cx + cx;
        const py = (s.y/s.pz)*cy + cy;
        const size = Math.max(0.3, (1-s.z)*2.5);
        const alpha = Math.min(0.55, (1-s.z)*0.7);
        // Trail color shifts to blue when warping fast
        const r = speed > 0.002 ? Math.round(100 + (1-s.z)*80) : 255;
        const g = speed > 0.002 ? Math.round(180 + (1-s.z)*60) : 255;
        warpCtx.beginPath();
        warpCtx.moveTo(px,py); warpCtx.lineTo(sx,sy);
        warpCtx.strokeStyle = `rgba(${r},${g},255,${alpha})`;
        warpCtx.lineWidth = size;
        warpCtx.stroke();
      });
    };

    // Lerp current speed toward target
    let currentSpeed = 0.0005;

    const loop = () => {
      const elapsed = (performance.now() - startTime) / 1000;
      frameCount++;

      // Read warp speed from Zustand WITHOUT subscribing (no re-render)
      const targetSpeed = useTransitionStore.getState().warpSpeed;
      currentSpeed += (targetSpeed - currentSpeed) * 0.08; // lerp

      // Warp layer — every frame
      drawWarpLayer(elapsed, currentSpeed);

      // Slow layer — every 3 frames (~20fps) sufficient for stars+planets
      if (frameCount % 3 === 0) {
        drawSlowLayer(elapsed);
      }

      animRef.current = requestAnimationFrame(loop);
    };

    resize();
    window.addEventListener('resize', resize);
    animRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const canvasStyle: React.CSSProperties = {
    position: 'fixed', top: 0, left: 0,
    width: '100vw', height: '100vh',
    pointerEvents: 'none',
  };

  return (
    <>
      {/* Static nebulae — bottom */}
      <canvas ref={staticRef} style={{ ...canvasStyle, zIndex: 0 }} />
      {/* Stars + planets — middle */}
      <canvas ref={slowRef}   style={{ ...canvasStyle, zIndex: 1 }} />
      {/* Warp starfield — top */}
      <canvas ref={warpRef}   style={{ ...canvasStyle, zIndex: 2 }} />
    </>
  );
}