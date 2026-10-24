import React, { useEffect, useMemo, useRef, useState } from 'react';

// Polyfill for roundRect on older browser engines
if (typeof CanvasRenderingContext2D !== 'undefined' && !(CanvasRenderingContext2D.prototype as any).roundRect) {
  (CanvasRenderingContext2D.prototype as any).roundRect = function(x: number, y: number, w: number, h: number, radii: any) {
    let r = 0;
    if (typeof radii === 'number') r = radii;
    else if (Array.isArray(radii)) r = radii[0] || 0;
    r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    this.moveTo(x + r, y);
    this.arcTo(x + w, y, x + w, y + h, r);
    this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r);
    this.arcTo(x, y, x + w, y, r);
    this.closePath();
    return this;
  };
}

// Standard Pens Definition
const DEFAULT_PENS: [string, string, string, string, string, number, number, number, number, string?, number?][] = [
  ['Cheap Ballpoint','Long barrel. Smooth side flicks.','#e8702a','#bcd0e6','#3a5fc0',130,1.0,.945,1.0, 'ball'],
  ['Gel Grip','Heavy grip. Hits like a truck.','#2f5fb8','#cfd8e6','#1d3f8f',120,1.4,.950,.90, 'gel'],
  ['Mech Pencil','Light and skittish. Fast flicks.','#8a8f99','#f2e07a','#555555',110,0.8,.940,1.1, 'mech'],
  ['Highlighter','Short and stubby. Stays put.','#f0e03a','#f6f08a','#c9b800',100,1.2,.935,.95, 'hl'],
  ['Fountain Pen','Slick nib. Slides far.','#2d3a4f','#a99ad6','#2d3a4f',125,1.0,.960,1.0, 'fount'],
  ['Marker','Fat barrel. Big impacts.','#d94b4b','#f0b0a8','#b02020',115,1.6,.950,.85, 'mark'],
  ['Brush Pen','Whippy and long balance.','#3a9a6a','#a8d8bc','#1d6a44',140,0.9,.950,1.05, 'brush'],
  ['Golden Pen','The champion’s pick.','#d9a520','#f7e08a','#9a7210',130,1.3,.955,1.05, 'gold']
];

interface SettingsState {
  name: string;
  p2: string;
  sel: number;
  diff: number;
  eq: number;
  mir: number;
  real: number;
  aim: number;
  vib: number;
  snd: number;
  muteAll: number;
  rm: number;
  series: number;
  theme: string;
  desk: string;
  mode: string;
  m: any[];
  xp: Record<number, number>;
  customPens: any[];
  seenUnlocks?: string[];
}

export interface UnlockCelebration {
  style: 'neon' | 'chrome' | 'transparent';
  title: string;
  badge: string;
  req: number;
  subtitle: string;
  desc: string;
  cap: string;
  body: string;
  ink: string;
}

export const UNLOCK_STYLES_INFO: Record<string, UnlockCelebration> = {
  neon: {
    style: 'neon',
    title: 'Neon Pen Style Unlocked!',
    badge: '⚡',
    req: 3,
    subtitle: '3 Wins Milestone Achieved!',
    desc: 'Electrify the school desk! Pulsing cyberpunk cyan & neon magenta styling is now unlocked in Pen Studio.',
    cap: '#00ffcc',
    body: '#ff00ff',
    ink: '#00ffcc'
  },
  chrome: {
    style: 'chrome',
    title: 'Chrome Pen Style Unlocked!',
    badge: '🦾',
    req: 5,
    subtitle: '5 Wins Milestone Achieved!',
    desc: 'Pure metallic prestige! Ultra-reflective silver chrome finish with high-gloss highlights is now available in Pen Studio.',
    cap: '#e0e0e0',
    body: '#a0a0a0',
    ink: '#333333'
  },
  transparent: {
    style: 'transparent',
    title: 'Transparent Pen Style Unlocked!',
    badge: '👻',
    req: 10,
    subtitle: '10 Wins Master Milestone!',
    desc: 'The ultimate ghost pen! Crystalline translucent see-through barrel showing your pressurized ink reservoir inside.',
    cap: 'rgba(255,255,255,0.4)',
    body: 'rgba(255,255,255,0.3)',
    ink: '#00d2ff'
  }
};

export interface StreakBadge {
  count: number;
  id: string;
  title: string;
  subtitle: string;
  tier: string;
  icon: string;
  badgeCol: string;
  accentCol: string;
  glowCol: string;
  desc: string;
}

