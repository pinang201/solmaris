// Vehicles — car factory (sedans, hatchbacks, a pickup, the golden
// Aurora GT, police livery), arcade driving physics and traffic AI
// that follows the road grid and stops for obstacles.
window.SOL = window.SOL || {};
SOL.Vehicles = (function () {
  const cars = [];
  const palette = [0xd94f4f, 0x3a7bd5, 0x53b06a, 0xf2c14e, 0xe8e8e8, 0x8e6cc8, 0xef8f3a, 0x3fb8af, 0x555c66];
  function makeCarMesh(color, kind) {
    const g = new THREE.Group();
    const paint = new THREE.MeshLambertMaterial({ color });
    const dark = new THREE.MeshLambertMaterial({ color: 0x22262b });
    const glass = new THREE.MeshLambertMaterial({ color: 0x9fd4e8 });
    let L = 4.2, W = 1.9, H = 0.62;
    if (kind === 'sport') { L = 4.5; W = 2; H = 0.5; }
    if (kind === 'pickup') { L = 4.8; H = 0.8; }
    const body = new THREE.Mesh(new THREE.BoxGeometry(W, H, L), paint); body.position.y = 0.55; g.add(body);
    const nose = new THREE.Mesh(new THREE.BoxGeometry(W * 0.92, H * 0.6, 0.7), paint); nose.position.set(0, 0.48, -L / 2 - 0.2); g.add(nose);
    if (kind === 'pickup') {
      const cab = new THREE.Mesh(new THREE.BoxGeometry(W * 0.9, 0.72, 1.5), glass); cab.position.set(0, 1.28, -0.5); g.add(cab);
    } else {
      const cabLen = kind === 'sport' ? 1.7 : 2.1;
      const cab = new THREE.Mesh(new THREE.BoxGeometry(W * 0.84, 0.55, cabLen), glass);
      cab.position.set(0, 1.08, kind === 'sport' ? 0.25 : 0.1); g.add(cab);
    }
    if (kind === 'sport') {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(W * 0.95, 0.1, 0.5), dark); wing.position.set(0, 1.0, L / 2 - 0.2); g.add(wing);
    }
    if (kind === 'police') {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.22, 0.5), dark); bar.position.set(0, 1.48, 0.1); g.add(bar);
      const rl = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 0.46), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
      rl.position.set(-0.3, 1.48, 0.1); g.add(rl); g.userData.lightR = rl;
      const bl = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 0.46), new THREE.MeshBasicMaterial({ color: 0x2266ff }));
      bl.position.set(0.3, 1.48, 0.1); g.add(bl); g.userData.lightB = bl;
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(W + 0.02, 0.3, L * 0.9), new THREE.MeshLambertMaterial({ color: 0x2244aa }));
      stripe.position.y = 0.55; g.add(stripe);
    }
    // Headlights + taillights make direction readable in screenshots.
    const hl = new THREE.MeshBasicMaterial({ color: 0xfff6c0 });
    const tl = new THREE.MeshBasicMaterial({ color: 0xff3344 });
    for (const s of [-1, 1]) {
      const h = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.06), hl); h.position.set(s * W * 0.32, 0.6, -L / 2 - 0.54); g.add(h);
      const t = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.14, 0.06), tl); t.position.set(s * W * 0.32, 0.62, L / 2 + 0.02); g.add(t);
    }
    const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.26, 10);
    const wheels = [];
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const w = new THREE.Mesh(wheelGeo, dark);
      w.rotation.z = Math.PI / 2; w.position.set(sx * (W / 2 + 0.02), 0.36, sz * (L / 2 - 0.85));
      g.add(w); wheels.push(w);
    }
    g.userData.wheels = wheels;
    return g;
  }
  function spawn(scene, opts) {
    const kind = opts.kind || 'sedan';
    const color = opts.color !== undefined ? opts.color : palette[0];
    const mesh = makeCarMesh(kind === 'police' ? 0xf2f2f2 : color, kind);
    mesh.position.set(opts.x, 0, opts.z);
    mesh.rotation.y = opts.heading || 0;
    scene.add(mesh);
    const car = {
      mesh, kind, x: opts.x, z: opts.z, heading: opts.heading || 0,
      speed: 0, steer: 0, health: 100, driver: opts.driver || 'parked',
      lane: opts.lane || 0, targetSpeed: 0, color, id: cars.length,
      flashT: 0, stuckT: 0, syndicate: !!opts.syndicate
    };
    cars.push(car); return car;
  }
  // Traffic: pick a straight road run, drive it, turn at intersections.
  function trafficThink(car, dt, rng) {
    const C = SOL.CONFIG;
    if (!car.route) {
      // route: {axis:'x'|'z', dir, fixed} — drive along a road line.
      const vert = rng() > 0.5;
      if (vert) car.route = { axis: 'z', fixed: SOL.rngPick(rng, C.avenues.concat([76])), dir: rng() > 0.5 ? 1 : -1 };
      else car.route = { axis: 'x', fixed: SOL.rngPick(rng, C.streets), dir: rng() > 0.5 ? 1 : -1 };
      car.lane = car.route.dir > 0 ? 2.6 : -2.6;
    }
    const r = car.route;
    const targetHeading = r.axis === 'z' ? (r.dir > 0 ? Math.PI : 0) : (r.dir > 0 ? -Math.PI / 2 : Math.PI / 2);
    // Note: heading 0 faces -Z in our convention (nose at -Z).
    car.heading += SOL.clamp(SOL.wrapAngle(targetHeading - car.heading), -2.4 * dt, 2.4 * dt);
    // Lane offset perpendicular to travel.
    let tx = car.x, tz = car.z;
    if (r.axis === 'z') { tx = r.fixed + (r.dir > 0 ? -2.6 : 2.6); }
    else { tz = r.fixed + (r.dir > 0 ? 2.6 : -2.6); }
    car.x += SOL.clamp(tx - car.x, -6 * dt, 6 * dt) * 0.4;
    car.z += SOL.clamp(tz - car.z, -6 * dt, 6 * dt) * 0.4;
    // Slow for cars ahead.
    let want = 10.5;
    for (const o of cars) {
      if (o === car) continue;
      const d = SOL.dist2d(car.x, car.z, o.x, o.z);
      if (d < 7) {
        const ahead = Math.cos(car.heading) * (o.z - car.z) + -Math.sin(car.heading) * (o.x - car.x);
        if (ahead < 0 || d < 4) want = Math.min(want, 2);
      }
    }
    // At world edge or near an intersection, sometimes re-route.
    if (Math.abs(car.x) > 118 || Math.abs(car.z) > 122 || rng() < dt * 0.012) {
      if (Math.abs(car.x) > 118 || Math.abs(car.z) > 122 || rng() > 0.4) car.route = null;
    }
    car.speed += SOL.clamp(want - car.speed, -14 * dt, 6 * dt);
  }
  function step(car, dt) {
    const fx = -Math.sin(car.heading), fz = -Math.cos(car.heading);
    car.x += fx * car.speed * dt; car.z += fz * car.speed * dt;
    car.x = SOL.clamp(car.x, -126, 112); car.z = SOL.clamp(car.z, -126, 128);
    // Building collision: slide out.
    const hit = SOL.City.collide(car.x, car.z, 1.5);
    if (hit) {
      const dx = car.x - hit.x, dz = car.z - hit.z;
      if (Math.abs(dx) / (hit.hw + 1.5) > Math.abs(dz) / (hit.hd + 1.5)) car.x = hit.x + Math.sign(dx || 1) * (hit.hw + 1.6);
      else car.z = hit.z + Math.sign(dz || 1) * (hit.hd + 1.6);
      if (Math.abs(car.speed) > 5) SOL.Audio.crash();
      car.speed *= -0.25;
    }
    car.mesh.position.set(car.x, 0, car.z);
    car.mesh.rotation.y = car.heading;
    car.mesh.rotation.z = -car.steer * 0.04;
    const spin = car.speed * dt * 2.6;
    for (const w of car.mesh.userData.wheels) w.rotation.x += spin;
    if (car.kind === 'police') {
      car.flashT += dt * 9;
      const on = Math.sin(car.flashT) > 0;
      if (car.mesh.userData.lightR) car.mesh.userData.lightR.material.color.setHex(on ? 0xff2222 : 0x551111);
      if (car.mesh.userData.lightB) car.mesh.userData.lightB.material.color.setHex(on ? 0x2244ff : 0x111155);
    }
  }
  // Arcade player driving. input: {f,b,l,r,hand}
  function drive(car, input, dt) {
    const maxF = car.kind === 'sport' ? 34 : 26, maxR = 9;
    if (input.f) car.speed += (car.kind === 'sport' ? 20 : 15) * dt;
    else if (input.b) car.speed -= (car.speed > 0.5 ? 22 : 9) * dt;
    else car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 4.5 * dt);
    if (input.hand) car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 26 * dt);
    car.speed = SOL.clamp(car.speed, -maxR, maxF);
    const steerTarget = (input.l ? 1 : 0) + (input.r ? -1 : 0);
    car.steer += SOL.clamp(steerTarget * 0.55 - car.steer, -4 * dt, 4 * dt);
    if (Math.abs(car.speed) > 0.2) {
      const turn = car.steer * dt * (1.6 - Math.min(1.1, Math.abs(car.speed) / 30)) * Math.sign(car.speed);
      car.heading += turn * (input.hand ? 1.7 : 1);
    }
    // Car-to-car bumps.
    for (const o of cars) {
      if (o === car) continue;
      const d = SOL.dist2d(car.x, car.z, o.x, o.z);
      if (d < 3.1 && d > 0.01) {
        const push = (3.1 - d) * 0.5;
        const nx = (o.x - car.x) / d, nz = (o.z - car.z) / d;
        o.x += nx * push; o.z += nz * push; car.x -= nx * push * 0.4; car.z -= nz * push * 0.4;
        if (Math.abs(car.speed) > 6) { SOL.Audio.crash(); o.speed = car.speed * 0.4; }
        car.speed *= 0.82;
      }
    }
    step(car, dt);
  }
  return { spawn, cars, trafficThink, step, drive, makeCarMesh, palette };
})();
