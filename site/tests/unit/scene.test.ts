import assert from 'node:assert/strict';
import test from 'node:test';
import { Mesh } from 'three';
import { createLanding, stepLanding } from '../../src/scripts/motion/landing';
import { createInflatable } from '../../src/lib/three/model';

test('entrance lands, compresses, rebounds once and becomes completely idle', () => {
  let state = createLanding(true);
  let compressed = false;
  let rebounded = false;
  for (let frame = 0; frame < 300; frame++) {
    state = stepLanding(state, 1 / 60);
    assert(state.height >= 0);
    assert(state.compression >= .8 && state.compression < 1.1);
    compressed ||= state.compression < .9;
    rebounded ||= state.bounces === 1 && state.height > .01;
  }
  assert(compressed);
  assert(rebounded);
  assert(state.settled);
  assert.equal(state.bounces, 2);
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
