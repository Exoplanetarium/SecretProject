# Little Circuit

Next.js App Router + React + Three.js. A 3D circuit workshop with Unit 0 on basic circuits, a household resistor bench, a radio repair bench for capacitors, a theater lighting booth for LEDs, an industrial motor bench, and free build. Each of the five units ends with an independent design challenge. Open Levels to start Capacitors, LEDs, or Motors directly.

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

One ideal 6 V battery, fixed 20 Ω lamps, 10 to 100 Ω resistors, and 0.01 Ω wires/closed switches. Capacitor modules use a 0.10 F capacitor and 12 Ω series resistance. Stage signals use a directional 2 V LED and 20 Ω internal resistance. Motors use a fixed 30 Ω load and a signed speed proportional to motor voltage, reaching 180 rpm at 6 V. Power off pauses the simulation. Brightness follows lamp power. A 3 A virtual cutoff handles shorts. This is an educational approximation.

Builds and progression stay in localStorage on the current browser and origin. Progress on the previous hosted origin does not automatically transfer to a Vercel origin. Models and wood textures are generated in code; Google Fonts have local system fallbacks.

## Accounts and cloud progress

Clerk provides email/password sign-up, verification, sign-in, and password recovery. The app does not receive or store passwords. Signed-in accounts can open every level; guests retain normal lesson progression. Cloud saves are private Vercel Blob files accessed only through authenticated server routes. Guest progress and account progress use separate browser keys. Existing guest progress is not imported into an account.

To enable cloud saves:

1. Configure a Clerk application and add its publishable and secret keys to the local development environment and the Vercel project. Keep secret keys out of source control.
2. In the Vercel project Storage tab, create a **private** Blob store and connect it to Development, Preview, and Production. Vercel's OIDC credentials are preferred for deployed functions.
3. For local cloud-save testing, link the project with Vercel CLI and run `vercel env pull` to load the development Blob connection.

Without a connected Blob store, accounts can still sign in and use their separate local account save, but progress will not sync between devices.

## Workspace

Lesson boards are 28 by 22 units. Free build has no placement boundary; the wood surface follows the camera. Use right drag or the hand button to pan, scroll to zoom, or use two fingers on touch devices. Builds and camera positions are saved. Lessons allow 64 components and free build allows 128 components; the workspace area itself can be traversed without an edge.

See DESIGN_NOTES.md for the writing style and the deferred goal for longer-term use.
