// 导入需要的ogl模块
import { Renderer, Program, Mesh, Color, Triangle } from 'ogl';

const vertexShader = `
attribute vec2 uv;
attribute vec2 position;

varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position, 0, 1);
}
`;

const fragmentShader = `
precision highp float;

uniform float uTime;
uniform vec3 uResolution;
uniform vec2 uFocal;
uniform vec2 uRotation;
uniform float uStarSpeed;
uniform float uDensity;
uniform float uHueShift;
uniform float uSpeed;
uniform vec2 uMouse;
uniform float uGlowIntensity;
uniform float uSaturation;
uniform bool uMouseRepulsion;
uniform float uTwinkleIntensity;
uniform float uRotationSpeed;
uniform float uRepulsionStrength;
uniform float uMouseActiveFactor;
uniform float uAutoCenterRepulsion;
uniform bool uTransparent;

varying vec2 vUv;

#define NUM_LAYER 4.0
#define STAR_COLOR_CUTOFF 0.2
#define MAT45 mat2(0.7071, -0.7071, 0.7071, 0.7071)
#define PERIOD 3.0

float Hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float tri(float x) {
  return abs(fract(x) * 2.0 - 1.0);
}

float tris(float x) {
  float t = fract(x);
  return 1.0 - smoothstep(0.0, 1.0, abs(2.0 * t - 1.0));
}

float trisn(float x) {
  float t = fract(x);
  return 2.0 * (1.0 - smoothstep(0.0, 1.0, abs(2.0 * t - 1.0))) - 1.0;
}

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

float Star(vec2 uv, float flare) {
  float d = length(uv);
  float m = (0.05 * uGlowIntensity) / d;
  float rays = smoothstep(0.0, 1.0, 1.0 - abs(uv.x * uv.y * 1000.0));
  m += rays * flare * uGlowIntensity;
  uv *= MAT45;
  rays = smoothstep(0.0, 1.0, 1.0 - abs(uv.x * uv.y * 1000.0));
  m += rays * 0.3 * flare * uGlowIntensity;
  m *= smoothstep(1.0, 0.2, d);
  return m;
}

vec3 StarLayer(vec2 uv) {
  vec3 col = vec3(0.0);

  vec2 gv = fract(uv) - 0.5; 
  vec2 id = floor(uv);

  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 offset = vec2(float(x), float(y));
      vec2 si = id + vec2(float(x), float(y));
      float seed = Hash21(si);
      float size = fract(seed * 345.32);
      float glossLocal = tri(uStarSpeed / (PERIOD * seed + 1.0));
      float flareSize = smoothstep(0.9, 1.0, size) * glossLocal;

      float red = smoothstep(STAR_COLOR_CUTOFF, 1.0, Hash21(si + 1.0)) + STAR_COLOR_CUTOFF;
      float blu = smoothstep(STAR_COLOR_CUTOFF, 1.0, Hash21(si + 3.0)) + STAR_COLOR_CUTOFF;
      float grn = min(red, blu) * seed;
      vec3 base = vec3(red, grn, blu);
      
      float hue = atan(base.g - base.r, base.b - base.r) / (2.0 * 3.14159) + 0.5;
      hue = fract(hue + uHueShift / 360.0);
      float sat = length(base - vec3(dot(base, vec3(0.299, 0.587, 0.114)))) * uSaturation;
      float val = max(max(base.r, base.g), base.b);
      base = hsv2rgb(vec3(hue, sat, val));

      vec2 pad = vec2(tris(seed * 34.0 + uTime * uSpeed / 10.0), tris(seed * 38.0 + uTime * uSpeed / 30.0)) - 0.5;

      float star = Star(gv - offset - pad, flareSize);
      vec3 color = base;

      float twinkle = trisn(uTime * uSpeed + seed * 6.2831) * 0.5 + 1.0;
      twinkle = mix(1.0, twinkle, uTwinkleIntensity);
      star *= twinkle;
      
      col += star * size * color;
    }
  }

  return col;
}

void main() {
  vec2 focalPx = uFocal * uResolution.xy;
  vec2 uv = (vUv * uResolution.xy - focalPx) / uResolution.y;

  vec2 mouseNorm = uMouse - vec2(0.5);
  
  if (uAutoCenterRepulsion > 0.0) {
    vec2 centerUV = vec2(0.0, 0.0); // Center in UV space
    float centerDist = length(uv - centerUV);
    vec2 repulsion = normalize(uv - centerUV) * (uAutoCenterRepulsion / (centerDist + 0.1));
    uv += repulsion * 0.05;
  } else if (uMouseRepulsion) {
    vec2 mousePosUV = (uMouse * uResolution.xy - focalPx) / uResolution.y;
    float mouseDist = length(uv - mousePosUV);
    vec2 repulsion = normalize(uv - mousePosUV) * (uRepulsionStrength / (mouseDist + 0.1));
    uv += repulsion * 0.05 * uMouseActiveFactor;
  } else {
    vec2 mouseOffset = mouseNorm * 0.1 * uMouseActiveFactor;
    uv += mouseOffset;
  }

  float autoRotAngle = uTime * uRotationSpeed;
  mat2 autoRot = mat2(cos(autoRotAngle), -sin(autoRotAngle), sin(autoRotAngle), cos(autoRotAngle));
  uv = autoRot * uv;

  uv = mat2(uRotation.x, -uRotation.y, uRotation.y, uRotation.x) * uv;

  vec3 col = vec3(0.0);

  for (float i = 0.0; i < 1.0; i += 1.0 / NUM_LAYER) {
    float depth = fract(i + uStarSpeed * uSpeed);
    float scale = mix(20.0 * uDensity, 0.5 * uDensity, depth);
    float fade = depth * smoothstep(1.0, 0.9, depth);
    col += StarLayer(uv * scale + i * 453.32) * fade;
  }

  if (uTransparent) {
    float alpha = length(col);
    alpha = smoothstep(0.0, 0.3, alpha); // Enhance contrast
    alpha = min(alpha, 1.0); // Clamp to maximum 1.0
    gl_FragColor = vec4(col, alpha);
  } else {
    gl_FragColor = vec4(col, 1.0);
  }
}
`;

