import {
  BufferGeometry, CatmullRomCurve3, CylinderGeometry, Float32BufferAttribute, Group,
  Matrix4, Mesh, MeshStandardMaterial, Quaternion, SphereGeometry, TubeGeometry, Vector3,
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { slideSpec as spec } from './spec';

type MaterialKey = keyof typeof spec.colors;

export function createInflatable(): { group: Group; dispose: () => void } {
  const group = new Group();
  group.name = 'Original inflatable slide — not a rental product';
  const buckets = new Map<MaterialKey, BufferGeometry[]>();
  const add = (geometry: BufferGeometry, color: MaterialKey, position = new Vector3(), rotation = new Quaternion()) => {
    geometry.applyMatrix4(new Matrix4().compose(position, rotation, new Vector3(1, 1, 1)));
    const plain = geometry.index ? geometry.toNonIndexed() : geometry;
    if (plain !== geometry) geometry.dispose();
    const list = buckets.get(color) ?? [];
    list.push(plain);
    buckets.set(color, list);
  };
  const cushion = (w: number, h: number, d: number, radius: number, color: MaterialKey, x: number, y: number, z: number) => {
    add(new RoundedBoxGeometry(w, h, d, 2, radius), color, new Vector3(x, y, z));
  };
  const tube = (points: Vector3[], radius: number, color: MaterialKey, segments: number = spec.curveSegments) => {
    add(new TubeGeometry(new CatmullRomCurve3(points, false, 'centripetal'), segments, radius, spec.tubeSides, false), color);
  };
  const segment = (a: Vector3, b: Vector3, radius: number, color: MaterialKey) => {
    const delta = b.clone().sub(a);
    add(new CylinderGeometry(radius, radius, delta.length(), 6), color,
      a.clone().add(b).multiplyScalar(.5),
      new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), delta.normalize()));
  };
  cushion(spec.base.width, spec.base.height, spec.base.depth, .2, 'blue', 0, .23, 0);
  cushion(4.55, .12, 4.7, .055, 'lightBlue', 0, .46, 0);
  cushion(4.22, .16, 1.05, .08, 'blue', 0, .54, 1.84);
  const rampPoints = [
    new Vector3(spec.ramp.x, spec.ramp.bottomY, spec.ramp.frontZ),
    new Vector3(spec.ramp.x, .73, 1.45),
    new Vector3(spec.ramp.x, 1.1, .95),
    new Vector3(spec.ramp.x, 2.45, -.85),
    new Vector3(spec.ramp.x, spec.ramp.topY, spec.ramp.backZ),
  ];
  const path = new CatmullRomCurve3(rampPoints, false, 'centripetal');
  const surface = (offset: number, width: number, color: MaterialKey) => {
    const positions: number[] = [];
    const uvs: number[] = [];
    for (let i = 0; i < spec.curveSegments; i++) {
      const a = path.getPoint(i / spec.curveSegments);
      const b = path.getPoint((i + 1) / spec.curveSegments);
      const vertices = [
        [a.x - width / 2, a.y + offset, a.z], [a.x + width / 2, a.y + offset, a.z], [b.x - width / 2, b.y + offset, b.z],
        [a.x + width / 2, a.y + offset, a.z], [b.x + width / 2, b.y + offset, b.z], [b.x - width / 2, b.y + offset, b.z],
      ];
      positions.push(...vertices.flat());
      uvs.push(0, i / spec.curveSegments, 1, i / spec.curveSegments, 0, (i + 1) / spec.curveSegments,
        1, i / spec.curveSegments, 1, (i + 1) / spec.curveSegments, 0, (i + 1) / spec.curveSegments);
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
    geometry.computeVertexNormals();
    add(geometry, color);
  };
  for (const sign of [-1, 1]) {
    tube(rampPoints.map((point) => point.clone().add(new Vector3(sign * (spec.ramp.width / 2 + .08), .16, 0))), .19, 'blue');
    tube(rampPoints.map((point) => point.clone().add(new Vector3(sign * (spec.ramp.width / 2 + .08), .315, .015))), .013, 'lightBlue');
  }
  for (let i = 0; i < 13; i++) {
    const p = path.getPoint((i + .4) / 14);
    cushion(1.63, Math.max(.18, p.y - .54), .35, .1, 'blue', spec.ramp.x, (p.y + .54) / 2 - .09, p.z);
  }
  surface(.025, spec.ramp.width, 'yellow');
  for (let i = 1; i < 9; i++) {
    const p = path.getPoint(i / 11);
    segment(new Vector3(p.x - .77, p.y + .03, p.z), new Vector3(p.x + .77, p.y + .03, p.z), .007, 'paleYellow');
  }
  cushion(1.82, .25, .48, .12, 'yellow', .56, .74, 1.93);
  for (let i = 0; i < 7; i++) {
    const z = 1.5 - i * .47;
    const y = .68 + i * .37;
    cushion(.82, .22, .48, .1, i % 2 ? 'yellow' : 'lightBlue', -1.27, y, z);
    cushion(.8, y - .5, .47, .12, 'deepBlue', -1.27, (y + .5) / 2 - .1, z);
  }
  tube([new Vector3(-1.85, .8, 1.7), new Vector3(-1.85, 1.6, .6), new Vector3(-1.85, 3.25, -1.65)], .15, 'blue');
  cushion(3.55, .32, .7, .15, 'yellow', -.32, 3.02, -1.75);
  tube([
    new Vector3(-1.9, 3, -1.92), new Vector3(-1.9, 3.75, -1.92),
    new Vector3(-1.67, 4.12, -1.92), new Vector3(-.2, 4.13, -1.92),
    new Vector3(1.37, 4.12, -1.92), new Vector3(1.62, 3.75, -1.92),
    new Vector3(1.62, 3, -1.92),
  ], .23, 'coral', 40);
  tube([new Vector3(-.62, 4.13, -1.92), new Vector3(-.25, 4.13, -1.92), new Vector3(.12, 4.13, -1.92)], .236, 'yellow', 8);
  for (let i = 0; i < 13; i++) {
    const x = -1.62 + i * .25;
    segment(new Vector3(x, 3.15, -1.95), new Vector3(x, 3.85, -1.95), .009, 'net');
  }
  for (let i = 0; i < 4; i++) {
    const y = 3.2 + i * .18;
    segment(new Vector3(-1.62, y, -1.95), new Vector3(1.38, y, -1.95), .009, 'net');
  }
  for (let i = 0; i < 22; i++) {
    segment(new Vector3(-2.05 + i * .19, .32, 2.445), new Vector3(-1.99 + i * .19, .32, 2.445), .009, 'seam');
  }
  add(new CylinderGeometry(.085, .085, .025, 12), 'deepBlue', new Vector3(1.58, .25, 2.455), new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), Math.PI / 2));
  add(new SphereGeometry(.04, 8, 6), 'lightBlue', new Vector3(1.58, .25, 2.48));
  const geometries: BufferGeometry[] = [];
  const materials: MeshStandardMaterial[] = [];
  for (const [key, parts] of buckets) {
    const geometry = mergeGeometries(parts);
    for (const part of parts) part.dispose();
    if (!geometry) throw new Error(`Geometria pentru materialul ${key} nu poate fi combinată.`);
    const material = new MeshStandardMaterial({ color: spec.colors[key], roughness: key === 'net' ? .9 : .38, metalness: 0 });
    const mesh = new Mesh(geometry, material);
    mesh.name = `Inflatable / ${key}`;
    group.add(mesh);
    geometries.push(geometry);
    materials.push(material);
  }
  return { group, dispose: () => { geometries.forEach((g) => g.dispose()); materials.forEach((m) => m.dispose()); } };
}
