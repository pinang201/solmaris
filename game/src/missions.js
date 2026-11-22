// Missions — the 5-job story chain for Rosa Delgado, plus taxi fares
// and 10 hidden sun charms. Owns objective state, the world beacon,
// dialogue lines and cash rewards. Story: earn $50,000 to save
// Dario's sister's café, The Salty Anchor, from Viktor Hale.
window.SOL = window.SOL || {};
SOL.Missions = (function () {
  const S = {
    index: 0, phase: 'idle', cash: 2500, charms: [], finished: false,
    objective: '', dialogue: '', dialogueT: 0, marker: null,
    timer: 0, drops: 0, taxiPed: null, taxiDest: null, followT: 0
  };
  let beacon = null, beaconRing = null, charmMeshes = [], dropMeshes = [], sceneRef = null;
  const CHARM_SPOTS = [[84, -100], [100, 110], [-100, 108], [24, 30], [-20, -60], [70, -100], [-60, -20], [10, 70], [90, 40], [-104, -60]];
  function init(scene) {
    sceneRef = scene;
    const geo = new THREE.CylinderGeometry(1.6, 1.6, 26, 14, 1, true);
    beacon = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffd94f, transparent: true, opacity: 0.34, side: THREE.DoubleSide, depthWrite: false }));
    beacon.position.y = 13; beacon.visible = false; scene.add(beacon);
    beaconRing = new THREE.Mesh(new THREE.TorusGeometry(2, 0.16, 8, 24), new THREE.MeshBasicMaterial({ color: 0xffd94f }));
    beaconRing.rotation.x = Math.PI / 2; beaconRing.position.y = 0.4; beaconRing.visible = false; scene.add(beaconRing);
    // Sun charms: small golden suns.
    for (let i = 0; i < CHARM_SPOTS.length; i++) {
      const g = new THREE.Group();
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffc92e }));
      g.add(core);
      for (let k = 0; k < 8; k++) {
        const ray = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.55, 4), new THREE.MeshBasicMaterial({ color: 0xffdf6e }));
        const a = (k / 8) * Math.PI * 2; ray.position.set(Math.cos(a) * 0.68, Math.sin(a) * 0.68, 0); ray.rotation.z = a - Math.PI / 2; g.add(ray);
      }
      g.position.set(CHARM_SPOTS[i][0], 1.1, CHARM_SPOTS[i][1]); scene.add(g);
      charmMeshes.push(g);
    }
  }
  function say(text, secs) { S.dialogue = text; S.dialogueT = secs || 6; }
  function setMarker(x, z) { S.marker = { x, z }; beacon.visible = true; beaconRing.visible = true; beacon.position.x = x; beacon.position.z = z; beaconRing.position.x = x; beaconRing.position.z = z; }
  function clearMarker() { S.marker = null; beacon.visible = false; beaconRing.visible = false; }
  function startMission(i, ctx) {
    S.index = i; const m = SOL.CONFIG.missions[i]; if (!m) { S.finished = true; S.objective = 'Story complete — The Salty Anchor is saved! Free-roam Solmaris.'; clearMarker(); return; }
    say(m.intro, 8); S.objective = m.objective; S.phase = 'go';
    const L = SOL.CONFIG.landmarks;
    if (m.id === 'flower') { S.timer = 150; setMarker(L.marina.x, L.marina.z); }
    if (m.id === 'wheelman') { setMarker(L.marinaLot.x, L.marinaLot.z); ctx.spawnGoldCar(); }
    if (m.id === 'tail') { setMarker(L.bank.x, L.bank.z); S.phase = 'toBank'; }
    if (m.id === 'heat') { SOL.Police.setWanted(3); S.phase = 'escape'; S.objective = 'Lose the 3-star wanted level — break line of sight!'; clearMarker(); }
    if (m.id === 'payday') { S.drops = 0; S.phase = 'drops'; ctx.spawnDrops(); setMarker(L.beachDrop.x, L.beachDrop.z); ctx.spawnSyndicate(); }
  }
  function complete(ctx, msg) {
    const m = SOL.CONFIG.missions[S.index];
    S.cash += m.pay; SOL.Audio.missionDone(); SOL.Audio.cash();
    say((msg || 'Job done.') + ' Rosa paid $' + m.pay.toLocaleString() + '. Café fund: $' + S.cash.toLocaleString() + ' / $50,000.', 7);
    ctx.save();
    startMission(S.index + 1, ctx);
    if (S.finished) say('Dario: That\u2019s the last of it — $' + S.cash.toLocaleString() + '. The Salty Anchor stays ours. Hale can whistle.', 10);
  }
  function makeDrop(scene, x, z) {
    const g = new THREE.Group();
    const bag = new THREE.Mesh(new THREE.SphereGeometry(0.55, 9, 7), new THREE.MeshLambertMaterial({ color: 0x2e8f4e }));
    bag.scale.y = 1.25; bag.position.y = 0.7; g.add(bag);
    const knot = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.4, 6), new THREE.MeshLambertMaterial({ color: 0x1f6b38 }));
    knot.position.y = 1.55; g.add(knot);
    g.position.set(x, 0, z); scene.add(g); dropMeshes.push(g); return g;
  }
  function update(dt, ctx) {
    S.dialogueT -= dt;
    if (beacon) { beacon.rotation.y += dt * 0.7; beaconRing.scale.setScalar(1 + Math.sin(performance.now() * 0.005) * 0.12); }
    for (let i = 0; i < charmMeshes.length; i++) {
      const g = charmMeshes[i]; if (!g.visible) continue;
      g.rotation.y += dt * 1.6; g.position.y = 1.1 + Math.sin(performance.now() * 0.003 + i) * 0.18;
      if (SOL.dist2d(ctx.px, ctx.pz, CHARM_SPOTS[i][0], CHARM_SPOTS[i][1]) < 2.2 && !S.charms.includes(i)) {
        S.charms.push(i); g.visible = false; SOL.Audio.pickup(); say('Sun charm found! ' + S.charms.length + ' / 10 hidden in Solmaris.', 3.5); ctx.save();
      }
    }
    const m = SOL.CONFIG.missions[S.index]; if (!m || S.finished) return;
    const d = S.marker ? SOL.dist2d(ctx.px, ctx.pz, S.marker.x, S.marker.z) : 999;
    if (m.id === 'flower') {
      S.timer -= dt; S.objective = 'Deliver Rosa\u2019s case to the marina office — ' + Math.max(0, Math.ceil(S.timer)) + 's left';
      if (S.timer <= 0) { say('Rosa: Too slow, love. The buyer left. Try again.', 5); S.timer = 150; }
      if (d < 5) complete(ctx, 'Case delivered, seal unbroken.');
    }
    if (m.id === 'wheelman') {
      if (S.phase === 'go' && ctx.inGoldCar) { S.phase = 'deliver'; setMarker(SOL.CONFIG.landmarks.garage.x, SOL.CONFIG.landmarks.garage.z); S.objective = 'Deliver the golden Aurora GT to Rosa\u2019s garage'; say('Rosa: That\u2019s it! Golden and gorgeous. Now bring her home — gently-ish.', 6); }
      else if (S.phase === 'deliver' && d < 6 && ctx.inGoldCar) complete(ctx, 'The Aurora GT purrs into Rosa\u2019s garage.');
    }
    if (m.id === 'tail') {
      if (S.phase === 'toBank' && d < 7) { S.phase = 'follow'; ctx.spawnCourier(); say('There he is. Pale blue sedan. Stay in the band: 14–42 m.', 6); clearMarker(); }
      else if (S.phase === 'follow' && ctx.courier) {
        const cd = SOL.dist2d(ctx.px, ctx.pz, ctx.courier.x, ctx.courier.z);
        S.objective = 'Tail the courier — distance ' + Math.round(cd) + ' m (keep 14–42 m) · route ' + Math.round(ctx.courierProgress * 100) + '%';
        if (cd < 11) { say('Too close! He\u2019s made you — back off!', 2.5); S.followT += dt; }
        else if (cd > 55) { say('You\u2019re losing him! Close the gap!', 2.5); S.followT += dt * 0.6; }
        if (S.followT > 5) { S.phase = 'toBank'; ctx.removeCourier(); setMarker(SOL.CONFIG.landmarks.bank.x, SOL.CONFIG.landmarks.bank.z); say('Rosa: He shook you. Circle back to the bank and try again.', 5); S.followT = 0; }
        if (ctx.courierDone) { S.phase = 'grab'; setMarker(ctx.courier.x, ctx.courier.z); S.objective = 'The courier stopped — grab the ledger from his car'; }
      }
      else if (S.phase === 'grab' && d < 4.5) { ctx.removeCourier(); SOL.Police.crime(1); complete(ctx, 'Ledger secured from the courier\u2019s car.'); }
    }
    if (m.id === 'heat') {
      if (S.phase === 'escape') {
        if (SOL.Police.state.wanted === 0) { S.phase = 'safe'; setMarker(SOL.CONFIG.landmarks.safehouse.x, SOL.CONFIG.landmarks.safehouse.z); S.objective = 'Heat is off — reach the safehouse'; say('Rosa: Sirens are fading. Now the safehouse, top of Harbor Hill.', 6); }
        else S.objective = 'Lose the 3-star wanted level — break line of sight! (' + SOL.Police.state.wanted + ' stars)';
      } else if (S.phase === 'safe' && d < 6) complete(ctx, 'Safe. Rosa is already reading the ledger by lamplight.');
    }
    if (m.id === 'payday' && S.phase === 'drops') {
      // Drops handled by main via dropMeshes proximity below.
      for (let i = dropMeshes.length - 1; i >= 0; i--) {
        const g = dropMeshes[i];
        if (SOL.dist2d(ctx.px, ctx.pz, g.position.x, g.position.z) < 4) {
          sceneRef.remove(g); dropMeshes.splice(i, 1); S.drops++; SOL.Audio.cash();
          say('Cash drop ' + S.drops + ' / 3 in the bag.', 3.5);
          const L = SOL.CONFIG.landmarks;
          if (S.drops === 1) setMarker(L.lighthouse.x, L.lighthouse.z);
          else if (S.drops === 2) setMarker(L.downtownDrop.x, L.downtownDrop.z);
          else if (S.drops >= 3) { S.phase = 'deliver'; setMarker(L.cafe.x, L.cafe.z); S.objective = 'Deliver the money to The Salty Anchor café'; say('Rosa: All three! Now the café — your sister is waiting, Dario.', 6); }
        }
      }
      if (S.phase === 'drops') S.objective = 'Collect 3 cash drops (' + S.drops + ' / 3) — syndicate cars will ram you';
    }
    if (m.id === 'payday' && S.phase === 'deliver' && d < 6) complete(ctx, 'Delivered at The Salty Anchor.');
  }
  return { init, startMission, update, say, setMarker, clearMarker, makeDrop, state: S, charmMeshes, get drops() { return dropMeshes; } };
})();