class Galaxy {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      focal: [0.5, 0.5],
      rotation: [1.0, 0.0],
      starSpeed: 0.5,
      density: 1,
      hueShift: 140,
      disableAnimation: false,
      speed: 1.0,
      mouseInteraction: true,
      glowIntensity: 0.3,
      saturation: 0.0,
      mouseRepulsion: true,
      repulsionStrength: 2,
      twinkleIntensity: 0.3,
      rotationSpeed: 0.1,
      autoCenterRepulsion: 0,
      transparent: true,
      ...options
    };

    this.targetMousePos = { x: 0.5, y: 0.5 };
    this.smoothMousePos = { x: 0.5, y: 0.5 };
    this.targetMouseActive = 0.0;
    this.smoothMouseActive = 0.0;

    this.init();
  }

  init() {
    const renderer = new Renderer({
      alpha: this.options.transparent,
      premultipliedAlpha: false,
    });
    
    this.renderer = renderer;
    this.gl = renderer.gl;

    if (this.options.transparent) {
      this.gl.enable(this.gl.BLEND);
      this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
      this.gl.clearColor(0, 0, 0, 0);
    } else {
      this.gl.clearColor(0, 0, 0, 1);
    }

    this.resize = this.resize.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseLeave = this.handleMouseLeave.bind(this);

    window.addEventListener("resize", this.resize, false);
    this.resize();

    const geometry = new Triangle(this.gl);
    this.program = new Program(this.gl, {
      vertex: vertexShader,
      fragment: fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uResolution: {
          value: new Color(
            this.gl.canvas.width,
            this.gl.canvas.height,
            this.gl.canvas.width / this.gl.canvas.height
          ),
        },
        uFocal: { value: new Float32Array(this.options.focal) },
        uRotation: { value: new Float32Array(this.options.rotation) },
        uStarSpeed: { value: this.options.starSpeed },
        uDensity: { value: this.options.density },
        uHueShift: { value: this.options.hueShift },
        uSpeed: { value: this.options.speed },
        uMouse: {
          value: new Float32Array([
            this.smoothMousePos.x,
            this.smoothMousePos.y,
          ]),
        },
        uGlowIntensity: { value: this.options.glowIntensity },
        uSaturation: { value: this.options.saturation },
        uMouseRepulsion: { value: this.options.mouseRepulsion },
        uTwinkleIntensity: { value: this.options.twinkleIntensity },
        uRotationSpeed: { value: this.options.rotationSpeed },
        uRepulsionStrength: { value: this.options.repulsionStrength },
        uMouseActiveFactor: { value: 0.0 },
        uAutoCenterRepulsion: { value: this.options.autoCenterRepulsion },
        uTransparent: { value: this.options.transparent },
      },
    });

    this.mesh = new Mesh(this.gl, { geometry, program: this.program });
    this.container.appendChild(this.gl.canvas);

    if (this.options.mouseInteraction) {
      this.container.addEventListener("mousemove", this.handleMouseMove);
      this.container.addEventListener("mouseleave", this.handleMouseLeave);
    }

    this.update();
  }

  resize() {
    const scale = 1;
    this.renderer.setSize(this.container.offsetWidth * scale, this.container.offsetHeight * scale);
    if (this.program) {
      this.program.uniforms.uResolution.value = new Color(
        this.gl.canvas.width,
        this.gl.canvas.height,
        this.gl.canvas.width / this.gl.canvas.height
      );
    }
  }

  handleMouseMove(e) {
    const rect = this.container.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = 1.0 - (e.clientY - rect.top) / rect.height;
    this.targetMousePos = { x, y };
    this.targetMouseActive = 1.0;
  }

  handleMouseLeave() {
    this.targetMouseActive = 0.0;
  }

  update() {
    this.animateId = requestAnimationFrame((t) => this.update(t));
    
    const t = performance.now();
    
    if (!this.options.disableAnimation) {
      this.program.uniforms.uTime.value = t * 0.001;
      this.program.uniforms.uStarSpeed.value = (t * 0.001 * this.options.starSpeed) / 10.0;
    }

    const lerpFactor = 0.05;
    this.smoothMousePos.x += (this.targetMousePos.x - this.smoothMousePos.x) * lerpFactor;
    this.smoothMousePos.y += (this.targetMousePos.y - this.smoothMousePos.y) * lerpFactor;

    this.smoothMouseActive += (this.targetMouseActive - this.smoothMouseActive) * lerpFactor;

    this.program.uniforms.uMouse.value[0] = this.smoothMousePos.x;
    this.program.uniforms.uMouse.value[1] = this.smoothMousePos.y;
    this.program.uniforms.uMouseActiveFactor.value = this.smoothMouseActive;

    this.renderer.render({ scene: this.mesh });
  }

  destroy() {
    if (this.animateId) {
      cancelAnimationFrame(this.animateId);
    }
    window.removeEventListener("resize", this.resize);
    if (this.options.mouseInteraction) {
      this.container.removeEventListener("mousemove", this.handleMouseMove);
      this.container.removeEventListener("mouseleave", this.handleMouseLeave);
    }
    if (this.container.contains(this.gl.canvas)) {
      this.container.removeChild(this.gl.canvas);
    }
    this.gl.getExtension("WEBGL_lose_context")?.loseContext();
  }
}

// 导出Galaxy类供使用
window.Galaxy = Galaxy;