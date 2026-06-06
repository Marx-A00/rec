'use client';

import { useEffect, useRef, type ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

/* ─── Shader sources (same smoke shader, tuned for small surfaces) ─── */

const vertexShaderSource =
  '#version 300 es\nprecision highp float;\nin vec4 position;\nvoid main(){gl_Position=position;}';

const fragmentShaderSource = `#version 300 es
precision highp float;
out vec4 O;
uniform float time;
uniform vec2 resolution;
uniform vec3 u_color;
uniform float u_speed;
uniform float u_density;
uniform float u_chromatic;
uniform float u_stretch;

#define FC gl_FragCoord.xy
#define R resolution
#define T (time+660.)

float rnd(vec2 p){p=fract(p*vec2(12.9898,78.233));p+=dot(p,p+34.56);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);return mix(mix(rnd(i),rnd(i+vec2(1,0)),u.x),mix(rnd(i+vec2(0,1)),rnd(i+1.),u.x),u.y);}
float fbm(vec2 p){float t=.0,a=1.;for(int i=0;i<5;i++){t+=a*noise(p);p*=mat2(1,-1.2,.2,1.2)*2.;a*=.5;}return t;}

void main(){
 vec2 uv=(FC-.5*R)/R.y;
 vec3 col=vec3(1);
 uv.x+=.25;
 uv*=vec2(u_stretch, 1.0);

 float n=fbm(uv*.28-vec2(T*u_speed*0.67, 0.0));
 n=noise(uv*u_density+n*2.);

 col.r-=fbm(uv+vec2(0, T*u_speed)+n);
 col.g-=fbm(uv*(1.0+u_chromatic)+vec2(0, T*u_speed)+n+u_chromatic);
 col.b-=fbm(uv*(1.0+u_chromatic*2.0)+vec2(0, T*u_speed)+n+u_chromatic*2.0);

 col=mix(col, u_color, dot(col,vec3(.21,.71,.07)));
 col=clamp(col,.08,1.);
 O=vec4(col,1);
}`;

const VERTICES = [-1, 1, -1, -1, 1, 1, 1, -1];

/* ─── Style presets ─────────────────────────────────────────────── */

export type SmokeButtonStyle =
  | 'ember'
  | 'frost'
  | 'void'
  | 'neon'
  | 'glass'
  | 'inferno';

interface StylePreset {
  label: string;
  color: string;
  speed: number;
  density: number;
  chromatic: number;
  stretch: number;
  /** Opacity of the smoke canvas layer (0-1) */
  smokeOpacity: number;
  /** Glass overlay: backdrop-blur + semi-transparent fill on top of smoke */
  glassOverlay: boolean;
  /** Border style */
  borderClass: string;
  /** Text color */
  textClass: string;
  /** Hover glow color (tailwind shadow class) */
  glowClass: string;
}

export const SMOKE_BUTTON_STYLES: Record<SmokeButtonStyle, StylePreset> = {
  ember: {
    label: 'Ember',
    color: '#10b981',
    speed: 0.06,
    density: 3.5,
    chromatic: 0.005,
    stretch: 1.5,
    smokeOpacity: 0.7,
    glassOverlay: true,
    borderClass: 'border border-emerald-500/30',
    textClass: 'text-white',
    glowClass: 'hover:shadow-[0_0_20px_rgba(16,185,129,0.3)]',
  },
  frost: {
    label: 'Frost',
    color: '#3b82f6',
    speed: 0.04,
    density: 2.5,
    chromatic: 0.008,
    stretch: 1.5,
    smokeOpacity: 0.5,
    glassOverlay: true,
    borderClass: 'border border-blue-400/30',
    textClass: 'text-white',
    glowClass: 'hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]',
  },
  void: {
    label: 'Void',
    color: '#8b5cf6',
    speed: 0.035,
    density: 4.0,
    chromatic: 0.01,
    stretch: 1.2,
    smokeOpacity: 0.8,
    glassOverlay: false,
    borderClass: 'border border-violet-500/40',
    textClass: 'text-white',
    glowClass: 'hover:shadow-[0_0_24px_rgba(139,92,246,0.35)]',
  },
  neon: {
    label: 'Neon',
    color: '#22d3ee',
    speed: 0.07,
    density: 3.0,
    chromatic: 0.015,
    stretch: 1.3,
    smokeOpacity: 0.6,
    glassOverlay: true,
    borderClass: 'border border-cyan-400/50',
    textClass: 'text-white',
    glowClass: 'hover:shadow-[0_0_24px_rgba(34,211,238,0.4)]',
  },
  glass: {
    label: 'Glass',
    color: '#6b7280',
    speed: 0.045,
    density: 2.0,
    chromatic: 0.003,
    stretch: 1.5,
    smokeOpacity: 0.35,
    glassOverlay: true,
    borderClass: 'border border-white/20',
    textClass: 'text-white',
    glowClass: 'hover:shadow-[0_0_16px_rgba(255,255,255,0.1)]',
  },
  inferno: {
    label: 'Inferno',
    color: '#ef4444',
    speed: 0.08,
    density: 4.0,
    chromatic: 0.012,
    stretch: 1.2,
    smokeOpacity: 0.85,
    glassOverlay: false,
    borderClass: 'border border-red-500/40',
    textClass: 'text-white',
    glowClass: 'hover:shadow-[0_0_24px_rgba(239,68,68,0.35)]',
  },
};

/* ─── Mini WebGL renderer for button-sized canvases ──────────────── */

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        parseInt(result[1], 16) / 255,
        parseInt(result[2], 16) / 255,
        parseInt(result[3], 16) / 255,
      ]
    : [0.5, 0.5, 0.5];
}

