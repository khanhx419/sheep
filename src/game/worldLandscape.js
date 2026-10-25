// The same modest palette is shared by buildings, props, and the barn batches.
export function landscape(scene, { cube, ball, cylinder }) {
  // The playable farm sits inside a continuous countryside, not on a platform.
  for (let i = 0; i < 3; i++) cube(scene, 0x897856, Math.sin(i * .08) * 6, -.025, 22 + i * 2, 3.8, .05, 2.1);
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
    const along = -22 + i * 1.65, height = .32 + (i % 4) * .035;
    if (side < 0 || Math.abs(along) > 4) ball(scene, i % 3 ? 0x647b70 : 0x799057, along, height, side * 23.5, .95, .42, .7);
    ball(scene, i % 3 ? 0x647b70 : 0x799057, side * 23.5, height, along, .7, .42, .95);
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
  // A curved footpath skirts the hay bales and joins the meadow's west gate.
  // The centre of the route stays clear of both the shop and the water trough.
  const meadowPath = [[1.5, 9.5], [8.4, 9.5], [8.65, 10.7], [9.4, 12.1], [10.7, 12.1]];
  for (let segment = 1; segment < meadowPath.length; segment++) {
    const [ax, az] = meadowPath[segment - 1], [bx, bz] = meadowPath[segment];
    const steps = Math.ceil(Math.hypot(bx - ax, bz - az) / .65);
    for (let i = 0; i < steps; i++) {
      const t = i / steps, x = ax + (bx - ax) * t, z = az + (bz - az) * t;
      const stone = ball(scene, i % 2 ? 0xa5aa94 : 0x8c9585, x, .025, z, .5, .055, .42);
      stone.rotation.y = i * .61;
    }
  }
  // Round orchard silhouettes soften the conifer forest behind the farm fence.
  // All trunks are beyond the playable boundary, so the visible walking area
  // does not acquire invisible obstacles or tree trunks without collisions.
  for (const [x, z, scale] of [[-25, 13, 1], [-24.8, 22, 1.1], [24.8, 5, 1.05], [25.5, 19, 1.15], [17, 26, 1], [-8, 27, .95]]) {
    cylinder(scene, 0x67543e, .24 * scale, 3.8 * scale, x, 1.9 * scale, z, .17 * scale);
    for (const side of [-1, 1]) {
      const branch = cylinder(scene, 0x67543e, .11 * scale, 1.8 * scale, x + side * .45 * scale, 3 * scale, z, .07 * scale);
      branch.rotation.z = side * -.65;
      ball(scene, side > 0 ? 0x799057 : 0x647b70, x + side * 1.05 * scale, 4.05 * scale, z + side * .35 * scale, 1.65 * scale, 1.55 * scale, 1.6 * scale);
    }
    ball(scene, 0x617a59, x, 5.15 * scale, z, 1.65 * scale, 1.4 * scale, 1.65 * scale);
  }
  // Daisies line the field's far edge without growing across harvest patches.
  for (let i = 0; i < 24; i++) {
    const x = 19.35 + Math.sin(i * 2.1) * .27, z = 10.7 + i * .33, height = .33 + i % 3 * .07;
    cylinder(scene, 0x799057, .018, height, x, height / 2, z);
    ball(scene, i % 4 ? 0xe7d6b7 : 0xc99c51, x, height + .02, z, .09, .035, .09);
    ball(scene, 0xc99c51, x, height + .045, z, .028, .025, .028);
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
  const awning = []; parent.userData.awning = awning;
  for (let i = 0; i < 6; i++) {
    const cloth = cube(parent, i % 2 ? 0xe7d6b7 : 0x647b70, -1.25 + i * 0.5, 2.75, 0, 0.5, 0.08, 1.85); cloth.rotation.x = -0.14;
    const flap = new Group(); flap.position.set(-1.25 + i * .5, 2.69, -.91); parent.add(flap); awning.push(flap);
    cube(flap, i % 2 ? 0xe7d6b7 : 0x647b70, 0, -.17, 0, .5, .35, .06);
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
  cube(clerk, 0xdbc998, 0, 1.18, .23, .36, .55, .1);
  const head = new Group(), arms = []; head.position.set(0, 1.97, .5); clerk.add(head);
  ball(head, 0xab8562, 0, 0, 0, 0.22, 0.28, 0.23);
  cylinder(head, 0xc2a56a, 0.38, 0.07, 0, .21, 0);
  cylinder(head, 0x9b7d52, 0.23, 0.22, 0, .31, 0);
  ball(head, 0xc49b71, 0, -.04, -.23, .065, .06, .06);
  for (const side of [-1, 1]) {
    ball(head, 0x382d29, side * .08, .02, -.212, .025, .032, .018);
    ball(head, 0xe7d6b7, side * .06, -.12, -.218, .07, .025, .035);
    const arm = new Group(); arm.position.set(side * .32, 1.5, .5); clerk.add(arm); arms.push(arm);
    cylinder(arm, 0x647b70, .09, .45, 0, -.18, 0);
    ball(arm, 0xab8562, 0, -.43, -.03, .1);
  }
  clerk.userData = { head, arms };
}
