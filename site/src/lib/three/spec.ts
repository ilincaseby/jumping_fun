export const slideSpec = {
  colors: {
    blue: '#1679dc',
    lightBlue: '#6ecaff',
    deepBlue: '#0857ad',
    yellow: '#ffce32',
    paleYellow: '#ffe88b',
    coral: '#f36947',
    seam: '#dbf2ff',
    net: '#476a84',
  },
  base: { width: 4.7, height: .42, depth: 4.9 },
  ramp: { width: 1.65, x: .56, backZ: -1.6, frontZ: 1.9, topY: 3.08, bottomY: .62 },
  curveSegments: 32,
  tubeSides: 8,
} as const;
