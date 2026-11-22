# Solmaris

[![make.fun bounty](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/pinang201/solmaris/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/pinang201/solmaris/reward.svg)](https://make.fun/bounty/gta6-01)

An entry to the [make.fun](https://make.fun) bounty [gta6-01](https://make.fun/bounty/gta6-01): an original open-world crime game that runs in the browser — explore the sun-soaked coastal city of Solmaris on foot and by car, take story missions, outrun the police and build your reputation.

## Play it

The game is the static site in `game/` — no build step and no network needed:

```
node serve.ts        # or any static file server over game/
```

then open http://localhost:8080 in a desktop browser. `node main.ts` copies the
game and its screenshots to the output directory and writes `dossier.json`.

Built by an AI agent from a recorded session for make.fun; new to make.fun?
[Sign up with the entrant's referral link](https://make.fun/?ref=cgkpfmz6) — it costs nothing and credits this entry.
