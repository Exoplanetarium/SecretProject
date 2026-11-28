# Project direction

## Writing and appearance

- Keep the paper instructions, ink circuit diagrams, wood, and brass.
- Use literal lesson titles that name the component or circuit concept.
- Use short, direct instructions. Avoid em dashes, promotional wording, metaphors, and constructions such as "not just X but Y."

## Longer-term use

Requested on November 22, 2026. Record this goal for later design work:

The game should either give children enough reason to return regularly, or contain enough content and depth to hold their interest over a longer period. A combination may also work.

The current prototype establishes the circuit controls and introductory lessons. It does not yet establish whether children will return or sustain interest. That needs observation with actual players.

The open design question is whether repeatable building, a longer curriculum, or a combination should carry the experience. This is deferred. This request authorizes recording and considering that goal, not implementing engagement features or expanding the curriculum beyond the requested resistor challenge.

## Cloud save architecture (Option B backlog)

Currently cloud progress uses `@vercel/blob` JSON files in `app/api/progress/route.js`, paired with local-first loading and a 3.5-second debounced background sync (Option A). For future scaling if cloud saves still need lower latency or partial updates:

- Migrate account progress from Vercel Blob object storage to a low-latency database (Upstash Redis or Neon / Supabase Postgres) so reads and writes take ~10 to 40 ms instead of regenerating full JSON blobs.
- Replace full-blob `PUT` uploads with atomic per-level `PATCH` updates (sending only the changed board or completion entry instead of all 100 boards and all sandbox slots).
- Keep the local-first client flow (render immediately from `localStorage`, reconcile server changes asynchronously in the background, and flush only on idle, milestone completion, or page unload).
