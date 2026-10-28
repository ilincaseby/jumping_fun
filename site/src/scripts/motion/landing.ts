export interface LandingState {
  height: number;
  velocity: number;
  compression: number;
  compressionVelocity: number;
  bounces: number;
  elapsed: number;
  settled: boolean;
}

export function createLanding(animate: boolean): LandingState {
  return {
    height: animate ? 2.8 : 0,
    velocity: 0,
    compression: 1,
    compressionVelocity: 0,
    bounces: 0,
    elapsed: 0,
    settled: !animate,
  };
}

export function stepLanding(state: LandingState, delta: number): LandingState {
  if (state.settled) return state;
  const dt = Math.max(0, Math.min(delta, 1 / 30));
  const next = { ...state, elapsed: state.elapsed + dt };
  if (next.bounces < 2) {
    next.velocity -= 22 * dt;
    next.height += next.velocity * dt;
    if (next.height <= 0) {
      next.height = 0;
      next.bounces++;
      next.compression = next.bounces === 1 ? .86 : .97;
      next.velocity = next.bounces === 1 ? -next.velocity * .18 : 0;
    }
  }
  const springForce = -100 * (next.compression - 1) - 10 * next.compressionVelocity;
  next.compressionVelocity += springForce * dt;
  next.compression += next.compressionVelocity * dt;
  if ((next.bounces === 2 && Math.abs(next.compression - 1) < .001 && Math.abs(next.compressionVelocity) < .01) || next.elapsed > 2.5) {
    return { ...next, height: 0, velocity: 0, compression: 1, compressionVelocity: 0, settled: true };
  }
  return next;
}
