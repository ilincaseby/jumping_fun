export interface SceneSize {
  width: number;
  height: number;
  pixelRatio: number;
}

export interface SceneMetrics {
  triangles: number;
  drawCalls: number;
  pixelRatio: number;
  renderCount: number;
}

export interface SceneController {
  pause(): void;
  resume(): void;
  resize(size: SceneSize): void;
  dispose(): void;
}

export type SceneCommand =
  | { type: 'init'; canvas: OffscreenCanvas; size: SceneSize; entrance: boolean }
  | { type: 'resize'; size: SceneSize }
  | { type: 'pause' | 'resume' | 'dispose' };

export type SceneEvent =
  | { type: 'state'; state: 'ready' | 'lost' | 'restored' }
  | { type: 'metrics'; metrics: SceneMetrics }
  | { type: 'settled' | 'disposed' }
  | { type: 'error'; message: string };
