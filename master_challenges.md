# Master Challenges

Master Challenges sit outside the component-learning curriculum (`The Library`). They drop players onto an open proving bench with no step-by-step teaching cards and no pre-drawn solution diagram, mixing medium-difficulty puzzles with harder wiring, timing, and technical builds.

## Design Rules

- **No themed groupings:** Lay challenges out directly in one numbered list, with optional `X.1` constraint variants underneath a base challenge.
- **Spec-driven grading:** Show the goal, constraints, and live telemetry/counts instead of guided instructions or solution schematics.
- **Subtle hints:** Each challenge includes a hint that points toward the core electrical principle or equations without giving away the exact wiring.
- **Hands-off verification where appropriate:** Automated machines must sustain their loop after Power ON without manual clicking.

## Environment Style: The Proving Ground

- **Architecture:** Obsidian charcoal-stone chamber with brass-inlaid arches.
- **Lighting & surface:** Warm overhead spotlight cones illuminating a dark oiled slate benchtop, framed with burnished copper and gold trim (`--theme` palette: dark slate/charcoal frame, copper-gold accent, cream spec paper).

---

## Challenge Roster

### 1 · Basketball

- **Status:** Built & Verified
- **Difficulty:** Medium
- **Goal:** Build a self-sustaining basketball machine that makes **10 consecutive baskets** hands-off after turning Power ON.
- **Fixed Fixture:**
  - Clean starter board with only the 3 fixed fixtures (`6 V` battery, court-mounted `Ball cannon`, and belt-coupled `Belt motor`).
  - Non-movable hoop, backboard, 3-ball magazine hopper, and return conveyor belt mechanically coupled by a PTO V-belt and telescoping drive shaft to the `Belt motor`.
- **Mechanics:**
  - **Cannon (`1 MΩ` idle sense input):** Directly connectable on the court (`+` / `−` terminals) and bolted in place (`locked`). Fires one ball per cadence cycle (2.4 s) using the voltage across its terminals as launch power:
    - `< 3.8 V`: Airball (falls short of the hoop).
    - `3.8 V to 4.7 V`: Swish (drops cleanly through the hoop onto the return belt).
    - `> 4.7 V`: Brick (hits high off the backboard and bounces out of bounds).
  - Draws a faint dotted parabola arc trail after each shot so the player can read under-power vs. over-power visually.
  - **Auto-discharge:** Immediately dumps terminal voltage down to `0 V` for `0.2 s` after firing, resetting any capacitor across the cannon before the next charge cycle (wiring raw `6 V` directly bricks and shorts/overloads on discharge).
  - **Return conveyor belt:** Mechanically driven by `Belt motor` via V-belt PTO + drive shaft. Correct polarity carries scored balls back up to reload the cannon (`ammo++`, max 3); reversed polarity rolls balls off-court and breaks the streak; running unpowered lets the 3-ball magazine run empty.
- **Hint:** `"Pair a resistor with the capacitor (an RC combo) or trim with the potentiometer so voltage lands in the sweet spot each cycle. Keep the return belt spinning the right way."`
- **Parts Tray:** `resistor`, `capacitor`, `pot`, `meter`, `rail`.

### 1.1 · Free Throw

- **Status:** Built & Verified
- **Difficulty:** Medium-Hard
- **Constraint:** No potentiometer. Identical fixture, cannon/belt physics, and **10 consecutive baskets** hands-off win condition as Challenge 1, with `pot` removed from the parts tray.
- **Solution Space:** Requires solving the launch voltage via RC charging timing (`resistor` + `capacitor`) or a resistive voltage divider.
- **Hint:** `"Without a dial, shape the launch voltage using an RC combo's charge rate or split the 6 V supply across resistors."`
- **Parts Tray:** `resistor`, `capacitor`, `meter`, `rail`.

---

### 2 · Bulbtown

- **Status:** Built & Verified
- **Difficulty:** Hard
- **Goal:** Drive the fixed target lightbulb (`20 Ω`) at exactly **`0.125 A`** (`±0.0005 A`) using only lightbulbs.
- **Fixed Fixture:**
  - Non-deletable `6 V` battery.
  - Non-deletable visually marked `Target bulb` (`20 Ω`) with a 3-decimal live current readout (`Target bulb: X.XXX A`).
- **Mechanics & Math:**
  - Reaching `0.125 A` across `6 V` requires `48 Ω` effective series-equivalent resistance (`20 Ω` target bulb + `28 Ω` external bulb network).
  - Forces nested series-parallel combinations (`20 Ω` bulbs alone cannot hit `28 Ω` via plain series or plain parallel).
  - Minimum 5 extra bulbs reference network: `20 Ω + (20 Ω || 20 Ω || (20 Ω + 20 Ω))` = `20 Ω + 8 Ω` = `28 Ω`.
