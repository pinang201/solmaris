// City builder — deterministic Solmaris: road grid, blocks, pastel
// buildings with lit windows, palms, streetlights, beach, bay, marina
// with boats, and the lighthouse point. Exposes collision boxes and
// the road network used by traffic, pedestrians and the minimap.
window.SOL = window.SOL || {};
SOL.City = (function () {
  const colliders = []; // {x,z,hw,hd}
  let waterMat = null, beaconMat = null;
  function box(mesh, x, z, hw, hd) { mesh.position.x = x; mesh.position.z = z; colliders.push({ x, z, hw, hd }); }
  function palm(scene, x, z, rng, mats) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 5.4, 6), mats.trunk);
    trunk.position.y = 2.7; trunk.rotation.z = (rng() - 0.5) * 0.14; g.add(trunk);
    for (let i = 0; i < 7; i++) {
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.06, 2.05), mats.leaf);
      const a = (i / 7) * Math.PI * 2;
      leaf.position.set(Math.cos(a) * 0.95, 5.8, Math.sin(a) * 0.95);
      leaf.rotation.y = -a + Math.PI / 2;
      leaf.translateZ(0.35); leaf.rotateX(0.42);
      g.add(leaf);
    }
    g.position.set(x, 0, z); scene.add(g);
  }
  function lamp(scene, x, z, mats) {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 5, 5), mats.pole);
    pole.position.y = 2.5; g.add(pole);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6), mats.bulb);
    bulb.position.y = 5.05; g.add(bulb);
    g.position.set(x, 0, z); scene.add(g);
  }
  function build(scene, rng, textures) {
    const C = SOL.CONFIG;
    colliders.length = 0;
    // Golden-hour lighting: warm sun, soft sky fill.
    scene.fog = new THREE.Fog(C.colors.fog, 90, 300);
    const hemi = new THREE.HemisphereLight(0xffe3b3, 0x3a5a78, 0.62); scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffc37a, 1.35);
    sun.position.set(-60, 55, -30); scene.add(sun);
    const fill = new THREE.DirectionalLight(0x7fb2e0, 0.3); fill.position.set(60, 30, 60); scene.add(fill);
    // Sky dome: big gradient sphere.
    const skyGeo = new THREE.SphereGeometry(420, 16, 10);
    const skyMat = new THREE.MeshBasicMaterial({ color: 0xf7a95c, side: THREE.BackSide, fog: false });
    scene.add(new THREE.Mesh(skyGeo, skyMat));
    const sunBall = new THREE.Mesh(new THREE.SphereGeometry(14, 12, 10), new THREE.MeshBasicMaterial({ color: 0xffe9a8, fog: false }));
    sunBall.position.set(-260, 62, -140); scene.add(sunBall);

    const mats = {
      ground: new THREE.MeshLambertMaterial({ color: 0x4f8a48 }),
      road: new THREE.MeshLambertMaterial({ map: textures.road }),
      walk: new THREE.MeshLambertMaterial({ color: 0x9d968b }),
      sand: new THREE.MeshLambertMaterial({ map: textures.sand }),
      trunk: new THREE.MeshLambertMaterial({ color: 0x8a6844 }),
      leaf: new THREE.MeshLambertMaterial({ color: 0x2e8f4e }),
      pole: new THREE.MeshLambertMaterial({ color: 0x44484e }),
      bulb: new THREE.MeshBasicMaterial({ color: 0xffe9a0 }),
      roof: new THREE.MeshLambertMaterial({ color: 0xb0563a }),
      white: new THREE.MeshLambertMaterial({ color: 0xf5f0e6 }),
      wood: new THREE.MeshLambertMaterial({ color: 0x9a6b45 })
    };
    waterMat = new THREE.MeshLambertMaterial({ color: C.colors.water, transparent: true, opacity: 0.88 });
    // Ground, water, beach.
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(280, 280), mats.ground);
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.05; scene.add(ground);
    const sand = new THREE.Mesh(new THREE.PlaneGeometry(34, 280), mats.sand);
    sand.rotation.x = -Math.PI / 2; sand.position.set(97, 0.01, 0); scene.add(sand);
    const water = new THREE.Mesh(new THREE.PlaneGeometry(220, 300), waterMat);
    water.rotation.x = -Math.PI / 2; water.position.set(215, 0.12, 0); scene.add(water);
    // Roads: avenues (N-S) and streets (E-W) with sidewalks.
    const roadGeoV = new THREE.PlaneGeometry(C.roadW, 252), roadGeoH = new THREE.PlaneGeometry(252, C.roadW);
    for (const x of C.avenues) {
      const r = new THREE.Mesh(roadGeoV, mats.road); r.rotation.x = -Math.PI / 2; r.rotation.z = Math.PI / 2; r.position.set(x, 0.02, 0); scene.add(r);
      for (const s of [-1, 1]) {
        const w = new THREE.Mesh(new THREE.PlaneGeometry(C.sidewalkW, 252), mats.walk);
        w.rotation.x = -Math.PI / 2; w.position.set(x + s * (C.roadW / 2 + C.sidewalkW / 2), 0.03, 0); scene.add(w);
      }
    }
    for (const z of C.streets) {
      if (z === 104) { // coast road along the beach
        const r = new THREE.Mesh(new THREE.PlaneGeometry(200, C.roadW), mats.road);
        r.rotation.x = -Math.PI / 2; r.position.set(-8, 0.02, z); scene.add(r); continue;
      }
      const r = new THREE.Mesh(roadGeoH, mats.road); r.rotation.x = -Math.PI / 2; r.position.set(-8, 0.02, z); scene.add(r);
      for (const s of [-1, 1]) {
        const w = new THREE.Mesh(new THREE.PlaneGeometry(200, C.sidewalkW), mats.walk);
        w.rotation.x = -Math.PI / 2; w.position.set(-8, 0.03, z + s * (C.roadW / 2 + C.sidewalkW / 2)); scene.add(w);
      }
    }
    // Coast road (vertical, beside the beach).
    const coast = new THREE.Mesh(new THREE.PlaneGeometry(C.roadW, 252), mats.road);
    coast.rotation.x = -Math.PI / 2; coast.rotation.z = Math.PI / 2; coast.position.set(76, 0.02, 0); scene.add(coast);
    // Buildings on each block: 1-4 per block with gaps for alleys.
    const roofGeo = new THREE.BoxGeometry(1, 0.5, 1);
    for (let bi = 0; bi < C.avenues.length; bi++) for (let bj = 0; bj < C.streets.length - 1; bj++) {
      const cx = (C.avenues[bi] + (bi + 1 < C.avenues.length ? C.avenues[bi + 1] : 76)) / 2;
      const cz = (C.streets[bj] + C.streets[bj + 1]) / 2;
      const bw = Math.abs((bi + 1 < C.avenues.length ? C.avenues[bi + 1] : 76) - C.avenues[bi]) - C.roadW - C.sidewalkW * 2 - 2;
      const bd = Math.abs(C.streets[bj + 1] - C.streets[bj]) - C.roadW - C.sidewalkW * 2 - 2;
      if (bw < 10 || bd < 10) continue;
      const n = 1 + Math.floor(rng() * 3);
      for (let k = 0; k < n; k++) {
        const w = bw * (0.42 + rng() * 0.2), d = bd * (0.42 + rng() * 0.2);
        const h = 8 + rng() * 22;
        const ox = (rng() - 0.5) * (bw - w) * 0.8, oz = (rng() - 0.5) * (bd - d) * 0.8;
        const ftex = textures.facades[Math.floor(rng() * textures.facades.length)];
        const bm = new THREE.MeshLambertMaterial({ map: ftex });
        const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), bm);
        b.position.set(cx + ox, h / 2, cz + oz); scene.add(b);
        const roof = new THREE.Mesh(roofGeo, mats.roof); roof.scale.set(w + 0.6, 1, d + 0.6); roof.position.set(cx + ox, h + 0.25, cz + oz); scene.add(roof);
        // Shop awning on some ground floors.
        if (rng() > 0.55) {
          const aw = new THREE.Mesh(new THREE.BoxGeometry(Math.min(w, 9), 0.25, 2.4),
            new THREE.MeshLambertMaterial({ map: textures.awnings[Math.floor(rng() * textures.awnings.length)] }));
          aw.position.set(cx + ox, 3.1, cz + oz + d / 2 + 1.1); aw.rotation.x = 0.35; scene.add(aw);
        }
        colliders.push({ x: cx + ox, z: cz + oz, hw: w / 2 + 0.4, hd: d / 2 + 0.4 });
      }
    }
    // Palms along coast + avenues, lamps at corners.
    for (let z = -120; z <= 120; z += 13) { palm(scene, 84.5, z + (rng() - 0.5) * 3, rng, mats); palm(scene, 68.5, z + 6, rng, mats); }
    for (const x of C.avenues) for (let z = -110; z <= 110; z += 27) palm(scene, x + 8.6, z + (rng() - 0.5) * 4, rng, mats);
    for (const x of C.avenues.concat([76])) for (const z of C.streets) { lamp(scene, x + 7.4, z + 7.4, mats); lamp(scene, x - 7.4, z - 7.4, mats); }
    // Marina: pier, boats, crates.
    const pier = new THREE.Mesh(new THREE.BoxGeometry(26, 0.7, 5), mats.wood);
    pier.position.set(112, 0.45, 64); scene.add(pier); colliders.push({ x: 100, z: 64, hw: 2, hd: 3 });
    const boatCols = [0xffffff, 0xd94f4f, 0x3a7bd5, 0xf2c14e];
    for (let i = 0; i < 6; i++) {
      const bg = new THREE.Group();
      const hull = new THREE.Mesh(new THREE.BoxGeometry(5.4, 1.1, 1.9), new THREE.MeshLambertMaterial({ color: boatCols[i % 4] }));
      hull.position.y = 0.55; bg.add(hull);
      const cab = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 1.4), mats.white); cab.position.y = 1.55; bg.add(cab);
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 4.6, 5), mats.pole); mast.position.y = 3.2; bg.add(mast);
      bg.position.set(106 + (i % 3) * 8, 0.15, 54 + Math.floor(i / 3) * 18); bg.rotation.y = (i % 2) * 0.2;
      bg.userData.boat = true; scene.add(bg); boats.push(bg);
    }
    for (let i = 0; i < 8; i++) {
      const crate = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 1.6), mats.wood);
      const cx2 = 70 + rng() * 12, cz2 = 46 + rng() * 30;
      crate.position.set(cx2, 0.8, cz2); scene.add(crate);
      colliders.push({ x: cx2, z: cz2, hw: 1, hd: 1 });
    }
    // Lighthouse point.
    const lh = new THREE.Group();
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 2.3, 11, 10),
      new THREE.MeshLambertMaterial({ color: 0xffffff }));
    tower.position.y = 5.5; lh.add(tower);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(1.95, 2.05, 2.4, 10), new THREE.MeshLambertMaterial({ color: 0xd94f4f }));
    band.position.y = 7.6; lh.add(band);
    beaconMat = new THREE.MeshBasicMaterial({ color: 0xfff2a0 });
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), beaconMat); beacon.position.y = 11.6; lh.add(beacon);
    const lhRoof = new THREE.Mesh(new THREE.ConeGeometry(1.9, 1.6, 10), mats.roof); lhRoof.position.y = 13; lh.add(lhRoof);
    lh.position.set(100, 0, 118); scene.add(lh); colliders.push({ x: 100, z: 118, hw: 2.8, hd: 2.8 });
    // Landmark signs: simple coloured blocks + roofs naming key places visually.
    landmark(scene, C.landmarks.cafe, 0xd94f4f, mats); landmark(scene, C.landmarks.rosa, 0xe86aa8, mats);
    landmark(scene, C.landmarks.hospital, 0xffffff, mats); landmark(scene, C.landmarks.garage, 0x888f98, mats);
    return { colliders };
  }
  const boats = [];
  function landmark(scene, L, col, mats) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(13, 6, 10), new THREE.MeshLambertMaterial({ color: col }));
    b.position.set(L.x, 3, L.z); scene.add(b);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(14, 0.6, 11), mats.roof); roof.position.set(L.x, 6.3, L.z); scene.add(roof);
    colliders.push({ x: L.x, z: L.z, hw: 7, hd: 5.5 });
  }
  function collide(x, z, r) {
    for (const c of colliders) {
      if (Math.abs(x - c.x) < c.hw + r && Math.abs(z - c.z) < c.hd + r) return c;
    }
    return null;
  }
  function update(dt, t) {
    if (waterMat) waterMat.color.setHSL(0.52, 0.62, 0.32 + Math.sin(t * 0.7) * 0.03);
    if (beaconMat) beaconMat.color.setHSL(0.13, 1, 0.72 + Math.sin(t * 3) * 0.2);
    for (let i = 0; i < boats.length; i++) boats[i].position.y = 0.15 + Math.sin(t * 1.2 + i * 1.7) * 0.12;
  }
  return { build, collide, update, colliders };
})();
