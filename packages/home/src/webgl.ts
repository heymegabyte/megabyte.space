// WebGL hero field: a cyan→violet particle wave lattice that answers scroll
// (camera glide + palette shift) and pointer (local swell). Degrades to the
// static CSS gradient when prefers-reduced-motion or WebGL is unavailable.
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Clock,
  Color,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  WebGLRenderer,
} from "three";

const VERT = /* glsl */ `
  uniform float uTime;
  uniform float uScroll;
  uniform vec2 uPointer;
  attribute float aSeed;
  varying float vGlow;

  void main() {
    vec3 p = position;
    float t = uTime * 0.6;

    float wave =
      sin(p.x * 0.55 + t) * 0.45 +
      sin(p.y * 0.38 - t * 1.2) * 0.35 +
      sin((p.x + p.y) * 0.22 + t * 0.7) * 0.5;

    float d = distance(p.xy * 0.06, uPointer);
    float swell = exp(-d * d * 6.0) * 1.6;

    p.z += wave * (1.0 + uScroll * 1.5) + swell;

    vGlow = smoothstep(-0.8, 1.6, p.z) + swell * 0.6 + aSeed * 0.15;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = (1.6 + vGlow * 2.4) * (140.0 / -mv.z);
  }
`;

const FRAG = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform float uScroll;
  varying float vGlow;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float r = length(uv);
    if (r > 0.5) discard;
    float soft = smoothstep(0.5, 0.05, r);
    vec3 color = mix(uColorA, uColorB, clamp(vGlow * 0.45 + uScroll * 0.6, 0.0, 1.0));
    gl_FragColor = vec4(color, soft * (0.35 + vGlow * 0.4));
  }
`;

export function mountHeroField(canvas: HTMLCanvasElement): () => void {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) return () => {};

  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: "low-power" });
  } catch {
    return () => {};
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

  const scene = new Scene();
  const camera = new PerspectiveCamera(55, 1, 0.1, 120);
  camera.position.set(0, -10, 16);
  camera.lookAt(0, 2, 0);

  const COLS = 130;
  const ROWS = 74;
  const SPACING = 0.62;
  const count = COLS * ROWS;
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  let i = 0;
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      positions[i * 3] = (x - COLS / 2) * SPACING;
      positions[i * 3 + 1] = (y - ROWS / 2) * SPACING;
      positions[i * 3 + 2] = 0;
      seeds[i] = Math.random();
      i++;
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setAttribute("aSeed", new BufferAttribute(seeds, 1));

  const material = new ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uScroll: { value: 0 },
      uPointer: { value: { x: 10, y: 10 } },
      uColorA: { value: new Color("#00e5ff") },
      uColorB: { value: new Color("#7c3aed") },
    },
  });

  const points = new Points(geometry, material);
  points.rotation.x = -0.9;
  scene.add(points);

  const clock = new Clock();
  let raf = 0;
  let pointerX = 10;
  let pointerY = 10;
  let scrollN = 0;

  const resize = () => {
    const { clientWidth, clientHeight } = canvas;
    if (clientWidth === 0 || clientHeight === 0) return;
    renderer.setSize(clientWidth, clientHeight, false);
    camera.aspect = clientWidth / clientHeight;
    camera.updateProjectionMatrix();
  };

  const onPointer = (event: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    pointerX = ((event.clientX - rect.left) / rect.width - 0.5) * 5;
    pointerY = -((event.clientY - rect.top) / rect.height - 0.5) * 3.2;
  };

  const onScroll = () => {
    scrollN = Math.min(window.scrollY / (window.innerHeight * 1.2), 1);
  };

  const tick = () => {
    material.uniforms.uTime.value = clock.getElapsedTime();
    material.uniforms.uScroll.value += (scrollN - material.uniforms.uScroll.value) * 0.06;
    const p = material.uniforms.uPointer.value as { x: number; y: number };
    p.x += (pointerX - p.x) * 0.05;
    p.y += (pointerY - p.y) * 0.05;
    camera.position.z = 16 - material.uniforms.uScroll.value * 4.5;
    camera.position.y = -10 + material.uniforms.uScroll.value * 3;
    raf = requestAnimationFrame(tick);
  };

  const onVisibility = () => {
    cancelAnimationFrame(raf);
    if (!document.hidden) raf = requestAnimationFrame(tick);
  };

  const render = () => {
    renderer.render(scene, camera);
    requestAnimationFrame(render);
  };

  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  window.addEventListener("pointermove", onPointer, { passive: true });
  window.addEventListener("scroll", onScroll, { passive: true });
  document.addEventListener("visibilitychange", onVisibility);
  raf = requestAnimationFrame(tick);

  let renderRaf = 0;
  const renderLoop = () => {
    renderer.render(scene, camera);
    renderRaf = requestAnimationFrame(renderLoop);
  };
  renderRaf = requestAnimationFrame(renderLoop);
  void render;

  return () => {
    cancelAnimationFrame(raf);
    cancelAnimationFrame(renderRaf);
    ro.disconnect();
    window.removeEventListener("pointermove", onPointer);
    window.removeEventListener("scroll", onScroll);
    document.removeEventListener("visibilitychange", onVisibility);
    geometry.dispose();
    material.dispose();
    renderer.dispose();
  };
}
