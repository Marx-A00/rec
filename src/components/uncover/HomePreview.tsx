'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Play,
  Archive,
  Flame,
  Lock,
  Zap,
  ChevronLeft,
  ChevronRight,
  Trophy,
  Clock,
  Target,
  Disc3,
  Eye,
} from 'lucide-react';

import { TeaserImage } from '@/components/uncover/TeaserImage';
import { LightRays } from '@/components/ui/light-rays';
import {
  SmokeBackground,
  SMOKE_DEFAULTS,
  type SmokeParams,
} from '@/components/ui/smoke-background';

/* ─── Variant Registry ──────────────────────────────────────────── */

const VARIANTS = [
  {
    id: 'centered-hero',
    label: 'Centered Hero',
    desc: 'Current style, emerald + white CTA',
  },
  {
    id: 'split-editorial',
    label: 'Editorial',
    desc: 'Magazine split, dark audio palette (#0F0F23)',
  },
  {
    id: 'cinematic-dark',
    label: 'Cinematic',
    desc: 'OLED dark, gold spotlight (#CA8A04), bottom-anchored',
  },
  {
    id: 'glass-card',
    label: 'Glass Card',
    desc: 'Glassmorphism card, indigo depth (#1E1B4B), green CTA',
  },
  {
    id: 'smoke-reveal',
    label: 'Smoke',
    desc: 'WebGL smoke shader backdrop, emerald tint, floating art',
  },
  {
    id: 'smoke-lights',
    label: 'Smoke+Lights',
    desc: 'Neutral smoke + colored LightRays bleeding through, concert fog vibe',
  },
] as const;

type VariantId = (typeof VARIANTS)[number]['id'];

/* ─── Shared dummy stats ────────────────────────────────────────── */

const STATS = { played: 23, winRate: 78, streak: 5, puzzleNumber: 47 };

/* ═══════════════════════════════════════════════════════════════════
   VARIANT A — Centered Hero
   Palette: Emerald (#10B981) on dark zinc
   Style: Minimal single-column, centered focus
   Typography: System sans (existing)
   ═══════════════════════════════════════════════════════════════════ */

