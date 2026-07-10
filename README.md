# Pokémon Invaders Breakout

A Breakout / Space Invaders hybrid: journey through 9 regions (3 stages each —
Arrival, Challenge, and a Legendary boss with a signature mechanic), catch
Pokémon for a persistent Pokédex, exploit type matchups, and draft run
upgrades between waves.

## Playing it from GitHub

The game is now multi-file (`index.html` + `js/` + `assets/`), so it needs to
be served as a real site — single-file HTML previewers won't load it. Use
**GitHub Pages**:

1. Push this repo to GitHub.
2. Repo **Settings → Pages → Build and deployment**: Source = *Deploy from a
   branch*, Branch = `main`, folder = `/ (root)`.
3. Play at `https://<username>.github.io/<repo>/`.

Every push to `main` redeploys automatically.

## Running locally

Any static file server works, e.g.:

```
npx serve .          # or: python3 -m http.server 8741
```

Append `?touch` to the URL to force the mobile touch controls on a desktop
browser (useful for testing).

## Project layout

| Path | What it is |
| --- | --- |
| `index.html` | Shell page — canvas + script tags |
| `js/setup.js` | Canvas, resize, viewport/safe-area handling |
| `js/config.js` | Difficulty presets, settings, menu/panel layout |
| `js/audio.js` | SFX synth + per-region chiptune sequencer |
| `js/data.js` | Types, powers, upgrades, region rosters, names, sprite loading |
| `js/scenery.js` | Region backgrounds, starfield, ambient weather |
| `js/state.js` | Game state, level builder, entity factories |
| `js/input.js` | Mouse/keyboard/touch input, touch buttons |
| `js/update.js` | Simulation: physics, combat, boss abilities |
| `js/render.js` | All drawing, HUD, menus, Pokédex |
| `js/main.js` | Frame loop |
| `assets/sprites/` | Local Pokémon artwork (see below) |
| `tools/fetch-sprites.js` | Downloads/refreshes the sprite set |

Script load order in `index.html` matters — later files may reference earlier
ones at load time.

## Sprites

Artwork is served from `assets/sprites/` so the game doesn't depend on a
third-party host at play time (there's a network fallback to PokeAPI if a
file is missing). After adding new Pokémon ids to the rosters in
`js/data.js`, refresh the set with:

```
node tools/fetch-sprites.js
sips -Z 256 assets/sprites/*.png   # macOS: shrink to the max size the game draws
```

## Licensing note

Pokémon names and artwork are the property of Nintendo / Creatures Inc. /
GAME FREAK inc. This project is a fan exercise; get a licensing review before
distributing it publicly or attaching any monetization.
