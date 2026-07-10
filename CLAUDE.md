# CLAUDE.md — orientation for this repo

Vanilla-JS Canvas game. **Read `README.md` first** — it has the full file map,
system tour, tuning knobs, and gotchas. This file is just the workflow.

## What it is
Breakout × Space Invaders/Galaga hybrid that morphs from relaxed brick-breaker
(Kanto) into a Space-Junkie flyer-shooter (Paldea). 10 JS modules in `js/`,
loaded in order (later reference earlier). No build step / deps / framework.

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

## Working style the user likes
- Big, ambitious feature swings; commit + push each round when asked.
- Motion/patterns and the difficulty arc (easy→frantic) are the crown jewels —
  handle with care. The "boxed brick vs bare free-flying alien" distinction is
  the core design metaphor.
- End-user commit messages + `Co-Authored-By: Claude ...` trailer.
