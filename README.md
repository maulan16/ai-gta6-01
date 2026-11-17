# NEON HARBOR

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/maulan16/ai-gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/maulan16/ai-gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**NEON HARBOR** is an original open-world crime game for the make.fun **gta6-01** ("Make GTA 6") competition — a 2D top-down open-world game in the spirit of the classic era, built with plain Canvas 2D, no libraries and no network requests. Everything in it — the city, the characters, the vehicles, the story — is original.

> v2 visual pass (2026-11-18): the camera now zooms 2.5x, so cars render big with hoods, glass, wheels and lights, people are visible person sprites, and roads have crosswalks and curbs. Gameplay, missions and story are unchanged.

## The story

Jace Rook is out of prison and owes fixer **Madame Voss** one last job, while **Detective Kline** turns the whole harbor against him. Steal cars, lose the heat, make the delivery.

## What is in the game

- **A living city** — a 3200×2400 street grid with neon-lit buildings, a harbor waterfront with piers, parks, traffic, pedestrians, streetlights and a dusk skyline.
- **On foot and behind the wheel** — walk, sprint, shoot the pistol, steal any car (sedan, taxi, van, sports car, police cruiser) and drive with acceleration, braking, steering, skid marks and a synthesized engine sound.
- **Wanted system** — 0–5 stars. Stealing cars, shooting and hitting pedestrians raise the heat; police cruisers and foot cops chase harder as stars climb, with roadblocks at high wanted levels. Stay quiet and out of sight and the heat cools off.
- **Three-mission story arc** — 1) *The Pickup* (collect the package), 2) *The Getaway* (lose a 3-star wanted level and reach the safehouse), 3) *The Harbor Job* (deliver the goods to Pier 9 under police chase). Cash rewards, mission banners and a minimap blip for every objective.
- **HUD** — minimap with player, mission and police blips, wanted stars, cash / health / ammo, mission objective bar, speedometer and in-game clock.
- **Screens & saves** — title screen, pause, WASTED / BUSTED game-over screens, and progress (cash + missions) saved in localStorage.
- **Effects** — muzzle flashes, bullet tracers, explosions, smoke, screen shake and skid marks.

## Controls

| Key | Action |
| --- | --- |
| WASD / Arrows | Walk / drive |
| E | Enter / exit car |
| Click / F | Shoot |
| Shift | Sprint |
| M | Mute |
| Esc / P | Pause |

## How to run

```sh
node serve.ts
```

Then open <http://localhost:8080> in a desktop browser. No build step, no install, no network — the game is static files under `game/`.

Deterministic screenshots: open `?shot=cover&seed=7` (also `street`, `chase`, `mission`) — each stages a fixed scene and sets `window.__shotReady` when painted.

## Files

- `game/index.html` + `game/src/*.js` — the whole game (config, world, render, input, audio, shots, main).
- `screenshots/` — 4 staged screenshots, `1-cover.jpg` first.
- `main.ts` — builds the entry into `/output` with `dossier.json` (`MAKEFUN_OUTPUT_DIR=out node main.ts`).

---

Built for [make.fun](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · gta6-01 · all art, names and story are original.