export const STREAK_BADGES: StreakBadge[] = [
  {
    count: 5,
    id: 'streak-5',
    title: 'Hot Streak',
    subtitle: '5 Wins in a Row',
    tier: 'Bronze Tier',
    icon: '🔥',
    badgeCol: '#FF6B00',
    accentCol: '#FFA726',
    glowCol: 'rgba(255, 107, 0, 0.35)',
    desc: 'Blazing momentum! Knocked five consecutive rivals clean off the school desk without a single defeat.'
  },
  {
    count: 10,
    id: 'streak-10',
    title: 'Desk Dominator',
    subtitle: '10 Wins in a Row',
    tier: 'Silver Tier',
    icon: '⚡',
    badgeCol: '#00B0FF',
    accentCol: '#40C4FF',
    glowCol: 'rgba(0, 176, 255, 0.35)',
    desc: 'Unstoppable shockwave! Ten straight flawless victories proving complete desk superiority.'
  },
  {
    count: 20,
    id: 'streak-20',
    title: 'Demon Legend',
    subtitle: '20 Wins in a Row',
    tier: 'Gold Tier',
    icon: '👑',
    badgeCol: '#FFD700',
    accentCol: '#FFB300',
    glowCol: 'rgba(255, 215, 0, 0.45)',
    desc: 'Mythic perfection! Twenty unbroken conquests etched into school desk history as an untouchable master.'
  }
];

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'home' | 'pick' | 'designer' | 'game' | 'stats' | 'lb'>('home');
  const [settings, setSettings] = useState<SettingsState>(() => {
    const saved = localStorage.getItem('flick_demon_v2');
    const def: SettingsState = {
      name: 'Demon', p2: 'Rival', sel: 0, diff: 1, eq: 1, mir: 1, real: 1, aim: 1, vib: 1, snd: 1, muteAll: 0, rm: 0, series: 3, theme: 'system', desk: 'old', mode: 'cpu', m: [], xp: {}, customPens: [], seenUnlocks: []
    };
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...def, ...parsed, muteAll: parsed.muteAll ? 1 : 0, seenUnlocks: parsed.seenUnlocks || [] };
      } catch(e) {}
    }
    return def;
  });

  const [activeSheet, setActiveSheet] = useState<'settings' | 'help' | 'about' | 'penInfo' | null>(null);

  // Designer state
  const [editingPenIdx, setEditingPenIdx] = useState<number>(-1);
  const [stName, setStName] = useState('My Custom Pen');
  const [stCap, setStCap] = useState('#e8702a');
  const [stBody, setStBody] = useState('#bcd0e6');
  const [stInk, setStInk] = useState('#3a5fc0');
  const [stLen, setStLen] = useState(125);
  const [stMass, setStMass] = useState(1.0);
  const [stPow, setStPow] = useState(1.0);
  const [stStyle, setStStyle] = useState('ball');
  const [stShadow, setStShadow] = useState<number>(0.35);

  // Stats / LB state
  const [statsTab, setStatsTab] = useState<'overview' | 'mastery' | 'unlocks'>('overview');
  const [lbTab, setLbTab] = useState<'pens' | 'duelists' | 'records'>('pens');

  // Game over overlay state
  const [gameOverInfo, setGameOverInfo] = useState<{ title: string; desc: string; winner: number } | null>(null);
  const [matchScore, setMatchScore] = useState<[number, number]>([0, 0]);
  const [turnBanner, setTurnBanner] = useState<string>('');
  const [unlockCelebration, setUnlockCelebration] = useState<UnlockCelebration | null>(null);
  const [selectedStreakBadge, setSelectedStreakBadge] = useState<StreakBadge | null>(null);

  // Canvas refs
  const heroCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pickCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const studioCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const unlockCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Total wins for achievements / unlocks
  const totalWins = settings.m.filter(x => x.win).length;

  // Streak calculations
  const { curStreak, bestStreak } = useMemo(() => {
    let cur = 0, best = 0;
    for (const x of settings.m) {
      if (x.win) {
        cur++;
        if (cur > best) best = cur;
      } else {
        cur = 0;
      }
    }
    return { curStreak: cur, bestStreak: best };
  }, [settings.m]);

  // Save helper
  const saveSettings = (newSt: Partial<SettingsState>) => {
    setSettings(prev => {
      const next = { ...prev, ...newSt };
      try { localStorage.setItem('flick_demon_v2', JSON.stringify(next)); } catch(e) {}
      return next;
    });
  };

  const getPens = () => [...DEFAULT_PENS, ...(settings.customPens || [])];
  const getLevel = (i: number) => 1 + Math.floor((settings.xp[i] || 0) / 3);

  // Theme application
  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme === 'system' ? '' : settings.theme;
    document.body.dataset.desk = settings.desk;
    document.body.dataset.rm = settings.rm ? '1' : '0';
  }, [settings.theme, settings.desk, settings.rm]);

  const [transitionDir, setTransitionDir] = useState<'forward' | 'backward'>('forward');

  // Screen navigation helper
  const go = (scr: 'home' | 'pick' | 'designer' | 'game' | 'stats' | 'lb') => {
    playMenuFeedback();
    if (gameRef.current) {
      gameRef.current.stopped = true;
    }
    if (gameAnimRef.current) {
      cancelAnimationFrame(gameAnimRef.current);
      gameAnimRef.current = 0;
    }
    setGameOverInfo(null);
    const order: Record<string, number> = {
      home: 0,
      pick: 1,
      stats: 1,
      lb: 1,
      designer: 2,
      game: 3,
    };
    if (scr === 'home') {
      setTransitionDir('backward');
    } else if (currentScreen === 'home') {
      setTransitionDir('forward');
    } else {
      setTransitionDir((order[scr] ?? 1) >= (order[currentScreen] ?? 1) ? 'forward' : 'backward');
    }

    if (scr === 'home') {
      setTimeout(() => drawHero(), 50);
    }
    setCurrentScreen(scr);
    if (scr === 'pick') setTimeout(() => renderPickCanvas(), 50);
    if (scr === 'designer') setTimeout(() => renderStudioPreview(), 50);
  };

  useEffect(() => {
    const handleResize = () => {
      if (currentScreen === 'home') drawHero();
      else if (currentScreen === 'pick') renderPickCanvas();
      else if (currentScreen === 'designer') renderStudioPreview();
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [currentScreen]);

  useEffect(() => {
    return () => {
      if (gameAnimRef.current) cancelAnimationFrame(gameAnimRef.current);
      if (audioCtxRef.current) {
        try { audioCtxRef.current.close(); } catch(e) {}
      }
    };
  }, []);

  const getScreenClass = (scr: string) => {
    if (currentScreen !== scr) return 'scr';
    if (settings.rm) return 'scr on';
    return `scr on slide-${transitionDir}`;
  };

  // ---------------- DRAW PEN ----------------
  const STY: Record<string, string> = {
    'Cheap Ballpoint':'ball','Gel Grip':'gel','Mech Pencil':'mech','Highlighter':'hl',
    'Fountain Pen':'fount','Marker':'mark','Brush Pen':'brush','Golden Pen':'gold',
    'Neon Pen': 'neon', 'Chrome Pen': 'chrome', 'Transparent Pen': 'transparent'
  };
  const TH: Record<string, number> = {ball:16,gel:18,mech:14,hl:20,fount:16,mark:20,brush:15,gold:17,neon:16,chrome:17,transparent:16};

  const drawPen = (c: CanvasRenderingContext2D, p: any, real: number, x: number, y: number, a: number, s=1, al=1, oL?: number) => {
    if (!p) return;
    const st = p[9] || STY[p[0]] || 'ball', L = (oL || p[5]) * s, th = (TH[st] || 16) * s, h = th/2, e = L/2;
    const X = (f: number) => -e + L*f, tl = L * (({fount:.2,gold:.2,brush:.2,hl:.15,mark:.15,mech:.12,neon:.15,chrome:.15,transparent:.15} as Record<string, number>)[st] || .15), T = e - tl;
    const INK = '#2C2223', MET = '#d6dae2', GOLD = '#e6c25a';
    const ln = (x0: number, y0: number, x1: number, y1: number, col: string, w: number) => { c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.strokeStyle = col; c.lineWidth = w*s; c.lineCap = 'round'; c.stroke(); };
    const dot = (px: number, r: number, col: string) => { c.beginPath(); c.arc(px, 0, r*s, 0, 7); c.fillStyle = col; c.fill(); };
    const fin = (col: string, hh = h) => {
      c.fillStyle = col; c.fill();
      if (real) {
        const g = c.createLinearGradient(0, -hh, 0, hh);
        g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(.3, 'rgba(255,255,255,.08)');
        g.addColorStop(.6, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.35)');
        c.fillStyle = g; c.fill();
      } else { c.lineWidth = 2.5*s; c.lineJoin = 'round'; c.strokeStyle = INK; c.stroke(); }
    };
    const B = (x0: number, x1: number, col: string, r: any, hh = h) => {
      c.beginPath(); c.roundRect(x0, -hh, x1 - x0, hh*2, r); fin(col, hh);
      if (!real && x1 - x0 > 10*s) ln(x0 + 3*s, -hh*.5, x1 - 3*s, -hh*.5, 'rgba(255,255,255,.6)', 1.8);
    };
    const Z = (pts: number[][], col: string, hh = h) => { c.beginPath(); pts.forEach((q, k) => k ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1])); c.closePath(); fin(col, hh); };
    const O = (x0: number, x1: number, r0: number, r1: number, col: string) => {
      const m = x0 + (x1 - x0)*.55;
      c.beginPath(); c.moveTo(x0, -r0); c.bezierCurveTo(m, -r0, m, -r1*1.4, x1, -r1);
      c.lineTo(x1, r1); c.bezierCurveTo(m, r1*1.4, m, r0, x0, r0); c.closePath(); fin(col, r0);
    };
    const ring = (xc: number, col: string, w = 2.4) => B(xc - w*s/2, xc + w*s/2, col, 1*s, h*1.05);
    const clip = (x0: number, x1: number, col = MET) => { c.beginPath(); c.roundRect(x0, -h - 2.4*s, x1 - x0, 3.4*s, 1.7*s); fin(col, h*1.3); };
    const knurl = (x0: number, n: number, gap: number) => { for(let k = 0; k < n; k++){ const gx = x0 + k*gap; ln(gx, -h*.8, gx, h*.8, 'rgba(0,0,0,.35)', 1.5); } };
    const nib = () => {
      Z([[T, -h*.6], [e - tl*.4, -h*.5], [e, 0], [e - tl*.4, h*.5], [T, h*.6]], GOLD);
      ln(T + tl*.3, 0, e - tl*.08, 0, INK, 1.1); dot(T + tl*.28, 1.6, INK);
    };
    c.save(); c.globalAlpha = al; c.translate(x, y); c.rotate(a);
    const rawSh = typeof p[10] === 'number' ? p[10] : (real ? 0.35 : 0.3);
    const shOp = Math.max(0, Math.min(1, rawSh));
    if (real) {
      c.shadowColor = `rgba(0,0,0,${shOp})`;
      c.shadowBlur = (3 + 9 * shOp) * s;
      c.shadowOffsetY = (1.5 + 5 * shOp) * s;
    } else {
      c.shadowColor = `rgba(44,34,35,${shOp})`;
      c.shadowBlur = 0;
      c.shadowOffsetY = (1.2 + 3.6 * shOp) * s;
    }
    switch(st){
      case 'gel':
        B(-e, T, p[3], h*.8);
        B(-e, X(.14), p[2], [h, 2*s, 2*s, h]); clip(X(.2), X(.42));
        B(X(.5), T, p[2], 3*s, h*1.04); knurl(X(.54), 6, L*.055);
        O(T, e, h*.8, h*.14, MET); ln(e - tl*.3, 0, e, 0, p[4], 3); break;
      case 'mech':
        B(-e, X(.5), p[3], h*.5, h*.9);
        B(-e, X(.1), '#f1a7b0', [h*.9, 2*s, 2*s, h*.9], h*.85); ring(X(.1), MET, 4); clip(X(.16), X(.4));
        B(X(.5), X(.76), '#9aa0aa', 2*s); knurl(X(.53), 5, L*.05);
        O(X(.76), e - L*.04, h*.8, h*.22, MET); ln(e - L*.04, 0, e, 0, p[4], 2.4); break;
      case 'hl':
        B(-e, T, p[3], h*.5, h*.95);
        B(-e, X(.3), p[2], [h*.8, 2*s, 2*s, h*.8], h*.95); clip(X(.05), X(.26));
        B(X(.42), X(.7), 'rgba(255,255,255,.65)', 2*s, h*.5);
        Z([[T, -h*.95], [e - tl*.3, -h*.95], [e, -h*.15], [e, h*.95], [T, h*.95]], p[2], h*.95); break;
      case 'fount':
        B(-e, X(.62), p[3], h*.5, h*.9);
        B(-e, X(.3), p[2], [h*.9, 2*s, 2*s, h*.9], h*.95); ring(X(.3), GOLD, 3); ring(X(.35), GOLD, 1.6);
        clip(X(.06), X(.26), GOLD);
        O(X(.62), T, h*.85, h*.6, p[4]); nib(); break;
      case 'mark':
        B(-e, X(.7), p[3], h*.55);
        B(-e, X(.34), p[2], [h, 3*s, 3*s, h]); ring(X(.35), p[4], 3.2); clip(X(.06), X(.3));
        B(X(.46), X(.64), p[4], 2*s, h*.55);
        O(X(.7), e - tl*.55, h*.8, h*.4, p[2]);
        B(e - tl*.55, e, p[4], [0, h*.5, h*.5, 0], h*.4); break;
      case 'brush':
        B(-e, X(.66), p[3], h*.6, h*.85);
        B(-e, X(.1), p[2], [h*.7, 2*s, 2*s, h*.7], h*.85); B(X(.66), X(.76), MET, 2*s, h*.75);
        c.beginPath(); c.moveTo(X(.76), -h*.6); c.bezierCurveTo(X(.88), -h*.95, X(.96), -h*.35, e, 0);
        c.bezierCurveTo(X(.96), h*.35, X(.88), h*.95, X(.76), h*.6); c.closePath(); fin(p[4], h*.8);
        ln(X(.8), 0, e - tl*.2, 0, 'rgba(255,255,255,.35)', 1); break;
      case 'gold':
        B(-e, T, p[3], h*.6, h*.95);
        B(-e, X(.12), p[2], [h, 2*s, 2*s, h]); ring(X(.3), p[2], 2.6); ring(X(.35), p[2], 1.6); ring(X(.64), p[2], 2.6);
        clip(X(.4), X(.6), p[2]);
        Z([[X(.2) - 4*s, 0], [X(.2), -5*s], [X(.2) + 4*s, 0], [X(.2), 5*s]], '#fff');
        O(T - L*.1, T, h*.8, h*.6, p[2]); nib(); break;
      case 'neon':
        B(-e, T, '#00ffcc', h*.85);
        B(-e, X(.4), '#ff00ff', [h*.9, 2*s, 2*s, h*.9], h*.9);
        ring(X(.4), '#00ffcc', 3);
        O(T, e, h*.8, h*.2, '#00ffcc'); ln(e - tl*.3, 0, e, 0, '#ffffff', 3); break;
      case 'chrome':
        B(-e, T, '#e0e0e0', h*.9);
        B(-e, X(.5), '#a0a0a0', [h*.95, 2*s, 2*s, h*.95]);
        ring(X(.5), '#ffffff', 4);
        O(T, e, h*.85, h*.15, '#ffffff'); ln(e - tl*.3, 0, e, 0, '#333333', 3); break;
      case 'transparent':
        B(-e, T, 'rgba(255,255,255,0.3)', h*.85);
        ln(-e + 10*s, 0, T - 5*s, 0, p[4] || '#3a5fc0', 4);
        O(T, e, h*.8, h*.2, 'rgba(255,255,255,0.4)'); ln(e - tl*.3, 0, e, 0, p[4], 2.5); break;
      default:
        B(-e, T, p[3], h*.85);
        ln(X(.28), 0, T + tl*.1, 0, p[4], 2.4);
        B(-e, X(.2), p[2], [h, 2*s, 2*s, h]); ring(X(.2), MET, 2.6); clip(X(.03), X(.18), MET);
        B(X(.56), X(.74), p[2], 3*s, h*1.02);
        O(T, e, h*.8, h*.14, MET); ln(e - tl*.3, 0, e, 0, p[4], 3);
    }
    c.restore();
  };

  // Audio & Haptics
  const audioCtxRef = useRef<AudioContext | null>(null);
  const getAudioContext = () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume().catch(() => {});
      }
      return audioCtxRef.current;
    } catch(e) {
      return null;
    }
  };

  const playSnd = (f: number, d = .08, t: OscillatorType = 'square', sl = 0, v = .05) => {
    if (settings.muteAll || !settings.snd) return;
    try {
      const ac = getAudioContext();
      if (!ac) return;
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = t;
      o.frequency.setValueAtTime(f, ac.currentTime);
      if (sl) o.frequency.linearRampToValueAtTime(Math.max(40, f + sl), ac.currentTime + d);
      g.gain.setValueAtTime(v, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + d);
      o.connect(g);
      g.connect(ac.destination);
      o.start();
      o.stop(ac.currentTime + d);
    } catch(e) {}
  };

  const playMenuFeedback = () => {
    if (settings.muteAll || !settings.snd) return;
    playSnd(520, .05, 'triangle', 0, .04);
  };

  const playCelebrationFanfare = () => {
    if (settings.muteAll || !settings.snd) return;
    try {
      const ac = getAudioContext();
      if (!ac) return;
      const notes = [
        { f: 523.25, d: 0.14, t: 0 },
        { f: 659.25, d: 0.14, t: 120 },
        { f: 783.99, d: 0.16, t: 240 },
        { f: 1046.50, d: 0.45, t: 380 }
      ];
      notes.forEach(({ f, d, t }) => {
        setTimeout(() => {
          playSnd(f, d, 'triangle', 0, 0.08);
        }, t);
      });
      buzz(30);
      setTimeout(() => buzz(45), 240);
    } catch(e) {}
  };

  const triggerUnlockCelebration = (info: UnlockCelebration) => {
    setUnlockCelebration(info);
    playCelebrationFanfare();
  };

  const buzz = (n: number) => { if (settings.vib) try { navigator.vibrate && navigator.vibrate(n); } catch(e) {} };

  // Home Screen Canvas Effect
  const drawHero = () => {
    const c = heroCanvasRef.current;
    if (!c) return;
    const r = c.getBoundingClientRect(), d = window.devicePixelRatio || 1;
    if (!r.width || !r.height) return;
    c.width = r.width * d; c.height = r.height * d;
    const x = c.getContext('2d');
    if (!x) return;
    x.scale(d, d);
    const w = r.width, h = r.height, PENS = getPens(), sc = Math.min(1.25, w / 340);
    x.clearRect(0, 0, w, h);
    x.save(); x.setLineDash([2, 12]); x.lineCap = 'round'; x.lineWidth = 5; x.strokeStyle = 'rgba(255,255,255,.65)';
    x.beginPath(); x.moveTo(w*.14, h*.74); x.quadraticCurveTo(w*.28, h*.9, w*.4, h*.7); x.stroke(); x.restore();
    x.save(); x.translate(w*.5, h*.5); x.rotate(.2); x.beginPath();
    for(let i = 0; i < 16; i++){ const q = i % 2 ? 16 : 30; x.lineTo(Math.cos(i*Math.PI/8)*q, Math.sin(i*Math.PI/8)*q); }
    x.closePath(); x.fillStyle = '#FFD25A'; x.strokeStyle = '#2C2223'; x.lineWidth = 4; x.lineJoin = 'round';
    x.shadowColor = 'rgba(0,0,0,.75)'; x.shadowOffsetY = 4; x.shadowBlur = 8; x.fill(); x.shadowColor = 'transparent'; x.stroke(); x.restore();
    drawPen(x, PENS[1] || PENS[0], 1, w*.72, h*.32, Math.PI + .28, sc);
    drawPen(x, PENS[0], 1, w*.28, h*.62, -.28, sc*1.1);
  };

  useEffect(() => {
    if (currentScreen === 'home') drawHero();
  }, [currentScreen]);

  // Pick Screen Canvas
  const renderPickCanvas = () => {
    const c = pickCanvasRef.current;
    if (!c) return;
    const x = c.getContext('2d');
    if (!x) return;
    const PENS = getPens();
    if (settings.sel >= PENS.length) setSettings(s => ({ ...s, sel: 0 }));
    const p = PENS[settings.sel] || PENS[0];
    x.clearRect(0, 0, 640, 360);
    drawPen(x, p, settings.real, 320, 180, -.55, 2.1, 1, p[5]);
  };

  useEffect(() => {
    if (currentScreen === 'pick') renderPickCanvas();
  }, [settings.sel, settings.real, currentScreen]);

  // Studio Preview Canvas
  const renderStudioPreview = () => {
    const c = studioCanvasRef.current;
    if (!c) return;
    const x = c.getContext('2d');
    if (!x) return;
    x.clearRect(0, 0, 640, 300);
    const tempPen = [
      stName || 'Preview', '',
      stCap, stBody, stInk,
      +stLen, +stMass, .95, +stPow, stStyle,
      +stShadow
    ];
    drawPen(x, tempPen, settings.real, 320, 150, -.4, 2.0, 1, Number(tempPen[5]));
  };

  useEffect(() => {
    if (currentScreen === 'designer') renderStudioPreview();
  }, [stName, stCap, stBody, stInk, stLen, stMass, stPow, stStyle, stShadow, settings.real, currentScreen]);

  // Celebratory Unlock Pen Canvas Preview
  useEffect(() => {
    if (!unlockCelebration) return;
    const c = unlockCanvasRef.current;
    if (!c) return;
    const x = c.getContext('2d');
    if (!x) return;
    x.clearRect(0, 0, 480, 220);
    const tempPen = [
      unlockCelebration.title, '',
      unlockCelebration.cap, unlockCelebration.body, unlockCelebration.ink,
      130, 1.0, .95, 1.1, unlockCelebration.style
    ];
    drawPen(x, tempPen, 1, 240, 110, -.42, 1.9, 1, 130);
  }, [unlockCelebration]);

  // --------------- GAMEPLAY ENGINE ---------------
  const gameRef = useRef<any>(null);
  const gameAnimRef = useRef<number>(0);

  const startBattle = (prac = false) => {
    const PENS = getPens();
    if (settings.sel >= PENS.length) {
      saveSettings({ sel: 0 });
    }
    setGameOverInfo(null);
    setMatchScore([0, 0]);
    setTurnBanner(settings.mode === 'two' ? `${settings.name || 'P1'}'s Turn` : 'Your Turn');
    go('game');
    setTimeout(() => {
      initGamePhysics(prac);
    }, 50);
  };

  const initGamePhysics = (prac: boolean) => {
    const cv = gameCanvasRef.current;
    if (!cv) return;
    const cx = cv.getContext('2d');
    if (!cx) return;
    const r = cv.getBoundingClientRect(), d = window.devicePixelRatio || 1;
    const W = r.width, H = r.height;
    cv.width = W * d; cv.height = H * d;
    cx.setTransform(d, 0, 0, d, 0, 0);

    const PENS = getPens();
    const two = settings.mode === 'two';
    const ip = settings.sel;
    const i2 = settings.mir ? ip : Math.floor(Math.random() * PENS.length);

    const mk = (i: number, x: number, y: number, a: number, side: number) => {
      const q = PENS[i] || PENS[0];
      const k = Math.min(1, W / 400) * .9;
      return { x, y, vx: 0, vy: 0, a, w: 0, pen: q, i, fall: 0, s: 1, L: q[5] * k, m: q[6], side };
    };

    const m = 14;
    const dk = { l: m, t: 90, r: W - m, b: H - m - 8 };
    const tg = { ...dk };
    const mx = (dk.l + dk.r) / 2, rand = () => (Math.random() - .5);
    const pe = [
      mk(ip, mx + rand()*50, dk.b - 80, -Math.PI/2 + rand()*.4, 0),
      mk(i2, mx + rand()*50, dk.t + 80, Math.PI/2 + rand()*.4, 1)
    ];

    const G: any = {
      W, H,
      two, pi: [ip, i2], sc: [0, 0],
      nm: [settings.name || (two ? 'P1' : 'Demon'), two ? (settings.p2 || 'P2') : 'CPU'],
      round: 1, rec: 0, prac, gr: Array.from({length:30}, () => [Math.random(), Math.random() * .6]),
      dk, tg, pe, cur: 0, turn: 0, drag: null, ph: 'aim', wait: 0, shake: 0, tk: 0, stopped: false
    };

    gameRef.current = G;

    const turnStart = () => {
      G.ph = 'aim'; G.wait = 0;
      if (!G.two && G.cur === 1) {
        G.ph = 'ai';
        G.wait = 24;
        setTurnBanner("CPU's Turn...");
      } else {
        setTurnBanner(G.two ? `${G.nm[G.cur]}'s Turn` : 'Your Turn');
      }
    };

    turnStart();

    let last = performance.now(), acc = 0;

    const loop = (t: number) => {
      if (!gameRef.current || gameRef.current.stopped) return;
      acc += Math.min(50, t - last); last = t;
      while (acc >= 16.67) {
        acc -= 16.67;
        if (G.ph !== 'done') upd();
      }
      drawGame(cx, W, H, G);
      if (!gameRef.current || gameRef.current.stopped) return;
      gameAnimRef.current = requestAnimationFrame(loop);
    };

    cancelAnimationFrame(gameAnimRef.current);
    gameAnimRef.current = requestAnimationFrame(loop);
  };

  const upd = () => {
    const G = gameRef.current;
    if (!G) return;
    const d = G.dk, t = G.tg, k = settings.rm ? 1 : .06;
    for (const q in d) d[q] += (t[q] - d[q]) * k;
    if (G.fx) {
      for (const q of G.fx) { q.x += q.vx; q.y += q.vy; q.vy += q.g; q.vx *= .96; q.l--; }
      G.fx = G.fx.filter((q: any) => q.l > 0);
    }
    G.shake = (G.shake || 0) * .86; G.tk = (G.tk || 0) + 1;
    if (G.ph === 'move' && G.tk % 3 === 0) {
      for (const p of G.pe) if (!p.fall && Math.hypot(p.vx, p.vy) > 3) burst(G, p.x, p.y, 1, 'rgba(255,255,255,.5)', .3, 14, 2.4, 0);
    }
    for (const p of G.pe) {
      if (p.fall) { p.fall++; p.s = Math.max(.3, 1 - p.fall/60); }
      p.x += p.vx; p.y += p.vy; p.a += p.w;
      p.vx *= p.pen[7]; p.vy *= p.pen[7]; p.w *= .95;
      if (Math.hypot(p.vx, p.vy) < .1) p.vx = p.vy = 0;
      if (Math.abs(p.w) < .004) p.w = 0;
      if (!p.fall && (p.x < d.l || p.x > d.r || p.y < d.t || p.y > d.b)) {
        p.fall = 1; playSnd(520, .5, 'sine', -420, .06); burst(G, p.x, p.y, 8, 'rgba(255,255,255,.6)', 2, 26, 3, .02);
      }
    }
    if (!G.pe[0].fall && !G.pe[1].fall) collide(G);

    if (G.ph === 'ai' && --G.wait <= 0) aiShot(G);
    else if (G.ph === 'move') {
      if (G.pe.some((p: any) => p.fall)) { G.ph = 'end'; G.wait = 36; }
      else if (G.pe.every((p: any) => !p.vx && !p.vy && !p.w) && ++G.wait > 18) {
        G.turn++;
        if (G.turn % 2 === 0 && (G.tg.r - G.tg.l) > 200) {
          G.tg.l += 12; G.tg.r -= 12; G.tg.t += 10; G.tg.b -= 10;
        }
        G.cur ^= 1;
        G.wait = 0;
        if (!G.two && G.cur === 1) {
          G.ph = 'ai';
          G.wait = 24;
          setTurnBanner("CPU's Turn...");
        } else {
          G.ph = 'aim';
          setTurnBanner(G.two ? `${G.nm[G.cur]}'s Turn` : 'Your Turn');
        }
      }
    }
    else if (G.ph === 'end' && --G.wait <= 0) resolveRound(G);
    else if (G.ph === 'banner' && --G.wait <= 0) { newRound(G); }
  };

  const burst = (G: any, x: number, y: number, n: number, col: any, spd = 3, life = 26, r = 3, g = .08) => {
    if (settings.rm || !G) return; G.fx = G.fx || [];
    for (let i = 0; i < n; i++) {
      const a = Math.random()*6.283, v = spd*(.3 + Math.random()*.9);
      G.fx.push({ x, y, vx: Math.cos(a)*v, vy: Math.sin(a)*v, l: life*(.6 + Math.random()*.6), m: life, g, r: r*(.6 + Math.random()*.8), c: Array.isArray(col) ? col[Math.random()*col.length|0] : col });
    }
  };

  const launch = (G: any, p: any, ux: number, uy: number, pw: number) => {
    const mult = (p.side === 0 && !settings.eq) ? 1 + .04 * (getLevel(p.i) - 1) : 1;
    const sp = 15 * pw * p.pen[8] * mult;
    p.vx = ux * sp; p.vy = uy * sp;
    p.w = (Math.cos(p.a) * uy - Math.sin(p.a) * ux) * sp * .012;
    G.ph = 'move'; G.wait = 0; G.drag = null;
    setTurnBanner('');
    playSnd(150 + pw*170, .12, 'triangle', 200, .05);
    burst(G, p.x, p.y, 7, 'rgba(255,255,255,.7)', 1.6, 22, 3, .01); G.shake = 2;
  };

  const aiShot = (G: any) => {
    const me = G.pe[1], op = G.pe[0], d = settings.diff;
    const a = Math.atan2(op.y - me.y, op.x - me.x) + (Math.random() - .5) * [.4, .18, .05][d];
    const pw = [.45 + Math.random()*.3, .65 + Math.random()*.25, .85 + Math.random()*.15][d];
    launch(G, me, Math.cos(a), Math.sin(a), pw);
  };

  const collide = (G: any) => {
    const A = G.pe[0], B = G.pe[1];
    const R = 9, T = [-.38, 0, .38]; let hit = 0, mx = 0, my = 0;
    for (const ta of T) for (const tb of T) {
      const ax = A.x + Math.cos(A.a)*ta*A.L, ay = A.y + Math.sin(A.a)*ta*A.L;
      const bx = B.x + Math.cos(B.a)*tb*B.L, by = B.y + Math.sin(B.a)*tb*B.L;
      const dx = bx - ax, dy = by - ay, dist = Math.hypot(dx, dy);
      if (dist < R*2 && dist > .01) {
        const nx = dx/dist, ny = dy/dist;
        const rax = ax - A.x, ray = ay - A.y, rbx = bx - B.x, rby = by - B.y;
        const vn = ((B.vx - B.w*rby) - (A.vx - A.w*ray))*nx + ((B.vy + B.w*rbx) - (A.vy + A.w*rax))*ny;
        const o = (R*2 - dist)*.5;
        A.x -= nx*o; A.y -= ny*o; B.x += nx*o; B.y += ny*o;
        if (vn < 0) {
          const j = -1.7 * vn / (1/A.m + 1/B.m);
          A.vx -= nx*j/A.m; A.vy -= ny*j/A.m; B.vx += nx*j/B.m; B.vy += ny*j/B.m;
          A.w -= (rax*ny - ray*nx)*j / (A.m*A.L*A.L/12) * .35;
          B.w += (rbx*ny - rby*nx)*j / (B.m*B.L*B.L/12) * .35;
          hit = Math.max(hit, j); mx = (ax + bx)/2; my = (ay + by)/2;
        }
      }
    }
    if (hit > 1) { playSnd(170 + Math.random()*50, .1, 'sine', -90, .08); buzz(15); burst(G, mx, my, 10 + Math.min(10, hit|0), ['#FFD25A', '#FEFEFE', '#CA4639'], 3.5, 24, 2.6); G.shake = Math.min(9, 2 + hit*.5); }
  };

  const newRound = (G: any) => {
    const cv = gameCanvasRef.current;
    const r = cv ? cv.getBoundingClientRect() : null;
    const W = r ? r.width : (G.W || 400);
    const H = r ? r.height : (G.H || 600);
    G.W = W;
    G.H = H;
    const m = 14;
    G.round++;
    G.dk = { l: m, t: 90, r: W - m, b: H - m - 8 };
    G.tg = { ...G.dk };
    const mx = (G.dk.l + G.dk.r) / 2, rand = () => (Math.random() - .5);
    G.pe = [
      mkPen(G.pi[0], mx + rand()*50, G.dk.b - 80, -Math.PI/2 + rand()*.4, 0, W),
      mkPen(G.pi[1], mx + rand()*50, G.dk.t + 80, Math.PI/2 + rand()*.4, 1, W)
    ];
    G.cur = (G.round - 1) % 2;
    G.turn = 0;
    G.drag = null;
    if (!G.two && G.cur === 1) {
      G.ph = 'ai';
      G.wait = 24;
      setTurnBanner("CPU's Turn...");
    } else {
      G.ph = 'aim';
      G.wait = 0;
      setTurnBanner(G.two ? `${G.nm[G.cur]}'s Turn` : 'Your Turn');
    }
  };

  const mkPen = (i: number, x: number, y: number, a: number, side: number, W: number) => {
    const PENS = getPens();
    const q = PENS[i] || PENS[0];
    const k = Math.min(1, W / 400) * .9;
    return { x, y, vx: 0, vy: 0, a, w: 0, pen: q, i, fall: 0, s: 1, L: q[5] * k, m: q[6], side };
  };

  const TARGET_WINS = 3;

  const resolveRound = (G: any) => {
    const f = G.pe.map((p: any) => p.fall);
    let w = f[0] && !f[1] ? 1 : f[1] && !f[0] ? 0 : -1;
    if (w < 0) {
      G.ph = 'banner';
      G.wait = 36;
      setTurnBanner('Draw! Replaying Round...');
      return;
    }
    G.sc[w]++;
    setMatchScore([G.sc[0], G.sc[1]]);
    playSnd(523, .2, 'triangle', 0, .07);

    // Match decisively ends after 3 wins by anyone
    if (G.sc[w] >= TARGET_WINS) {
      G.ph = 'done';
      setTurnBanner('');
      recordMatch(G, w);
      if (w === 0 && !settings.muteAll && settings.snd) {
        setTimeout(() => playSnd(523, .16, 'triangle', 0, .06), 40);
        setTimeout(() => playSnd(659, .18, 'triangle', 0, .06), 180);
        setTimeout(() => playSnd(784, .3, 'triangle', 0, .08), 320);
      }
      if (w === 0) {
        const W = G.W || 400, H = G.H || 600;
        burst(G, W / 2, H / 2, 35, ['#FFD25A', '#CA4639', '#81C784', '#9EC6E8', '#FEFEFE'], 4.5, 42, 4.5, 0.04);
      }
      const nextStreak = w === 0 ? curStreak + 1 : 0;
      let streakNote = '';
      if (w === 0) {
        if (nextStreak === 20) streakNote = ' · 👑 20 STREAK DEMON LEGEND!';
        else if (nextStreak === 10) streakNote = ' · ⚡ 10 STREAK DOMINATOR!';
        else if (nextStreak === 5) streakNote = ' · 🔥 5 STREAK UNLOCKED!';
        else if (nextStreak >= 2) streakNote = ` · ${nextStreak} Win Streak 🔥`;
      }
      setGameOverInfo({
        title: G.two ? `${G.nm[w]} Wins!` : (w === 0 ? 'You Win!' : 'CPU Wins'),
        desc: `First to 3 Wins · Final: ${G.sc[0]} - ${G.sc[1]}${streakNote}`,
        winner: w
      });
      return;
    }

    // Match continues: brief round notification then new round
    G.ph = 'banner';
    G.wait = 40;
    const scorer = w === 0 ? (G.two ? G.nm[0] : 'You') : (G.two ? G.nm[1] : 'CPU');
    setTurnBanner(`${scorer} scored! (${G.sc[0]} - ${G.sc[1]})`);
    if (w === 0) {
      const W = G.W || 400, H = G.H || 600;
      burst(G, W / 2, H / 2, 18, ['#FFD25A', '#FEFEFE', '#81C784'], 3.2, 24, 3, 0.04);
    }
  };

  const recordMatch = (G: any, w: number) => {
    if (G.rec || G.prac) return; G.rec = 1;
    const prevWins = settings.m.filter(x => x.win).length;
    const newM = { t: Date.now(), mode: G.two ? 'two' : 'cpu', pen: G.pi[0], win: w === 0, winner: G.nm[w], a: G.sc[0], b: G.sc[1] };
    const nextM = [...settings.m, newM].slice(-200);
    const nextXp = { ...settings.xp };
    if (!G.two && w === 0) {
      nextXp[G.pi[0]] = (nextXp[G.pi[0]] || 0) + 1;
    }

    const seen = settings.seenUnlocks || [];
    const newSeen = [...seen];
    let toCelebrate: UnlockCelebration | null = null;

    if (w === 0) {
      const newWins = prevWins + 1;
      if (newWins >= 10 && !seen.includes('transparent')) {
        toCelebrate = UNLOCK_STYLES_INFO.transparent;
        newSeen.push('transparent');
      } else if (newWins >= 5 && !seen.includes('chrome')) {
        toCelebrate = UNLOCK_STYLES_INFO.chrome;
        newSeen.push('chrome');
      } else if (newWins >= 3 && !seen.includes('neon')) {
        toCelebrate = UNLOCK_STYLES_INFO.neon;
        newSeen.push('neon');
      }
    }

    saveSettings({ m: nextM, xp: nextXp, seenUnlocks: newSeen });

    if (toCelebrate) {
      setTimeout(() => {
        triggerUnlockCelebration(toCelebrate!);
      }, 500);
    }
  };

  const drawGame = (cx: CanvasRenderingContext2D, W: number, H: number, G: any) => {
    cx.clearRect(0, 0, W, H);
    cx.save(); if (G.shake > .3) cx.translate((Math.random() - .5)*G.shake, (Math.random() - .5)*G.shake);
    const d = G.dk, w = d.r - d.l, h = d.b - d.t, cl = settings.desk === 'clean';
    cx.save(); cx.shadowColor = 'rgba(0,0,0,.35)'; cx.shadowBlur = 22; cx.shadowOffsetY = 10;
    const bg = cx.createLinearGradient(0, d.t, 0, d.b);
    bg.addColorStop(0, cl ? '#F1DEB8' : '#E4C28E'); bg.addColorStop(1, cl ? '#E0C591' : '#CDA36B');
    cx.fillStyle = bg; cx.beginPath(); cx.roundRect(d.l, d.t, w, h, 18); cx.fill(); cx.restore();
    cx.save(); cx.beginPath(); cx.roundRect(d.l, d.t, w, h, 18); cx.clip();
    if (!cl) {
      cx.lineCap = 'round';
      for (const g of G.gr) {
        const y = d.t + g[0]*h; cx.strokeStyle = g[1] > .5 ? 'rgba(120,80,40,.2)' : 'rgba(255,240,210,.22)'; cx.lineWidth = 1 + g[1]*1.6;
        cx.beginPath(); cx.moveTo(d.l + g[1]*w, y); cx.quadraticCurveTo(d.l + (g[1] + .18)*w, y - 4, d.l + (g[1] + .4)*w, y + 3); cx.stroke();
      }
    }
    cx.strokeStyle = 'rgba(255,255,255,.35)'; cx.lineWidth = 3; cx.beginPath(); cx.roundRect(d.l + 3, d.t + 3, w - 6, h - 6, 15); cx.stroke();
    cx.restore();
    cx.lineWidth = 4; cx.strokeStyle = '#2C2223'; cx.beginPath(); cx.roundRect(d.l, d.t, w, h, 18); cx.stroke();

    for (const p of G.pe) {
      drawPen(cx, p.pen, settings.real, p.x, p.y, p.a, p.s * Math.min(1, W/400) * .9, p.fall ? Math.max(.2, p.s) : 1, p.pen[5] / (Math.min(1, W/400) * .9) * (p.L / p.pen[5]));
    }

    const dr = G.drag, ap = G.ph === 'aim' && (G.two || !G.cur) ? G.pe[G.cur] : null, now = performance.now();
    if (ap && !dr) {
      const pu = (Math.sin(now/260) + 1) / 2, rr = 24 + pu*6;
      cx.save(); cx.lineCap = 'round'; cx.setLineDash([7, 9]); cx.lineDashOffset = -now/40;
      cx.lineWidth = 7; cx.strokeStyle = 'rgba(44,34,35,.4)'; cx.beginPath(); cx.arc(ap.x, ap.y, rr, 0, 7); cx.stroke();
      cx.lineWidth = 3.5; cx.strokeStyle = '#FEFEFE'; cx.beginPath(); cx.arc(ap.x, ap.y, rr, 0, 7); cx.stroke();
      cx.restore();
    }
    if (dr && ap) {
      const p = ap, rl = Math.hypot(p.x - dr.x, p.y - dr.y), l = Math.min(110, rl);
      if (rl > 1) {
        const dx = (p.x - dr.x) / rl, dy = (p.y - dr.y) / rl, f = l / 110, col = `hsl(${130 - f*125},75%,52%)`;
        const hx = p.x - dx*l*.7, hy = p.y - dy*l*.7;
        cx.save(); cx.lineCap = 'round'; cx.lineJoin = 'round';
        cx.lineWidth = 10; cx.strokeStyle = 'rgba(44,34,35,.4)'; cx.beginPath(); cx.arc(p.x, p.y, 30, 0, 7); cx.stroke();
        cx.lineWidth = 6; cx.strokeStyle = col; cx.beginPath(); cx.arc(p.x, p.y, 30, -Math.PI/2, -Math.PI/2 + f*Math.PI*2); cx.stroke();
        if (settings.aim && l > 8) {
          const len = l*3;
          for (let dist = 40; dist < len; dist += 16) {
            const k = dist / len;
            cx.globalAlpha = 1 - k*.6; cx.fillStyle = col; cx.strokeStyle = 'rgba(44,34,35,.7)'; cx.lineWidth = 1.5;
            cx.beginPath(); cx.arc(p.x + dx*dist, p.y + dy*dist, 4.5 - k*2, 0, 7); cx.fill(); cx.stroke();
          }
        }
        cx.strokeStyle = '#2C2223'; cx.lineWidth = (7 - f*3) + 4; cx.beginPath(); cx.moveTo(p.x, p.y); cx.lineTo(hx, hy); cx.stroke();
        cx.strokeStyle = '#FEFEFE'; cx.lineWidth = 7 - f*3; cx.beginPath(); cx.moveTo(p.x, p.y); cx.lineTo(hx, hy); cx.stroke();
        cx.fillStyle = col; cx.strokeStyle = '#2C2223'; cx.lineWidth = 3.5;
        cx.beginPath(); cx.arc(hx, hy, 11, 0, 7); cx.fill(); cx.stroke();
        cx.restore();
      }
    }
    if (G.fx) for (const q of G.fx) { const k = q.l/q.m; cx.globalAlpha = Math.min(1, k*1.3); cx.fillStyle = q.c; cx.beginPath(); cx.arc(q.x, q.y, q.r*(.4 + .6*k), 0, 7); cx.fill(); }
    cx.globalAlpha = 1; cx.restore();
  };

  // Pointer event handlers for game canvas
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const G = gameRef.current;
    if (!G || G.ph !== 'aim' || (!G.two && G.cur)) return;
    const cv = gameCanvasRef.current;
    if (!cv) return;
    const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    const p = G.pe[G.cur];
    if (!p) return;
    if (Math.hypot(x - p.x, y - p.y) < p.L*.6 + 22) {
      try { cv.setPointerCapture(e.pointerId); } catch(err) {}
      G.drag = { x, y };
      buzz(10); playSnd(300, .04);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const G = gameRef.current;
    if (G && G.drag) {
      const cv = gameCanvasRef.current;
      if (!cv) return;
      const r = cv.getBoundingClientRect();
      G.drag = { x: e.clientX - r.left, y: e.clientY - r.top };
    }
  };

  const handlePointerUp = (e?: React.PointerEvent<HTMLCanvasElement>) => {
    const cv = gameCanvasRef.current;
    if (cv && e) {
      try { cv.releasePointerCapture(e.pointerId); } catch(err) {}
    }
    const G = gameRef.current;
    if (!G || !G.drag) return;
    const p = G.pe[G.cur];
    if (!p) { G.drag = null; return; }
    const dx = p.x - G.drag.x, dy = p.y - G.drag.y, l = Math.hypot(dx, dy);
    if (l > 14) launch(G, p, dx/l, dy/l, Math.min(110, l)/110);
    else { G.drag = null; }
  };

  const openHelp = () => {
    playMenuFeedback();
    setActiveSheet('help');
  };

  const openAbout = () => {
    playMenuFeedback();
    setActiveSheet('about');
  };

  const openSettings = () => {
    playMenuFeedback();
    setActiveSheet('settings');
  };

  const seg = (k: keyof SettingsState, o: [any, string][]) => (
    <div className="seg" style={{width:'100%'}}>
      {o.map(a => (
        <button
          key={a[0]}
          onClick={() => {
            saveSettings({ [k]: a[0] });
            playMenuFeedback();
          }}
          className={settings[k] === a[0] ? 'on' : ''}
          style={{flex:1}}
        >
          {a[1]}
        </button>
      ))}
    </div>
  );

  const tg = (k: keyof SettingsState, l: string, d: string) => (
    <div className="set" key={k}>
      <div><b>{l}</b><small>{d}</small></div>
      <button
        className="tgl"
        aria-pressed={!!settings[k]}
        onClick={() => {
          const nextVal = settings[k] ? 0 : 1;
          saveSettings({ [k]: nextVal });
          if (k !== 'muteAll' || !nextVal) {
            playMenuFeedback();
          }
        }}
      >
        {settings[k] ? 'On' : 'Off'}<span className="sw"></span>
      </button>
    </div>
  );

  // Render Stats data & Unlocks
  const renderStatsBody = () => {
    const matches = settings.m;
    const cpuMatches = matches.filter(x => x.mode === 'cpu');
    const cpuWins = cpuMatches.filter(x => x.win).length;
    const twoMatches = matches.filter(x => x.mode === 'two');
    const PENS = getPens();

    if (statsTab === 'unlocks') {
      const unlocks = [
        { key: 'neon', name: '⚡ Neon Pen Style', req: 3, unlocked: totalWins >= 3, desc: 'Glowing electric cyan & magenta cyberpunk barrel.' },
        { key: 'chrome', name: '🦾 Chrome Pen Style', req: 5, unlocked: totalWins >= 5, desc: 'Shiny metallic silver & chrome finish.' },
        { key: 'transparent', name: '👻 Transparent Pen Style', req: 10, unlocked: totalWins >= 10, desc: 'See-through glass translucent barrel with visible ink.' }
      ];
      return (
        <div style={{display:'flex',flexDirection:'column',gap:'10px',overflowY:'auto',flex:1}}>
          <div style={{textAlign:'center',padding:'6px 0',color:'var(--sub)',fontSize:'14px'}}>
            Total Wins: <b>{totalWins}</b> 🏆
          </div>
          {unlocks.map((u, i) => (
            <div key={i} className="card" style={{padding:'12px',borderRadius:'16px',boxShadow:'0 3px 0 var(--ink)',display:'flex',justifyContent:'space-between',alignItems:'center',background: u.unlocked ? 'var(--cream)' : 'var(--card2)'}}>
              <div>
                <b style={{fontSize:'16px',fontFamily:'Fredoka, sans-serif'}}>{u.name}</b>
                <div style={{fontSize:'12px',color:'var(--sub)',marginTop:'2px'}}>{u.desc}</div>
              </div>
              <div style={{textAlign:'right',flex:'none',marginLeft:'10px'}}>
                {u.unlocked ? (
                  <button
                    className="btn y"
                    style={{padding:'4px 10px',fontSize:'12px'}}
                    onClick={() => {
                      playMenuFeedback();
                      triggerUnlockCelebration(UNLOCK_STYLES_INFO[u.key]);
                    }}
                  >
                    Celebrate 🎉
                  </button>
                ) : (
                  <span style={{fontSize:'13px',fontWeight:800,color:'var(--sub)'}}>{totalWins} / {u.req} Wins</span>
                )}
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (statsTab === 'mastery') {
      return (
        <div style={{display:'flex',flexDirection:'column',gap:'10px',overflowY:'auto',flex:1}}>
          <div style={{textAlign:'center',padding:'4px 0',color:'var(--sub)',fontSize:'13px'}}>
            Every 3 wins against CPU raises a pen's level and flick strength!
          </div>
          {PENS.map((p, i) => {
            const xp = settings.xp[i] || 0;
            const lv = getLevel(i);
            const xpInLv = xp % 3;
            const penWins = matches.filter(m => m.pen === i && m.win).length;
            return (
              <div key={i} className="card" style={{padding:'10px 14px',borderRadius:'16px',boxShadow:'0 3px 0 var(--ink)'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                    <span style={{width:'14px',height:'14px',borderRadius:'50%',background:p[2],border:'2px solid var(--ink)',display:'inline-block'}}></span>
                    <b style={{fontSize:'15px',fontFamily:'Fredoka, sans-serif'}}>{p[0]}</b>
                  </div>
                  <span className="lv" style={{fontSize:'12px',padding:'2px 8px'}}>Lv {lv}</span>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:'12px',color:'var(--sub)',margin:'6px 0 2px'}}>
                  <span>XP: {xpInLv} / 3 to Lv {lv + 1}</span>
                  <span>{penWins} wins</span>
                </div>
                <div className="bar" style={{margin:'2px 0 0'}}>
                  <i style={{width:`${(xpInLv / 3) * 100}%`}}></i>
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    // Career Overview
    if (!matches.length) {
      return (
        <div style={{display:'flex',flexDirection:'column',gap:'10px',overflowY:'auto',flex:1}}>
          <div className="empty" style={{padding:'20px 10px'}}>
            <div className="av">📊</div>
            <h2>No Match Data Yet</h2>
            <p>Battle CPU or friends to build career records & streak badges.</p>
          </div>
          <div className="card streak-card" style={{padding:'12px 14px',borderRadius:'18px',boxShadow:'0 3px 0 var(--ink)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px'}}>
              <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                <span style={{fontSize:'18px'}}>🏅</span>
                <b style={{fontSize:'15px',fontFamily:'Fredoka, sans-serif'}}>Win Streak Badges</b>
              </div>
              <span style={{fontSize:'11px',fontWeight:800,color:'var(--sub)'}}>
                Tap to inspect
              </span>
            </div>
            <div className="streak-badges-grid">
              {STREAK_BADGES.map(b => (
                <div
                  key={b.id}
                  className={`streak-badge-card locked ${b.id}`}
                  onClick={() => {
                    playMenuFeedback();
                    setSelectedStreakBadge(b);
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`${b.title}: ${b.count} streak (Locked)`}
                >
                  <div className="streak-badge-crest">
                    <span className="streak-badge-emoji">{b.icon}</span>
                    <span className="streak-badge-indicator">🔒</span>
                  </div>
                  <b className="streak-badge-title">{b.title}</b>
                  <span className="streak-badge-count">{b.count} Streak</span>
                  <div className="streak-progress-wrap">
                    <div className="streak-progress-fill" style={{width:'0%',background:b.badgeCol}}></div>
                    <span className="streak-progress-text">0/{b.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    const winRate = Math.round((totalWins / matches.length) * 100) || 0;
    const cpuWinRate = cpuMatches.length ? Math.round((cpuWins / cpuMatches.length) * 100) : 0;

    return (
      <div style={{display:'flex',flexDirection:'column',gap:'10px',overflowY:'auto',flex:1}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
          <div className="card" style={{padding:'10px',textAlign:'center',borderRadius:'16px',boxShadow:'0 3px 0 var(--ink)'}}>
            <small style={{color:'var(--sub)',fontSize:'12px'}}>Total Matches</small>
            <div style={{fontSize:'24px',fontFamily:'Fredoka, sans-serif'}}>{matches.length}</div>
          </div>
          <div className="card" style={{padding:'10px',textAlign:'center',borderRadius:'16px',boxShadow:'0 3px 0 var(--ink)'}}>
            <small style={{color:'var(--sub)',fontSize:'12px'}}>Win Rate</small>
            <div style={{fontSize:'24px',fontFamily:'Fredoka, sans-serif',color:'var(--primary)'}}>{winRate}%</div>
          </div>
          <div className="card" style={{padding:'10px',textAlign:'center',borderRadius:'16px',boxShadow:'0 3px 0 var(--ink)'}}>
            <small style={{color:'var(--sub)',fontSize:'12px'}}>Total Victories</small>
            <div style={{fontSize:'24px',fontFamily:'Fredoka, sans-serif'}}>{totalWins} 🏆</div>
          </div>
          <div className="card" style={{padding:'10px',textAlign:'center',borderRadius:'16px',boxShadow:'0 3px 0 var(--ink)'}}>
            <small style={{color:'var(--sub)',fontSize:'12px'}}>Best Streak</small>
            <div style={{fontSize:'24px',fontFamily:'Fredoka, sans-serif'}}>🔥 {bestStreak}</div>
            <small style={{display:'block',fontSize:'10px',fontWeight:800,color:bestStreak>=20?'#F57F17':bestStreak>=10?'#0277BD':bestStreak>=5?'#E65100':'var(--sub)',marginTop:'2px'}}>
              {bestStreak >= 20 ? '👑 Demon Legend' : bestStreak >= 10 ? '⚡ Dominator' : bestStreak >= 5 ? '🔥 Hot Streak' : 'Target: 5 Wins'}
            </small>
          </div>
        </div>

        {/* Win Streak Badges Section */}
        <div className="card streak-card" style={{padding:'12px 14px',borderRadius:'18px',boxShadow:'0 3px 0 var(--ink)'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px'}}>
            <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
              <span style={{fontSize:'18px'}}>🏅</span>
              <b style={{fontSize:'15px',fontFamily:'Fredoka, sans-serif'}}>Win Streak Badges</b>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
              {curStreak > 0 && (
                <span className="lv" style={{background:'var(--y)',color:'var(--ink)',fontSize:'11px',padding:'1px 6px'}}>
                  Active: {curStreak} 🔥
                </span>
              )}
              <span style={{fontSize:'11px',fontWeight:800,color:'var(--sub)'}}>
                Tap to inspect
              </span>
            </div>
          </div>

          <div className="streak-badges-grid">
            {STREAK_BADGES.map(b => {
              const isUnlocked = bestStreak >= b.count;
              const progress = Math.min(bestStreak, b.count);
              const pct = Math.round((progress / b.count) * 100);
              return (
                <div
                  key={b.id}
                  className={`streak-badge-card ${isUnlocked ? 'unlocked' : 'locked'} ${b.id}`}
                  onClick={() => {
                    playMenuFeedback();
                    setSelectedStreakBadge(b);
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`${b.title}: ${b.count} streak ${isUnlocked ? 'Earned' : `Progress ${progress}/${b.count}`}`}
                >
                  <div className="streak-badge-crest">
                    <span className="streak-badge-emoji">{b.icon}</span>
                    <span className="streak-badge-indicator">
                      {isUnlocked ? '✓' : '🔒'}
                    </span>
                  </div>
                  <b className="streak-badge-title">{b.title}</b>
                  <span className="streak-badge-count">{b.count} Streak</span>
                  {isUnlocked ? (
                    <span className="streak-status-tag earned">Earned</span>
                  ) : (
                    <div className="streak-progress-wrap">
                      <div className="streak-progress-fill" style={{width:`${pct}%`,background:b.badgeCol}}></div>
                      <span className="streak-progress-text">{progress}/{b.count}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="card" style={{padding:'12px',borderRadius:'18px',boxShadow:'0 3px 0 var(--ink)'}}>
          <div style={{fontWeight:800,fontSize:'14px',marginBottom:'6px'}}>🎮 Mode Records</div>
          <div className="stat"><span>vs CPU Record</span><b>{cpuWins}W - {cpuMatches.length - cpuWins}L ({cpuWinRate}%)</b></div>
          <div className="stat"><span>2 Players Duels</span><b>{twoMatches.length} Matches</b></div>
        </div>

        <div className="card" style={{padding:'12px',borderRadius:'18px',boxShadow:'0 3px 0 var(--ink)'}}>
          <div style={{fontWeight:800,fontSize:'14px',marginBottom:'6px'}}>📜 Recent Matches</div>
          {matches.slice(-4).reverse().map((m, idx) => (
            <div key={idx} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 0',borderBottom: idx < 3 ? '1px dashed var(--card2)' : 'none',fontSize:'13px'}}>
              <div>
                <b>{m.mode === 'cpu' ? 'vs CPU' : '2 Players'}</b>
                <span style={{color:'var(--sub)',marginLeft:'6px'}}>{PENS[m.pen] ? PENS[m.pen][0] : 'Pen'}</span>
              </div>
              <span className="lv" style={{background: m.win ? 'var(--g)' : 'var(--card2)', color: m.win ? '#fff' : 'var(--ink)', fontSize:'11px', padding:'2px 8px'}}>
                {m.win ? 'WIN' : 'LOSS'}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render Leaderboards
  const renderLbBody = () => {
    const matches = settings.m;
    const PENS = getPens();

    if (!matches.length) {
      return <div className="empty"><div className="av">🏆</div><h2>No Ranks Yet</h2><p>Play matches to establish desk rankings.</p></div>;
    }

    if (lbTab === 'pens') {
      const penStats: Record<number, { wins: number; matches: number }> = {};
      matches.forEach(m => {
        const pIdx = m.pen ?? 0;
        penStats[pIdx] = penStats[pIdx] || { wins: 0, matches: 0 };
        penStats[pIdx].matches++;
        if (m.win) penStats[pIdx].wins++;
      });

      const sorted = Object.entries(penStats)
        .map(([id, st]) => ({
          idx: +id,
          name: PENS[+id] ? PENS[+id][0] : 'Custom Pen',
          color: PENS[+id] ? PENS[+id][2] : '#CA4639',
          wins: st.wins,
          matches: st.matches,
          rate: Math.round((st.wins / st.matches) * 100) || 0
        }))
        .sort((a, b) => b.wins - a.wins || b.rate - a.rate);

      return (
        <div style={{display:'flex',flexDirection:'column',gap:'8px',overflowY:'auto',flex:1}}>
          <div style={{textAlign:'center',padding:'4px 0',color:'var(--sub)',fontSize:'13px'}}>
            Ranked by match victories & desk dominance
          </div>
          {sorted.map((item, i) => {
            const medal = ['🥇','🥈','🥉'][i] || `#${i+1}`;
            const tier = item.rate >= 75 && item.wins >= 3 ? 'S Tier' : item.rate >= 50 ? 'A Tier' : 'B Tier';
            return (
              <div key={i} className="card" style={{padding:'10px 14px',borderRadius:'16px',boxShadow:'0 3px 0 var(--ink)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                  <span style={{fontSize:'20px',width:'28px',textAlign:'center'}}>{medal}</span>
                  <div>
                    <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                      <span style={{width:'10px',height:'10px',borderRadius:'50%',background:item.color,border:'1px solid var(--ink)',display:'inline-block'}}></span>
                      <b style={{fontSize:'15px',fontFamily:'Fredoka, sans-serif'}}>{item.name}</b>
                    </div>
                    <div style={{fontSize:'12px',color:'var(--sub)'}}>{item.matches} matches played</div>
                  </div>
                </div>
                <div style={{textAlign:'right'}}>
                  <b style={{fontSize:'15px',fontFamily:'Fredoka, sans-serif'}}>{item.wins} wins</b>
                  <div style={{fontSize:'12px',fontWeight:800,color:'var(--primary)'}}>{item.rate}% · {tier}</div>
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    if (lbTab === 'duelists') {
      const duelistWins: Record<string, { wins: number; matches: number }> = {};
      const p1 = settings.name || 'Demon';
      const p2 = settings.p2 || 'Rival';
      const cpu = 'CPU';

      matches.forEach(m => {
        if (m.mode === 'cpu') {
          duelistWins[p1] = duelistWins[p1] || { wins: 0, matches: 0 };
          duelistWins[cpu] = duelistWins[cpu] || { wins: 0, matches: 0 };
          duelistWins[p1].matches++;
          duelistWins[cpu].matches++;
          if (m.win) duelistWins[p1].wins++;
          else duelistWins[cpu].wins++;
        } else {
          duelistWins[p1] = duelistWins[p1] || { wins: 0, matches: 0 };
          duelistWins[p2] = duelistWins[p2] || { wins: 0, matches: 0 };
          duelistWins[p1].matches++;
          duelistWins[p2].matches++;
          if (m.winner === p1) duelistWins[p1].wins++;
          else if (m.winner === p2) duelistWins[p2].wins++;
        }
      });

      const sorted = Object.entries(duelistWins)
        .map(([name, st]) => ({
          name,
          wins: st.wins,
          matches: st.matches,
          rate: Math.round((st.wins / st.matches) * 100) || 0
        }))
        .sort((a, b) => b.wins - a.wins);

      return (
        <div style={{display:'flex',flexDirection:'column',gap:'8px',overflowY:'auto',flex:1}}>
          <div style={{textAlign:'center',padding:'4px 0',color:'var(--sub)',fontSize:'13px'}}>
            Fighter leaderboard across all matches
          </div>
          {sorted.map((item, i) => (
            <div key={i} className="card" style={{padding:'12px 14px',borderRadius:'16px',boxShadow:'0 3px 0 var(--ink)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                <span style={{fontSize:'22px',width:'28px',textAlign:'center'}}>{['🥇','🥈','🥉'][i] || `#${i+1}`}</span>
                <div>
                  <b style={{fontSize:'16px',fontFamily:'Fredoka, sans-serif'}}>{item.name}</b>
                  <div style={{fontSize:'12px',color:'var(--sub)'}}>{item.matches} bouts</div>
                </div>
              </div>
              <div style={{textAlign:'right'}}>
                <b style={{fontSize:'16px',fontFamily:'Fredoka, sans-serif'}}>{item.wins} Wins</b>
                <div style={{fontSize:'12px',fontWeight:800,color:'var(--sub)'}}>{item.rate}% Win Rate</div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    // Hall of Fame Records Tab
    let curStreak = 0, bestStreak = 0;
    matches.forEach(x => {
      if (x.win) { curStreak++; if (curStreak > bestStreak) bestStreak = curStreak; }
      else { curStreak = 0; }
    });

    return (
      <div style={{display:'flex',flexDirection:'column',gap:'10px',overflowY:'auto',flex:1}}>
        <div className="card" style={{padding:'14px',borderRadius:'18px',boxShadow:'0 3px 0 var(--ink)'}}>
          <div style={{fontSize:'13px',color:'var(--sub)'}}>🔥 All-Time Best Streak</div>
          <div style={{fontSize:'26px',fontFamily:'Fredoka, sans-serif',margin:'4px 0'}}>{bestStreak} Wins in a Row</div>
          <small style={{color:'var(--sub)'}}>Consecutive victories without a defeat</small>
        </div>
        <div className="card" style={{padding:'14px',borderRadius:'18px',boxShadow:'0 3px 0 var(--ink)'}}>
          <div style={{fontSize:'13px',color:'var(--sub)'}}>⚔️ Total Desk Clashes</div>
          <div style={{fontSize:'26px',fontFamily:'Fredoka, sans-serif',margin:'4px 0'}}>{matches.length} Matches</div>
          <small style={{color:'var(--sub)'}}>Total competitive battles completed</small>
        </div>
        <div className="card" style={{padding:'14px',borderRadius:'18px',boxShadow:'0 3px 0 var(--ink)'}}>
          <div style={{fontSize:'13px',color:'var(--sub)'}}>🎯 Total Rounds Fought</div>
          <div style={{fontSize:'26px',fontFamily:'Fredoka, sans-serif',margin:'4px 0'}}>
            {matches.reduce((acc, m) => acc + Math.max(1, (m.a || 0) + (m.b || 0)), 0)} Rounds
          </div>
          <small style={{color:'var(--sub)'}}>Knockout points contested</small>
        </div>
      </div>
    );
  };

  return (
    <div id="app">
      {/* HOME SCREEN */}
      <section className={getScreenClass('home')} id="home">
        <button className="btn help" onClick={openHelp} aria-label="How to play">?</button>
        <div className="hm-top">
          <div className="logo fr"><b>Flick</b><span>Demon</span></div>
        </div>
        <div className="hm-stage">
          <canvas ref={heroCanvasRef} id="hero" style={{position:'absolute',inset:0,width:'100%',height:'100%',zIndex:1}}></canvas>
          <div className="hm-chips">
            <span>🏆 {settings.m.filter(g => g.win).length} wins</span>
            <span>🎯 {settings.m.length} matches</span>
            <span>✏️ {getPens().length} pens</span>
          </div>
        </div>
        <div style={{width:'100%'}}>
          <button className="btn btn-primary big" onClick={() => go('pick')}>▶ Start Battle</button>
          <div className="mini" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginTop:'14px'}}>
            <button className="btn" style={{display:'flex',flexDirection:'row',gap:'10px',alignItems:'center'}} onClick={() => {
              setEditingPenIdx(-1);
              setStName('My Custom Pen');
              setStCap('#e8702a');
              setStBody('#bcd0e6');
              setStInk('#3a5fc0');
              setStLen(125);
              setStMass(1.0);
              setStPow(1.0);
              setStStyle('ball');
              setStShadow(0.35);
              go('designer');
            }}><i>🎨</i>Studio</button>
            <button className="btn" style={{display:'flex',flexDirection:'row',gap:'10px',alignItems:'center'}} onClick={() => go('lb')}><i>🏆</i>Ranks</button>
            <button className="btn" style={{display:'flex',flexDirection:'row',gap:'10px',alignItems:'center'}} onClick={() => go('stats')}><i>📊</i>Career</button>
            <button className="btn" style={{display:'flex',flexDirection:'row',gap:'10px',alignItems:'center'}} onClick={openSettings}><i>⚙️</i>Settings</button>
          </div>
          <div className="ver" style={{textAlign:'center'}}>Flick Demon v2.0 · Saved locally</div>
        </div>
      </section>

      {/* PICK SCREEN */}
      <section className={getScreenClass('pick')} id="pick">
        <div className="top">
          <button className="btn y sq" onClick={() => go('home')} aria-label="Back">←</button>
          <h1>Pick Your Pen</h1>
          <button className="btn bl" onClick={() => {
            saveSettings({ mode: settings.mode === 'cpu' ? 'two' : 'cpu' });
            playMenuFeedback();
          }}>
            {settings.mode === 'cpu' ? '🤖 vs CPU' : '👥 2 Players'}
          </button>
        </div>
        <div className="card">
          <div className="row">
            <span className="lv">Lv{settings.eq ? 1 : getLevel(settings.sel)}</span>
            <div className="dots" style={{display:'flex',gap:'6px',flex:1,justifyContent:'center',alignItems:'center'}}>
              {getPens().map((_, i) => (
                <i key={i} className={i === settings.sel ? 'on' : ''} style={{width: i === settings.sel ? '26px' : '10px', height:'10px', borderRadius:'5px', background: i === settings.sel ? 'var(--primary)' : 'var(--card2)', border:'2px solid var(--ink)'}}></i>
              ))}
            </div>
            <button className="btn bl sq" style={{width:'40px',height:'40px',fontSize:'16px'}} onClick={() => {
              playMenuFeedback();
              setActiveSheet('penInfo');
            }} aria-label="Pen info">i</button>
          </div>
          <div className="stage">
            <canvas ref={pickCanvasRef} width={640} height={360} className="pen-preview-canvas" style={{display:'block',width:'100%',height:'180px'}}></canvas>
            <button className="btn y" style={{left:'10px',position:'absolute',top:'65px',width:'44px',height:'48px',padding:0,fontSize:'22px'}} onClick={() => {
              const PENS = getPens();
              saveSettings({ sel: (settings.sel + PENS.length - 1) % PENS.length });
              playSnd(400, .05);
            }} aria-label="Previous pen">‹</button>
            <button className="btn y" style={{right:'10px',position:'absolute',top:'65px',width:'44px',height:'48px',padding:0,fontSize:'22px'}} onClick={() => {
              const PENS = getPens();
              saveSettings({ sel: (settings.sel + 1) % PENS.length });
              playSnd(460, .05);
            }} aria-label="Next pen">›</button>
          </div>
          <h2 id="pn">{getPens()[settings.sel]?.[0]}</h2>
          <div id="pd" style={{textAlign:'center',color:'var(--sub)',margin:'2px 0 10px',fontSize:'14px'}}>{getPens()[settings.sel]?.[1]}</div>
          <div style={{display:'flex',justifyContent:'center',gap:'10px',alignItems:'center'}}>
            <div className="seg" id="look">
              <button className={settings.real === 0 ? 'on' : ''} onClick={() => { saveSettings({ real: 0 }); playMenuFeedback(); }}>Classic</button>
              <button className={settings.real === 1 ? 'on' : ''} onClick={() => { saveSettings({ real: 1 }); playMenuFeedback(); }}>Real</button>
            </div>
            {settings.sel >= DEFAULT_PENS.length && (
              <button className="btn gr" style={{padding:'6px 12px',fontSize:'14px'}} onClick={() => {
                playMenuFeedback();
                setEditingPenIdx(settings.sel);
                const p = getPens()[settings.sel];
                setStName(p[0]); setStCap(p[2]); setStBody(p[3]); setStInk(p[4]);
                setStLen(p[5]); setStMass(p[6]); setStPow(p[8]); setStStyle(p[9] || 'ball');
                setStShadow(typeof p[10] === 'number' ? p[10] : 0.35);
                go('designer');
              }}>✏️ Edit</button>
            )}
          </div>
        </div>
        <div className="opts">
          <div className="pill"><span>✏️</span><input value={settings.name} onChange={e => saveSettings({ name: e.target.value })} placeholder="Player Name" maxLength={12} aria-label="Your name" /></div>
          {settings.mode === 'cpu' && (
            <div className="diff">
              <span className="lab">CPU</span>
              <button className={`btn ${settings.diff === 0 ? 'active-diff' : ''}`} onClick={() => { saveSettings({ diff: 0 }); playMenuFeedback(); }}>Easy</button>
              <button className={`btn ${settings.diff === 1 ? 'active-diff' : ''}`} onClick={() => { saveSettings({ diff: 1 }); playMenuFeedback(); }}>Normal</button>
              <button className={`btn ${settings.diff === 2 ? 'active-diff' : ''}`} onClick={() => { saveSettings({ diff: 2 }); playMenuFeedback(); }}>Hard</button>
            </div>
          )}
          <div className="tg">
            <button className="tgl" aria-pressed={!!settings.eq} onClick={() => { saveSettings({ eq: settings.eq ? 0 : 1 }); playMenuFeedback(); }}>Equal levels<span className="sw"></span></button>
            <button className="tgl" aria-pressed={!!settings.mir} onClick={() => { saveSettings({ mir: settings.mir ? 0 : 1 }); playMenuFeedback(); }}>Mirror match<span className="sw"></span></button>
          </div>
          <button className="btn btn-primary big" onClick={() => startBattle(false)}>▶ Battle!</button>
        </div>
      </section>

      {/* PEN STUDIO SCREEN */}
      <section className={getScreenClass('designer')} id="designer">
        <div className="top">
          <button className="btn y sq" onClick={() => go('pick')} aria-label="Back">←</button>
          <h1 id="stTitle">{editingPenIdx >= 0 ? 'Edit Pen' : 'Pen Studio'}</h1>
          {editingPenIdx >= DEFAULT_PENS.length && (
            <button className="btn rd sq" onClick={() => {
              if (editingPenIdx >= DEFAULT_PENS.length) {
                const newCustom = [...settings.customPens];
                newCustom.splice(editingPenIdx - DEFAULT_PENS.length, 1);
                saveSettings({ customPens: newCustom, sel: 0 });
                playMenuFeedback();
                go('pick');
              }
            }} aria-label="Delete Pen">🗑</button>
          )}
        </div>
        <div className="card" style={{marginBottom:'10px'}}>
          <div className="stage" style={{margin:'0 0 10px'}}>
            <canvas ref={studioCanvasRef} width={640} height={300} style={{display:'block',width:'100%',height:'150px'}}></canvas>
          </div>
          <div className="pill" style={{marginBottom:'10px'}}>
            <span>🏷️</span><input value={stName} onChange={e => setStName(e.target.value)} placeholder="Custom Pen Name" maxLength={16} />
          </div>
          <div className="studio-row"><span>Grip / Cap Color</span><input type="color" value={stCap} onChange={e => setStCap(e.target.value)} /></div>
          <div className="studio-row"><span>Barrel Color</span><input type="color" value={stBody} onChange={e => setStBody(e.target.value)} /></div>
          <div className="studio-row"><span>Ink Color</span><input type="color" value={stInk} onChange={e => setStInk(e.target.value)} /></div>
          <div className="studio-row">
            <span>Pen Style</span>
            <select value={stStyle} onChange={e => setStStyle(e.target.value)}>
              <option value="ball">Ballpoint</option>
              <option value="gel">Gel Grip</option>
              <option value="mech">Mech Pencil</option>
              <option value="hl">Highlighter</option>
              <option value="fount">Fountain</option>
              <option value="mark">Marker</option>
              <option value="brush">Brush</option>
              <option value="gold">Golden</option>
              <option value="neon" disabled={totalWins < 3}>⚡ Neon Style {totalWins < 3 ? '(Req. 3 Wins)' : ''}</option>
              <option value="chrome" disabled={totalWins < 5}>🦾 Chrome Style {totalWins < 5 ? '(Req. 5 Wins)' : ''}</option>
              <option value="transparent" disabled={totalWins < 10}>👻 Transparent Style {totalWins < 10 ? '(Req. 10 Wins)' : ''}</option>
            </select>
          </div>
        </div>
        <div className="card" style={{marginBottom:'12px'}}>
          <div className="studio-row"><span>Length</span><input type="range" min={90} max={150} value={stLen} onChange={e => setStLen(+e.target.value)} /></div>
          <div className="studio-row"><span>Weight (Mass)</span><input type="range" min={0.7} max={1.7} step={0.1} value={stMass} onChange={e => setStMass(+e.target.value)} /></div>
          <div className="studio-row"><span>Flick Power</span><input type="range" min={0.8} max={1.3} step={0.05} value={stPow} onChange={e => setStPow(+e.target.value)} /></div>
          <div className="studio-row">
            <span>Pen Shadow ({Math.round(stShadow * 100)}%)</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={stShadow}
              onChange={e => setStShadow(+e.target.value)}
              aria-label="Pen Shadow Strength"
            />
          </div>
        </div>
        <button className="btn btn-primary big" onClick={() => {
          const newPen = [
            stName.trim() || 'Custom Pen',
            'Custom crafted pen in Studio.',
            stCap, stBody, stInk,
            stLen, stMass, .95, stPow, stStyle,
            stShadow
          ];
          const custom = [...settings.customPens];
          if (editingPenIdx >= DEFAULT_PENS.length) {
            custom[editingPenIdx - DEFAULT_PENS.length] = newPen;
            saveSettings({ customPens: custom });
          } else {
            custom.push(newPen);
            saveSettings({ customPens: custom, sel: DEFAULT_PENS.length + custom.length - 1 });
          }
          playMenuFeedback();
          go('pick');
        }}>💾 Save Pen</button>
      </section>

      {/* GAMEPLAY SCREEN */}
      <section className={`scr ${currentScreen === 'game' ? 'on' : ''}`} id="game" style={{padding:0,overflow:'hidden'}}>
        <canvas ref={gameCanvasRef} id="cv" style={{position:'absolute',inset:0,width:'100%',height:'100%',touchAction:'none'}} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={() => { if(gameRef.current) gameRef.current.drag = null; }}></canvas>
        <div id="hud">
          <button className="btn" onClick={() => go('pick')} aria-label="Quit match">✕</button>
          <div id="sc" style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'6px'}}>
            <span style={{fontWeight:800,maxWidth:'85px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
              {settings.mode === 'two' ? (settings.name || 'P1') : (settings.name || 'Demon')}
            </span>
            <div style={{display:'inline-flex',alignItems:'center',gap:'4px',background:'var(--card2)',padding:'2px 8px',borderRadius:'10px',border:'2px solid var(--ink)',margin:'0 4px'}}>
              <b style={{fontSize:'16px',color:'var(--primary)'}}>{matchScore[0]}</b>
              <span style={{color:'var(--sub)',fontSize:'12px'}}>:</span>
              <b style={{fontSize:'16px',color:'var(--ink)'}}>{matchScore[1]}</b>
            </div>
            <span style={{fontWeight:800,maxWidth:'85px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
              {settings.mode === 'two' ? (settings.p2 || 'P2') : 'CPU'}
            </span>
            <span style={{marginLeft:'4px',fontSize:'10px',fontWeight:800,color:'var(--sub)',background:'var(--card2)',padding:'2px 6px',borderRadius:'6px',border:'1.5px solid var(--ink)',whiteSpace:'nowrap'}}>First to 3</span>
          </div>
        </div>
        <div id="tn">
          {turnBanner && <span className="tn-pill">{turnBanner}</span>}
        </div>
        <div id="ov" className={gameOverInfo ? 'on' : ''}>
          <div className="card" style={{textAlign:'center',width:'100%'}}>
            <div className="ov-badge">
              {gameOverInfo?.winner === 0 ? '🏆' : (settings.mode === 'two' ? '👑' : '💥')}
            </div>
            <h2 id="ot" style={{fontSize:'34px',marginBottom: gameOverInfo?.desc ? '6px' : '16px'}}>{gameOverInfo?.title}</h2>
            {gameOverInfo?.desc ? (
              <p id="op" style={{color:'var(--sub)',margin:'0 0 14px'}}>{gameOverInfo.desc}</p>
            ) : null}
            <button className="btn btn-primary" onClick={() => { setGameOverInfo(null); startBattle(false); }}>Rematch</button>
            <button className="btn" onClick={() => { setGameOverInfo(null); go('pick'); }}>Pick Pen</button>
          </div>
        </div>
      </section>

      {/* CAREER SCREEN */}
      <section className={getScreenClass('stats')} id="stats">
        <div className="top"><button className="btn y sq" onClick={() => go('home')} aria-label="Back">←</button><h1>Career</h1></div>
        <div className="tabs">
          <div className="card" style={{padding:'6px',borderRadius:'20px'}}>
            <div className="seg" id="sTab" style={{width:'100%',display:'flex'}}>
              <button className={statsTab === 'overview' ? 'on' : ''} onClick={() => { setStatsTab('overview'); playMenuFeedback(); }} style={{flex:1}}>📊 Overview</button>
              <button className={statsTab === 'mastery' ? 'on' : ''} onClick={() => { setStatsTab('mastery'); playMenuFeedback(); }} style={{flex:1}}>⚡ Mastery</button>
              <button className={statsTab === 'unlocks' ? 'on' : ''} onClick={() => { setStatsTab('unlocks'); playMenuFeedback(); }} style={{flex:1}}>🏆 Unlocks</button>
            </div>
          </div>
        </div>
        <div className="card" style={{flex:1,display:'flex',flexDirection:'column'}}>
          <div id="sBody" style={{flex:1,display:'flex',flexDirection:'column'}}>{renderStatsBody()}</div>
          <div className="foot">Saved locally on this device</div>
        </div>
      </section>

      {/* LEADERBOARD SCREEN */}
      <section className={getScreenClass('lb')} id="lb">
        <div className="top"><button className="btn y sq" onClick={() => go('home')} aria-label="Back">←</button><h1>Ranks</h1></div>
        <div className="tabs">
          <div className="card" style={{padding:'6px',borderRadius:'20px'}}>
            <div className="seg modes" style={{width:'100%',display:'flex'}}>
              <button className={lbTab === 'pens' ? 'on' : ''} onClick={() => { setLbTab('pens'); playMenuFeedback(); }} style={{flex:1}}>✏️ Pen Tier</button>
              <button className={lbTab === 'duelists' ? 'on' : ''} onClick={() => { setLbTab('duelists'); playMenuFeedback(); }} style={{flex:1}}>👑 Duelists</button>
              <button className={lbTab === 'records' ? 'on' : ''} onClick={() => { setLbTab('records'); playMenuFeedback(); }} style={{flex:1}}>🔥 Records</button>
            </div>
          </div>
        </div>
        <div className="card" style={{flex:1,display:'flex',flexDirection:'column'}} id="lBody">
          {renderLbBody()}
          <div className="foot">Local Desk Hall of Fame</div>
        </div>
      </section>

      {/* SETTINGS DRAWER / SHEET */}
      <div id="sheet" className={`sheet ${activeSheet ? 'on' : ''}`} onClick={e => { if ((e.target as HTMLElement).id === 'sheet') setActiveSheet(null); }}>
        <div className="in" id="sin">
          {activeSheet === 'settings' && (
            <div>
              <div className="sh">
                <h2>Settings</h2>
                <button className="btn sq" style={{width:'40px',height:'40px',fontSize:'16px'}} onClick={() => { playMenuFeedback(); setActiveSheet(null); }} aria-label="Close">✕</button>
              </div>

              <div className="sec-title">🎨 Visuals & Desk</div>
              <div className="settings-card">
                <div style={{marginBottom:'6px'}}><small style={{color:'var(--sub)'}}>Color Theme</small></div>
                {seg('theme', [['system','System'],['light','Light'],['dark','Dark']])}
                <div style={{margin:'10px 0 6px'}}><small style={{color:'var(--sub)'}}>Desk Surface</small></div>
                {seg('desk', [['clean','Clean Wood'],['old','Classic Desk']])}
              </div>

              <div className="sec-title">🎮 Gameplay & Assist</div>
              <div className="settings-card">
                {tg('aim', 'Aim Trajectory', 'Shows trajectory & direction guide')}
                {tg('vib', 'Haptic Vibration', 'Tactile feedback when pulling pen')}
                {tg('rm', 'Reduce Motion', 'Simplifies banners and match effects')}
              </div>

              <div className="sec-title">🔊 Audio & Names</div>
              <div className="settings-card">
                {tg('muteAll', 'Mute All', 'Silences both game effects and menu feedback')}
                {tg('snd', 'Sound Effects', 'Flick sound synthesis & collision effects')}
                <div className="settings-grid">
                  <div><small style={{color:'var(--sub)'}}>Player 1 Name</small><input className="t" value={settings.name} onChange={e => saveSettings({ name: e.target.value })} maxLength={12} /></div>
                  <div><small style={{color:'var(--sub)'}}>Player 2 Name</small><input className="t" value={settings.p2} onChange={e => saveSettings({ p2: e.target.value })} maxLength={12} /></div>
                </div>
              </div>

              <div className="sec-title">ℹ️ About</div>
              <div className="settings-card">
                <div className="set">
                  <div><b>About Flick Demon</b><small>Version 2.0 · Developer Muntasir Billah Muhit</small></div>
                  <button className="btn" onClick={openAbout}>Open</button>
                </div>
              </div>

              <div className="sec-title">⚠️ Data Reset</div>
              <div className="settings-card">
                <div className="set">
                  <div><b>Reset All Progress</b><small>Clears wins, XP, and custom pens</small></div>
                  <button className="btn rd" onClick={(e: any) => {
                    if (e.target.dataset.sure) {
                      saveSettings({ m: [], xp: {}, customPens: [], sel: 0 });
                      e.target.textContent = 'Cleared!';
                    } else {
                      e.target.dataset.sure = '1';
                      e.target.textContent = 'Tap Again';
                    }
                  }}>Reset</button>
                </div>
              </div>
            </div>
          )}

          {activeSheet === 'help' && (
            <div>
              <div className="sh">
                <h2>How to Play</h2>
                <button className="btn sq" style={{width:'40px',height:'40px',fontSize:'16px'}} onClick={() => { playMenuFeedback(); setActiveSheet(null); }} aria-label="Close">✕</button>
              </div>
              <details><summary>Goal</summary><p>Knock their pen off the desk while keeping yours safe on board.</p></details>
              <details><summary>How to Flick</summary><p>Touch your pen, pull back like a slingshot, and release. Side angles add spin.</p></details>
              <details><summary>Turns</summary><p>You and your rival flick in turns. Wait until both pens completely stop moving.</p></details>
              <details><summary>Desk Shrinks</summary><p>Every two turns the desk boundaries shrink inward to force quick battles!</p></details>
              <button className="btn btn-primary big" style={{fontSize:'16px',padding:'12px',marginTop:'8px'}} onClick={() => { setActiveSheet(null); startBattle(true); }}>Play Practice Match (not recorded)</button>
            </div>
          )}

          {activeSheet === 'about' && (
            <div>
              <div className="sh">
                <h2>About</h2>
                <button className="btn sq" style={{width:'40px',height:'40px',fontSize:'16px'}} onClick={() => { playMenuFeedback(); setActiveSheet(null); }} aria-label="Close">✕</button>
              </div>
              <div className="about-top"><div className="fr">Flick Demon</div><p>Version 2.0</p></div>
              <details><summary>What is Flick Demon?</summary><p>A two-pen duel on a school desk. Pull back, flick, and knock your rival’s pen off the edge.</p></details>
              <details><summary>The pens</summary><p>Eight pens ship with the game, each with custom weight, slide, and power. Build your own in Studio.</p></details>
              <details><summary>Levels and ranks</summary><p>Each win against CPU earns XP for your pen. Every 3 wins raises its level.</p></details>
              <div className="dev"><div className="av">👨‍💻</div><div><small>Developer</small><b>Muntasir Billah Muhit</b></div></div>
            </div>
          )}

          {activeSheet === 'penInfo' && (() => {
            const p = getPens()[settings.sel];
            if (!p) return null;
            const bar = (l: string, v: number) => (
              <div key={l}>
                <div>{l}</div>
                <div className="bar"><i style={{width: `${Math.min(100, v * 100)}%`}}></i></div>
              </div>
            );
            return (
              <div>
                <div className="sh">
                  <h2>{p[0]}</h2>
                  <button className="btn sq" style={{width:'40px',height:'40px',fontSize:'16px'}} onClick={() => { playMenuFeedback(); setActiveSheet(null); }} aria-label="Close">✕</button>
                </div>
                {bar('Weight', p[6] / 1.7)}
                {bar('Slide', (p[7] - .93) / .03)}
                {bar('Flick Power', p[8] / 1.3)}
                {bar('Length', p[5] / 150)}
                {bar('Pen Shadow', typeof p[10] === 'number' ? p[10] : 0.35)}
                <p style={{color:'var(--sub)'}}>Level {getLevel(settings.sel)} · {settings.xp[settings.sel] || 0} wins with this pen.</p>
              </div>
            );
          })()}
        </div>
      </div>

      {/* CELEBRATORY UNLOCK MODAL */}
      <div
        id="unlock-modal"
        className={unlockCelebration ? 'on' : ''}
        onClick={e => {
          if ((e.target as HTMLElement).id === 'unlock-modal') setUnlockCelebration(null);
        }}
      >
        {unlockCelebration && (
          <div className="unlock-card">
            <div className="unlock-sunburst"></div>
            <div className="confetti-container">
              {[...Array(14)].map((_, i) => (
                <span
                  key={i}
                  className="confetti-piece"
                  style={{
                    left: `${(i * 7.5 + 4) % 94}%`,
                    top: `${-15 - (i % 4) * 8}px`,
                    background: ['#FFD25A', '#FF4081', '#00E5FF', '#76FF03', '#E040FB', '#FF6E40', '#FFFFFF'][i % 7],
                    animationDelay: `${(i * 0.22).toFixed(2)}s`,
                    width: i % 2 === 0 ? '9px' : '12px',
                    height: i % 3 === 0 ? '12px' : '8px'
                  }}
                />
              ))}
            </div>
            <div className="unlock-badge">{unlockCelebration.badge}</div>
            <span
              style={{
                display: 'inline-block',
                fontSize: '11px',
                fontWeight: 900,
                color: 'var(--ink)',
                background: 'var(--y)',
                padding: '3px 10px',
                borderRadius: '10px',
                border: '2px solid var(--ink)',
                marginBottom: '6px',
                position: 'relative',
                zIndex: 2
              }}
            >
              {unlockCelebration.subtitle}
            </span>
            <h2
              style={{
                fontSize: '26px',
                margin: '2px 0 6px',
                position: 'relative',
                zIndex: 2,
                fontFamily: 'Fredoka, sans-serif'
              }}
            >
              {unlockCelebration.title}
            </h2>
            <div
              className="stage"
              style={{
                margin: '10px 0',
                position: 'relative',
                zIndex: 2,
                background: 'rgba(255,255,255,0.15)'
              }}
            >
              <canvas
                ref={unlockCanvasRef}
                width={480}
                height={220}
                className="pen-preview-canvas"
                style={{ display: 'block', width: '100%', height: '130px' }}
              ></canvas>
            </div>
            <p
              style={{
                fontSize: '13px',
                color: 'var(--sub)',
                margin: '0 0 16px',
                position: 'relative',
                zIndex: 2,
                lineHeight: '1.4'
              }}
            >
              {unlockCelebration.desc}
            </p>
            <div style={{ display: 'flex', gap: '8px', position: 'relative', zIndex: 2 }}>
              <button
                className="btn btn-primary"
                style={{ flex: 1, padding: '10px 8px', fontSize: '14px' }}
                onClick={() => {
                  playMenuFeedback();
                  const targetStyle = unlockCelebration.style;
                  setUnlockCelebration(null);
                  setGameOverInfo(null);
                  setStStyle(targetStyle);
                  setStCap(unlockCelebration.cap);
                  setStBody(unlockCelebration.body);
                  setStInk(unlockCelebration.ink);
                  setStName(
                    targetStyle === 'neon'
                      ? 'Neon Demon'
                      : targetStyle === 'chrome'
                      ? 'Chrome Titan'
                      : 'Ghost Spec'
                  );
                  setEditingPenIdx(-1);
                  setStShadow(0.35);
                  go('designer');
                }}
              >
                🎨 Try in Pen Studio
              </button>
              <button
                className="btn"
                style={{ padding: '10px 14px', fontSize: '14px' }}
                onClick={() => {
                  playMenuFeedback();
                  setUnlockCelebration(null);
                }}
              >
                Awesome!
              </button>
            </div>
          </div>
        )}
      </div>

      {/* STREAK BADGE INSPECT MODAL */}
      <div
        id="streak-modal"
        className={selectedStreakBadge ? 'on' : ''}
        onClick={e => {
          if ((e.target as HTMLElement).id === 'streak-modal') setSelectedStreakBadge(null);
        }}
      >
        {selectedStreakBadge && (() => {
          const isUnlocked = bestStreak >= selectedStreakBadge.count;
          const progress = Math.min(bestStreak, selectedStreakBadge.count);
          return (
            <div className="streak-modal-card">
              <div
                className="streak-modal-halo"
                style={{
                  background: `radial-gradient(circle, ${selectedStreakBadge.glowCol} 0%, transparent 70%)`
                }}
              />
              <div className="streak-modal-badge-icon" style={{ borderColor: selectedStreakBadge.badgeCol }}>
                <span>{selectedStreakBadge.icon}</span>
              </div>
              <span
                className="lv"
                style={{
                  display: 'inline-block',
                  background: isUnlocked ? selectedStreakBadge.badgeCol : 'var(--card2)',
                  color: isUnlocked ? '#FFF' : 'var(--sub)',
                  fontSize: '12px',
                  padding: '3px 12px',
                  borderRadius: '12px',
                  marginBottom: '6px',
                  border: '1.5px solid var(--ink)',
                  boxShadow: '0 2px 0 var(--ink)'
                }}
              >
                {selectedStreakBadge.tier} · {selectedStreakBadge.subtitle}
              </span>
              <h2 style={{ fontSize: '24px', fontFamily: 'Fredoka, sans-serif', margin: '4px 0 8px' }}>
                {selectedStreakBadge.title}
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--sub)', lineHeight: '1.4', margin: '0 0 14px' }}>
                {selectedStreakBadge.desc}
              </p>

              <div
                className="card"
                style={{
                  background: isUnlocked ? 'rgba(129, 199, 132, 0.15)' : 'var(--card2)',
                  border: '2px solid var(--ink)',
                  borderRadius: '14px',
                  padding: '10px 14px',
                  marginBottom: '16px',
                  textAlign: 'left'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', fontWeight: 800 }}>
                  <span style={{ color: 'var(--sub)' }}>Requirement</span>
                  <span>{selectedStreakBadge.count} Consecutive Victories</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', fontWeight: 800, marginTop: '6px' }}>
                  <span>Career Best</span>
                  <span style={{ color: isUnlocked ? 'var(--g)' : 'var(--primary)' }}>
                    {isUnlocked ? `✓ Unlocked (Best: ${bestStreak})` : `${progress} / ${selectedStreakBadge.count} Streak`}
                  </span>
                </div>
                {!isUnlocked && (
                  <div className="streak-mini-bar" style={{ height: '8px', marginTop: '8px', background: 'rgba(0,0,0,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      className="streak-mini-bar-fill"
                      style={{
                        width: `${Math.round((progress / selectedStreakBadge.count) * 100)}%`,
                        background: selectedStreakBadge.badgeCol,
                        height: '100%'
                      }}
                    />
                  </div>
                )}
              </div>

              <button
                className="btn btn-primary"
                style={{ width: '100%', padding: '10px', fontSize: '14px' }}
                onClick={() => {
                  playMenuFeedback();
                  setSelectedStreakBadge(null);
                }}
              >
                {isUnlocked ? 'Awesome!' : 'Got It!'}
              </button>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
