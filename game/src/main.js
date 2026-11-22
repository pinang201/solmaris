// Solmaris — boot and game loop. Wires city, vehicles, pedestrians,
// player, police, missions, HUD and save into one state machine:
// title -> playing <-> paused -> busted/wasted -> hospital respawn.
(function () {
  'use strict';
  const params = new URLSearchParams(location.search);
  const seed = parseInt(params.get('seed') || '20261122', 10);
  const rng = SOL.makeRng(seed);
  const canvas = document.getElementById('game3d');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 900);
  function resize() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize); resize();

  const textures = SOL.Textures.build(SOL.makeRng(7));
  SOL.City.build(scene, SOL.makeRng(99), textures);
  const P = SOL.Player.build(scene);
  SOL.Police.init(scene, SOL.makeRng(1234));
  SOL.Missions.init(scene);
  SOL.Hud.init();

  // --- World population -------------------------------------------------
  const C = SOL.CONFIG;
  let goldCar = null, courier = null, courierRoute = null, syndicate = [];
  function parkNear(x, z, color, kind) {
    return SOL.Vehicles.spawn(scene, { x, z, heading: 0, color, kind: kind || 'sedan', driver: 'parked' });
  }
  // Parked cars along avenues and the marina lot.
  for (let i = 0; i < 16; i++) {
    const av = SOL.rngPick(rng, C.avenues.concat([76]));
    parkNear(av + (rng() > 0.5 ? 4.4 : -4.4), -115 + rng() * 230, SOL.rngPick(rng, SOL.Vehicles.palette), rng() > 0.8 ? 'pickup' : 'sedan');
  }
  for (let i = 0; i < 4; i++) parkNear(60 + i * 5.5, 46, SOL.rngPick(rng, SOL.Vehicles.palette), 'sedan');
  // Moving traffic.
  const traffic = [];
  for (let i = 0; i < 11; i++) {
    const c = SOL.Vehicles.spawn(scene, {
      x: SOL.rngPick(rng, C.avenues), z: -110 + rng() * 220,
      heading: 0, color: SOL.rngPick(rng, SOL.Vehicles.palette),
      kind: rng() > 0.85 ? 'pickup' : 'sedan', driver: 'traffic'
    });
    traffic.push(c);
  }
  // Pedestrians.
  for (let i = 0; i < 26; i++) SOL.Pedestrians.spawn(scene, rng, -110 + rng() * 220, -115 + rng() * 230);

  // --- Game state --------------------------------------------------------
  const G = {
    mode: 'title', clockMin: 17 * 60 + 12, time: 0, shotMode: null, shotTick: null,
    taxi: null, taxiCooldown: 20, crashCd: 0
  };
  const keys = new Set(); let mouseDX = 0, mouseDY = 0, mouseAim = false;
  const missionCtx = {
    get px() { return P.x; }, get pz() { return P.z; },
    get inGoldCar() { return !!(P.inCar && goldCar && P.inCar === goldCar); },
    get courier() { return courier; },
    get courierProgress() { return courierRoute ? courierRoute.t / courierRoute.total : 0; },
    get courierDone() { return !!(courierRoute && courierRoute.done); },
    spawnGoldCar: function () {
      if (goldCar) return;
      goldCar = SOL.Vehicles.spawn(scene, { x: C.landmarks.marinaLot.x, z: C.landmarks.marinaLot.z, heading: 1.2, color: 0xf7b500, kind: 'sport', driver: 'parked' });
      goldCar.isGold = true;
    },
    spawnCourier: function () {
      courier = SOL.Vehicles.spawn(scene, { x: 24, z: -22, heading: Math.PI, color: 0xaec6f5, kind: 'sedan', driver: 'courier' });
      // Route: downtown -> coast -> marina district, then stop.
      courierRoute = { pts: [[24, 24], [24, 64], [64, 64], [64, 30]], i: 0, t: 0, total: 4, done: false };
    },
    removeCourier: function () {
      if (!courier) return;
      const i = SOL.Vehicles.cars.indexOf(courier); if (i >= 0) SOL.Vehicles.cars.splice(i, 1);
      scene.remove(courier.mesh); courier = null; courierRoute = null;
    },
    spawnDrops: function () {
      const L = C.landmarks;
      SOL.Missions.makeDrop(scene, L.beachDrop.x, L.beachDrop.z);
      SOL.Missions.makeDrop(scene, L.lighthouse.x - 4, L.lighthouse.z - 4);
      SOL.Missions.makeDrop(scene, L.downtownDrop.x, L.downtownDrop.z);
    },
    spawnSyndicate: function () {
      for (let i = 0; i < 3; i++) {
        const c = SOL.Vehicles.spawn(scene, { x: 40 + i * 14, z: 90 - i * 10, heading: 0, color: 0x1c1e24, kind: 'pickup', driver: 'syndicate', syndicate: true });
        syndicate.push(c);
      }
    },
    save: function () { SOL.Save.store(SOL.Missions.state); }
  };
  G.missionCtx = missionCtx;
  // Helpers exposed for screenshot staging.
  G.parkNear = parkNear;
  G.driveCarAt = function (x, z, heading, color, kind) {
    const car = SOL.Vehicles.spawn(scene, { x, z, heading, color, kind, driver: 'player' });
    P.inCar = car; P.x = x; P.z = z; return car;
  };
  G.placePedsNear = function (x, z, n) {
    for (let i = 0; i < n && i < SOL.Pedestrians.peds.length; i++) {
      const p = SOL.Pedestrians.peds[i]; p.x = x + i * 2.4; p.z = z + i * 1.8; p.route = null; p.heading = 2;
    }
  };
  G.placeTrafficNear = function (x, z, dir) {
    const c = traffic.find(t => !t.placed); if (!c) return;
    c.placed = true; c.x = x; c.z = z; c.route = { axis: 'z', fixed: x > 70 ? 76 : Math.round(x), dir: dir || 1 }; c.speed = 8;
  };
  G.spawnCopAt = function (x, z, heading) {
    const car = SOL.Vehicles.spawn(scene, { x, z, heading, kind: 'police', driver: 'cop' });
    SOL.Police.cops.push(car); return car;
  };

  // --- Flow ---------------------------------------------------------------
  function show(id, on) { document.getElementById(id).style.display = on ? 'flex' : 'none'; }
  function startGame(fresh) {
    SOL.Audio.unlock(); SOL.Audio.startMusic();
    if (fresh) {
      SOL.Save.clear();
      const s = SOL.Missions.state;
      s.cash = 2500; s.charms = []; s.finished = false;
      SOL.Missions.startMission(0, missionCtx);
      SOL.Missions.charmMeshes.forEach(g => g.visible = true);
    } else {
      const sv = SOL.Save.load();
      if (sv) {
        const s = SOL.Missions.state;
        s.cash = sv.cash; s.charms = sv.charms || []; s.finished = !!sv.finished;
        for (const ci of s.charms) if (SOL.Missions.charmMeshes[ci]) SOL.Missions.charmMeshes[ci].visible = false;
        if (s.finished) { s.objective = 'Story complete — The Salty Anchor is saved! Free-roam Solmaris.'; }
        else SOL.Missions.startMission(Math.min(sv.mission || 0, 4), missionCtx);
      } else SOL.Missions.startMission(0, missionCtx);
    }
    P.health = 100; P.x = 60; P.z = -40; P.inCar = null; P.camYaw = 2.4;
    show('start-screen', false); show('end-screen', false); show('pause-screen', false);
    document.getElementById('hud').style.display = 'block';
    SOL.Missions.clearOverride(); G.taxi = null;
    G.mode = 'playing';
    SOL.Hud.banner('SOLMARIS', 1800);
  }
  function endRun(kind) {
    G.mode = 'ended';
    SOL.Audio.fail(); SOL.Audio.setEngine(false, 0);
    const fine = Math.min(SOL.Missions.state.cash, kind === 'busted' ? 600 : 900);
    SOL.Missions.state.cash -= fine; missionCtx.save();
    document.getElementById('end-title').textContent = kind === 'busted' ? 'BUSTED' : 'WASTED';
    document.getElementById('end-text').textContent = kind === 'busted'
      ? 'Solmaris PD walks you out of the holding cell at dawn. Fine paid: $' + fine + '. Rosa is not impressed.'
      : 'You wake up in Solmaris Hospital with a bandage and a bill: $' + fine + '. The café still needs you, Dario.';
    show('end-screen', true);
    if (document.exitPointerLock) document.exitPointerLock();
  }
  function respawn() {
    SOL.Police.clear();
    for (const c of syndicate) { const i = SOL.Vehicles.cars.indexOf(c); if (i >= 0) SOL.Vehicles.cars.splice(i, 1); scene.remove(c.mesh); }
    syndicate = [];
    P.health = 100; P.inCar = null; P.x = C.landmarks.hospital.x + 9; P.z = C.landmarks.hospital.z + 8;
    show('end-screen', false); G.mode = 'playing';
    SOL.Missions.say('Nurse: Easy, Mr Venn. Your car keys are… somewhere. The city is still out there.', 5);
  }
  document.getElementById('btn-new').onclick = () => { SOL.Audio.click(); startGame(true); };
  document.getElementById('btn-continue').onclick = () => { SOL.Audio.click(); startGame(false); };
  document.getElementById('btn-respawn').onclick = () => { SOL.Audio.click(); respawn(); };
  document.getElementById('btn-resume').onclick = () => { show('pause-screen', false); G.mode = 'playing'; };
  document.getElementById('btn-save').onclick = () => { missionCtx.save(); SOL.Hud.banner('SAVED', 1200); };
  document.getElementById('btn-quit').onclick = () => { missionCtx.save(); show('pause-screen', false); show('start-screen', true); G.mode = 'title'; document.getElementById('hud').style.display = 'none'; };
  if (!SOL.Save.has()) document.getElementById('btn-continue').style.opacity = '0.5';

  // --- Input ---------------------------------------------------------------
  window.addEventListener('keydown', e => {
    keys.add(e.code);
    if (e.code === 'KeyP' || e.code === 'Escape') {
      if (G.mode === 'playing') {
        G.mode = 'paused'; show('pause-screen', true);
        document.getElementById('pause-stats').textContent =
          'Cash $' + SOL.Missions.state.cash.toLocaleString() + ' · ' + (SOL.Missions.state.finished ? 'Story complete' : 'Mission ' + (SOL.Missions.state.index + 1) + ' of 5') + ' · Charms ' + SOL.Missions.state.charms.length + '/10';
        if (document.exitPointerLock) document.exitPointerLock();
      } else if (G.mode === 'paused') { show('pause-screen', false); G.mode = 'playing'; }
    }
    if (e.code === 'KeyE' && G.mode === 'playing') tryEnterExit();
    if (e.code === 'Space') e.preventDefault();
  });
  window.addEventListener('keyup', e => keys.delete(e.code));
  canvas.addEventListener('click', () => {
    if (G.mode === 'playing' && !G.shotMode && canvas.requestPointerLock) canvas.requestPointerLock();
    SOL.Audio.unlock();
  });
  document.addEventListener('mousemove', e => {
    if (document.pointerLockElement === canvas) { mouseDX += e.movementX || 0; mouseDY += e.movementY || 0; }
  });
  document.addEventListener('mousedown', e => {
    if (G.mode !== 'playing' || e.target !== canvas) return;
    if (e.button === 0 && !P.inCar) {
      const hit = SOL.Player.shoot(SOL.Pedestrians.peds, SOL.Vehicles.cars, onShootHit);
      if (hit) SOL.Police.crime(1.6, P.x, P.z);
    }
    if (e.button === 2) mouseAim = true;
  });
  document.addEventListener('mouseup', e => { if (e.button === 2) mouseAim = false; });
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  function onShootHit(best) {
    if (best.ped) { best.ped.down = true; best.ped.health = 0; SOL.Police.crime(1.2, P.x, P.z); }
    if (best.car) { best.car.health -= 25; if (best.car.driver === 'traffic') SOL.Pedestrians.scare(best.car.x, best.car.z, 10); }
  }
  function tryEnterExit() {
    if (P.inCar) {
      const car = P.inCar; P.inCar = null;
      P.x = car.x + Math.cos(car.heading) * 2.4; P.z = car.z - Math.sin(car.heading) * 2.4;
      if (car.driver === 'player') car.driver = 'parked';
      SOL.Audio.door(); SOL.Audio.setEngine(false, 0);
      return;
    }
    let best = null, bd = 4.2;
    for (const c of SOL.Vehicles.cars) { const d = SOL.dist2d(P.x, P.z, c.x, c.z); if (d < bd) { bd = d; best = c; } }
    if (best) {
      const wasParked = best.driver === 'parked';
      P.inCar = best; best.driver = 'player'; SOL.Audio.door();
      if (!wasParked || best.isGold) { SOL.Police.crime(best.isGold ? 1.4 : 0.7, P.x, P.z); SOL.Missions.say(best.isGold ? 'That\u2019s the Aurora GT! Golden, loud, and very stolen.' : 'Borrowed. You\u2019ll bring it back. Probably.', 3.5); }
      if (best.kind === 'police') { const ci = SOL.Police.cops.indexOf(best); if (ci >= 0) SOL.Police.cops.splice(ci, 1); SOL.Police.crime(1, P.x, P.z); }
    }
  }

  // --- Taxi side jobs -------------------------------------------------------
  function updateTaxi(dt) {
    G.taxiCooldown -= dt;
    const M = SOL.Missions.state;
    if (!G.taxi && G.taxiCooldown <= 0) {
      let best = null, bd = 55;
      for (const p of SOL.Pedestrians.peds) { if (p.down) continue; const d = SOL.dist2d(P.x, P.z, p.x, p.z); if (d < bd) { bd = d; best = p; } }
      if (best) { G.taxi = { ped: best, phase: 'pickup' }; best.taxi = true; }
    }
    if (G.taxi) {
      const t = G.taxi;
      if (t.phase === 'pickup') {
        SOL.Missions.setOverride(t.ped.x, t.ped.z);
        if (P.inCar && SOL.dist2d(P.x, P.z, t.ped.x, t.ped.z) < 4.5) {
          t.phase = 'ride'; const dests = [C.landmarks.cafe, C.landmarks.marina, C.landmarks.bank, C.landmarks.rosa, C.landmarks.hospital];
          t.dest = SOL.rngPick(rng, dests); t.dist = Math.max(30, SOL.dist2d(P.x, P.z, t.dest.x, t.dest.z));
          t.ped.mesh.visible = false;
          SOL.Missions.setOverride(t.dest.x, t.dest.z);
          SOL.Missions.say('Passenger: ' + t.dest.label + ', please — and I tip for smooth driving!', 4);
          // Story marker is preserved underneath; the override is cleared on drop-off.
        } else if (!P.inCar && SOL.dist2d(P.x, P.z, t.ped.x, t.ped.z) < 3) {
          // Hint only; pickup needs a car.
        }
      } else if (t.phase === 'ride' && SOL.dist2d(P.x, P.z, t.dest.x, t.dest.z) < 6) {
        const fare = Math.round(t.dist * 1.6);
        M.cash += fare; SOL.Audio.cash();
        SOL.Missions.say('Passenger: Perfect ride! Fare $' + fare + '. Five stars, wheelman.', 4);
        t.ped.mesh.visible = true; t.ped.x = t.dest.x + 3; t.ped.z = t.dest.z + 3; t.ped.taxi = false;
        G.taxi = null; G.taxiCooldown = 35; missionCtx.save();
        // Override cleared: beacon returns to the story objective automatically.
        SOL.Missions.clearOverride();
      }
    }
  }

  // --- Per-frame update -------------------------------------------------------
  const policeEvents = {
    onRam: function (dmg) { if (G.crashCd <= 0) { P.health -= dmg; G.crashCd = 0.5; SOL.Audio.crash(); if (P.health <= 0) endRun('wasted'); } },
    onBusted: function () { endRun('busted'); },
    onWantedDrop: function (n) { if (n === 0) SOL.Missions.say('Heat\u2019s off. Solmaris forgets — for now.', 3.5); }
  };
  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    let dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (G.mode === 'paused' || G.mode === 'title' || G.mode === 'ended') {
      // Still render a living backdrop behind menus.
      if (G.mode !== 'paused') { SOL.City.update(dt, now / 1000); renderer.render(scene, camera); }
      if (G.mode === 'title' && !G.shotMode) {
        const t = now / 1000;
        camera.position.set(88 + Math.sin(t * 0.05) * 6, 15, -58 + Math.cos(t * 0.04) * 6);
        camera.lookAt(20, 4, 0); renderer.render(scene, camera);
      }
      if (G.shotMode && G.mode === 'title') { G.mode = 'playing'; document.getElementById('hud').style.display = 'block'; }
      if (G.mode !== 'playing') { if (G.shotTick) G.shotTick(); return; }
    }
    G.time += dt; G.clockMin += dt * 1.0; G.crashCd -= dt;
    const shotPin = !!G.shotMode;
    // Player / driving.
    const camDelta = { x: mouseDX, y: mouseDY }; mouseDX = 0; mouseDY = 0;
    if (mouseAim) keys.add('MouseAim'); else keys.delete('MouseAim');
    SOL.Player.update(dt, keys, camDelta, null);
    if (P.inCar && !shotPin) {
      const input = { f: keys.has('KeyW'), b: keys.has('KeyS'), l: keys.has('KeyA'), r: keys.has('KeyD'), hand: keys.has('Space') };
      const before = Math.abs(P.inCar.speed);
      SOL.Vehicles.drive(P.inCar, input, dt);
      SOL.Audio.setEngine(true, Math.abs(P.inCar.speed) / 30);
      if (before > 12 && Math.abs(P.inCar.speed) < before - 8 && G.crashCd <= 0) { P.health -= 6; G.crashCd = 0.6; if (P.health <= 0) endRun('wasted'); }
      // Running over a pedestrian is a serious crime.
      for (const p of SOL.Pedestrians.peds) {
        if (!p.down && Math.abs(P.inCar.speed) > 3 && SOL.dist2d(P.inCar.x, P.inCar.z, p.x, p.z) < 1.7) {
          p.down = true; SOL.Police.crime(2, P.x, P.z); SOL.Audio.crash();
          SOL.Missions.say('Dario: Oh no — Rosa is going to hear about that…', 3);
        }
      }
    } else if (!P.inCar) SOL.Audio.setEngine(false, 0);
    // Traffic + parked car sync.
    for (const c of SOL.Vehicles.cars) {
      if (c === P.inCar || c.driver === 'cop' || c.driver === 'courier' || c.driver === 'syndicate') continue;
      if (c.driver === 'traffic') { SOL.Vehicles.trafficThink(c, dt, rng); SOL.Vehicles.step(c, dt); }
      else SOL.Vehicles.step(c, 0); // parked: sync mesh only
    }
    // Courier route driving.
    if (courier && courierRoute && !courierRoute.done) {
      const wp = courierRoute.pts[courierRoute.i];
      if (wp) {
        const want = Math.atan2(-(wp[0] - courier.x), -(wp[1] - courier.z));
        courier.heading += SOL.clamp(SOL.wrapAngle(want - courier.heading), -2 * dt, 2 * dt);
        courier.speed += SOL.clamp(10 - courier.speed, -10 * dt, 5 * dt);
        if (SOL.dist2d(courier.x, courier.z, wp[0], wp[1]) < 5) { courierRoute.i++; courierRoute.t = courierRoute.i; }
      }
      if (courierRoute.i >= courierRoute.pts.length) { courierRoute.done = true; courier.speed = 0; }
      SOL.Vehicles.step(courier, dt);
    } else if (courier) SOL.Vehicles.step(courier, 0);
    // Syndicate rammers (mission 5).
    for (const c of syndicate) {
      const want = Math.atan2(-(P.x - c.x), -(P.z - c.z));
      c.heading += SOL.clamp(SOL.wrapAngle(want - c.heading), -1.9 * dt, 1.9 * dt);
      c.speed += SOL.clamp(17 - c.speed, -12 * dt, 6 * dt);
      SOL.Vehicles.step(c, dt);
      if (SOL.dist2d(c.x, c.z, P.x, P.z) < 3.4 && G.crashCd <= 0) { P.health -= 5; G.crashCd = 0.7; SOL.Audio.crash(); if (P.health <= 0) endRun('wasted'); }
    }
    // Police. In staged shots the cruisers hold position and just flash.
    const target = P.inCar ? P.inCar : P;
    if (shotPin) { for (const c of SOL.Police.cops) { c.speed = 0; SOL.Vehicles.step(c, dt); } }
    else SOL.Police.update(dt, target, policeEvents);
    if (G.mode !== 'playing') { renderer.render(scene, camera); return; }
    // World life.
    const danger = P.inCar ? { x: P.x, z: P.z, fast: Math.abs(P.inCar.speed) > 13 } : null;
    SOL.Pedestrians.update(dt, rng, danger);
    SOL.City.update(dt, G.time);
    if (!shotPin) { SOL.Missions.update(dt, missionCtx); updateTaxi(dt); }
    // Slow health regen when calm.
    if (SOL.Police.state.wanted === 0 && P.health > 0 && P.health < 100) P.health = Math.min(100, P.health + dt * 1.6);
    // Camera + HUD.
    if (shotPin) {
      // Deterministic staged camera: orbit slightly for life, fixed framing per scene.
      if (G.shotMode === 'cover') { camera.position.set(89, 4.2, -49); camera.lookAt(69, 1.8, -20); }
      else if (G.shotMode === 'drive') { camera.position.set(-16 + 7.5, 4.6, 6 + 10); camera.lookAt(-16, 1.4, -6); }
      else if (G.shotMode === 'chase') { camera.position.set(-6, 5.5, 48); camera.lookAt(-17, 1.2, 18); }
      else if (G.shotMode === 'mission') { camera.position.set(-72, 4.4, -100); camera.lookAt(-52, 1.5, -80); }
    } else SOL.Player.camera(camera);
    let prompt = '';
    if (!P.inCar) {
      let bd = 4.2; for (const c of SOL.Vehicles.cars) bd = Math.min(bd, SOL.dist2d(P.x, P.z, c.x, c.z));
      if (bd < 4.2) prompt = 'Press E to enter car';
      if (G.taxi && G.taxi.phase === 'pickup' && SOL.dist2d(P.x, P.z, G.taxi.ped.x, G.taxi.ped.z) < 6) prompt = 'Taxi fare waiting — bring a car here!';
    } else prompt = 'E exit · Space handbrake';
    const M = SOL.Missions.state;
    SOL.Hud.update({
      cash: M.cash, wanted: SOL.Police.state.wanted, health: P.health,
      objective: M.objective, missionName: SOL.CONFIG.missions[M.index] ? SOL.CONFIG.missions[M.index].name : 'Free Roam',
      dialogue: M.dialogue, dialogueT: M.dialogueT,
      inCar: !!P.inCar, speed: P.inCar ? P.inCar.speed : 0, clockMin: G.clockMin,
      charms: M.charms.length, prompt, busted01: SOL.Police.state.bustedT / 2.4,
      px: P.x, pz: P.z, heading: P.inCar ? P.inCar.heading : P.camYaw,
      marker: SOL.Missions.displayMarker(),
      cops: SOL.Police.cops, hostiles: syndicate
    });
    renderer.render(scene, camera);
    if (G.shotTick) G.shotTick();
  }
  // Screenshot staging runs after the world exists.
  if (SOL.Shots.name) { SOL.Shots.setup(G); show('start-screen', false); }
  requestAnimationFrame(frame);
})();
