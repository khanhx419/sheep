// The same modest palette is shared by buildings, props, and the barn batches.
export function landscape(scene, { cube, ball, cylinder }) {
  // The playable farm sits inside a continuous countryside, not on a platform.
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; ball(scene, i % 2 ? 0x617a59 : 0x647b70, Math.cos(a) * 65, -3, Math.sin(a) * 65, 24, 10 + i % 4, 20); }
  for (let i = 0; i < 36; i++) cube(scene, 0x897856, Math.sin(i * .08) * 6, -.025, 22 + i * 2, 3.8, .05, 2.1);
  // A broad, uneven stone path leads out of the barn to the courtyard gate.
  for (let row = 0; row < 12; row++) for (let col = 0; col < 3; col++) {
    const stone = cube(scene, [0x8c9585, 0xa5aa94, 0x788477][(row + col) % 3], (col - 1) * 0.88 + Math.sin(row) * 0.05, 0.005, 8.5 + row * 1.05, .8, .06, .9);
    stone.rotation.y = Math.sin(row + col) * .06;
  }
  for (let i = 0; i < 10; i++) ball(scene, 0x8c9585, -2.4 - i * 1.3, 0, 14.1 + Math.sin(i) * 0.16, 0.75, 0.08, 0.4);
  // Farmhouse: slate roof, cream plaster, timber, shutters, and a smoking chimney.
  cube(scene, 0x96714e, -15, -.01, 17, 6, .1, 5);
  for (const x of [-18, -12]) cube(scene, 0xe1c99d, x, 1.9, 17, .2, 3.8, 5);
  cube(scene, 0xe1c99d, -15, 1.9, 19.5, 6, 3.8, .2);
  for (const x of [-16.95, -13.05]) cube(scene, 0xe1c99d, x, 1.9, 14.5, 2.1, 3.8, .2);
  cube(scene, 0xe1c99d, -15, 3.2, 14.5, 1.8, 1.2, .2);
  // Open doorway, bed, quilt and pillow, all reachable from the courtyard path.
  cube(scene, 0x67543e, -16.5, .3, 17.5, 1.25, .6, 2.1);
  cube(scene, 0xe7d6b7, -16.5, .68, 17.5, 1.2, .2, 2);
  cube(scene, 0x647b70, -16.5, .82, 17.2, 1.22, .15, 1.4);
  ball(scene, 0xf4efdc, -16.5, .88, 18.2, .48, .12, .23);
  cube(scene, 0x67543e, -16.5, .75, 18.55, 1.3, 1.1, .12);
  cube(scene, 0x96714e, -12.7, .5, 18.7, 1, 1, .7);
  cube(scene, 0xc99c51, -12.7, 1.12, 18.7, .3, .26, .3);
  for (const side of [-1, 1]) {
    const roof = cube(scene, 0x454e4b, -15 + side * 1.75, 4.5, 17, 4, 0.2, 6); roof.rotation.z = side * -0.48;
    cube(scene, 0x574330, -15 + side * 2.9, 1.9, 19.55, 0.2, 3.8, 0.18);
    cube(scene, 0x647b70, -15 + side * 1.8, 2, 19.56, 1.1, 1.2, 0.12);
    cube(scene, 0xc2a56a, -15 + side * 1.8, 2, 19.65, 0.06, 1.2, 0.04);
    cube(scene, 0xc2a56a, -15 + side * 1.8, 2, 19.65, 1.1, 0.06, 0.04);
  }
  for (const x of [-15.95, -14.05]) cube(scene, 0x67543e, x, 1.3, 14.38, .13, 2.6, .2);
  cube(scene, 0x8c9585, -15, 0.12, 20.2, 1.8, 0.25, 0.9);
  cube(scene, 0x8b7556, -16.6, 4.7, 16.2, 0.65, 2.2, 0.7);
  // Small open hay shed; bundles visibly fill the storage bays.
  for (const x of [-9.6, -7.4]) cube(scene, 0x67543e, x, 1.25, 18.8, .15, 2.5, .15);
  cube(scene, 0x454e4b, -8.5, 2.55, 18.8, 2.8, .15, 2.8);
  cube(scene, 0x96714e, -8.5, .6, 19.7, 2.4, 1.2, .12);
  // Layered hedgerow makes the hard farm boundary visible before collision.
  for (let i = 0; i < 28; i++) for (const side of [-1, 1]) {
    ball(scene, 0x647b70, -22 + i * 1.65, .45, side * 23.5, .95, .65, .7);
    ball(scene, 0x647b70, side * 23.5, .45, -22 + i * 1.65, .7, .65, .95);
  }
  // Stone well; rings have an open centre instead of a solid cylinder.
  for (let row = 0; row < 3; row++) for (let i = 0; i < 12; i++) {
    const a = (i + row % 2 * 0.5) / 12 * Math.PI * 2;
    const stone = cube(scene, row % 2 ? 0x8c9585 : 0xa5aa94, -12 + Math.cos(a), 0.18 + row * 0.28, 7 + Math.sin(a), 0.49, 0.26, 0.35); stone.rotation.y = -a;
  }
  for (const side of [-1, 1]) cube(scene, 0x67543e, -12 + side * 1.25, 1.4, 7, 0.17, 2.8, 0.17);
  for (const side of [-1, 1]) { const roof = cube(scene, 0x647b70, -12 + side * 0.7, 2.8, 7, 1.65, 0.14, 2.3); roof.rotation.z = side * -0.4; }
  const spindle = cylinder(scene, 0x9b7d52, 0.1, 2.7, -12, 1.85, 7); spindle.rotation.z = Math.PI / 2;
  cylinder(scene, 0xc2a56a, 0.025, 1.1, -12, 1.25, 7);
  // Raised vegetable beds on the opposite side of the courtyard.
  for (const z of [13, 16.5]) {
    cube(scene, 0x574330, 13, 0.12, z, 6, 0.24, 2.3);
    for (const side of [-1, 1]) cube(scene, 0x96714e, 13, 0.28, z + side * 1.15, 6.3, 0.34, 0.12);
    for (let i = 0; i < 7; i++) for (const side of [-1, 1]) {
      const x = 10.6 + i * 0.8;
      ball(scene, 0x647b70, x, 0.43, z + side * 0.5, 0.29, 0.2, 0.3);
      ball(scene, 0x799057, x - 0.11, 0.49, z + side * 0.5, 0.22, 0.16, 0.22);
      if (i % 3 === 0) ball(scene, 0xc99c51, x, 0.59, z + side * 0.5, 0.07);
    }
  }
  // Flower islands and bushes frame the walking space instead of blocking it.
  for (let i = 0; i < 64; i++) {
    const a = i * 2.399, x = Math.sin(a) * (16 + i % 4), z = Math.cos(a) * (16 + i % 5);
    if (z < 9 && Math.abs(x) < 9 || x < -10 && z > 13 || x > 9 && z > 11) continue;
    ball(scene, 0x647b70, x, 0.22, z, 0.45, 0.32, 0.4);
    if (i % 2) for (let f = 0; f < 3; f++) {
      cylinder(scene, 0x799057, 0.016, 0.42, x + f * 0.15, 0.4, z);
      ball(scene, i % 3 ? 0xe7d6b7 : 0xc99c51, x + f * 0.15, 0.63, z, 0.075, 0.045, 0.075);
    }
  }
  // A water trough and a stack of supply crates beside the shop.
  cube(scene, 0x67543e, 10.5, 0.38, 8, 2.8, 0.7, 0.9);
  cube(scene, 0x8ebcc1, 10.5, 0.75, 8, 2.5, 0.025, 0.65);
  for (const side of [-1, 1]) cube(scene, 0x9b7d52, 10.5, 0.79, 8 + side * 0.46, 2.9, 0.16, 0.1);
  for (let i = 0; i < 3; i++) {
    cube(scene, 0x96714e, 7.2, 0.4 + i * 0.72, 14.8, 0.9, 0.7, 0.85);
    for (const y of [-0.2, 0.2]) cube(scene, 0xc2a56a, 7.2, 0.4 + i * 0.72 + y, 15.24, 0.94, 0.06, 0.05);
  }
}

