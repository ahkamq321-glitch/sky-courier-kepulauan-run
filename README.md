# Karst Bay Courier

[![make.fun](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![Rank](https://make.fun/badge/best-flight-game-20261126-0057/ahkamq321-glitch/sky-courier-kepulauan-run/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![Reward](https://make.fun/badge/best-flight-game-20261126-0057/ahkamq321-glitch/sky-courier-kepulauan-run/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)

A real 3D bush-plane courier game built with Three.js. Fly a Cessna-style
high-wing plane over a karst bay at golden hour — thread glowing rings between
limestone towers, drop supplies on the lighthouse pad, hop between island
strips, and land on the coastal strip in a crosswind.

## How to play

Open `game/index.html` in a desktop browser (no network needed — Three.js is
vendored under `game/vendor/`). Press Enter, pick a mission, and fly.

## Controls

- **W / S** — pitch down / up (Arrow Up / Down also work)
- **A / D** — roll left / right (Arrow Left / Right also work)
- **Q / E** — yaw
- **Shift / Ctrl** — throttle up / down
- **Space** — drop the supply crate (Lighthouse Supply Drop)
- **C** — toggle chase view / cockpit view
- **R** — restart the mission
- **P** — pause

## Missions

1. **Ring Run** — fly all 8 glowing rings through the karst towers.
2. **Lighthouse Supply Drop** — drop the crate on the lighthouse island pad.
3. **Island Hop** — land on 3 island strips.
4. **Crosswind Landing** — precision landing on the coastal strip.

## Tech

- Three.js r128 (vendored, offline) — real 3D renderer with shadows, ACES
  tone mapping and a golden-hour sun.
- Plain static files: `game/index.html` + ES modules under `game/js/`.
- `main.ts` hands the game in: it copies `game/` and `screenshots/` to the
  output directory and writes `dossier.json` with the make.fun library.
- Run it with `mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts`.

## Entry

Built for the [make.fun "Make the best flight game" bounty](https://make.fun/bounty/best-flight-game-20261126-0057).
Payout wallet: `6CArXbxMVYEMW8WWcc1KpacMp7cxsnctoj2fZnAtdsRd`
