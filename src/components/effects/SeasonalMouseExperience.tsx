import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Sparkles, Leaf, Snowflake, Flower2, Sun, Power, ChevronUp, ChevronDown } from 'lucide-react';

export type Season = 'autumn' | 'winter' | 'spring' | 'summer';

interface Particle {
  x: number;
  y: number;
  size: number;
  speedY: number;
  speedX: number;
  rotation: number;
  rotationSpeed: number;
  flip: number;
  flipSpeed: number;
  opacity: number;
  color: string;
  type: 'leaf' | 'snow' | 'petal' | 'phoenix' | 'firefly';
  swayOffset: number;
  swaySpeed: number;
}

interface TrailPoint {
  x: number;
  y: number;
  size: number;
  alpha: number;
  color: string;
}

const SEASON_CONFIG = {
  autumn: {
    name: 'Mùa Thu',
    subtitle: 'Lá vàng xao xác',
    icon: Leaf,
    badgeColor: 'text-amber-700 bg-amber-50 border-amber-200',
    dotColor: 'bg-amber-500',
    glowColor: 'rgba(245, 158, 11, 0.06)',
    trailColor: 'rgba(251, 191, 36, 0.8)',
    colors: ['#d97706', '#b45309', '#f59e0b', '#ea580c', '#c2410c'],
    types: ['leaf' as const],
    particleCount: 22
  },
  winter: {
    name: 'Mùa Đông',
    subtitle: 'Tuyết sương tinh khôi',
    icon: Snowflake,
    badgeColor: 'text-sky-700 bg-sky-50 border-sky-200',
    dotColor: 'bg-sky-400',
    glowColor: 'rgba(56, 189, 248, 0.06)',
    trailColor: 'rgba(186, 230, 253, 0.9)',
    colors: ['#ffffff', '#e0f2fe', '#bae6fd', '#cbd5e1'],
    types: ['snow' as const],
    particleCount: 30
  },
  spring: {
    name: 'Mùa Xuân',
    subtitle: 'Cánh đào bay nhẹ',
    icon: Flower2,
    badgeColor: 'text-rose-700 bg-rose-50 border-rose-200',
    dotColor: 'bg-rose-400',
    glowColor: 'rgba(251, 113, 133, 0.06)',
    trailColor: 'rgba(253, 164, 175, 0.9)',
    colors: ['#fda4af', '#fb7185', '#f43f5e', '#fecdd3'],
    types: ['petal' as const],
    particleCount: 24
  },
  summer: {
    name: 'Mùa Hè',
    subtitle: 'Phượng vĩ & đom đóm',
    icon: Sun,
    badgeColor: 'text-orange-700 bg-orange-50 border-orange-200',
    dotColor: 'bg-orange-500',
    glowColor: 'rgba(249, 115, 22, 0.06)',
    trailColor: 'rgba(254, 240, 138, 0.9)',
    colors: ['#ef4444', '#dc2626', '#f87171', '#facc15'],
    types: ['phoenix' as const, 'firefly' as const],
    particleCount: 26
  }
};

const getAutoSeason = (): Season => {
  const month = new Date().getMonth(); // 0 = Jan, 8 = Sept
  if (month >= 8 && month <= 10) return 'autumn';
  if (month === 11 || month === 0 || month === 1) return 'winter';
  if (month >= 2 && month <= 4) return 'spring';
  return 'summer';
};

const STORAGE_KEYS = {
  ENABLED: 'cvt_seasonal_effect_enabled',
  SEASON: 'cvt_seasonal_effect_season',
  MOUSE_TRACK: 'cvt_seasonal_mouse_track_enabled'
};

