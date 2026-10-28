import {
  CanvasTexture, Color, DirectionalLight, Group, HemisphereLight, Mesh, MeshBasicMaterial,
  OrthographicCamera, PlaneGeometry, Scene, SRGBColorSpace, WebGLRenderer,
} from 'three';
import { createInflatable } from './model';
import { createLanding, stepLanding } from '../../scripts/motion/landing';

export interface SceneController {
  pause(): void;
  resume(): void;
  dispose(): void;
}

interface SceneOptions {
  entrance: boolean;
  onState: (state: 'ready' | 'lost' | 'restored') => void;
  onMetrics: (metrics: { triangles: number; drawCalls: number; pixelRatio: number }) => void;
}

export function createScene(canvas: HTMLCanvasElement, options: SceneOptions): SceneController {
  const stage = canvas.parentElement;
  if (!stage) throw new Error('Containerul scenei lipsește.');
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = SRGBColorSpace;
  const scene = new Scene();
  const camera = new OrthographicCamera(-4, 4, 4, -4, .1, 50);
  camera.position.set(7.5, 6, 9.5);
  camera.lookAt(0, 1.85, 0);
  scene.add(new HemisphereLight(new Color('#ffffff'), new Color('#9fc7e5'), 2.5));
  const sun = new DirectionalLight('#fff8e9', 3.8);
  sun.position.set(-4, 8, 6);
  scene.add(sun);
  const fill = new DirectionalLight('#b7e0ff', 1.2);
  fill.position.set(5, 3, -5);
  scene.add(fill);
  const model = createInflatable();
  const pivot = new Group();
  pivot.add(model.group);
  scene.add(pivot);
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 128;
  shadowCanvas.height = 128;
  const context = shadowCanvas.getContext('2d');
  if (!context) {
    model.dispose();
    renderer.dispose();
    throw new Error('Nu se poate crea posterul de umbră al scenei.');
  }
  const gradient = context.createRadialGradient(64, 64, 12, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(18,49,75,0.28)');
  gradient.addColorStop(.6, 'rgba(18,49,75,0.12)');
  gradient.addColorStop(1, 'rgba(18,49,75,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  const shadowTexture = new CanvasTexture(shadowCanvas);
  const shadowGeometry = new PlaneGeometry(7.5, 6.8);
  const shadowMaterial = new MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false });
  const shadow = new Mesh(shadowGeometry, shadowMaterial);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -.03;
  scene.add(shadow);
  let landing = createLanding(options.entrance);
  let frame = 0;
  let lastTime = 0;
  let paused = false;
  let disposed = false;
  let lost = false;
  let firstFrame = true;
  let targetYaw = 0;
  let resizePending = false;
  const abort = new AbortController();
  const draw = (time: number) => {
    frame = 0;
    if (paused || disposed || lost) return;
    const dt = lastTime ? Math.min((time - lastTime) / 1000, 1 / 30) : 1 / 60;
    lastTime = time;
    landing = stepLanding(landing, dt);
    model.group.position.y = landing.height;
    const spread = 1 / Math.sqrt(landing.compression);
    model.group.scale.set(spread, landing.compression, spread);
    pivot.rotation.y += (targetYaw - pivot.rotation.y) * (1 - Math.exp(-10 * dt));
    shadowMaterial.opacity = Math.max(.3, 1 - landing.height * .18);
    shadow.scale.setScalar(1 + landing.height * .07);
    renderer.render(scene, camera);
    if (firstFrame) {
      firstFrame = false;
      options.onState('ready');
    }
    options.onMetrics({ triangles: renderer.info.render.triangles, drawCalls: renderer.info.render.calls, pixelRatio: renderer.getPixelRatio() });
    if (!landing.settled || Math.abs(targetYaw - pivot.rotation.y) > .0005) requestDraw();
    else canvas.dataset.settled = 'true';
  };
  function requestDraw() {
    if (!frame && !paused && !disposed && !lost) frame = requestAnimationFrame(draw);
  }
  const resize = () => {
    if (paused) { resizePending = true; return; }
    const { width, height } = stage.getBoundingClientRect();
    if (!width || !height || disposed) return;
    const vertical = 6.8;
    const horizontal = vertical * width / height;
    camera.left = -horizontal / 2;
    camera.right = horizontal / 2;
    camera.top = vertical / 2;
    camera.bottom = -vertical / 2;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    resizePending = false;
    requestDraw();
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(stage);
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  stage.addEventListener('pointermove', (event) => {
    if (!finePointer.matches || !landing.settled) return;
    const bounds = stage.getBoundingClientRect();
    targetYaw = ((event.clientX - bounds.left) / bounds.width - .5) * .28;
    requestDraw();
  }, { signal: abort.signal });
  stage.addEventListener('pointerleave', () => { targetYaw = 0; requestDraw(); }, { signal: abort.signal });
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    if (disposed) return;
    lost = true;
    cancelAnimationFrame(frame);
    frame = 0;
    console.warn('Contextul WebGL s-a pierdut; este afișat posterul static.');
    options.onState('lost');
  }, { signal: abort.signal });
  canvas.addEventListener('webglcontextrestored', () => {
    if (disposed) return;
    lost = false;
    landing = createLanding(false);
    lastTime = 0;
    options.onState('restored');
    requestDraw();
  }, { signal: abort.signal });
  resize();
  return {
    pause() {
      paused = true;
      cancelAnimationFrame(frame);
      frame = 0;
      lastTime = 0;
    },
    resume() {
      if (disposed || lost) return;
      paused = false;
      lastTime = 0;
      if (resizePending) resize();
      requestDraw();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      abort.abort();
      model.dispose();
      shadowGeometry.dispose();
      shadowMaterial.dispose();
      shadowTexture.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      scene.clear();
    },
  };
}
