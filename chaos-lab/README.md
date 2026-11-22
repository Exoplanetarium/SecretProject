# Little Circuit

Next.js App Router + React + Three.js. A 3D wooden circuit workbench with five guided tutorials, a resistor unit with four lessons and a final challenge, and a sandbox.

## Local development

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:3000. For a production preview, run `npm run build` followed by `npm start`.

`npm test` checks open/closed loops, resistance, switches, series/parallel loads, independent branches, shorts, resistor challenges, teaching actions, and save migration.

## Vercel

The project includes `vercel.json` and uses the standard Next.js build. From this directory:

```sh
npx vercel login
npx vercel --yes
```

This creates a preview deployment. After reviewing it, `npx vercel --prod` publishes production. No environment variables, accounts inside the game, or database are required.

## Structure

- `app/workshop.js`: client UI; initializes and disposes the 3D workshop in a React effect.
- `app/globals.css`: wood, brass, paper, icons, responsive layout.
- `src/main.js`: 3D models, dragging, terminal wiring, flow indicators, progression, local saves.
- `src/circuit.js`: linear DC solver and level goals.
- `src/lessons.js`: action-driven paper teaching cards and migration from the previous lesson order.
- `src/visuals.js`: SVG controls and circuit goal diagrams.

## Model and saves

One ideal 6 V battery, fixed 20 Ω lamps, 10 to 100 Ω resistors, and 0.01 Ω wires/closed switches. Brightness follows lamp power. A 3 A virtual cutoff handles shorts. This is an educational approximation.

Builds and progression stay in localStorage on the current browser and origin. Progress on the previous hosted origin does not automatically transfer to a Vercel origin. Models and wood textures are generated in code; Google Fonts have local system fallbacks.

## Workspace

Lesson boards are 28 by 22 units. Free build has no placement boundary; the wood surface follows the camera. Use right drag or the hand button to pan, scroll to zoom, or use two fingers on touch devices. Builds and camera positions are saved. Lessons allow 64 components and free build allows 128 components; the workspace area itself can be traversed without an edge.

See DESIGN_NOTES.md for the writing style and the deferred goal for longer-term use.
