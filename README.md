# SpinBounce

SpinBounce is a lightweight browser arcade game built with plain HTML, CSS, and JavaScript. The player jumps between moving tower platforms and tries to stay alive as the pace ramps up.

## Features

- rotating platform challenge with time-based rhythm
- score tracking and persistent best-score saving with browser storage
- level progression and speed scaling
- combo and perfect-landing bonuses
- pause and restart controls
- beginner tutorial overlay
- mobile-friendly tap controls and vibration feedback
- clean separation into CSS and JavaScript files for easier maintenance

## Files

- `spinbounce.html` — page structure and game shell
- `style.css` — visual styling and responsive layout
- `game.js` — game logic, rendering, scoring, persistence, and controls
- `README.md` — project notes

## How to run

Open the project in a browser directly, or serve it locally:

```bash
cd "c:\Users\joshu\OneDrive\Documents\adp1 repository\web applications\spinbounce"
python -m http.server 8000
```

Then visit:

```text
http://localhost:8000/
```

## Controls

- Click or tap: jump
- Space bar: jump
- Escape: pause or resume

## Gameplay notes

- The ball waits on the current platform until you jump.
- The next ring rotates continuously; timing the gap matters.
- Perfect landings score more and can create combo bonuses.
- If you miss the landing window, the run ends.

## Audio note

The sound hooks are intentionally left as placeholder comments in the game logic because this is something you want to handle personally. The code already has dedicated call points for jump, landing, perfect, and game-over cues so you can plug in your own audio system later without changing the game flow.

## Suggested next steps

- add custom audio assets for jump, clear, perfect, and fail states
- tune difficulty progression further based on session length
- add a settings panel for sound, vibration, and reduced motion
- expand the game with the next challenge mode or endless variant

## License

This project is currently unlicensed.
