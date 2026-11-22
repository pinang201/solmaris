// Seeded RNG (mulberry32) so Solmaris is identical on every load.
window.SOL = window.SOL || {};
SOL.makeRng = function (seed) {
  let a = (seed >>> 0) || 1;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
SOL.rngPick = function (rng, arr) { return arr[Math.floor(rng() * arr.length) % arr.length]; };
SOL.rngRange = function (rng, lo, hi) { return lo + rng() * (hi - lo); };
SOL.clamp = function (v, lo, hi) { return Math.max(lo, Math.min(hi, v)); };
SOL.lerp = function (a, b, t) { return a + (b - a) * t; };
SOL.dist2d = function (ax, az, bx, bz) { const dx = ax - bx, dz = az - bz; return Math.sqrt(dx * dx + dz * dz); };
// Wrap an angle to [-PI, PI].
SOL.wrapAngle = function (a) { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
