import {
  CanvasTexture, Color, DirectionalLight, HemisphereLight, Mesh, MeshBasicMaterial,
  OrthographicCamera, PlaneGeometry, Scene, SRGBColorSpace, WebGLRenderer,
} from 'three';
import { createInflatable } from './model';
import { createLanding, stepLanding } from '../../scripts/motion/landing';
import type { SceneController, SceneMetrics, SceneSize } from './scene-protocol';

interface SceneOptions {
  entrance: boolean;
  size: SceneSize;
  onState(state: 'ready' | 'lost' | 'restored'): void;
  onMetrics(metrics: SceneMetrics): void;
  onSettled(): void;
  onError(error: unknown): void;
}

export async function createScene(canvas: OffscreenCanvas, options: SceneOptions): Promise<SceneController> {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
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
  scene.add(model.group);
  const shadowCanvas = new OffscreenCanvas(128, 128);
  const context = shadowCanvas.getContext('2d');
  if (!context) {
    model.dispose();
    renderer.dispose();
    throw new Error('Nu se poate crea umbra procedurală a scenei.');
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
  let paused = true;
  let disposed = false;
  let lost = false;
  let ready = false;
  let announcedSettled = false;
  let restoring = false;
  let renderCount = 0;
  let pendingSize = options.size;
  let appliedSize: SceneSize | undefined;
  const abort = new AbortController();
  const applySize = () => {
    if (appliedSize?.width === pendingSize.width && appliedSize.height === pendingSize.height && appliedSize.pixelRatio === pendingSize.pixelRatio) return;
    const vertical = 6.8;
    const horizontal = vertical * pendingSize.width / pendingSize.height;
    camera.left = -horizontal / 2;
    camera.right = horizontal / 2;
    camera.top = vertical / 2;
    camera.bottom = -vertical / 2;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(pendingSize.pixelRatio, 1.5));
    renderer.setSize(pendingSize.width, pendingSize.height, false);
    appliedSize = { ...pendingSize };
  };
  const draw = (time: number) => {
    frame = 0;
    if (paused || disposed || lost) return;
    try {
      applySize();
      let remaining = lastTime ? Math.min((time - lastTime) / 1000, .1) : 1 / 60;
      lastTime = time;
      while (remaining > 0 && !landing.settled) {
        const dt = Math.min(remaining, 1 / 60);
        landing = stepLanding(landing, dt);
        remaining -= dt;
      }
      model.group.position.y = landing.height;
      const spread = 1 / Math.sqrt(landing.compression);
      model.group.scale.set(spread, landing.compression, spread);
      shadowMaterial.opacity = Math.max(.3, 1 - landing.height * .18);
      shadow.scale.setScalar(1 + landing.height * .07);
      renderer.render(scene, camera);
      renderCount++;
      if (!ready || restoring) {
        options.onState(restoring ? 'restored' : 'ready');
        restoring = false;
      }
      if (!ready || landing.settled) {
        options.onMetrics({ triangles: renderer.info.render.triangles, drawCalls: renderer.info.render.calls, pixelRatio: renderer.getPixelRatio(), renderCount });
      }
      ready = true;
      if (!landing.settled) requestDraw();
      else if (!announcedSettled) {
        announcedSettled = true;
        options.onSettled();
      }
    } catch (error) {
      options.onError(error);
    }
  };
  function requestDraw() {
    if (!frame && !paused && !disposed && !lost) frame = requestAnimationFrame(draw);
  }
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frame);
    abort.abort();
    model.dispose();
    shadowGeometry.dispose();
    shadowMaterial.dispose();
    shadowTexture.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    scene.clear();
  };
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    if (disposed) return;
    lost = true;
    cancelAnimationFrame(frame);
    frame = 0;
    options.onState('lost');
  }, { signal: abort.signal });
  canvas.addEventListener('webglcontextrestored', () => {
    if (disposed) return;
    lost = false;
    restoring = true;
    announcedSettled = false;
    landing = createLanding(false);
    lastTime = 0;
    requestDraw();
  }, { signal: abort.signal });
  try {
    applySize();
    await renderer.compileAsync(scene, camera);
  } catch (error) {
    dispose();
    throw error;
  }
  return {
    pause() {
      paused = true;
      cancelAnimationFrame(frame);
      frame = 0;
      lastTime = 0;
    },
    resume() {
      if (disposed || !paused) return;
      paused = false;
      lastTime = 0;
      requestDraw();
    },
    resize(size) {
      if (disposed || size.width <= 0 || size.height <= 0) return;
      pendingSize = size;
      if (!paused) requestDraw();
    },
    dispose,
  };
}
