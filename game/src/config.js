// Solmaris configuration — city layout, tuning and story data.
// All distances are metres in three.js world units. The city is a
// deterministic grid: vertical avenues and horizontal streets cross
// city blocks; the bay and beach sit on the east (+X) edge.
window.SOL = window.SOL || {};
SOL.CONFIG = {
  cityHalf: 120,
  avenues: [-96, -56, -16, 24, 64],        // x of N-S roads
  streets: [-96, -56, -16, 24, 64, 104],   // z of E-W roads
  roadW: 11, sidewalkW: 3.4,
  beachX: 88, waterX: 106,
  playerSpeed: 7.2, sprintSpeed: 11.5,
  gravity: 0,
  colors: {
    sky: 0xffb36b, skyTop: 0x3a6ea5, fog: 0xf2a56b,
    sand: 0xe8c98a, water: 0x1e7f9e, road: 0x33373d,
    sidewalk: 0xb8a88f, grass: 0x5f9e52,
    pastel: [0xf6c6a8, 0xf9e2ae, 0xa8d8c8, 0xf4a9b8, 0xaec6f5, 0xe8b4f0, 0xfff3c4, 0xffd1a3]
  },
  missions: [
    { id: 'flower', name: '1 · Flower Run', pay: 6000,
      intro: "Rosa: Dario, take this locked case to the marina office. Fast — and don't dent it.",
      objective: 'Deliver Rosa\u2019s case to the marina office' },
    { id: 'wheelman', name: '2 · The Wheelman', pay: 9000,
      intro: "Rosa: Hale keeps a golden Aurora GT at the marina lot. Borrow it. Bring it to my garage.",
      objective: 'Steal the golden Aurora GT at the marina and deliver it to Rosa\u2019s garage' },
    { id: 'tail', name: '3 · Tail the Courier', pay: 10000,
      intro: "Rosa: A syndicate courier leaves the downtown bank. Follow — close enough to see, far enough to breathe.",
      objective: 'Tail the courier car: stay 14–42 m away until it stops, then take the ledger' },
    { id: 'heat', name: '4 · Heat', pay: 11000,
      intro: "Rosa: The ledger names everyone. Hale called the police on you — lose the heat, reach the safehouse.",
      objective: 'Escape a 3-star wanted level, then reach the safehouse' },
    { id: 'payday', name: '5 · Bay Day Payday', pay: 14000,
      intro: "Rosa: Three cash drops, one afternoon. Beach, lighthouse, downtown. Hale's boys will ram you — finish at The Salty Anchor.",
      objective: 'Collect 3 cash drops, then deliver the money to The Salty Anchor café' }
  ],
  goalCash: 50000,
  landmarks: {
    rosa: { x: -96, z: -96, label: "Rosa's Flowers" },
    garage: { x: -88, z: 24, label: "Rosa's Garage" },
    marina: { x: 76, z: 64, label: 'Marina Office' },
    marinaLot: { x: 64, z: 52, label: 'Marina Lot' },
    bank: { x: 24, z: -16, label: 'Downtown Bank' },
    safehouse: { x: -56, z: 104, label: 'Safehouse' },
    cafe: { x: 64, z: -56, label: 'The Salty Anchor' },
    hospital: { x: -16, z: 64, label: 'Solmaris Hospital' },
    lighthouse: { x: 100, z: 118, label: 'Lighthouse Point' },
    beachDrop: { x: 94, z: 10, label: 'Beach Drop' },
    downtownDrop: { x: 4, z: -36, label: 'Downtown Drop' }
  }
};
