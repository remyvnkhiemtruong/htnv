import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Sparkles,
  Leaf,
  Snowflake,
  Flower2,
  Sun,
  Power,
  ChevronUp,
  ChevronDown,
  Gift,
  PartyPopper,
  Award,
  Moon
} from 'lucide-react';

export type ThemeMode =
  | 'autumn'
  | 'winter'
  | 'spring'
  | 'summer'
  | 'christmas'
  | 'newyear'
  | 'tet'
  | 'teachersday'
  | 'midautumn';

export type Season = ThemeMode; // Alias for backward compatibility

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
  type: 'leaf' | 'snow' | 'petal' | 'phoenix' | 'firefly' | 'star' | 'ornament' | 'confetti' | 'mai' | 'lixi' | 'lantern';
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

const THEME_CONFIG: Record<
  ThemeMode,
  {
    name: string;
    category: 'season' | 'holiday';
    subtitle: string;
    icon: React.ElementType;
    badgeColor: string;
    dotColor: string;
    glowColor: string;
    trailColor: string;
    colors: string[];
    types: Particle['type'][];
    particleCount: number;
  }
> = {
  autumn: {
    name: 'Mùa Thu',
    category: 'season',
    subtitle: 'Lá vàng xao xác',
    icon: Leaf,
    badgeColor: 'text-amber-700 bg-amber-50 border-amber-200',
    dotColor: 'bg-amber-500',
    glowColor: 'rgba(245, 158, 11, 0.06)',
    trailColor: 'rgba(251, 191, 36, 0.8)',
    colors: ['#d97706', '#b45309', '#f59e0b', '#ea580c', '#c2410c'],
    types: ['leaf'],
    particleCount: 22
  },
  winter: {
    name: 'Mùa Đông',
    category: 'season',
    subtitle: 'Tuyết sương tinh khôi',
    icon: Snowflake,
    badgeColor: 'text-sky-700 bg-sky-50 border-sky-200',
    dotColor: 'bg-sky-400',
    glowColor: 'rgba(56, 189, 248, 0.06)',
    trailColor: 'rgba(186, 230, 253, 0.9)',
    colors: ['#ffffff', '#e0f2fe', '#bae6fd', '#cbd5e1'],
    types: ['snow'],
    particleCount: 30
  },
  spring: {
    name: 'Mùa Xuân',
    category: 'season',
    subtitle: 'Cánh đào bay nhẹ',
    icon: Flower2,
    badgeColor: 'text-rose-700 bg-rose-50 border-rose-200',
    dotColor: 'bg-rose-400',
    glowColor: 'rgba(251, 113, 133, 0.06)',
    trailColor: 'rgba(253, 164, 175, 0.9)',
    colors: ['#fda4af', '#fb7185', '#f43f5e', '#fecdd3'],
    types: ['petal'],
    particleCount: 24
  },
  summer: {
    name: 'Mùa Hè',
    category: 'season',
    subtitle: 'Phượng vĩ & đom đóm',
    icon: Sun,
    badgeColor: 'text-orange-700 bg-orange-50 border-orange-200',
    dotColor: 'bg-orange-500',
    glowColor: 'rgba(249, 115, 22, 0.06)',
    trailColor: 'rgba(254, 240, 138, 0.9)',
    colors: ['#ef4444', '#dc2626', '#f87171', '#facc15'],
    types: ['phoenix', 'firefly'],
    particleCount: 26
  },
  christmas: {
    name: 'Giáng Sinh (Noel)',
    category: 'holiday',
    subtitle: 'Chuông vàng & sao tuyết',
    icon: Sparkles,
    badgeColor: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    dotColor: 'bg-emerald-500',
    glowColor: 'rgba(16, 185, 129, 0.06)',
    trailColor: 'rgba(251, 191, 36, 0.9)',
    colors: ['#ffffff', '#fbbf24', '#ef4444', '#10b981'],
    types: ['snow', 'star', 'ornament'],
    particleCount: 26
  },
  newyear: {
    name: 'Tết Dương Lịch',
    category: 'holiday',
    subtitle: 'Pháo hoa & kim tuyến',
    icon: PartyPopper,
    badgeColor: 'text-purple-700 bg-purple-50 border-purple-200',
    dotColor: 'bg-purple-500',
    glowColor: 'rgba(168, 85, 247, 0.06)',
    trailColor: 'rgba(250, 204, 21, 0.9)',
    colors: ['#fbbf24', '#ef4444', '#06b6d4', '#a855f7', '#ffffff'],
    types: ['confetti', 'star'],
    particleCount: 28
  },
  tet: {
    name: 'Tết Âm Lịch (Tết Ta)',
    category: 'holiday',
    subtitle: 'Mai vàng & bao lì xì',
    icon: Gift,
    badgeColor: 'text-red-700 bg-red-50 border-red-200',
    dotColor: 'bg-red-500',
    glowColor: 'rgba(239, 68, 68, 0.06)',
    trailColor: 'rgba(250, 204, 21, 0.95)',
    colors: ['#facc15', '#eab308', '#fb7185', '#ef4444'],
    types: ['mai', 'petal', 'lixi'],
    particleCount: 26
  },
  teachersday: {
    name: 'Tri Ân 20/11',
    category: 'holiday',
    subtitle: 'Hoa tri ân thầy cô',
    icon: Award,
    badgeColor: 'text-amber-700 bg-amber-50 border-amber-200',
    dotColor: 'bg-amber-500',
    glowColor: 'rgba(245, 158, 11, 0.06)',
    trailColor: 'rgba(251, 191, 36, 0.9)',
    colors: ['#f59e0b', '#fbbf24', '#d97706', '#ef4444'],
    types: ['petal', 'star'],
    particleCount: 24
  },
  midautumn: {
    name: 'Tết Trung Thu',
    category: 'holiday',
    subtitle: 'Đèn ông sao & trăng rằm',
    icon: Moon,
    badgeColor: 'text-orange-700 bg-orange-50 border-orange-200',
    dotColor: 'bg-orange-500',
    glowColor: 'rgba(251, 146, 60, 0.06)',
    trailColor: 'rgba(254, 240, 138, 0.9)',
    colors: ['#ef4444', '#facc15', '#fb923c'],
    types: ['lantern', 'star'],
    particleCount: 24
  }
};