- **Hint:** `"Each bulb is 20 Ω. Series: R_total = R1 + R2. Parallel: 1 / R_total = 1/R1 + 1/R2."`
- **Parts Tray:** `lamp` only (no resistors, no potentiometer, no bus bar).
- **Variants:** None.

---

### 3 · Flip-Proof

- **Status:** Built & Verified
- **Difficulty:** Medium-Hard
- **Goal:** Keep the fixed `DC motor` spinning continuously clockwise (never stopping, never reversing) through **4 consecutive automatic battery polarity flips**.
- **Fixed Fixture:**
  - Non-deletable rogue `6 V` battery whose polarity automatically reverses (`+` and `−` swap) every `2.0 s` while Power is ON.
  - Non-deletable fixed `DC motor` (`30 Ω`).
- **Mechanics & Math:**
  - Prevents single-diode half-wave cheese: the motor must stay actively driven clockwise (`> 60 rpm`) during both battery polarities.
  - Solved by wiring 4 diodes in a full-wave bridge rectifier steering current through the motor in one fixed direction regardless of supply polarity (`(6 V - 2 × 0.7 V) / (30 Ω + 2 × 5 Ω)` = `0.115 A`, `~104 rpm`).
- **Hint:** `"A single one-way diode stalls on every other flip. Arrange four one-way paths in a bridge so both polarities enter the motor's same side."`
- **Parts Tray:** `diode`, `rail`.

---

### 4 · Full adder

- **Status:** Built & Verified
- **Difficulty:** Medium-Hard
- **Goal:** Add three binary input switches (`Bit A`, `Bit B`, `Carry in`) with logic gates so `Sum` and `Carry out` light accurately across all **8** input combinations (`000` through `111`).
- **Fixed Fixture:**
  - Non-deletable `6 V` battery.
  - Non-deletable input switches `Bit A`, `Bit B`, and `Carry in`.
  - Non-deletable output lamps `Sum` and `Carry out`.
  - Starter `rail` bus bar for shared `−` return.
- **Mechanics & Verification:**
  - Evaluates settled output state (`Sum = A XOR B XOR Cin`, `Carry out = (A + B + Cin) >= 2`) with zero shorts across all 8 input states (`Cases X / 8`, live `A + B + Cin = Cout Sum`).
  - Reference architecture uses 5 logic gates (two half adders joined by one `OR` gate).
- **Hint:** `"Didn't you make a half adder somewhere?"`
- **Parts Tray:** `gate`, `rail`.

---

### 5 · Sacrifice

- **Status:** Built & Verified
- **Difficulty:** Medium-Hard
- **Goal:** Start with `Target lamp` **OFF**. Press and release `Push button` once; afterward `Target lamp` must stay **permanently ON** without switches, relays, or memory cells.
- **Fixed Fixture:**
  - Non-deletable `6 V` battery.
  - Non-deletable `Target lamp` (`20 Ω`) and momentary `Push button`.
- **Mechanics & Math:**
  - Wire a `0.35 A` glass fuse (`0.1 Ω`) as a sacrificial shorting bypass across `Target lamp`, fed through a `20 Ω` series resistor (`~0.30 A` safe at rest; voltage across the lamp stays near `0 V` so it remains OFF).
  - Pressing `Push button` intentionally creates a surge through the fuse, blowing it open before the battery shorts; after release, the blown fuse stays open so `Target lamp` stays permanently lit (`0.15 A`).
- **Hint:** `"An intact fuse holds its two terminals at almost the same voltage. Blowing it turns it into a permanent open switch."`
- **Parts Tray:** `fuse`, `resistor`.

### 5.1 · Double Sacrifice

- **Status:** Built & Verified
- **Difficulty:** Hard
- **Goal:** Start with `Lamp 1` **ON** and `Lamp 2` **OFF**. Press and release `Push button` once; afterward `Lamp 1` must stay **permanently OFF** and `Lamp 2` must stay **permanently ON**.
- **Fixed Fixture:**
  - Non-deletable `6 V` battery.
  - Non-deletable `Lamp 1` (`20 Ω`), `Lamp 2` (`20 Ω`), and one momentary `Push button`.
- **Mechanics & Math:**
  - Run `Lamp 1` in series with Fuse A (`0.35 A`; `0.30 A` safe, Lamp 1 ON). Put Fuse B (`0.35 A`) in parallel across `Lamp 2` behind a `20 Ω` resistor (`0.30 A` safe, Lamp 2 OFF).
  - Wiring `Push button` between Fuse A's output (`+6 V`) and Fuse B's input (`0 V`) routes one deliberate short through both fuses at once, blowing both open in a single flash so `Lamp 1` dies permanently and `Lamp 2` wakes up (`0.15 A`).
- **Hint:** `"A fuse in series breaks a path when blown. A fuse across a lamp hides it until blown. One short can claim two victims."`
- **Parts Tray:** `fuse`, `resistor`.

---

### Upcoming

- *Challenge 6: Pending design*
