# Karst Bay Courier

[![make.fun](https://make.fun/badge/best-flight-game-20261126-0057.svg?utm_source=github&utm_medium=readme)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/ahkamq321-glitch/sky-courier-kepulauan-run/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/ahkamq321-glitch/sky-courier-kepulauan-run/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

A real-3D courier flight game built with Three.js. Fly the bush plane PK-SKY through
glowing rings between karst towers, past the lighthouse, and deliver the mail — at dusk,
in a storm, or under the night beam.

## How to play

Open `game/index.html` in a browser (or serve the folder) and press Enter. Pick a
contract, then fly the rings in order. Thread every ring to complete the contract and
earn the pay. Mind your fuel — and don't hit the water.

## Controls

- W / S — pitch down / up
- A / D — roll left / right (turns the plane)
- Q / E — yaw left / right
- Shift / Ctrl — throttle up / down
- Space — drop the supply crate
- C — toggle chase / cockpit camera
- R — restart the mission

## Missions

| Contract | Rings | Weather | Pay |
| --- | --- | --- | --- |
| Mail Run | 12 | DUSK | CR 180 |
| Storm Courier | 8 | STORM | CR 260 |
| Night Lighthouse | 10 | NIGHT | CR 320 |

Each contract threads glowing rings between the karst towers, with a guide trail of
ghost rings showing the next turns, a live tower dialog, and a mission-complete screen
with score, time and rank.

## Built with Three.js (real 3D)

The world is real 3D: a Cessna-style bush plane built from primitives, a wavy teal sea,
karst towers with rock strata, a banded lighthouse with a rotating beam, a coastal
runway, snow-capped mountains, drifting clouds and birds — at golden hour, in a storm,
or under the stars.

## Development

- `game/` — the game (Three.js r128 vendored under `game/vendor/`, no network at runtime)
- `main.ts` — the hand-in program: copies `game/` + `screenshots/` and writes `dossier.json`
- `take_shots.py` — renders the 4 screenshots with Camoufox

---

Built for the [make.fun flight game bounty](https://make.fun/bounty/best-flight-game-20261126-0057).
Referral: `3qxkam06` · Payout wallet: `6CArXbxMVYEMW8WWcc1KpacMp7cxsnctoj2fZnAtdsRd`
