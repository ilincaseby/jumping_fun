import assert from 'node:assert/strict';
import test from 'node:test';
import { Mesh } from 'three';
import { createLanding, stepLanding } from '../../src/scripts/motion/landing';
import { createInflatable } from '../../src/lib/three/model';

test('entrance lands, compresses, rebounds twice with decreasing height and becomes idle', () => {
  let state = createLanding(true);
  let compressed = false;
  let rebounded = false;
  let firstPeak = 0;
  let secondPeak = 0;
  for (let frame = 0; frame < 300; frame++) {
    state = stepLanding(state, 1 / 60);
    assert(state.height >= 0);
    assert(state.compression >= .8 && state.compression < 1.1);
    compressed ||= state.compression < .9;
    rebounded ||= state.bounces === 1 && state.height > .01;
    if (state.bounces === 1) firstPeak = Math.max(firstPeak, state.height);
    if (state.bounces === 2) secondPeak = Math.max(secondPeak, state.height);
  }
  assert(compressed);
  assert(rebounded);
  assert(state.settled);
  assert.equal(state.bounces, 3);
  assert(secondPeak > 0 && secondPeak < firstPeak);
  assert.equal(state.height, 0);
  assert.equal(state.compression, 1);
});

test('static preference starts settled and suspended frames cannot cause a large jump', () => {
  const still = createLanding(false);
  assert.equal(stepLanding(still, 1), still);
  assert(stepLanding(createLanding(true), 60).height > 2.7);
});

test('model has real merged 3D geometry within the scene budget', () => {
  const model = createInflatable();
  let triangles = 0;
  let meshes = 0;
  model.group.traverse((node) => {
    if (!(node instanceof Mesh)) return;
    meshes++;
    triangles += (node.geometry.index?.count ?? node.geometry.getAttribute('position').count) / 3;
    node.geometry.computeBoundingBox();
    assert(node.geometry.boundingBox);
  });
  assert(meshes > 1 && meshes <= 12, `mesh count: ${meshes}`);
  assert(triangles > 1000 && triangles <= 25000, `triangles: ${triangles}`);
  model.dispose();
});