export const SeasonalMouseExperience: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // States
  const [isEnabled, setIsEnabled] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ENABLED);
      return stored !== null ? stored === 'true' : true;
    } catch {
      return true;
    }
  });

  const [mouseTrackEnabled, setMouseTrackEnabled] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.MOUSE_TRACK);
      return stored !== null ? stored === 'true' : true;
    } catch {
      return true;
    }
  });

  const [currentSeason, setCurrentSeason] = useState<Season>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SEASON);
      if (stored && ['autumn', 'winter', 'spring', 'summer'].includes(stored)) {
        return stored as Season;
      }
    } catch {
      // fallback
    }
    return getAutoSeason();
  });

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Refs for animation loop
  const mousePos = useRef<{ x: number; y: number; active: boolean }>({ x: -100, y: -100, active: false });
  const trailRef = useRef<TrailPoint[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameId = useRef<number | null>(null);
  const isHiddenRef = useRef<boolean>(false);

  // Save changes
  const toggleEnabled = useCallback(() => {
    setIsEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEYS.ENABLED, String(next));
        window.dispatchEvent(new CustomEvent('cvt:seasonal_change', {
          detail: { enabled: next, season: currentSeason, mouseTrack: mouseTrackEnabled }
        }));
      } catch {
        // ignore
      }
      return next;
    });
  }, [currentSeason, mouseTrackEnabled]);

  const selectSeason = useCallback((season: Season) => {
    setCurrentSeason(season);
    try {
      localStorage.setItem(STORAGE_KEYS.SEASON, season);
      window.dispatchEvent(new CustomEvent('cvt:seasonal_change', {
        detail: { season, enabled: isEnabled, mouseTrack: mouseTrackEnabled }
      }));
    } catch {
      // ignore
    }
  }, [isEnabled, mouseTrackEnabled]);

  const toggleMouseTrack = useCallback(() => {
    setMouseTrackEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEYS.MOUSE_TRACK, String(next));
        window.dispatchEvent(new CustomEvent('cvt:seasonal_change', {
          detail: { mouseTrack: next, season: currentSeason, enabled: isEnabled }
        }));
      } catch {
        // ignore
      }
      return next;
    });
  }, [currentSeason, isEnabled]);

  // Synchronize changes from external sources (e.g. CustomContextMenu)
  useEffect(() => {
    const handleSync = (e: CustomEvent) => {
      if (e.detail?.season) setCurrentSeason(e.detail.season);
      if (typeof e.detail?.enabled === 'boolean') setIsEnabled(e.detail.enabled);
      if (typeof e.detail?.mouseTrack === 'boolean') setMouseTrackEnabled(e.detail.mouseTrack);
    };
    window.addEventListener('cvt:seasonal_change', handleSync as EventListener);
    return () => {
      window.removeEventListener('cvt:seasonal_change', handleSync as EventListener);
    };
  }, []);

  // Listen to mouse
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mousePos.current.x = e.clientX;
      mousePos.current.y = e.clientY;
      mousePos.current.active = true;

      if (isEnabled && mouseTrackEnabled) {
        // Add trail point with controlled density
        if (Math.random() < 0.45 && trailRef.current.length < 24) {
          const cfg = SEASON_CONFIG[currentSeason];
          trailRef.current.push({
            x: e.clientX + (Math.random() - 0.5) * 8,
            y: e.clientY + (Math.random() - 0.5) * 8,
            size: 1 + Math.random() * 2,
            alpha: 0.85,
            color: cfg.trailColor
          });
        }
      }
    };

    const handleMouseLeave = () => {
      mousePos.current.active = false;
    };

    const handleVisibilityChange = () => {
      isHiddenRef.current = document.hidden;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentSeason, isEnabled, mouseTrackEnabled]);

  // Main canvas animation
  useEffect(() => {
    if (!isEnabled) {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize, { passive: true });

    // Initialize particles for current season
    const cfg = SEASON_CONFIG[currentSeason];
    const isMobile = window.innerWidth < 768;
    const count = isMobile ? Math.floor(cfg.particleCount * 0.5) : cfg.particleCount;

    const initParticle = (atTop = false): Particle => {
      const type = cfg.types[Math.floor(Math.random() * cfg.types.length)];
      const color = cfg.colors[Math.floor(Math.random() * cfg.colors.length)];
      const size = type === 'snow'
        ? 1.5 + Math.random() * 3
        : type === 'firefly'
          ? 2 + Math.random() * 2.5
          : 8 + Math.random() * 9;

      return {
        x: Math.random() * width,
        y: atTop ? -20 : Math.random() * height,
        size,
        speedY: type === 'firefly' ? -0.2 - Math.random() * 0.4 : 0.6 + Math.random() * 1.2,
        speedX: (Math.random() - 0.5) * 0.8,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.03,
        flip: Math.random() * Math.PI,
        flipSpeed: 0.02 + Math.random() * 0.03,
        opacity: 0.35 + Math.random() * 0.55,
        color,
        type,
        swayOffset: Math.random() * 100,
        swaySpeed: 0.015 + Math.random() * 0.02
      };
    };

    particlesRef.current = Array.from({ length: count }, () => initParticle(false));

    let time = 0;

    const drawLeaf = (p: Particle) => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.scale(Math.cos(p.flip), 1);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.opacity;

      ctx.beginPath();
      ctx.moveTo(0, -p.size);
      ctx.bezierCurveTo(p.size * 0.8, -p.size * 0.4, p.size * 0.8, p.size * 0.5, 0, p.size);
      ctx.bezierCurveTo(-p.size * 0.8, p.size * 0.5, -p.size * 0.8, -p.size * 0.4, 0, -p.size);
      ctx.fill();

      // Delicate leaf stem
      ctx.strokeStyle = 'rgba(0,0,0,0.18)';
      ctx.lineWidth = 0.75;
      ctx.beginPath();
      ctx.moveTo(0, -p.size);
      ctx.lineTo(0, p.size * 1.15);
      ctx.stroke();

      ctx.restore();
    };

    const drawSnow = (p: Particle) => {
      ctx.save();
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const drawPetal = (p: Particle) => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.scale(Math.cos(p.flip), 1);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.opacity;

      ctx.beginPath();
      ctx.moveTo(0, -p.size * 0.9);
      ctx.bezierCurveTo(p.size * 0.6, -p.size * 0.6, p.size * 0.7, p.size * 0.4, 0, p.size);
      ctx.bezierCurveTo(-p.size * 0.7, p.size * 0.4, -p.size * 0.6, -p.size * 0.6, 0, -p.size * 0.9);
      ctx.fill();
      ctx.restore();
    };

    const drawPhoenix = (p: Particle) => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.scale(Math.cos(p.flip), 1);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.opacity;

      // Phoenix flower petal (elongated fan-drop)
      ctx.beginPath();
      ctx.moveTo(0, -p.size);
      ctx.bezierCurveTo(p.size * 0.5, -p.size * 0.2, p.size * 0.6, p.size * 0.6, 0, p.size * 0.9);
      ctx.bezierCurveTo(-p.size * 0.6, p.size * 0.6, -p.size * 0.5, -p.size * 0.2, 0, -p.size);
      ctx.fill();
      ctx.restore();
    };

    const drawFirefly = (p: Particle) => {
      const glow = Math.sin(time * 0.05 + p.swayOffset) * 0.4 + 0.6;
      ctx.save();
      ctx.globalAlpha = p.opacity * glow;

      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3.5);
      grad.addColorStop(0, p.color);
      grad.addColorStop(0.3, 'rgba(250, 204, 21, 0.4)');
      grad.addColorStop(1, 'rgba(250, 204, 21, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const render = () => {
      if (isHiddenRef.current) {
        animationFrameId.current = requestAnimationFrame(render);
        return;
      }

      ctx.clearRect(0, 0, width, height);
      time += 1;

      // 1. Draw Mouse Glow if enabled
      if (mouseTrackEnabled && mousePos.current.active) {
        const mx = mousePos.current.x;
        const my = mousePos.current.y;
        const radius = 90;
        const grad = ctx.createRadialGradient(mx, my, 0, mx, my, radius);
        grad.addColorStop(0, cfg.glowColor);
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(mx, my, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. Draw & Update Mouse Trail
      if (mouseTrackEnabled && trailRef.current.length > 0) {
        for (let i = trailRef.current.length - 1; i >= 0; i--) {
          const pt = trailRef.current[i];
          pt.alpha -= 0.035;
          pt.size = Math.max(0.2, pt.size - 0.05);

          if (pt.alpha <= 0) {
            trailRef.current.splice(i, 1);
            continue;
          }

          ctx.save();
          ctx.globalAlpha = pt.alpha;
          ctx.fillStyle = pt.color;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      // 3. Draw & Update Seasonal Particles
      const particles = particlesRef.current;
      const mx = mousePos.current.x;
      const my = mousePos.current.y;
      const mouseActive = mousePos.current.active;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Motion physics
        p.rotation += p.rotationSpeed;
        p.flip += p.flipSpeed;
        p.y += p.speedY;
        p.x += p.speedX + Math.sin(time * p.swaySpeed + p.swayOffset) * 0.45;

        // Interactive mouse wind deflection
        if (mouseActive) {
          const dx = p.x - mx;
          const dy = p.y - my;
          const dist = Math.hypot(dx, dy);
          if (dist < 75 && dist > 0) {
            const force = (1 - dist / 75) * 1.8;
            p.x += (dx / dist) * force;
            p.y += (dy / dist) * force * 0.6;
          }
        }

        // Loop boundaries
        if (p.type === 'firefly') {
          if (p.y < -20) p.y = height + 10;
          if (p.x < -20) p.x = width + 10;
          if (p.x > width + 20) p.x = -10;
        } else {
          if (p.y > height + 25) {
            particles[i] = initParticle(true);
          }
          if (p.x < -30) p.x = width + 20;
          if (p.x > width + 30) p.x = -20;
        }

        // Render appropriate particle type
        switch (p.type) {
          case 'leaf':
            drawLeaf(p);
            break;
          case 'snow':
            drawSnow(p);
            break;
          case 'petal':
            drawPetal(p);
            break;
          case 'phoenix':
            drawPhoenix(p);
            break;
          case 'firefly':
            drawFirefly(p);
            break;
        }
      }

      animationFrameId.current = requestAnimationFrame(render);
    };

    animationFrameId.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [currentSeason, isEnabled, mouseTrackEnabled]);

  const activeSeasonData = SEASON_CONFIG[currentSeason];
  const ActiveIcon = activeSeasonData.icon;

  return (
    <>
      {/* Background Interactive Canvas (Strictly non-blocking) */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0 z-20 select-none overflow-hidden"
        aria-hidden="true"
      />

      {/* Floating Seasonal Control Pill */}
      <aside aria-label="Điều khiển hiệu ứng mùa" className="fixed bottom-16 left-3 z-30 select-none md:bottom-4 md:left-4">
        <div className="relative">
          {/* Expanded Menu Panel */}
          {isMenuOpen && (
            <div className="absolute bottom-full left-0 mb-2 w-64 rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
              <div className="mb-2.5 flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <Sparkles className="h-3.5 w-3.5 text-primary-600" />
                  <span>Hiệu ứng không gian</span>
                </div>
                <button
                  type="button"
                  onClick={toggleEnabled}
                  title={isEnabled ? 'Tắt toàn bộ hiệu ứng' : 'Bật hiệu ứng'}
                  aria-label={isEnabled ? 'Tắt hiệu ứng' : 'Bật hiệu ứng'}
                  className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
                    isEnabled
                      ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  <Power className="h-3 w-3" />
                  <span>{isEnabled ? 'Đang bật' : 'Đã tắt'}</span>
                </button>
              </div>

              {/* Season Selection */}
              <div className="mb-3 space-y-1">
                <p className="text-xs font-semibold text-slate-500">Chọn mùa trải nghiệm:</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {(Object.keys(SEASON_CONFIG) as Season[]).map((key) => {
                    const s = SEASON_CONFIG[key];
                    const Icon = s.icon;
                    const isSelected = currentSeason === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => selectSeason(key)}
                        disabled={!isEnabled}
                        className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-left text-xs transition-colors ${
                          isSelected
                            ? 'border-primary-500 bg-primary-50/80 font-bold text-primary-900'
                            : 'border-slate-200 bg-white font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                        } ${!isEnabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{s.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Mouse Track Toggle */}
              <div className="border-t border-slate-100 pt-2">
                <button
                  type="button"
                  onClick={toggleMouseTrack}
                  disabled={!isEnabled}
                  className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${
                    mouseTrackEnabled && isEnabled
                      ? 'bg-slate-50 text-slate-800'
                      : 'text-slate-400'
                  } ${!isEnabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-100'}`}
                >
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3 text-amber-500" />
                    <span>Track chuột & bụi sao</span>
                  </span>
                  <span
                    className={`h-2 w-2 rounded-full ${
                      mouseTrackEnabled && isEnabled ? 'bg-emerald-500' : 'bg-slate-300'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* Trigger Pill Button */}
          <button
            type="button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            aria-expanded={isMenuOpen}
            aria-label="Cài đặt hiệu ứng mùa và track chuột"
            className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/95 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur transition-all hover:border-slate-300 hover:bg-white hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          >
            <span className="flex items-center gap-1.5">
              <span className={`inline-block h-2 w-2 rounded-full ${isEnabled ? activeSeasonData.dotColor : 'bg-slate-300'}`} />
              <ActiveIcon className="h-3.5 w-3.5 text-slate-600" />
              <span>{activeSeasonData.name}</span>
            </span>
            {isMenuOpen ? (
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            ) : (
              <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
            )}
          </button>
        </div>
      </aside>
    </>
  );
};
