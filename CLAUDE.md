# CLAUDE.md — orientation for this repo

Vanilla-JS Canvas game. **Read `README.md` first** — it has the full file map,
system tour, tuning knobs, and gotchas. This file is just the workflow.

## What it is
Breakout × Space Invaders/Galaga hybrid that morphs from a relaxed brick wall
(Kanto) into a swarm of free-flying Pokémon (Paldea). 10 JS modules in `js/`,
loaded in order (later reference earlier). No build step / deps / framework.

Current shape of the game (as of the latest session): **boxed bricks are a
STATIC wall; the Pokémon carry all the motion**, flying distinct patterns
around and below the wall. See "Design invariants" below before touching
motion, density, or flyer geometry.

## Editing
- Everything is `js/*.js`. `index.html` is just the shell. Never inline JS back
  into it.
- After any edit: `node --check js/<file>.js` (syntax) before testing.
- `G` (in state.js) is the god-object holding all runtime state.

## Verifying (there is no live human tester)
The preview browser throttles rAF when backgrounded, so you can't watch
real-time physics. **Drive the sim from the JS console instead:** loop
`update(1/60)`, set `mouseX` to steer, `paused=false; G.freeze=0` to force-run,
read `G.*` to assert. `G.freeze=999` freezes a frame for a screenshot. Test
mobile with `?touch` in the URL + synthetic `TouchEvent`s. Serve locally with
`node serve.js` (localhost:8741). Always check console for errors after.

## Deploying (user plays via GitHub Pages)
Commit to `main`, `git push`. Then trigger + verify the build:
`gh api -X POST repos/CrawlerKarl/pokemon-brick/pages/builds`, poll
`.../pages/builds/latest` until `.commit` == HEAD and `.status`=="built".
Live at https://crawlerkarl.github.io/pokemon-brick/. The user tests on a real
phone — flag anything only verifiable there.

## Design invariants (current — don't regress these without being asked)
- **Blocks are static; only the Pokémon move.** `G.blocksStatic` (set
  `!hasBoss` in `buildLevel`) skips the march/descent/sway. Don't re-introduce
  a marching wall on normal waves — the march now runs only on boss waves.
- **Flyers NEVER overlap the boxed wall.** `flightGeom`/`clampOpen` (state.js)
  place every pattern so it can't enter the grid rect: `square` loops AROUND
  the wall, all `open` patterns stay in the band BELOW it, streams enter from
  the sides at open-zone height. After ANY flyer-geometry change, re-run the
  overlap-count sim assertion (drive `update(1/60)`, count flyer-rect vs
  boxed-rect intersections; must be 0) on a few levels + mobile.
- **Readability over density.** The ball must never get lost. `flyerBudget`
  hard-caps moving flyers (≤20); `boxedBudget` shrinks the wall region by
  region; total on-screen holds ~22–32. The ball's glow scales with on-screen
  `clutter` (render.js `drawBalls`). Don't pile on entities.
- **Nothing flies/attacks as a framed brick.** `bareMon(br)` gates this;
  bare mons FAINT (no card shatter), boxed bricks card-shatter.
- The "boxed brick vs bare free-flying Pokémon" split is the core metaphor.

## Working style the user likes
- Big, ambitious feature swings; commit + push each round when asked.
- Fine to delegate mechanical work to cheaper models; reserve top models for
  open-ended design. Verify visual work by screenshot, not just asserts.
- End-user commit messages + `Co-Authored-By: Claude ...` trailer.