function createRenderer(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext('webgl2', { alpha: true });
  if (!gl) return null;

  const vs = gl.createShader(gl.VERTEX_SHADER)!;
  gl.shaderSource(vs, vertexShaderSource);
  gl.compileShader(vs);

  const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
  gl.shaderSource(fs, fragmentShaderSource);
  gl.compileShader(fs);

  const program = gl.createProgram()!;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(VERTICES), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const uniforms = {
    resolution: gl.getUniformLocation(program, 'resolution'),
    time: gl.getUniformLocation(program, 'time'),
    u_color: gl.getUniformLocation(program, 'u_color'),
    u_speed: gl.getUniformLocation(program, 'u_speed'),
    u_density: gl.getUniformLocation(program, 'u_density'),
    u_chromatic: gl.getUniformLocation(program, 'u_chromatic'),
    u_stretch: gl.getUniformLocation(program, 'u_stretch'),
  };

  return {
    render(
      now: number,
      color: [number, number, number],
      speed: number,
      density: number,
      chromatic: number,
      stretch: number
    ) {
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
      gl.uniform1f(uniforms.time, now * 1e-3);
      gl.uniform3fv(uniforms.u_color, color);
      gl.uniform1f(uniforms.u_speed, speed);
      gl.uniform1f(uniforms.u_density, density);
      gl.uniform1f(uniforms.u_chromatic, chromatic);
      gl.uniform1f(uniforms.u_stretch, stretch);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
    resize() {
      const dpr = Math.max(1, window.devicePixelRatio);
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
    },
    destroy() {
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buffer);
    },
  };
}

/* ─── Component ─────────────────────────────────────────────────── */

interface SmokeButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'style'> {
  variant?: SmokeButtonStyle;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASSES = {
  sm: 'h-10 px-5 text-sm rounded-lg',
  md: 'h-12 px-7 text-base rounded-xl',
  lg: 'h-14 px-10 text-lg rounded-2xl',
};

export function SmokeButton({
  variant = 'ember',
  size = 'md',
  className,
  children,
  ...props
}: SmokeButtonProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const preset = SMOKE_BUTTON_STYLES[variant];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = createRenderer(canvas);
    if (!renderer) return;

    renderer.resize();

    const color = hexToRgb(preset.color);
    let raf: number;

    const loop = (now: number) => {
      renderer.render(
        now,
        color,
        preset.speed,
        preset.density,
        preset.chromatic,
        preset.stretch
      );
      raf = requestAnimationFrame(loop);
    };
    loop(0);

    const handleResize = () => renderer.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', handleResize);
      renderer.destroy();
    };
  }, [preset]);

  return (
    <button
      className={cn(
        'relative overflow-hidden font-semibold',
        'transition-all duration-200',
        'active:scale-[0.97]',
        SIZE_CLASSES[size],
        preset.borderClass,
        preset.textClass,
        preset.glowClass,
        className
      )}
      {...props}
    >
      {/* Smoke canvas layer */}
      <canvas
        ref={canvasRef}
        className='pointer-events-none absolute inset-0 h-full w-full'
        style={{ opacity: preset.smokeOpacity }}
      />

      {/* Glass overlay (optional frosted layer on top of smoke) */}
      {preset.glassOverlay && (
        <div className='pointer-events-none absolute inset-0 bg-black/30 backdrop-blur-[2px]' />
      )}

      {/* Button content */}
      <span className='relative z-10 flex items-center justify-center gap-2'>
        {children}
      </span>
    </button>
  );
}