export function farmStall(parent, { cube, ball, cylinder, Group }) {
  cube(parent, 0x96714e, 0, 0.8, 0, 2.6, 0.9, 1.05);
  cube(parent, 0xc2a56a, 0, 1.3, 0, 2.85, 0.14, 1.3);
  for (const side of [-1, 1]) cylinder(parent, 0x67543e, 0.065, 3, side * 1.3, 1.5, 0.45);
  for (let i = 0; i < 6; i++) {
    const cloth = cube(parent, i % 2 ? 0xe7d6b7 : 0x647b70, -1.25 + i * 0.5, 2.75, 0, 0.5, 0.08, 1.85); cloth.rotation.x = -0.14;
    cube(parent, i % 2 ? 0xe7d6b7 : 0x647b70, -1.25 + i * 0.5, 2.52, -0.91, 0.5, 0.35, 0.06);
  }
  for (let i = 0; i < 3; i++) {
    cylinder(parent, 0x647b70, 0.08, 0.22, -0.7 + i * 0.22, 1.48, -0.23, 0.05);
    ball(parent, 0xc99c51, 0.6 + i * 0.13, 1.44, -0.3, 0.1);
  }
  cube(parent, 0xb59a56, 0.15, 1.5, 0.1, 0.6, 0.3, 0.55);
  cube(parent, 0x766240, 0.15, 1.5, 0.1, 0.06, 0.32, 0.57);
  // Friendly shopkeeper behind the counter, looking towards the barn.
  const clerk = new Group(); parent.add(clerk); parent.userData.clerk = clerk;
  cylinder(clerk, 0x647b70, 0.25, 0.9, 0, 1.15, 0.5, 0.3);
  ball(clerk, 0xab8562, 0, 1.97, 0.5, 0.22, 0.28, 0.23);
  cylinder(clerk, 0xc2a56a, 0.38, 0.07, 0, 2.18, 0.5);
  cylinder(clerk, 0x9b7d52, 0.23, 0.22, 0, 2.28, 0.5);
  for (const side of [-1, 1]) ball(clerk, 0x382d29, side * 0.08, 1.99, 0.288, 0.025, 0.032, 0.018);
}
