// Player — Dario Venn on foot: WASD movement, mouse-orbit camera,
// sprint, car entry, and pistol shooting with muzzle flash.
window.SOL = window.SOL || {};
SOL.Player = (function () {
  let mesh = null, gun = null, flash = null;
  const P = {
    x: 60, z: -40, heading: 2.4, health: 100, inCar: null,
    camYaw: 2.4, camPitch: 0.32, walkT: 0, shootCd: 0, dead: false
  };
  function build(scene) {
    const g = new THREE.Group();
    const suit = new THREE.MeshLambertMaterial({ color: 0x2b4a67 });
    const skinM = new THREE.MeshLambertMaterial({ color: 0xd9a066 });
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.8, 0.24), new THREE.MeshLambertMaterial({ color: 0x22262b }));
    legL.position.set(-0.15, 0.4, 0); g.add(legL);
    const legR = legL.clone(); legR.position.x = 0.15; g.add(legR);
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.74, 0.36), suit); torso.position.y = 1.17; g.add(torso);
    const shirt = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.38), new THREE.MeshLambertMaterial({ color: 0xf5e9c9 }));
    shirt.position.y = 1.2; g.add(shirt);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 9, 8), skinM); head.position.y = 1.82; g.add(head);
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.23, 9, 6), new THREE.MeshLambertMaterial({ color: 0x2a1c10 }));
    hair.position.y = 1.9; hair.scale.y = 0.6; g.add(hair);
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.62, 0.18), suit); armL.position.set(-0.42, 1.18, 0); g.add(armL);
    const armR = armL.clone(); armR.position.x = 0.42; g.add(armR);
    gun = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.14, 0.5), new THREE.MeshLambertMaterial({ color: 0x14161a }));
    gun.position.set(0.42, 1.18, -0.4); g.add(gun);
    flash = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 5), new THREE.MeshBasicMaterial({ color: 0xffd76e }));
    flash.position.set(0.42, 1.2, -0.75); flash.visible = false; g.add(flash);
    g.userData = { legL, legR, armL, armR };
    mesh = g; scene.add(g);
    return P;
  }
  // keys: Set of codes; mouse dx accumulated by main.
  function update(dt, keys, camDelta, onCrime) {
    if (!mesh) return;
    P.shootCd -= dt;
    if (flash) flash.visible = false;
    if (P.inCar) { P.x = P.inCar.x; P.z = P.inCar.z; P.heading = P.inCar.heading; mesh.visible = false; return; }
    mesh.visible = true;
    P.camYaw -= (camDelta.x || 0) * 0.0032;
    P.camPitch = SOL.clamp(P.camPitch + (camDelta.y || 0) * 0.0026, 0.06, 1.05);
    let mx = 0, mz = 0;
    if (keys.has('KeyW')) mz += 1; if (keys.has('KeyS')) mz -= 1;
    if (keys.has('KeyA')) mx -= 1; if (keys.has('KeyD')) mx += 1;
    const moving = (mx !== 0 || mz !== 0);
    const sprint = keys.has('ShiftLeft') || keys.has('ShiftRight');
    const spd = sprint ? SOL.CONFIG.sprintSpeed : SOL.CONFIG.playerSpeed;
    if (moving) {
      const ang = P.camYaw + Math.atan2(mx, mz);
      P.heading = ang;
      const nx = P.x + Math.sin(ang) * spd * dt * (mz !== 0 || mx !== 0 ? 1 : 0);
      const nz = P.z + Math.cos(ang) * spd * dt;
      // Movement in camera space: forward is away from camera.
      const fx = -Math.sin(P.camYaw), fz = -Math.cos(P.camYaw);
      const rx = -fz, rz = fx;
      const vx = fx * mz + rx * mx, vz = fz * mz + rz * mx;
      const len = Math.sqrt(vx * vx + vz * vz) || 1;
      const tx = P.x + (vx / len) * spd * dt, tz = P.z + (vz / len) * spd * dt;
      if (!SOL.City.collide(tx, P.z, 0.5)) P.x = tx;
      if (!SOL.City.collide(P.x, tz, 0.5)) P.z = tz;
      P.x = SOL.clamp(P.x, -126, 118); P.z = SOL.clamp(P.z, -126, 128);
      P.walkT += dt * (sprint ? 13 : 9);
    }
    const sw = moving ? Math.sin(P.walkT) * 0.55 : 0;
    mesh.userData.legL.rotation.x = sw; mesh.userData.legR.rotation.x = -sw;
    mesh.userData.armL.rotation.x = -sw * 0.7;
    mesh.userData.armR.rotation.x = keys.has('MouseAim') ? -1.35 : sw * 0.7;
    mesh.position.set(P.x, 0, P.z); mesh.rotation.y = P.heading;
  }
  // Shoot toward camera aim: hits nearest ped/car in a forward cone.
  function shoot(peds, cars, onHit) {
    if (P.shootCd > 0 || P.inCar) return false;
    P.shootCd = 0.24;
    if (flash) flash.visible = true;
    SOL.Audio.shot();
    const dirX = -Math.sin(P.camYaw), dirZ = -Math.cos(P.camYaw);
    let best = null, bestD = 34;
    for (const p of peds) {
      if (p.down) continue;
      const dx = p.x - P.x, dz = p.z - P.z, d = Math.sqrt(dx * dx + dz * dz);
      if (d < bestD && (dx * dirX + dz * dirZ) / (d || 1) > 0.93) { best = { ped: p }; bestD = d; }
    }
    for (const c of cars) {
      const dx = c.x - P.x, dz = c.z - P.z, d = Math.sqrt(dx * dx + dz * dz);
      if (d < bestD && (dx * dirX + dz * dirZ) / (d || 1) > 0.9) { best = { car: c }; bestD = d; }
    }
    if (best) { SOL.Audio.hit(); onHit(best); }
    SOL.Pedestrians.scare(P.x, P.z, 16);
    return true;
  }
  function camera(camera) {
    // Forward on foot is (-sin camYaw, -cos camYaw); a car's forward is
    // (-sin heading, -cos heading). The camera sits behind: target - fwd*dist.
    const target = P.inCar ? P.inCar : P;
    const dist = P.inCar ? 10.5 : 6.4;
    const yaw = P.inCar ? P.inCar.heading : P.camYaw;
    const pitch = P.inCar ? 0.3 : P.camPitch;
    const bx = target.x + Math.sin(yaw) * Math.cos(pitch) * dist;
    const bz = target.z + Math.cos(yaw) * Math.cos(pitch) * dist;
    const by = 1.2 + Math.sin(pitch) * dist + (P.inCar ? 1.6 : 0.6);
    camera.position.set(bx, by, bz);
    camera.lookAt(target.x, 1.6, target.z);
    return { x: bx, z: bz };
  }
  return { build, update, shoot, camera, state: P, get mesh() { return mesh; } };
})();
