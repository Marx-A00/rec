'use client';

import { useEffect, useRef } from 'react';

import { cn } from '@/lib/utils';

/**
 * WebGL smoke/fog animated background with tunable parameters.
 * Adapted from https://21st.dev/community/components/easemize/spooky-smoke-animation
 *
 * All shader parameters are exposed as uniforms so they can be changed
 * at runtime without recompiling the shader.
 */

/* ─── Shader sources ────────────────────────────────────────────── */

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
uniform float u_fadeIn;

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
 col.g-=fbm(uv*( 1.0+u_chromatic    )+vec2(0, T*u_speed)+n+u_chromatic);
 col.b-=fbm(uv*( 1.0+u_chromatic*2.0)+vec2(0, T*u_speed)+n+u_chromatic*2.0);

 col=mix(col, u_color, dot(col,vec3(.21,.71,.07)));

 col=mix(vec3(.08),col,min(time*u_fadeIn,1.));
 col=clamp(col,.08,1.);
 O=vec4(col,1);
}`;

const vertexShaderSource =
  '#version 300 es\nprecision highp float;\nin vec4 position;\nvoid main(){gl_Position=position;}';

const VERTICES = [-1, 1, -1, -1, 1, 1, 1, -1];

/* ─── Renderer class ────────────────────────────────────────────── */

interface Uniforms {
  resolution: WebGLUniformLocation | null;
  time: WebGLUniformLocation | null;
  u_color: WebGLUniformLocation | null;
  u_speed: WebGLUniformLocation | null;
  u_density: WebGLUniformLocation | null;
  u_chromatic: WebGLUniformLocation | null;
  u_stretch: WebGLUniformLocation | null;
  u_fadeIn: WebGLUniformLocation | null;
}

export interface SmokeParams {
  speed: number;
  density: number;
  chromatic: number;
  stretch: number;
  fadeIn: number;
}

const DEFAULT_PARAMS: SmokeParams = {
  speed: 0.015,
  density: 3.0,
  chromatic: 0.003,
  stretch: 2.0,
  fadeIn: 0.1,
};

class Renderer {
  private gl: WebGL2RenderingContext;
  private canvas: HTMLCanvasElement;
  private program: WebGLProgram | null = null;
  private uniforms: Uniforms | null = null;
  private color: [number, number, number] = [0.5, 0.5, 0.5];
  private params: SmokeParams = { ...DEFAULT_PARAMS };
  private vs: WebGLShader | null = null;
  private fs: WebGLShader | null = null;
  private buffer: WebGLBuffer | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl2');
    if (!gl) throw new Error('WebGL2 not supported');
    this.gl = gl;
    this.setup();
    this.init();
  }

  updateColor(newColor: [number, number, number]) {
    this.color = newColor;
  }

  updateParams(newParams: Partial<SmokeParams>) {
    Object.assign(this.params, newParams);
  }

  updateScale() {
    const dpr = Math.max(1, window.devicePixelRatio);
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  private compile(shader: WebGLShader, source: string) {
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
  }

  reset() {
    const { gl, program } = this;
    if (program) gl.deleteProgram(program);
    this.program = null;
  }

  private setup() {
    const { gl } = this;
    this.vs = gl.createShader(gl.VERTEX_SHADER);
    this.fs = gl.createShader(gl.FRAGMENT_SHADER);
    const program = gl.createProgram();
    if (!this.vs || !this.fs || !program) return;
    this.compile(this.vs, vertexShaderSource);
    this.compile(this.fs, fragmentShaderSource);
    this.program = program;
    gl.attachShader(program, this.vs);
    gl.attachShader(program, this.fs);
    gl.linkProgram(program);
  }

  private init() {
    const { gl, program } = this;
    if (!program) return;
    this.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(VERTICES), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    this.uniforms = {
      resolution: gl.getUniformLocation(program, 'resolution'),
      time: gl.getUniformLocation(program, 'time'),
      u_color: gl.getUniformLocation(program, 'u_color'),
      u_speed: gl.getUniformLocation(program, 'u_speed'),
      u_density: gl.getUniformLocation(program, 'u_density'),
      u_chromatic: gl.getUniformLocation(program, 'u_chromatic'),
      u_stretch: gl.getUniformLocation(program, 'u_stretch'),
      u_fadeIn: gl.getUniformLocation(program, 'u_fadeIn'),
    };
  }

  render(now = 0) {
    const { gl, program, buffer, canvas, uniforms, params } = this;
    if (!program || !gl.isProgram(program) || !uniforms) return;
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
    gl.uniform1f(uniforms.time, now * 1e-3);
    gl.uniform3fv(uniforms.u_color, this.color);
    gl.uniform1f(uniforms.u_speed, params.speed);
    gl.uniform1f(uniforms.u_density, params.density);
    gl.uniform1f(uniforms.u_chromatic, params.chromatic);
    gl.uniform1f(uniforms.u_stretch, params.stretch);
    gl.uniform1f(uniforms.u_fadeIn, params.fadeIn);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}

/* ─── Utilities ─────────────────────────────────────────────────── */

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

/* ─── Component ─────────────────────────────────────────────────── */

interface SmokeBackgroundProps {
  smokeColor?: string;
  speed?: number;
  density?: number;
  chromatic?: number;
  stretch?: number;
  fadeIn?: number;
  className?: string;
}

export { DEFAULT_PARAMS as SMOKE_DEFAULTS };

export function SmokeBackground({
  smokeColor = '#808080',
  speed,
  density,
  chromatic,
  stretch,
  fadeIn,
  className,
}: SmokeBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<Renderer | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;

    let renderer: Renderer;
    try {
      renderer = new Renderer(canvas);
    } catch {
      return;
    }
    rendererRef.current = renderer;

    const handleResize = () => renderer.updateScale();
    handleResize();
    window.addEventListener('resize', handleResize);

    let raf: number;
    const loop = (now: number) => {
      renderer.render(now);
      raf = requestAnimationFrame(loop);
    };
    loop(0);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(raf);
      renderer.reset();
    };
  }, []);

  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.updateColor(hexToRgb(smokeColor));
    }
  }, [smokeColor]);

  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.updateParams({
        ...(speed !== undefined && { speed }),
        ...(density !== undefined && { density }),
        ...(chromatic !== undefined && { chromatic }),
        ...(stretch !== undefined && { stretch }),
        ...(fadeIn !== undefined && { fadeIn }),
      });
    }
  }, [speed, density, chromatic, stretch, fadeIn]);

  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 overflow-hidden',
        className
      )}
    >
      <canvas ref={canvasRef} className='block h-full w-full' />
    </div>
  );
}