function CenteredHero() {
  return (
    <div className='relative flex h-full flex-col items-center justify-center gap-8 px-4'>
      <LightRays
        count={8}
        color='rgba(16, 185, 129, 0.35)'
        blur={40}
        speed={16}
        length='65vh'
      />

      {/* Puzzle badge row */}
      <div className='relative z-10 flex items-center gap-3 text-[11px] font-semibold tracking-[0.15em] text-zinc-500'>
        <span>PUZZLE #{STATS.puzzleNumber}</span>
        <span className='text-zinc-700'>·</span>
        <div className='flex items-center gap-1'>
          <Flame className='h-3 w-3 text-orange-500' />
          <span className='text-orange-500'>{STATS.streak} DAY STREAK</span>
        </div>
      </div>

      {/* Album art teaser */}
      <div className='relative z-10 w-[340px]'>
        <div className='overflow-hidden rounded-2xl shadow-[0_0_120px_rgba(255,255,255,0.03)]'>
          <TeaserImage />
        </div>
        <div className='absolute inset-0 flex items-center justify-center'>
          <div className='flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800/80 backdrop-blur'>
            <Lock className='h-7 w-7 text-zinc-400' />
          </div>
        </div>
      </div>

      {/* Hook */}
      <p className='relative z-10 text-xl font-medium text-white'>
        Can you name this album?
      </p>

      {/* CTA — white pill */}
      <button className='relative z-10 flex cursor-pointer items-center gap-2.5 rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-white/50'>
        Start today&apos;s puzzle
        <span aria-hidden>→</span>
      </button>

      {/* Inline stats */}
      <div className='relative z-10 flex items-center gap-10 pt-2'>
        <div className='flex items-center gap-2'>
          <span className='text-sm font-semibold text-white'>
            {STATS.played}
          </span>
          <span className='text-xs text-zinc-600'>played</span>
        </div>
        <div className='flex items-center gap-2'>
          <span className='text-sm font-semibold text-white'>
            {STATS.winRate}%
          </span>
          <span className='text-xs text-zinc-600'>win rate</span>
        </div>
        <div className='flex items-center gap-2'>
          <span className='text-sm font-semibold text-white'>
            {STATS.streak}
          </span>
          <span className='text-xs text-zinc-600'>streak</span>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   VARIANT B — Split Editorial
   Palette: Music Streaming dark (#0F0F23 bg, #4338CA secondary, #22C55E CTA)
   Style: Two-column magazine layout, large art left
   Ref: "Dark audio + play green" palette
   ═══════════════════════════════════════════════════════════════════ */

function SplitEditorial() {
  return (
    <div className='relative flex h-full items-center gap-16 px-[60px]'>
      {/* Subtle deep-indigo ambient light */}
      <LightRays
        count={5}
        color='rgba(67, 56, 202, 0.2)'
        blur={50}
        speed={20}
        length='60vh'
      />

      {/* Left — large art with indigo accent frame */}
      <div className='relative z-10 flex-shrink-0'>
        <div className='relative w-[420px]'>
          {/* Decorative outer ring — indigo */}
          <div className='absolute -inset-3 rounded-3xl border border-indigo-500/15' />
          <div className='overflow-hidden rounded-2xl'>
            <TeaserImage className='rounded-2xl' />
          </div>
          {/* Puzzle number overlay — green accent */}
          <div className='absolute -right-4 -top-4 flex h-14 w-14 items-center justify-center rounded-full border-2 border-green-500/30 bg-[#0F0F23] shadow-lg'>
            <span className='text-sm font-bold text-green-400'>
              #{STATS.puzzleNumber}
            </span>
          </div>
        </div>
      </div>

      {/* Right — copy + actions */}
      <div className='relative z-10 flex flex-col gap-6'>
        {/* Streak badge */}
        <div className='flex items-center gap-2 self-start rounded-full border border-orange-500/20 bg-orange-500/5 px-3.5 py-1.5'>
          <Flame className='h-4 w-4 text-orange-500' />
          <span className='text-sm font-semibold text-orange-400'>
            {STATS.streak} day streak
          </span>
        </div>

        {/* Title — large, tight tracking */}
        <div>
          <h2 className='text-5xl font-bold tracking-tight text-[#F8FAFC]'>
            Daily
            <br />
            Uncover
          </h2>
          <p className='mt-3 max-w-sm text-base leading-relaxed text-zinc-400'>
            A blurred album cover. Four guesses. Can you identify it before the
            reveal?
          </p>
        </div>

        {/* CTA row — green primary from music streaming palette */}
        <div className='flex items-center gap-4'>
          <button className='flex cursor-pointer items-center gap-2.5 rounded-xl bg-[#22C55E] px-7 py-3.5 text-sm font-semibold text-white transition-all hover:bg-[#16A34A] focus:outline-none focus:ring-2 focus:ring-green-500/50'>
            <Play className='h-4 w-4 fill-current' />
            Play Now
          </button>
          <Link
            href='/game/archive'
            className='flex cursor-pointer items-center gap-2 rounded-xl border border-zinc-700 px-5 py-3.5 text-sm text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-500/50'
          >
            <Archive className='h-4 w-4' />
            Archive
          </Link>
        </div>

        {/* Stats row — icon tiles with indigo secondary */}
        <div className='flex gap-8 border-t border-zinc-800 pt-5'>
          <div className='flex items-center gap-2.5'>
            <div className='flex h-9 w-9 items-center justify-center rounded-lg bg-[#1E1B4B]'>
              <Target className='h-4 w-4 text-green-400' />
            </div>
            <div>
              <p className='text-sm font-semibold text-[#F8FAFC]'>
                {STATS.winRate}%
              </p>
              <p className='text-[11px] text-zinc-500'>Win rate</p>
            </div>
          </div>
          <div className='flex items-center gap-2.5'>
            <div className='flex h-9 w-9 items-center justify-center rounded-lg bg-[#1E1B4B]'>
              <Trophy className='h-4 w-4 text-[#CA8A04]' />
            </div>
            <div>
              <p className='text-sm font-semibold text-[#F8FAFC]'>
                {STATS.played}
              </p>
              <p className='text-[11px] text-zinc-500'>Played</p>
            </div>
          </div>
          <div className='flex items-center gap-2.5'>
            <div className='flex h-9 w-9 items-center justify-center rounded-lg bg-[#1E1B4B]'>
              <Flame className='h-4 w-4 text-orange-500' />
            </div>
            <div>
              <p className='text-sm font-semibold text-[#F8FAFC]'>
                {STATS.streak}
              </p>
              <p className='text-[11px] text-zinc-500'>Streak</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   VARIANT C — Cinematic Dark
   Palette: Theater/Cinema (#0F0F23 bg, #312E81 secondary, #CA8A04 gold CTA)
   Style: OLED dark, dramatic. Full-bleed blurred teaser backdrop,
          content bottom-anchored like a movie poster
   Ref: "Dramatic dark + spotlight gold"
   ═══════════════════════════════════════════════════════════════════ */

function CinematicDark() {
  return (
    <div className='relative flex h-full flex-col items-center justify-end overflow-hidden pb-14'>
      {/* Full-bleed teaser as ambient backdrop */}
      <div className='absolute inset-0 flex items-center justify-center'>
        <div className='h-[75%] w-[55%] scale-110 opacity-40 blur-md'>
          <TeaserImage className='rounded-none' />
        </div>
        {/* OLED gradient overlays — deep black edges */}
        <div className='absolute inset-0 bg-gradient-to-t from-[#000000] via-[#000000]/85 to-[#000000]/30' />
        <div className='absolute inset-0 bg-gradient-to-b from-[#000000] via-transparent to-transparent' />
        {/* Subtle gold spotlight from top */}
        <div
          className='absolute inset-0 opacity-20'
          style={{
            background:
              'radial-gradient(ellipse at 50% 0%, rgba(202, 138, 4, 0.3), transparent 70%)',
          }}
        />
      </div>

      {/* Foreground — bottom-anchored poster layout */}
      <div className='relative z-10 flex flex-col items-center gap-7'>
        {/* Sharp teaser with gold border glow */}
        <div className='w-[240px] overflow-hidden rounded-xl border border-[#CA8A04]/20 shadow-[0_0_40px_rgba(202,138,4,0.08)]'>
          <TeaserImage />
        </div>

        {/* Title — cinema style */}
        <div className='text-center'>
          <div className='flex items-center justify-center gap-3'>
            <h2 className='text-4xl font-bold tracking-tight text-[#F8FAFC]'>
              Uncover
            </h2>
          </div>
          <p className='mt-2 text-sm tracking-wide text-zinc-500'>
            Puzzle #{STATS.puzzleNumber} · 4 guesses · daily
          </p>
        </div>

        {/* Gold CTA — spotlight accent */}
        <button className='group flex cursor-pointer items-center gap-3 rounded-full bg-[#CA8A04] px-10 py-4 text-base font-semibold text-[#0F0F23] shadow-[0_0_40px_rgba(202,138,4,0.15)] transition-all hover:bg-[#EAB308] hover:shadow-[0_0_60px_rgba(202,138,4,0.25)] focus:outline-none focus:ring-2 focus:ring-[#CA8A04]/50'>
          <Eye className='h-5 w-5 transition-transform group-hover:scale-110' />
          Reveal Today&apos;s Challenge
        </button>

        {/* Stats — minimal, high contrast on OLED black */}
        <div className='flex items-center gap-6 text-xs'>
          <span className='flex items-center gap-1.5 text-[#CA8A04]'>
            <Flame className='h-3.5 w-3.5' />
            {STATS.streak} streak
          </span>
          <span className='text-zinc-700'>·</span>
          <span className='text-zinc-400'>{STATS.winRate}% win rate</span>
          <span className='text-zinc-700'>·</span>
          <span className='text-zinc-400'>{STATS.played} played</span>
        </div>

        {/* Archive — subtle */}
        <Link
          href='/game/archive'
          className='flex cursor-pointer items-center gap-1.5 text-xs text-zinc-600 transition-colors hover:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-500/50'
        >
          <Clock className='h-3 w-3' />
          Browse past puzzles
        </Link>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   VARIANT D — Glass Card
   Palette: Deep indigo (#1E1B4B primary, #4338CA secondary, #22C55E CTA)
   Style: Glassmorphism — frosted card with backdrop-blur, layered depth
   Ref: "Translucent overlays, vibrant background, subtle borders"
   ═══════════════════════════════════════════════════════════════════ */

function GlassCard() {
  return (
    <div className='relative flex h-full items-center justify-center overflow-hidden'>
      {/* Ambient color blobs behind glass — indigo + green */}
      <div
        className='absolute inset-0'
        style={{
          background: `
            radial-gradient(ellipse at 30% 20%, rgba(67, 56, 202, 0.25), transparent 60%),
            radial-gradient(ellipse at 70% 80%, rgba(34, 197, 94, 0.15), transparent 60%),
            radial-gradient(ellipse at 50% 50%, rgba(30, 27, 75, 0.4), transparent 80%)
          `,
        }}
      />

      {/* Background depth cards — layered behind main */}
      <div className='absolute z-0 h-[500px] w-[460px] translate-x-5 translate-y-5 rotate-3 rounded-3xl border border-[#4338CA]/10 bg-[#1E1B4B]/20' />
      <div className='absolute z-0 h-[500px] w-[460px] -translate-x-2 translate-y-2 -rotate-1 rounded-3xl border border-[#4338CA]/15 bg-[#1E1B4B]/30' />

      {/* Main glass card */}
      <div className='relative z-10 flex h-[500px] w-[460px] flex-col items-center justify-between rounded-3xl border border-white/[0.08] bg-white/[0.04] p-8 shadow-2xl backdrop-blur-xl'>
        {/* Top — badge row */}
        <div className='flex w-full items-center justify-between'>
          <div className='flex items-center gap-2'>
            <Disc3 className='h-4 w-4 text-[#4338CA]' />
            <span className='text-xs font-semibold tracking-wider text-zinc-400'>
              DAILY CHALLENGE
            </span>
          </div>
          <div className='flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.04] px-2.5 py-1 backdrop-blur'>
            <Flame className='h-3 w-3 text-orange-500' />
            <span className='text-xs font-bold text-orange-400'>
              {STATS.streak}
            </span>
          </div>
        </div>

        {/* Center — art + title */}
        <div className='flex flex-col items-center gap-5'>
          <div className='relative w-[200px]'>
            {/* Glass border on image */}
            <div className='overflow-hidden rounded-xl border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.3)]'>
              <TeaserImage />
            </div>
            {/* Puzzle badge — green accent */}
            <div className='absolute -bottom-2.5 -right-2.5 flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.1] bg-[#22C55E] shadow-lg'>
              <span className='text-[11px] font-bold text-white'>
                #{STATS.puzzleNumber}
              </span>
            </div>
          </div>
          <div className='text-center'>
            <h2 className='text-2xl font-bold text-[#F8FAFC]'>Uncover</h2>
            <p className='mt-1.5 text-sm text-zinc-500'>
              Name the album from its blurred cover
            </p>
          </div>
        </div>

        {/* Bottom — CTA + stats */}
        <div className='flex w-full flex-col gap-4'>
          {/* Green CTA — music streaming accent */}
          <button className='flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#22C55E] py-3.5 text-sm font-semibold text-white transition-all hover:bg-[#16A34A] focus:outline-none focus:ring-2 focus:ring-green-500/50'>
            <Play className='h-4 w-4 fill-current' />
            Start Puzzle
          </button>

          {/* Glass stat dividers */}
          <div className='flex justify-center gap-8'>
            <div className='text-center'>
              <p className='text-lg font-bold text-[#F8FAFC]'>{STATS.played}</p>
              <p className='text-[10px] text-zinc-600'>Played</p>
            </div>
            <div className='h-8 w-px bg-white/[0.06]' />
            <div className='text-center'>
              <p className='text-lg font-bold text-[#F8FAFC]'>
                {STATS.winRate}%
              </p>
              <p className='text-[10px] text-zinc-600'>Win Rate</p>
            </div>
            <div className='h-8 w-px bg-white/[0.06]' />
            <div className='text-center'>
              <p className='text-lg font-bold text-orange-400'>
                {STATS.streak}
              </p>
              <p className='text-[10px] text-zinc-600'>Streak</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   VARIANT E — Smoke Reveal
   Background: WebGL smoke shader (emerald-tinted)
   Style: Floating album art over animated smoke, centered layout
   Ref: 21st.dev/community/components/easemize/spooky-smoke-animation
   ═══════════════════════════════════════════════════════════════════ */

/* ─── Slider config for the tweaker panel ───────────────────────── */

interface SliderDef {
  key: keyof SmokeParams;
  label: string;
  min: number;
  max: number;
  step: number;
  desc: string;
}

const SLIDERS: SliderDef[] = [
  {
    key: 'speed',
    label: 'Speed',
    min: 0,
    max: 0.06,
    step: 0.001,
    desc: 'How fast the smoke drifts',
  },
  {
    key: 'density',
    label: 'Density',
    min: 0.5,
    max: 8,
    step: 0.25,
    desc: 'Lower = large blobs, higher = tight wisps',
  },
  {
    key: 'chromatic',
    label: 'Chromatic',
    min: 0,
    max: 0.03,
    step: 0.001,
    desc: '0 = mono, higher = rainbow fringe',
  },
  {
    key: 'stretch',
    label: 'Stretch',
    min: 0.5,
    max: 4,
    step: 0.1,
    desc: 'Horizontal aspect of the noise',
  },
  {
    key: 'fadeIn',
    label: 'Fade In',
    min: 0.02,
    max: 1,
    step: 0.02,
    desc: 'Higher = faster fade from black',
  },
];

const COLOR_PRESETS = [
  { hex: '#10B981', label: 'Emerald' },
  { hex: '#6366F1', label: 'Indigo' },
  { hex: '#CA8A04', label: 'Gold' },
  { hex: '#EF4444', label: 'Red' },
  { hex: '#808080', label: 'Neutral' },
  { hex: '#1a1a2e', label: 'Dark' },
  { hex: '#EC4899', label: 'Pink' },
  { hex: '#06B6D4', label: 'Cyan' },
];

function SmokeTweaker({
  params,
  color,
  opacity,
  onParamChange,
  onColorChange,
  onOpacityChange,
  onReset,
}: {
  params: SmokeParams;
  color: string;
  opacity: number;
  onParamChange: (key: keyof SmokeParams, value: number) => void;
  onColorChange: (hex: string) => void;
  onOpacityChange: (v: number) => void;
  onReset: () => void;
}) {
  return (
    <div className='pointer-events-auto absolute right-4 top-4 z-50 max-h-[calc(100%-8rem)] w-72 overflow-y-auto rounded-2xl border border-zinc-700/80 bg-zinc-900/95 p-4 shadow-2xl backdrop-blur-xl'>
      <div className='mb-3 flex items-center justify-between'>
        <span className='text-xs font-semibold text-zinc-300'>
          Smoke Tweaker
        </span>
        <button
          onClick={onReset}
          className='cursor-pointer rounded-md bg-zinc-800 px-2 py-1 text-[10px] font-medium text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-200'
        >
          Reset
        </button>
      </div>

      {/* Color presets */}
      <div className='mb-4'>
        <label className='mb-1.5 block text-[10px] font-medium text-zinc-500'>
          Color
        </label>
        <div className='flex flex-wrap gap-1.5'>
          {COLOR_PRESETS.map(p => (
            <button
              key={p.hex}
              onClick={() => onColorChange(p.hex)}
              title={p.label}
              className={`h-7 w-7 cursor-pointer rounded-full border-2 transition-all ${
                color === p.hex
                  ? 'scale-110 border-white'
                  : 'border-zinc-700 hover:border-zinc-500'
              }`}
              style={{ backgroundColor: p.hex }}
            />
          ))}
        </div>
        <div className='mt-2 flex items-center gap-2'>
          <input
            type='color'
            value={color}
            onChange={e => onColorChange(e.target.value)}
            className='h-6 w-6 cursor-pointer rounded border-0 bg-transparent'
          />
          <span className='font-mono text-[10px] text-zinc-500'>{color}</span>
        </div>
      </div>

      {/* Opacity */}
      <div className='mb-3'>
        <div className='mb-1 flex items-center justify-between'>
          <label className='text-[10px] font-medium text-zinc-500'>
            Opacity
          </label>
          <span className='font-mono text-[10px] text-zinc-600'>
            {Math.round(opacity * 100)}%
          </span>
        </div>
        <input
          type='range'
          min={0}
          max={1}
          step={0.05}
          value={opacity}
          onChange={e => onOpacityChange(Number(e.target.value))}
          className='w-full accent-emerald-500'
        />
      </div>

      {/* Shader params */}
      {SLIDERS.map(s => (
        <div key={s.key} className='mb-3'>
          <div className='mb-1 flex items-center justify-between'>
            <label className='text-[10px] font-medium text-zinc-500'>
              {s.label}
            </label>
            <span className='font-mono text-[10px] text-zinc-600'>
              {params[s.key].toFixed(s.step < 0.01 ? 3 : s.step < 1 ? 2 : 1)}
            </span>
          </div>
          <input
            type='range'
            min={s.min}
            max={s.max}
            step={s.step}
            value={params[s.key]}
            onChange={e => onParamChange(s.key, Number(e.target.value))}
            className='w-full accent-emerald-500'
          />
          <p className='mt-0.5 text-[9px] text-zinc-700'>{s.desc}</p>
        </div>
      ))}
    </div>
  );
}

function SmokeReveal() {
  const [params, setParams] = useState<SmokeParams>({ ...SMOKE_DEFAULTS });
  const [color, setColor] = useState('#10B981');
  const [opacity, setOpacity] = useState(0.7);
  const [showTweaker, setShowTweaker] = useState(true);

  const handleParamChange = useCallback(
    (key: keyof SmokeParams, value: number) => {
      setParams(prev => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleReset = useCallback(() => {
    setParams({ ...SMOKE_DEFAULTS });
    setColor('#10B981');
    setOpacity(0.7);
  }, []);

  return (
    <div className='relative flex h-full flex-col items-center justify-center overflow-hidden'>
      {/* WebGL smoke backdrop */}
      <div
        className='pointer-events-none absolute inset-0 transition-opacity duration-300'
        style={{ opacity }}
      >
        <SmokeBackground
          smokeColor={color}
          speed={params.speed}
          density={params.density}
          chromatic={params.chromatic}
          stretch={params.stretch}
          fadeIn={params.fadeIn}
        />
      </div>

      {/* Vignette */}
      <div
        className='absolute inset-0 z-[1]'
        style={{
          background:
            'radial-gradient(ellipse at 50% 50%, transparent 30%, rgba(0,0,0,0.6) 100%)',
        }}
      />

      {/* Tweaker toggle */}
      <button
        onClick={() => setShowTweaker(prev => !prev)}
        className='absolute right-4 top-4 z-[60] cursor-pointer rounded-full bg-zinc-800/80 p-2.5 text-zinc-400 shadow-lg ring-1 ring-zinc-700 backdrop-blur transition-colors hover:bg-zinc-700 hover:text-white'
        title='Toggle smoke tweaker'
      >
        <Zap className='h-4 w-4' />
      </button>

      {/* Tweaker panel */}
      {showTweaker && (
        <SmokeTweaker
          params={params}
          color={color}
          opacity={opacity}
          onParamChange={handleParamChange}
          onColorChange={setColor}
          onOpacityChange={setOpacity}
          onReset={handleReset}
        />
      )}

      {/* Content */}
      <div className='relative z-10 flex flex-col items-center gap-7'>
        <div className='flex items-center gap-3 text-[11px] font-semibold tracking-[0.15em] text-zinc-400'>
          <span>PUZZLE #{STATS.puzzleNumber}</span>
          <span className='text-zinc-600'>·</span>
          <div className='flex items-center gap-1'>
            <Flame className='h-3 w-3 text-orange-400' />
            <span className='text-orange-400'>{STATS.streak} STREAK</span>
          </div>
        </div>

        <div className='relative w-[300px]'>
          <div className='overflow-hidden rounded-2xl border border-emerald-500/20 shadow-[0_0_80px_rgba(16,185,129,0.12)]'>
            <TeaserImage />
          </div>
          <div className='absolute inset-0 flex items-center justify-center'>
            <div className='flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-black/50 backdrop-blur-sm'>
              <Lock className='h-6 w-6 text-zinc-300' />
            </div>
          </div>
        </div>

        <div className='text-center'>
          <h2 className='text-3xl font-bold text-white drop-shadow-lg'>
            Uncover
          </h2>
          <p className='mt-1.5 text-sm text-zinc-400'>
            Guess the album from its cover art
          </p>
        </div>

        <button className='flex cursor-pointer items-center gap-2.5 rounded-full bg-white px-9 py-4 text-sm font-semibold text-zinc-900 shadow-[0_0_30px_rgba(255,255,255,0.1)] transition-all hover:shadow-[0_0_50px_rgba(16,185,129,0.2)] focus:outline-none focus:ring-2 focus:ring-white/50'>
          <Play className='h-4 w-4 fill-current' />
          Start Today&apos;s Puzzle
        </button>

        <div className='flex items-center gap-8 text-xs text-zinc-500'>
          <div className='text-center'>
            <p className='text-sm font-semibold text-white'>{STATS.played}</p>
            <p>played</p>
          </div>
          <div className='text-center'>
            <p className='text-sm font-semibold text-white'>{STATS.winRate}%</p>
            <p>win rate</p>
          </div>
          <div className='text-center'>
            <p className='text-sm font-semibold text-orange-400'>
              {STATS.streak}
            </p>
            <p>streak</p>
          </div>
        </div>

        <Link
          href='/game/archive'
          className='flex cursor-pointer items-center gap-1.5 text-xs text-zinc-500 transition-colors hover:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-500/50'
        >
          <Archive className='h-3 w-3' />
          Browse past puzzles
        </Link>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   VARIANT F — Smoke + Lights
   Background: Neutral dark smoke + LightRays layered underneath
   The smoke acts as moving fog that partially occludes the rays,
   creating a "concert stage lights through haze" effect.
   Uses mix-blend-mode to let the colors interact.
   ═══════════════════════════════════════════════════════════════════ */

function SmokeLights() {
  return (
    <div className='relative flex h-full flex-col items-center justify-center overflow-hidden'>
      {/* Layer 1 (bottom): Static color blobs — these are the "lights" */}
      <div
        className='absolute inset-0'
        style={{
          background: `
            radial-gradient(ellipse at 25% 30%, rgba(16, 185, 129, 0.4), transparent 50%),
            radial-gradient(ellipse at 75% 25%, rgba(99, 102, 241, 0.35), transparent 50%),
            radial-gradient(ellipse at 50% 75%, rgba(202, 138, 4, 0.25), transparent 50%),
            radial-gradient(ellipse at 15% 80%, rgba(239, 68, 68, 0.15), transparent 45%)
          `,
        }}
      />

      {/* Layer 2: Animated LightRays — emerald, indigo, gold beams */}
      <LightRays
        count={5}
        color='rgba(16, 185, 129, 0.5)'
        blur={30}
        speed={14}
        length='70vh'
      />
      <LightRays
        count={4}
        color='rgba(99, 102, 241, 0.4)'
        blur={35}
        speed={18}
        length='65vh'
      />
      <LightRays
        count={3}
        color='rgba(202, 138, 4, 0.3)'
        blur={40}
        speed={22}
        length='55vh'
      />

      {/* Layer 3: Smoke on top — neutral/dark, acts as fog over the lights */}
      <SmokeBackground
        smokeColor='#1a1a2e'
        className='z-[2] mix-blend-multiply opacity-80'
      />

      {/* Layer 4: Subtle vignette to frame content */}
      <div
        className='absolute inset-0 z-[3]'
        style={{
          background:
            'radial-gradient(ellipse at 50% 45%, transparent 35%, rgba(0,0,0,0.5) 100%)',
        }}
      />

      {/* Content — over everything */}
      <div className='relative z-10 flex flex-col items-center gap-7'>
        {/* Puzzle info */}
        <div className='flex items-center gap-3 text-[11px] font-semibold tracking-[0.15em] text-zinc-300/80'>
          <span>PUZZLE #{STATS.puzzleNumber}</span>
          <span className='text-zinc-600'>·</span>
          <div className='flex items-center gap-1'>
            <Flame className='h-3 w-3 text-orange-400' />
            <span className='text-orange-400'>{STATS.streak} STREAK</span>
          </div>
        </div>

        {/* Album art */}
        <div className='relative w-[300px]'>
          <div className='overflow-hidden rounded-2xl border border-white/10 shadow-[0_0_60px_rgba(0,0,0,0.4)]'>
            <TeaserImage />
          </div>
          <div className='absolute inset-0 flex items-center justify-center'>
            <div className='flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-black/40 backdrop-blur-sm'>
              <Lock className='h-6 w-6 text-zinc-300' />
            </div>
          </div>
        </div>

        {/* Title */}
        <div className='text-center'>
          <h2 className='text-3xl font-bold text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]'>
            Uncover
          </h2>
          <p className='mt-1.5 text-sm text-zinc-400'>
            Guess the album from its cover art
          </p>
        </div>

        {/* CTA */}
        <button className='flex cursor-pointer items-center gap-2.5 rounded-full bg-white/95 px-9 py-4 text-sm font-semibold text-zinc-900 shadow-[0_0_40px_rgba(255,255,255,0.08)] transition-all hover:bg-white hover:shadow-[0_0_60px_rgba(255,255,255,0.15)] focus:outline-none focus:ring-2 focus:ring-white/50'>
          <Play className='h-4 w-4 fill-current' />
          Start Today&apos;s Puzzle
        </button>

        {/* Stats */}
        <div className='flex items-center gap-8 text-xs text-zinc-500'>
          <div className='text-center'>
            <p className='text-sm font-semibold text-white'>{STATS.played}</p>
            <p>played</p>
          </div>
          <div className='text-center'>
            <p className='text-sm font-semibold text-white'>{STATS.winRate}%</p>
            <p>win rate</p>
          </div>
          <div className='text-center'>
            <p className='text-sm font-semibold text-orange-400'>
              {STATS.streak}
            </p>
            <p>streak</p>
          </div>
        </div>

        {/* Archive */}
        <Link
          href='/game/archive'
          className='flex cursor-pointer items-center gap-1.5 text-xs text-zinc-500 transition-colors hover:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-500/50'
        >
          <Archive className='h-3 w-3' />
          Browse past puzzles
        </Link>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Variant Switcher + Main Preview Shell
   ═══════════════════════════════════════════════════════════════════ */

const variantComponents: Record<VariantId, React.FC> = {
  'centered-hero': CenteredHero,
  'split-editorial': SplitEditorial,
  'cinematic-dark': CinematicDark,
  'glass-card': GlassCard,
  'smoke-reveal': SmokeReveal,
  'smoke-lights': SmokeLights,
};

export function HomePreview() {
  const [activeIdx, setActiveIdx] = useState(0);
  const active = VARIANTS[activeIdx];
  const ActiveComponent = variantComponents[active.id];

  const prev = () =>
    setActiveIdx(i => (i - 1 + VARIANTS.length) % VARIANTS.length);
  const next = () => setActiveIdx(i => (i + 1) % VARIANTS.length);

  return (
    <div className='relative h-full overflow-hidden'>
      {/* Render active variant */}
      <ActiveComponent />

      {/* Floating variant switcher — bottom center */}
      <div className='absolute bottom-6 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2'>
        {/* Style description */}
        <p className='text-[10px] tracking-wide text-zinc-600'>{active.desc}</p>

        {/* Pill switcher */}
        <div className='flex items-center gap-1 rounded-full border border-zinc-700/80 bg-zinc-900/95 px-2 py-1.5 shadow-2xl backdrop-blur-xl'>
          <button
            onClick={prev}
            aria-label='Previous variant'
            className='flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-zinc-500/50'
          >
            <ChevronLeft className='h-4 w-4' />
          </button>

          {VARIANTS.map((v, i) => (
            <button
              key={v.id}
              onClick={() => setActiveIdx(i)}
              className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition-all focus:outline-none focus:ring-2 focus:ring-zinc-500/50 ${
                i === activeIdx
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {v.label}
            </button>
          ))}

          <button
            onClick={next}
            aria-label='Next variant'
            className='flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-zinc-500/50'
          >
            <ChevronRight className='h-4 w-4' />
          </button>
        </div>

        {/* Counter */}
        <p className='text-[10px] font-medium tracking-widest text-zinc-700'>
          {activeIdx + 1} / {VARIANTS.length}
        </p>
      </div>
    </div>
  );
}
