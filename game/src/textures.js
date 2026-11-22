// Procedural canvas textures — facades with lit windows, roads, sand.
// Everything is drawn at boot; the game ships zero image files.
window.SOL = window.SOL || {};
SOL.Textures = (function () {
  function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function tex(c, rx, ry) {
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx || 1, ry || 1);
    t.anisotropy = 4; return t;
  }
  function facade(base, rng) {
    const c = canvas(128, 256), g = c.getContext('2d');
    g.fillStyle = base; g.fillRect(0, 0, 128, 256);
    g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, 0, 128, 10);
    for (let y = 0; y < 7; y++) for (let x = 0; x < 4; x++) {
      const lit = rng() > 0.45;
      g.fillStyle = lit ? '#ffd97a' : '#2e4356';
      g.fillRect(10 + x * 30, 18 + y * 33, 18, 20);
      g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(10 + x * 30, 18 + y * 33, 18, 3);
    }
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, 244, 128, 12);
    return c;
  }
  function road() {
    const c = canvas(128, 128), g = c.getContext('2d');
    g.fillStyle = '#33373d'; g.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 300; i++) { g.fillStyle = 'rgba(255,255,255,' + (Math.random() * 0.05) + ')'; g.fillRect(Math.random() * 128, Math.random() * 128, 2, 2); }
    g.fillStyle = '#f5d76e'; g.fillRect(61, 6, 6, 34); g.fillRect(61, 88, 6, 34);
    g.fillStyle = '#e8e8e8'; g.fillRect(2, 0, 3, 128); g.fillRect(123, 0, 3, 128);
    return c;
  }
  function sand() {
    const c = canvas(128, 128), g = c.getContext('2d');
    g.fillStyle = '#e8c98a'; g.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 500; i++) { g.fillStyle = 'rgba(160,120,50,' + (Math.random() * 0.18) + ')'; g.fillRect(Math.random() * 128, Math.random() * 128, 2, 2); }
    return c;
  }
  function awning(col) {
    const c = canvas(64, 32), g = c.getContext('2d');
    for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#ffffff' : col; g.fillRect(i * 8, 0, 8, 32); }
    return c;
  }
  return {
    build: function (rng) {
      const out = { facades: [], road: tex(road(), 1, 6), sand: tex(sand(), 8, 30) };
      const bases = ['#f6c6a8', '#f9e2ae', '#a8d8c8', '#f4a9b8', '#aec6f5', '#e8b4f0', '#fff3c4', '#ffd1a3'];
      for (const b of bases) out.facades.push(tex(facade(b, rng), 1, 1));
      out.awnings = ['#d94f4f', '#2e8f86', '#e8a13a', '#5b7fd4'].map(col => tex(awning(col), 3, 1));
      return out;
    }
  };
})();
