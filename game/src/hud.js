// HUD — DOM updates plus the canvas minimap (roads, player arrow,
// police blips, objective marker, charms) and wanted stars.
window.SOL = window.SOL || {};
SOL.Hud = (function () {
  let els = null, mapCtx = null;
  function init() {
    els = {
      cash: document.getElementById('hud-cash'), stars: document.getElementById('hud-stars'),
      health: document.getElementById('hud-health-fill'), objective: document.getElementById('hud-objective'),
      missionName: document.getElementById('hud-mission'), dialogue: document.getElementById('hud-dialogue'),
      speed: document.getElementById('hud-speed'), clock: document.getElementById('hud-clock'),
      charms: document.getElementById('hud-charms'), prompt: document.getElementById('hud-prompt'),
      bustedBar: document.getElementById('hud-busted-fill'), banner: document.getElementById('hud-banner')
    };
    const c = document.getElementById('minimap'); if (c) mapCtx = c.getContext('2d');
  }
  function fmt(n) { return '$' + Math.round(n).toLocaleString('en-US'); }
  function update(state) {
    if (!els) return;
    els.cash.textContent = fmt(state.cash);
    els.charms.textContent = '☀ ' + state.charms + ' / 10';
    let stars = '';
    for (let i = 0; i < 5; i++) stars += i < state.wanted ? '★' : '☆';
    els.stars.textContent = stars;
    els.stars.style.opacity = state.wanted ? '1' : '0.35';
    els.health.style.width = SOL.clamp(state.health, 0, 100) + '%';
    els.health.style.background = state.health > 35 ? '#53d769' : '#e33e3e';
    els.objective.textContent = state.objective || '';
    els.missionName.textContent = state.missionName || '';
    els.dialogue.textContent = state.dialogueT > 0 ? state.dialogue : '';
    els.dialogue.style.display = state.dialogueT > 0 ? 'block' : 'none';
    els.speed.textContent = state.inCar ? Math.round(Math.abs(state.speed) * 3.6) + ' km/h' : '';
    const mins = Math.floor(state.clockMin) % (24 * 60);
    const hh = String(Math.floor(mins / 60)).padStart(2, '0'), mm = String(mins % 60).padStart(2, '0');
    els.clock.textContent = hh + ':' + mm;
    els.prompt.textContent = state.prompt || '';
    els.prompt.style.display = state.prompt ? 'block' : 'none';
    els.bustedBar.style.width = SOL.clamp(state.busted01 * 100, 0, 100) + '%';
    drawMap(state);
  }
  function banner(text, ms) {
    if (!els) return;
    els.banner.textContent = text; els.banner.style.display = 'block';
    setTimeout(() => { els.banner.style.display = 'none'; }, ms || 2600);
  }
  function w2m(x, z, size) { // world [-140,140] -> minimap px
    return [(x + 140) / 280 * size, (z + 140) / 280 * size];
  }
  function drawMap(s) {
    if (!mapCtx) return;
    const g = mapCtx, S = 168;
    g.fillStyle = '#274b3a'; g.fillRect(0, 0, S, S);
    g.fillStyle = '#1e7f9e'; const [wx, wy] = w2m(106, -140, S); g.fillRect(wx, 0, S - wx, S);
    g.fillStyle = '#e8c98a'; const [bx] = w2m(88, 0, S); g.fillRect(bx, 0, wx - bx, S);
    g.strokeStyle = '#4a4f57'; g.lineWidth = 4;
    for (const x of SOL.CONFIG.avenues.concat([76])) { const [px] = w2m(x, 0, S); g.beginPath(); g.moveTo(px, 0); g.lineTo(px, S); g.stroke(); }
    for (const z of SOL.CONFIG.streets) { const [, py] = w2m(0, z, S); g.beginPath(); g.moveTo(0, py); g.lineTo(S, py); g.stroke(); }
    if (s.marker) { const [mx, my] = w2m(s.marker.x, s.marker.z, S); g.fillStyle = '#ffd94f'; g.beginPath(); g.arc(mx, my, 5 + Math.sin(Date.now() * 0.008) * 1.4, 0, 7); g.fill(); }
    g.fillStyle = '#2266ff';
    for (const c of s.cops) { const [cx, cy] = w2m(c.x, c.z, S); g.fillRect(cx - 2.5, cy - 2.5, 5, 5); }
    g.fillStyle = '#ff5544';
    for (const c of s.hostiles) { const [cx, cy] = w2m(c.x, c.z, S); g.fillRect(cx - 2.5, cy - 2.5, 5, 5); }
    // Player arrow.
    const [px, py] = w2m(s.px, s.pz, S);
    g.save(); g.translate(px, py); g.rotate(-s.heading);
    g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(0, -7); g.lineTo(4.6, 5); g.lineTo(-4.6, 5); g.closePath(); g.fill();
    g.restore();
  }
  return { init, update, banner };
})();