const getAutoTheme = (): ThemeMode => {
  const now = new Date();
  const month = now.getMonth(); // 0 = Jan, 8 = Sep, 11 = Dec
  const date = now.getDate();

  // Noel: Dec 15 - Dec 26
  if (month === 11 && date >= 15 && date <= 26) return 'christmas';
  // New Year Countdown: Dec 27 - Jan 03
  if ((month === 11 && date >= 27) || (month === 0 && date <= 3)) return 'newyear';
  // Lunar New Year: Jan 15 - Feb 15
  if ((month === 0 && date >= 15) || (month === 1 && date <= 15)) return 'tet';
  // Vietnamese Teachers' Day: Nov 15 - Nov 22
  if (month === 10 && date >= 15 && date <= 22) return 'teachersday';
  // Mid Autumn Festival: Sep 12 - Sep 30
  if (month === 8 && date >= 12 && date <= 30) return 'midautumn';

  // 4 Seasons fallback
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

  const [currentTheme, setCurrentTheme] = useState<ThemeMode>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SEASON);
      if (stored && Object.keys(THEME_CONFIG).includes(stored)) {
        return stored as ThemeMode;
      }
    } catch {
      // fallback
    }
    return getAutoTheme();
  });

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'season' | 'holiday'>('season');

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
        window.dispatchEvent(
          new CustomEvent('cvt:seasonal_change', {
            detail: { enabled: next, season: currentTheme, mouseTrack: mouseTrackEnabled }
          })
        );
      } catch {
        // ignore
      }
      return next;
    });
  }, [currentTheme, mouseTrackEnabled]);

  const selectTheme = useCallback(
    (theme: ThemeMode) => {
      setCurrentTheme(theme);
      try {
        localStorage.setItem(STORAGE_KEYS.SEASON, theme);
        window.dispatchEvent(
          new CustomEvent('cvt:seasonal_change', {
            detail: { season: theme, enabled: isEnabled, mouseTrack: mouseTrackEnabled }
          })
        );
      } catch {
        // ignore
      }
    },
    [isEnabled, mouseTrackEnabled]
  );

  const toggleMouseTrack = useCallback(() => {
    setMouseTrackEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEYS.MOUSE_TRACK, String(next));
        window.dispatchEvent(
          new CustomEvent('cvt:seasonal_change', {
            detail: { mouseTrack: next, season: currentTheme, enabled: isEnabled }
          })
        );
      } catch {
        // ignore
      }
      return next;
    });
  }, [currentTheme, isEnabled]);

  // Synchronize changes from external sources (e.g. CustomContextMenu)
  useEffect(() => {
    const handleSync = (e: CustomEvent) => {
      if (e.detail?.season && Object.keys(THEME_CONFIG).includes(e.detail.season)) {
        setCurrentTheme(e.detail.season as ThemeMode);
      }
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
        if (Math.random() < 0.45 && trailRef.current.length < 24) {
          const cfg = THEME_CONFIG[currentTheme];
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
  }, [currentTheme, isEnabled, mouseTrackEnabled]);

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

    // Initialize particles for current theme
    const cfg = THEME_CONFIG[currentTheme];
    const isMobile = window.innerWidth < 768;
    const count = isMobile ? Math.floor(cfg.particleCount * 0.5) : cfg.particleCount;

    const initParticle = (atTop = false): Particle => {
      const type = cfg.types[Math.floor(Math.random() * cfg.types.length)];
      const color = cfg.colors[Math.floor(Math.random() * cfg.colors.length)];
      let size = 8 + Math.random() * 9;
      if (type === 'snow') size = 1.5 + Math.random() * 3;
      else if (type === 'firefly' || type === 'star') size = 2.5 + Math.random() * 3;
      else if (type === 'ornament' || type === 'mai') size = 7 + Math.random() * 6;
      else if (type === 'lixi') size = 10 + Math.random() * 5;
      else if (type === 'confetti') size = 6 + Math.random() * 6;

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

    const drawStar = (p: Particle) => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.opacity;
      ctx.beginPath();
      const spikes = 5;
      const outerRadius = p.size;
      const innerRadius = p.size * 0.45;
      let rot = (Math.PI / 2) * 3;
      const step = Math.PI / spikes;
      ctx.moveTo(0, -outerRadius);
      for (let i = 0; i < spikes; i++) {
        ctx.lineTo(Math.cos(rot) * outerRadius, Math.sin(rot) * outerRadius);
        rot += step;
        ctx.lineTo(Math.cos(rot) * innerRadius, Math.sin(rot) * innerRadius);
        rot += step;
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    const drawOrnament = (p: Particle) => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.opacity;
      ctx.beginPath();
      ctx.arc(0, 0, p.size * 0.7, 0, Math.PI * 2);
      ctx.fill();
      // Golden top ring
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(-p.size * 0.25, -p.size * 0.9, p.size * 0.5, p.size * 0.25);
      ctx.restore();
    };

    const drawConfetti = (p: Particle) => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.scale(Math.cos(p.flip), 1);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.opacity;
      ctx.fillRect(-p.size * 0.6, -p.size * 0.3, p.size * 1.2, p.size * 0.6);
      ctx.restore();
    };

    const drawMai = (p: Particle) => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.scale(Math.cos(p.flip), 1);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.opacity;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.rotate((Math.PI * 2) / 5);
        ctx.ellipse(0, -p.size * 0.5, p.size * 0.35, p.size * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // Pistil center
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.arc(0, 0, p.size * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const drawLixi = (p: Particle) => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.scale(Math.cos(p.flip), 1);
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = '#ef4444';
      const w = p.size * 0.85;
      const h = p.size * 1.3;
      ctx.fillRect(-w / 2, -h / 2, w, h);
      // Gold seal
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(0, -h * 0.08, w * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const drawLantern = (p: Particle) => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = p.opacity;
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size);
      grad.addColorStop(0, '#fef08a');
      grad.addColorStop(0.5, p.color);
      grad.addColorStop(1, 'rgba(239, 68, 68, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, p.size, 0, Math.PI * 2);
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

      // 3. Draw & Update Particles
      const particles = particlesRef.current;
      const mx = mousePos.current.x;
      const my = mousePos.current.y;
      const mouseActive = mousePos.current.active;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

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
        if (p.type === 'firefly' || p.type === 'lantern') {
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

        switch (p.type) {
          case 'leaf': drawLeaf(p); break;
          case 'snow': drawSnow(p); break;
          case 'petal': drawPetal(p); break;
          case 'phoenix': drawPhoenix(p); break;
          case 'firefly': drawFirefly(p); break;
          case 'star': drawStar(p); break;
          case 'ornament': drawOrnament(p); break;
          case 'confetti': drawConfetti(p); break;
          case 'mai': drawMai(p); break;
          case 'lixi': drawLixi(p); break;
          case 'lantern': drawLantern(p); break;
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
  }, [currentTheme, isEnabled, mouseTrackEnabled]);

  const activeThemeData = THEME_CONFIG[currentTheme];
  const ActiveIcon = activeThemeData.icon;

  const seasonsList = (Object.keys(THEME_CONFIG) as ThemeMode[]).filter(
    (k) => THEME_CONFIG[k].category === 'season'
  );
  const holidaysList = (Object.keys(THEME_CONFIG) as ThemeMode[]).filter(
    (k) => THEME_CONFIG[k].category === 'holiday'
  );

  return (
    <>
      {/* Background Interactive Canvas (Strictly non-blocking) */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0 z-20 select-none overflow-hidden"
        aria-hidden="true"
      />

      {/* Floating Seasonal & Holiday Control Pill */}
      <aside aria-label="Điều khiển hiệu ứng mùa và lễ hội" className="fixed bottom-16 left-3 z-30 select-none md:bottom-4 md:left-4">
        <div className="relative">
          {/* Expanded Menu Panel */}
          {isMenuOpen && (
            <div className="absolute bottom-full left-0 mb-2 w-72 rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
              <div className="mb-2.5 flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <Sparkles className="h-3.5 w-3.5 text-primary-600" />
                  <span>Không gian & Lễ hội</span>
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

              {/* Tabs: 4 Mùa vs Dịp Lễ Hội */}
              <div className="mb-2 flex rounded-md bg-slate-100 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab('season')}
                  className={`flex-1 rounded py-1 text-center font-medium transition-all ${
                    activeTab === 'season'
                      ? 'bg-white font-bold text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  4 Mùa
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('holiday')}
                  className={`flex-1 rounded py-1 text-center font-medium transition-all ${
                    activeTab === 'holiday'
                      ? 'bg-white font-bold text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Dịp Lễ Hội
                </button>
              </div>

              {/* Theme Grid */}
              <div className="mb-3 max-h-44 overflow-y-auto space-y-1 pr-0.5">
                <div className="grid grid-cols-2 gap-1.5">
                  {(activeTab === 'season' ? seasonsList : holidaysList).map((key) => {
                    const s = THEME_CONFIG[key];
                    const Icon = s.icon;
                    const isSelected = currentTheme === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => selectTheme(key)}
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
            aria-label="Cài đặt hiệu ứng mùa, lễ hội và track chuột"
            className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/95 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur transition-all hover:border-slate-300 hover:bg-white hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          >
            <span className="flex items-center gap-1.5">
              <span className={`inline-block h-2 w-2 rounded-full ${isEnabled ? activeThemeData.dotColor : 'bg-slate-300'}`} />
              <ActiveIcon className="h-3.5 w-3.5 text-slate-600" />
              <span>{activeThemeData.name}</span>
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
