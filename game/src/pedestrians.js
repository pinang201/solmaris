// Pedestrians — low-poly walkers on sidewalks who stroll between
// intersections and flee from danger (speeding cars, gunfire).
window.SOL = window.SOL || {};
SOL.Pedestrians = (function () {
  const peds = [];
  const skin = [0xf2c79b, 0xc98d5e, 0x8a5a34, 0xffe0bd];
  const clothes = [0xd94f4f, 0x3a7bd5, 0x53b06a, 0xf2c14e, 0xe86aa8, 0x3fb8af, 0xef8f3a, 0xeeeeee];
  function makePed(rng) {
    const g = new THREE.Group();
    const c = SOL.rngPick(rng, clothes), s = SOL.rngPick(rng, skin);
    const legs = new THREE.MeshLambertMaterial({ color: 0x33404f });
    const top = new THREE.MeshLambertMaterial({ color: c });
    const skinM = new THREE.MeshLambertMaterial({ color: s });
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.75, 0.22), legs); legL.position.set(-0.14, 0.38, 0); g.add(legL);
    const legR = legL.clone(); legR.position.x = 0.14; g.add(legR);
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.7, 0.34), top); torso.position.y = 1.1; g.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 8, 7), skinM); head.position.y = 1.72; g.add(head);
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.6, 0.17), top); armL.position.set(-0.4, 1.12, 0); g.add(armL);
    const armR = armL.clone(); armR.position.x = 0.4; g.add(armR);
    g.userData = { legL, legR, armL, armR };
    return g;
  }
  function spawn(scene, rng, x, z) {
    const mesh = makePed(rng); mesh.position.set(x, 0, z); scene.add(mesh);
    const C = SOL.CONFIG;
    const ped = {
      mesh, x, z, heading: rng() * Math.PI * 2, speed: 0, walkT: rng() * 9,
      state: 'walk', fleeT: 0, health: 100, down: false,
      route: null, taxi: false, phase: rng() * 6
    };
    // Walk along a sidewalk: pick an avenue or street edge line.
    if (rng() > 0.5) ped.route = { axis: 'z', fixed: SOL.rngPick(rng, C.avenues.concat([76])) + (rng() > 0.5 ? 7.3 : -7.3), dir: rng() > 0.5 ? 1 : -1 };
    else ped.route = { axis: 'x', fixed: SOL.rngPick(rng, C.streets) + (rng() > 0.5 ? 7.3 : -7.3), dir: rng() > 0.5 ? 1 : -1 };
    peds.push(ped); return ped;
  }
  function scare(px, pz, radius) {
    for (const p of peds) {
      if (p.down) continue;
      if (SOL.dist2d(p.x, p.z, px, pz) < (radius || 12)) { p.state = 'flee'; p.fleeT = 2.2; p.fleeFrom = { x: px, z: pz }; }
    }
  }
  function update(dt, rng, danger) {
    for (const p of peds) {
      if (p.down) { p.mesh.rotation.x = Math.PI / 2; p.mesh.position.y = 0.25; continue; }
      p.walkT += dt * (p.state === 'flee' ? 11 : 6);
      const swing = Math.sin(p.walkT + p.phase) * 0.5;
      p.mesh.userData.legL.rotation.x = swing; p.mesh.userData.legR.rotation.x = -swing;
      p.mesh.userData.armL.rotation.x = -swing * 0.7; p.mesh.userData.armR.rotation.x = swing * 0.7;
      if (danger && SOL.dist2d(p.x, p.z, danger.x, danger.z) < 9 && danger.fast) { p.state = 'flee'; p.fleeT = 1.4; p.fleeFrom = danger; }
      let wantHeading = p.heading, spd = 1.5;
      if (p.state === 'flee') {
        p.fleeT -= dt; spd = 5.6;
        wantHeading = Math.atan2(-(p.fleeFrom.x - p.x), -(p.fleeFrom.z - p.z));
        if (p.fleeT <= 0) p.state = 'walk';
      } else if (p.route) {
        const r = p.route;
        if (r.axis === 'z') { wantHeading = r.dir > 0 ? Math.PI : 0; p.x += SOL.clamp(r.fixed - p.x, -dt * 2, dt * 2); if (Math.abs(p.z) > 122) r.dir *= -1; }
        else { wantHeading = r.dir > 0 ? -Math.PI / 2 : Math.PI / 2; p.z += SOL.clamp(r.fixed - p.z, -dt * 2, dt * 2); if (Math.abs(p.x) > 118) r.dir *= -1; }
        if (rng() < dt * 0.01) r.dir *= -1;
      }
      p.heading += SOL.clamp(SOL.wrapAngle(wantHeading - p.heading), -5 * dt, 5 * dt);
      p.x += -Math.sin(p.heading) * spd * dt; p.z += -Math.cos(p.heading) * spd * dt;
      const hit = SOL.City.collide(p.x, p.z, 0.4);
      if (hit) { p.x += (p.x - hit.x) * 0.1; p.z += (p.z - hit.z) * 0.1; if (p.route) p.route.dir *= -1; }
      p.mesh.position.set(p.x, 0, p.z); p.mesh.rotation.y = p.heading;
    }
  }
  return { spawn, peds, scare, update };
})();
