// Police & wanted system — crimes raise stars; cruisers spawn at the
// city edge and pursue; staying unseen decays wanted. Busted when a
// cruiser pins a slow player, Wasted at zero health.
window.SOL = window.SOL || {};
SOL.Police = (function () {
  const S = { wanted: 0, heat: 0, hiddenT: 0, bustedT: 0, sirenOn: false };
  let cops = [], sceneRef = null, rngRef = null;
  function init(scene, rng) { sceneRef = scene; rngRef = rng; cops = []; }
  function crime(points, x, z) {
    S.heat = Math.min(5, S.heat + points);
    S.wanted = Math.max(S.wanted, Math.floor(S.heat));
    if (points >= 1) S.wanted = Math.max(S.wanted, 1);
    S.hiddenT = 0;
  }
  function setWanted(n) { S.wanted = SOL.clamp(n, 0, 5); S.heat = S.wanted; }
  function desiredCops() { return S.wanted === 0 ? 0 : 1 + S.wanted; }
  function spawnCop(px, pz) {
    const a = rngRef() * Math.PI * 2, d = 55 + rngRef() * 25;
    const x = SOL.clamp(px + Math.cos(a) * d, -120, 110), z = SOL.clamp(pz + Math.sin(a) * d, -122, 124);
    const car = SOL.Vehicles.spawn(sceneRef, { x, z, heading: rngRef() * 6.28, kind: 'police', driver: 'cop' });
    car.targetSpeed = 15 + S.wanted * 3.2;
    cops.push(car); return car;
  }
  function update(dt, target, events) {
    // Spawn / despawn to match wanted level.
    if (cops.length < desiredCops()) { S.spawnT = (S.spawnT || 0) - dt; if (S.spawnT <= 0) { spawnCop(target.x, target.z); S.spawnT = 1.6; } }
    while (cops.length > desiredCops() + 2) {
      const c = cops.pop(); const i = SOL.Vehicles.cars.indexOf(c); if (i >= 0) SOL.Vehicles.cars.splice(i, 1); sceneRef.remove(c.mesh);
    }
    let nearest = 999, anySeen = false;
    for (const c of cops) {
      const d = SOL.dist2d(c.x, c.z, target.x, target.z);
      nearest = Math.min(nearest, d);
      if (d < 46) anySeen = true;
      // Pursuit steering: aim at target, ram gently.
      const want = Math.atan2(-(target.x - c.x), -(target.z - c.z));
      c.heading += SOL.clamp(SOL.wrapAngle(want - c.heading), -2.2 * dt, 2.2 * dt);
      const top = 14 + S.wanted * 3.4 + (d > 30 ? 5 : 0);
      const inFrontBlocked = SOL.Vehicles.cars.some(o => o !== c && SOL.dist2d(c.x, c.z, o.x, o.z) < 5);
      c.speed += SOL.clamp((inFrontBlocked ? 4 : top) - c.speed, -16 * dt, 7 * dt);
      SOL.Vehicles.step(c, dt);
      // Contact damages / slows the player.
      if (d < 3.4 && Math.abs(c.speed) > 7) { events.onRam && events.onRam(Math.abs(c.speed) * 0.35); c.speed *= 0.6; }
    }
    // Wanted decay only while unseen.
    if (S.wanted > 0) {
      if (!anySeen) { S.hiddenT += dt; if (S.hiddenT > 9) { setWanted(S.wanted - 1); S.hiddenT = 0; events.onWantedDrop && events.onWantedDrop(S.wanted); } }
      else S.hiddenT = 0;
    }
    // Busted: a cop close while the player is slow, sustained.
    const playerSpeed = target.speed !== undefined ? Math.abs(target.speed) : 0;
    if (S.wanted > 0 && nearest < 6 && playerSpeed < 2.2) {
      S.bustedT += dt;
      if (S.bustedT > 2.4) { S.bustedT = 0; events.onBusted && events.onBusted(); }
    } else S.bustedT = Math.max(0, S.bustedT - dt * 2);
    SOL.Audio.setSiren(S.wanted > 0 && cops.length > 0);
    return { nearest, anySeen };
  }
  function clear() { setWanted(0); for (const c of cops) { const i = SOL.Vehicles.cars.indexOf(c); if (i >= 0) SOL.Vehicles.cars.splice(i, 1); sceneRef.remove(c.mesh); } cops = []; }
  return { init, crime, setWanted, update, clear, state: S, get cops() { return cops; } };
})();
