// Staged screenshot scenes — ?shot=cover|drive|chase|mission&seed=1
// auto-starts the game, pins actors/camera/HUD deterministically and
// sets window.__shotReady once the staged frame is stable. Used only
// to capture the entry screenshots; normal play ignores it.
window.SOL = window.SOL || {};
SOL.Shots = (function () {
  const params = new URLSearchParams(location.search);
  const name = params.get('shot');
  function setup(G) {
    if (!name) return;
    const P = SOL.Player.state, M = SOL.Missions.state;
    document.getElementById('start-screen').style.display = 'none';
    if (name === 'cover') {
      // Looking north up the coast road: Dario beside a coral sports car,
      // city avenues on the left, beach and bay on the right.
      const car = G.parkNear(74.5, -29, 0xd94f4f, 'sport');
      car.heading = Math.PI; car.mesh.rotation.y = Math.PI;
      P.x = 71.6; P.z = -31; P.heading = 2.6; P.camYaw = 2.6; P.camPitch = 0.3;
      G.placePedsNear(70, -18, 3); G.placeTrafficNear(76, -52, 1); G.placeTrafficNear(76, -2, -1);
      M.objective = 'Meet Rosa at her flower shop — the first job pays $6,000';
    }
    if (name === 'drive') {
      const car = G.driveCarAt(-16, 6, Math.PI, 0x3a7bd5, 'sedan');
      car.speed = 15; G.placeTrafficNear(-16, -36, 1); G.placeTrafficNear(24, 30, -1);
      G.placePedsNear(-8, 20, 2);
      M.objective = 'Deliver Rosa\u2019s case to the marina office — 118s left';
      SOL.Missions.setMarker(76, 64);
    }
    if (name === 'chase') {
      const car = G.driveCarAt(-16, 30, Math.PI, 0xf2c14e, 'sport');
      car.speed = 19;
      SOL.Police.setWanted(3);
      G.spawnCopAt(-20, 37, Math.PI); G.spawnCopAt(-12, 38, Math.PI); G.spawnCopAt(-16, 41.5, Math.PI);
      M.objective = 'Lose the 3-star wanted level — break line of sight!';
      SOL.Missions.say('Rosa (phone): Three stars, Dario! Alleys! Break their line of sight!', 999);
    }
    if (name === 'mission') {
      P.x = -62; P.z = -90; P.heading = 0.6; P.camYaw = 0.6; P.camPitch = 0.3;
      SOL.Missions.startMission(0, G.missionCtx);
      SOL.Missions.setMarker(-48, -76); // beacon visible ahead in-frame
      SOL.Missions.say('Rosa: Dario, take this locked case to the marina office. Fast — and don\u2019t dent it.', 999);
      G.placePedsNear(-57, -85, 2); G.parkNear(-50, -94, 0x53b06a, 'sedan');
    }
    G.shotMode = name;
    let frames = 0;
    G.shotTick = function () { frames++; if (frames > 45) window.__shotReady = true; };
  }
  return { name, setup };
})();
