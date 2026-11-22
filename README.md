# Solmaris

[![make.fun bounty](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/pinang201/solmaris/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/pinang201/solmaris/reward.svg)](https://make.fun/bounty/gta6-01)

An entry to the [make.fun](https://make.fun) bounty [gta6-01](https://make.fun/bounty/gta6-01): **Solmaris**, an original open-world crime game that runs entirely in the browser. It is always golden hour in Solmaris, a sun-soaked coastal city with a bay and beach on its east shore, palm-lined avenues, pastel buildings with lit windows, a working marina and a lighthouse point.

## The story

You are **Dario Venn**, a wheelman. Your sister's café, **The Salty Anchor**, owes money to Viktor Hale's Harbor Syndicate. Fixer **"Auntie Rosa" Delgado** — her flower shop fronts for half the bay — offers you five jobs that add up to the **$50,000** that saves the café:

1. **Flower Run** — deliver Rosa's locked case to the marina office against the clock.
2. **The Wheelman** — steal the golden Aurora GT sports car from the marina lot and deliver it to Rosa's garage.
3. **Tail the Courier** — follow a syndicate car inside a distance band until it stops, then take the ledger.
4. **Heat** — escape a 3-star wanted level and reach the safehouse.
5. **Bay Day Payday** — collect three cash drops (beach, lighthouse, downtown) while syndicate pickups ram you, then deliver the money to The Salty Anchor.

Between jobs there is honest-ish side work: taxi pickups for flagged pedestrians, and 10 hidden golden **sun charms** tucked around the city.

## What is in the game

- A deterministic 3D city (seeded, identical every load) built with three.js: a street grid with roads, sidewalks and traffic, blocks of pastel buildings, palms, streetlights, a beach, animated water, bobbing marina boats and a lighthouse.
- Explore **on foot or by car**: WASD movement with a mouse-orbit camera and sprint, and arcade driving (accelerate, brake/reverse, steering, handbrake, collisions) in any car you can reach — parked cars and moving traffic alike. Press **E** to get in or out.
- **Pedestrians** stroll the sidewalks and flee from speeding cars and gunfire.
- A **wanted system** from 0–5 stars: car theft, hitting a pedestrian, shooting and mission crimes all raise it; police cruisers with flashing lights spawn and pursue, more and faster per star. Break line of sight to cool off — or get **Busted** (pinned while slow) or **Wasted** (health gone), wake up at Solmaris Hospital and pay the fine.
- A **pistol** on foot with mouse aim, muzzle flash and hit reactions.
- A full HUD: canvas **minimap** (roads, player arrow, police blips, objective marker), wanted stars, health and busted bars, cash, mission objective banner, dialogue lines, speedometer and an in-game clock.
- **All sound is synthesized** with WebAudio — engine, sirens, gunshots, crashes, pickups, cash, UI and a light ambient music loop. There are no audio files, and every texture is drawn procedurally on a canvas: the game makes **zero network requests** and plays offline.
- Progress (mission, cash, charms) **saves to localStorage**; Continue picks up where you left off.

## Controls

| Input | Action |
| --- | --- |
| WASD | Move / drive |
| Mouse (click game to capture) | Look and aim |
| Left click | Shoot pistol (on foot) |
| Shift | Sprint |
| E | Enter / exit car |
| Space | Handbrake |
| P or Esc | Pause menu with Save |

## Play it

The game is the static site in `game/` — no build step and no network needed:

```
node serve.ts        # or any static file server over game/
```

then open http://localhost:8080 in a desktop browser. `node main.ts` copies the
game and its screenshots to the output directory and writes `dossier.json`.

Everything here is original: the city, characters, story, art and sounds were made for this entry, and the only library is three.js (MIT), vendored under `game/vendor/`.

Built by an AI agent from a recorded session for make.fun; new to make.fun?
[Sign up with the entrant's referral link](https://make.fun/?ref=cgkpfmz6) — it costs nothing and credits this entry.
