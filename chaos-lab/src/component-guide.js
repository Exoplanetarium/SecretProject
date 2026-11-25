const svgWrap = (body, cls = 'guide-svg') =>
  `<svg class="${cls}" viewBox="0 0 180 110" role="img" aria-hidden="true">${body}</svg>`;

const diagWrap = (body) =>
  `<svg class="circuit-diagram guide-diagram-svg" viewBox="0 0 180 110" role="img" aria-hidden="true">${body}</svg>`;

const basePlate = (pins = ['●', '●']) => {
  const xs = pins.length === 2 ? [48, 132] : pins.map((_, i) => 34 + (i / (pins.length - 1)) * 112);
  const posts = xs.map((x, i) => `
    <circle cx="${x}" cy="84" r="7" fill="#c89e54" stroke="#6d4c24" stroke-width="1.4"/>
    <circle cx="${x}" cy="84" r="3" fill="#ffe19e"/>
    <text x="${x}" y="99" text-anchor="middle" font-size="8.5" font-weight="700" font-family="monospace" fill="#fff0cc">${pins[i]}</text>
  `).join('');
  return `
    <rect x="20" y="72" width="140" height="32" rx="6" fill="#5b3e29" stroke="#3c2618" stroke-width="1.5"/>
    <rect x="26" y="75" width="128" height="16" rx="4" fill="#e6decb" stroke="#bda986" stroke-width="1"/>
    <rect x="24" y="89" width="132" height="12" rx="2.5" fill="#3a342e"/>
    ${posts}
  `;
};

const dLbl = (x, y, text) => `<text x="${x}" y="${y}" text-anchor="middle" font-size="11" font-family="monospace">${text}</text>`;

export const COMPONENT_GUIDES = {
  battery: {
    name: 'Battery',
    spec: '6 V DC power supply',
    summary: 'Provides a steady 6 V difference between the positive (+) and negative (−) terminals.',
    howToUse: [
      'Connect one path from + through your components back to −.',
      'Never wire + directly to − without a load, or a short circuit will occur.',
      'Select the battery and click Reverse polarity when a unit allows flipping current direction.'
    ],
    terminals: [
      { pin: '+', name: 'Positive', role: '6 V high side' },
      { pin: '−', name: 'Negative', role: '0 V reference return' }
    ],
    diagramSvg: diagWrap(
      `<path d="M22 55h54M104 55h54M76 28v54M88 40v30M96 28v54M104 40v30"/>${dLbl(64, 42, '+')}${dLbl(116, 42, '−')}`
    ),
    illustrationSvg: svgWrap(
      `${basePlate(['+', '−'])}<rect x="50" y="34" width="80" height="34" rx="14" fill="#3f3a35" stroke="#221e1a" stroke-width="1.5"/><rect x="44" y="34" width="24" height="34" rx="8" fill="#b75b42" stroke="#6f301e" stroke-width="1.3"/><rect x="36" y="43" width="10" height="16" rx="3" fill="#c89e54"/><text x="95" y="55" text-anchor="middle" font-size="12" font-weight="700" font-family="monospace" fill="#f5e2c0">6 V</text>`
    )
  },
  lamp: {
    name: 'Lamp',
    spec: '20 Ω glowing bulb',
    summary: 'Converts electrical current into light. Brightness depends on the current flowing through it.',
    howToUse: [
      'Works in either wire direction across its two terminals.',
      'Directly across a 6 V battery, a lamp draws 0.30 A.',
      'Two lamps in series share voltage and glow dimmer; parallel lamps stay bright.'
    ],
    terminals: [
      { pin: '●', name: 'Lead 1', role: 'Filament terminal (non-polarized)' },
      { pin: '●', name: 'Lead 2', role: 'Filament terminal (non-polarized)' }
    ],
    diagramSvg: diagWrap(
      `<path d="M26 55h44M110 55h44"/><circle class="diagram-lamp" cx="90" cy="55" r="20"/><path d="m76 41 28 28m-28 0 28-28"/>`
    ),
    illustrationSvg: svgWrap(
      `${basePlate()}<circle cx="90" cy="37" r="22" fill="#ffe194" fill-opacity=".6" stroke="#b98b44" stroke-width="1.4"/><circle cx="90" cy="36" r="16" fill="#fff0bf" stroke="#c39547" stroke-width="1.2"/><path d="M84 46q6-18 12 0" fill="none" stroke="#b66b22" stroke-width="2"/><rect x="78" y="56" width="24" height="16" rx="3" fill="#514b44"/><rect x="72" y="66" width="36" height="8" rx="3" fill="#c49952"/>`
    )
  },
  switch: {
    name: 'Switch',
    spec: 'Single-throw toggle',
    summary: 'Opens or closes one conducting path. When open, current stops.',
    howToUse: [
      'Wire the switch in series with the branch or device you want to turn on and off.',
      'Click the brass lever on the board or select it and click the switch button to flip it.',
      'Closed switches have almost 0 Ω resistance, so never wire one directly across a battery.'
    ],
    terminals: [
      { pin: '●', name: 'Contact 1', role: 'Switch input/output' },
      { pin: '●', name: 'Contact 2', role: 'Switch input/output' }
    ],
    diagramSvg: diagWrap(
      `<path d="M24 62h40M116 62h40M64 62l48-22"/><circle cx="64" cy="62" r="4"/><circle cx="116" cy="62" r="4"/>`
    ),
    illustrationSvg: svgWrap(
      `${basePlate()}<rect x="70" y="54" width="40" height="18" rx="3" fill="#46403a"/><path d="M64 60 112 36" stroke="#caa158" stroke-width="7" stroke-linecap="round"/><circle cx="66" cy="60" r="5" fill="#9a7236"/><circle cx="112" cy="60" r="5" fill="#c89e54"/>`
    )
  },
  resistor: {
    name: 'Resistor',
    spec: '10 Ω to 100 Ω adjustable',
    summary: 'Limits current and divides voltage according to Ohm’s law (V = I × R).',
    howToUse: [
      'Wire a resistor in series with an LED, lamp, motor, or capacitor to limit current.',
      'Select the resistor and drag the Resistance slider between 10 Ω and 100 Ω.',
      'Series resistances add together; parallel resistors reduce total resistance.'
    ],
    terminals: [
      { pin: '●', name: 'Lead 1', role: 'Resistor terminal (non-polarized)' },
      { pin: '●', name: 'Lead 2', role: 'Resistor terminal (non-polarized)' }
    ],
    diagramSvg: diagWrap(
      `<path d="M22 55h28l6-14 12 28 12-28 12 28 12-28 6 14h48"/>`
    ),
    illustrationSvg: svgWrap(
      `${basePlate()}<path d="M48 70V48h84v22" fill="none" stroke="#a6aeb0" stroke-width="4" stroke-linecap="round"/><rect x="58" y="38" width="64" height="20" rx="8" fill="#cba477" stroke="#89633e" stroke-width="1.3"/><rect x="70" y="38" width="6" height="20" fill="#3c3732"/><rect x="82" y="38" width="6" height="20" fill="#3c3732"/><rect x="102" y="38" width="6" height="20" fill="#b44f3c"/>`
    )
  },
  capacitor: {
    name: 'Capacitor',
    spec: '0.10 F + 12 Ω internal',
    summary: 'Stores electrical energy as voltage across two plates and releases it when the circuit discharges.',
    howToUse: [
      'Wire across a battery to charge it up to 6 V.',
      'Use a series resistor to slow down charging and timing.',
      'Disconnect the battery and leave a lamp or bell across it to watch stored energy flow out.'
    ],
    terminals: [
      { pin: '●', name: 'Plate 1', role: 'Positive reference for gauge needle' },
      { pin: '●', name: 'Plate 2', role: 'Opposite capacitor plate' }
    ],
    diagramSvg: diagWrap(
      `<path d="M26 55h54M100 55h54M80 28v54M100 28v54"/>`
    ),
    illustrationSvg: svgWrap(
      `${basePlate()}<rect x="52" y="28" width="76" height="44" rx="4" fill="#246964" stroke="#163f3c" stroke-width="1.4"/><rect x="64" y="13" width="16" height="17" rx="3" fill="#adb7b5" stroke="#536368"/><rect x="100" y="13" width="16" height="17" rx="3" fill="#adb7b5" stroke="#536368"/><circle cx="90" cy="50" r="16" fill="#fbefd0" stroke="#9ea7a4" stroke-width="2"/><path d="M90 54 99 42" stroke="#b65a44" stroke-width="2.4" stroke-linecap="round"/>`
    )
  },
  led: {
    name: 'LED signal',
    spec: '2 V drop + 20 Ω built-in',
    summary: 'A light-emitting diode that conducts and glows only when current flows from Anode (A) to Cathode (K).',
    howToUse: [
      'Connect A toward the positive side and K toward the negative side.',
      'If wired backward, an LED blocks current and stays dark.',
      'Includes a built-in 20 Ω resistor, though adding series resistance further controls brightness.'
    ],
    terminals: [
      { pin: 'A', name: 'Anode', role: 'Positive input side' },
      { pin: 'K', name: 'Cathode', role: 'Negative return side' }
    ],
    diagramSvg: diagWrap(
      `<path d="M26 55h46M106 55h48M72 37v36l34-18ZM106 37v36M104 28l14-14m-10 0h10v10m4 10 14-14m-10 0h10v10"/>${dLbl(64, 34, 'A')}${dLbl(116, 86, 'K')}`
    ),
    illustrationSvg: svgWrap(
      `${basePlate(['A', 'K'])}<rect x="60" y="24" width="60" height="46" rx="14" fill="#443b52" stroke="#2c2536" stroke-width="1.4"/><circle cx="90" cy="47" r="18" fill="#c94f47" stroke="#b7bfbc" stroke-width="3"/><circle cx="90" cy="47" r="9" fill="#ff948b" fill-opacity=".6"/>`
    )
  },
  motor: {
    name: 'DC motor',
    spec: '30 Ω load · 180 rpm at 6 V',
    summary: 'Spins a flywheel proportional to current. Reversing voltage reverses rotation direction.',
    howToUse: [
      'Connect the two terminals across a power source to spin.',
      'Add a series resistor to reduce voltage and slow down speed.',
      'Flip battery polarity to reverse spin direction.'
    ],
    terminals: [
      { pin: '●', name: 'Terminal 1', role: 'Armature lead' },
      { pin: '●', name: 'Terminal 2', role: 'Armature return' }
    ],
    diagramSvg: diagWrap(
      `<path d="M24 55h42M114 55h42"/><circle cx="90" cy="55" r="24"/><path d="M78 65V44l12 15 12-15v21"/>`
    ),
    illustrationSvg: svgWrap(
      `${basePlate()}<rect x="52" y="34" width="76" height="36" rx="10" fill="#33606b" stroke="#203d44"/><circle cx="90" cy="42" r="24" fill="none" stroke="#d96826" stroke-width="5"/><circle cx="90" cy="42" r="19" fill="#f3ebd6" fill-opacity=".2" stroke="#adb7b5" stroke-width="2"/><path d="M90 19v46M70 30l40 24M70 54l40-24" stroke="#adb7b5" stroke-width="3"/><rect x="86" y="16" width="8" height="7" fill="#ffdf7c"/>`
    )
  },
  spdt: {
    name: '2-way switch',
    spec: 'Single-pole double-throw',
    summary: 'Routes common pin C to either terminal A or terminal B.',
    howToUse: [
      'Feed power or a signal into common terminal C.',
      'Connect two separate branches or loads to A and B.',
      'Click the brass lever on the board or use Toggle switch in the selection bar to swap between A and B.'
    ],
    terminals: [
      { pin: 'C', name: 'Common', role: 'Shared wiper contact' },
      { pin: 'A', name: 'Throw A', role: 'Left output contact' },
      { pin: 'B', name: 'Throw B', role: 'Right output contact' }
    ],
    diagramSvg: diagWrap(
      `<path d="M22 55h44l46-18M112 35h44M112 75h44"/><circle cx="66" cy="55" r="4"/><circle cx="112" cy="35" r="4"/><circle cx="112" cy="75" r="4"/>${dLbl(58, 43, 'C')}${dLbl(122, 27, 'A')}${dLbl(122, 92, 'B')}`
    ),
    illustrationSvg: svgWrap(
      `${basePlate(['C', 'A', 'B'])}<rect x="44" y="54" width="92" height="18" rx="3" fill="#46403a"/><rect x="48" y="42" width="18" height="14" rx="2" fill="#d3ab5d"/><rect x="114" y="42" width="18" height="14" rx="2" fill="#d3ab5d"/><path d="M90 62 56 38" stroke="#caa158" stroke-width="7" stroke-linecap="round"/><circle cx="90" cy="62" r="5" fill="#9a7236"/>`
    )
  },
  button: {
    name: 'Push button',
    spec: 'Momentary contact',
    summary: 'Closes the circuit only while pressed and opens automatically when released.',
    howToUse: [
      'Wire the two terminals in series wherever you want a brief pulse.',
      'Click the button on the board or select it and click Press button.',
      'Useful for triggering memory cells, relay latches, and manual pulses.'
    ],
    terminals: [
      { pin: '●', name: 'Contact 1', role: 'Normally open input' },
      { pin: '●', name: 'Contact 2', role: 'Normally open output' }
    ],
    diagramSvg: diagWrap(
      `<path d="M26 65h40M114 65h40M62 51h56M90 51V32M78 32h24"/><circle cx="66" cy="65" r="4"/><circle cx="114" cy="65" r="4"/>`
    ),
    illustrationSvg: svgWrap(
      `${basePlate()}<rect x="66" y="56" width="48" height="16" rx="4" fill="#383430"/><rect x="74" y="42" width="32" height="16" rx="4" fill="#9ea6a4"/><rect x="78" y="28" width="24" height="16" rx="6" fill="#c89c52" stroke="#855e24" stroke-width="1.3"/>`
    )
  },
  rail: {
    name: 'Bus bar',
    spec: '4-pin shared strip',
    summary: 'Joins all four brass terminals together into a single electrical node for neat power or ground distribution.',
    howToUse: [
      'Connect battery + or battery − to any pin on the bus bar.',
      'Wire multiple devices to the other three pins to share that node.',
      'Avoid connecting both + and − to the same bus bar, which creates a short circuit.'
    ],
    terminals: [
      { pin: '1', name: 'Tap 1', role: 'Common bus terminal' },
      { pin: '2', name: 'Tap 2', role: 'Common bus terminal' },
      { pin: '3', name: 'Tap 3', role: 'Common bus terminal' },
      { pin: '4', name: 'Tap 4', role: 'Common bus terminal' }
    ],
    diagramSvg: diagWrap(
      `<rect x="26" y="44" width="128" height="22" rx="4"/><circle cx="48" cy="55" r="3"/><circle cx="76" cy="55" r="3"/><circle cx="104" cy="55" r="3"/><circle cx="132" cy="55" r="3"/><path d="M48 55v25M76 55v25M104 55v25M132 55v25"/>${dLbl(48, 36, '1')}${dLbl(76, 36, '2')}${dLbl(104, 36, '3')}${dLbl(132, 36, '4')}`
    ),
    illustrationSvg: svgWrap(
      `${basePlate(['1', '2', '3', '4'])}<rect x="34" y="44" width="112" height="22" rx="4" fill="#cca254" stroke="#856025" stroke-width="1.4"/><circle cx="48" cy="55" r="5" fill="#6f4d1e"/><circle cx="76" cy="55" r="5" fill="#6f4d1e"/><circle cx="104" cy="55" r="5" fill="#6f4d1e"/><circle cx="132" cy="55" r="5" fill="#6f4d1e"/>`
    )
  },
  fuse: {
    name: 'Glass fuse',
    spec: '0.20 A · 0.35 A · 0.50 A',
    summary: 'A safety link that melts open if circuit current exceeds its rating, preventing shorts and overloads.',
    howToUse: [
      'Wire the fuse in series with the battery + terminal.',
      'Select the fuse to set its trip current (default 0.35 A).',
      'When blown, the inner wire disappears. Disconnect the fault and click Replace fuse.'
    ],
    terminals: [
      { pin: '●', name: 'Clip 1', role: 'Supply side' },
      { pin: '●', name: 'Clip 2', role: 'Protected load side' }
    ],
    diagramSvg: diagWrap(
      `<path d="M24 55h40c10-16 20 16 26 0c6-16 16 16 26 0h40"/><rect x="52" y="35" width="76" height="40" rx="10"/>`
    ),
    illustrationSvg: svgWrap(
      `${basePlate()}<rect x="44" y="44" width="14" height="26" rx="2" fill="#c89e54"/><rect x="122" y="44" width="14" height="26" rx="2" fill="#c89e54"/><rect x="54" y="42" width="72" height="22" rx="10" fill="#d9e8e9" fill-opacity=".65" stroke="#7f9698" stroke-width="1.5"/><path d="M58 53h64" stroke="#f09b4e" stroke-width="2.4"/>`
    )
  },
  diode: {
    name: 'Diode',
    spec: '0.7 V forward drop',
    summary: 'Acts like a one-way valve for current, conducting from Anode (A) to Cathode (K) and blocking reverse flow.',
    howToUse: [
      'Match the painted band toward K (negative side).',
      'Expect about 0.7 V drop across the diode when it is conducting.',
      'Use diodes to block reverse battery hookups or steer signals one way.'
    ],
    terminals: [
      { pin: 'A', name: 'Anode', role: 'Current enters here (+)' },
      { pin: 'K', name: 'Cathode', role: 'Silver band side (−)' }
    ],
    diagramSvg: diagWrap(
      `<path d="M24 55h46M106 55h48M70 35v40l36-20ZM106 35v40"/>${dLbl(62, 34, 'A')}${dLbl(116, 34, 'K')}`
    ),
    illustrationSvg: svgWrap(
      `${basePlate(['A', 'K'])}<path d="M48 70V49h84v21" fill="none" stroke="#a6aeb0" stroke-width="4"/><rect x="60" y="38" width="60" height="22" rx="4" fill="#2d2926" stroke="#181513"/><rect x="104" y="38" width="9" height="22" fill="#e6dcc6"/>`
    )
  },
  pot: {
    name: 'Potentiometer',
    spec: '100 Ω rotary divider',
    summary: 'A 100 Ω track between terminals 1 and 2 with a movable wiper W in the middle.',
    howToUse: [
      'Wire 1 and W (or W and 2) in series with a load to act as a variable resistor.',
      'Or wire 1 to + and 2 to − to create an adjustable 0 V to 6 V output on W.',
      'Select the potentiometer and drag its Dial slider from 0% to 100%.'
    ],
    terminals: [
      { pin: '1', name: 'End 1', role: 'Counter-clockwise end of 100 Ω track' },
      { pin: 'W', name: 'Wiper', role: 'Sliding middle contact' },
      { pin: '2', name: 'End 2', role: 'Clockwise end of 100 Ω track' }
    ],
    diagramSvg: diagWrap(
      `<path d="M26 55h28l6-14 12 28 12-28 12 28 12-28 6 14h40M90 22v19m-6-6 6 6 6-6"/>${dLbl(26, 43, '1')}${dLbl(104, 28, 'W')}${dLbl(152, 43, '2')}`
    ),
    illustrationSvg: svgWrap(
      `${basePlate(['1', 'W', '2'])}<circle cx="90" cy="44" r="24" fill="#3a444d" stroke="#222a30" stroke-width="2"/><circle cx="90" cy="44" r="16" fill="#c89e54" stroke="#7d5c24" stroke-width="1.5"/><path d="M90 44 101 33" stroke="#f7ebd2" stroke-width="3" stroke-linecap="round"/>`
    )
  },
  meter: {
    name: 'Voltmeter',
    spec: '−6 V to +6 V probe',
    summary: 'Measures voltage between its + and − terminals without drawing noticeable current.',
    howToUse: [
      'Connect + and − in parallel across any battery or component you want to measure.',
      'Do not wire a voltmeter in series with a lamp, because its 1 MΩ resistance blocks current.',
      'Watch both the sweeping needle and digital V reading update live.'
    ],
    terminals: [
      { pin: '+', name: 'Red probe', role: 'Positive measurement lead' },
      { pin: '−', name: 'Black probe', role: 'Reference measurement lead' }
    ],
    diagramSvg: diagWrap(
      `<path d="M24 55h40M116 55h40"/><circle cx="90" cy="55" r="26"/>${dLbl(90, 60, 'V')}${dLbl(52, 43, '+')}${dLbl(128, 43, '−')}`
    ),
    illustrationSvg: svgWrap(
      `${basePlate(['+', '−'])}<rect x="48" y="18" width="84" height="52" rx="6" fill="#5e432c" stroke="#392616" stroke-width="1.5"/><rect x="56" y="24" width="68" height="36" rx="4" fill="#f5ebd2"/><path d="M68 50a24 24 0 0 1 44 0" fill="none" stroke="#6d5840" stroke-width="1.5"/><path d="M90 52 104 33" stroke="#b64836" stroke-width="2.5" stroke-linecap="round"/><text x="90" y="56" text-anchor="middle" font-size="9" font-weight="700" font-family="monospace" fill="#5b4328">+6.0 V</text>`
    )
  },
  photo: {
    name: 'Photoresistor',
    spec: '600 Ω bright · 10 kΩ dark',
    summary: 'Light-sensitive resistor. Bright light lowers resistance so current flows; darkness raises resistance.',
    howToUse: [
      'Wire in series with an LED, or connect across L1 and L2 on a sensor switch.',
      'Select the photoresistor to test Light from Dark (0%) to Bright (100%).',
      'In the Dispatch line lesson, the passing crate blocks light automatically.'
    ],
    terminals: [
      { pin: '●', name: 'Lead 1', role: 'Sensor cell terminal' },
      { pin: '●', name: 'Lead 2', role: 'Sensor cell terminal' }
    ],
    diagramSvg: diagWrap(
      `<circle cx="90" cy="59" r="26"/><path d="M26 59h34l5-10 9 20 9-20 9 20 9-10h53M56 16l14 16m-7-2 7 2-2-7m8-11 14 16m-7-2 7 2-2-7"/>`
    ),
    illustrationSvg: svgWrap(
      `${basePlate()}<circle cx="90" cy="40" r="25" fill="#d9a447" stroke="#855e24" stroke-width="1.5"/><circle cx="90" cy="40" r="21" fill="#efab71"/><path d="M74 30h32v7H74v7h32v7H74" fill="none" stroke="#783720" stroke-width="3" stroke-linejoin="round"/>`
    )
  },
  rgb: {
    name: 'RGB light',
    spec: 'R, G, B emitters + common −',
    summary: 'Combines Red, Green, and Blue LEDs in one fixture to mix colors on a surface.',
    howToUse: [
      'Always connect the common − terminal to battery −.',
      'Wire any combination of R, G, and B to + (each includes a protective resistor).',
      'Red + Green mixes Yellow; Red + Blue mixes Magenta; all three mix White.'
    ],
    terminals: [
      { pin: 'R', name: 'Red', role: 'Red channel anode' },
      { pin: 'G', name: 'Green', role: 'Green channel anode' },
      { pin: 'B', name: 'Blue', role: 'Blue channel anode' },
      { pin: '−', name: 'Common −', role: 'Shared cathode return' }
    ],
    diagramSvg: diagWrap(
      `<rect x="44" y="20" width="92" height="54" rx="8"/><path d="M58 74v18M80 74v18M102 74v18M124 74v18"/><circle cx="76" cy="47" r="6"/><circle cx="90" cy="36" r="6"/><circle cx="104" cy="47" r="6"/>${dLbl(58, 102, 'R')}${dLbl(80, 102, 'G')}${dLbl(102, 102, 'B')}${dLbl(124, 102, '−')}`
    ),
    illustrationSvg: svgWrap(
      `${basePlate(['R', 'G', 'B', '−'])}<circle cx="90" cy="40" r="26" fill="#423d51" stroke="#24202d" stroke-width="2"/><circle cx="80" cy="44" r="6" fill="#ec4947"/><circle cx="90" cy="29" r="6" fill="#58b66c"/><circle cx="100" cy="44" r="6" fill="#537dda"/><circle cx="90" cy="41" r="6" fill="#9ea3aa"/>`
    )
  },
  bell: {
    name: 'Threshold bell',
    spec: 'Rings at 3 V or more',
    summary: 'High-resistance gong that strikes once the voltage across its terminals reaches 3 V.',
    howToUse: [
      'Connect + and − across a battery, switch, or charging capacitor.',
      'Because it draws almost no current, it will not drain a capacitor.',
      'Great for signaling when a capacitor reaches half charge.'
    ],
    terminals: [
      { pin: '+', name: 'Trigger +', role: 'Positive voltage sense' },
      { pin: '−', name: 'Return −', role: 'Negative voltage sense' }
    ],
    diagramSvg: diagWrap(
      `<path d="M24 68h40M116 68h40M64 68c7-8 7-16 7-26a19 19 0 0 1 38 0c0 10 0 18 7 26ZM82 74q8 10 16 0"/>${dLbl(52, 54, '+')}${dLbl(128, 54, '−')}`
    ),
    illustrationSvg: svgWrap(
      `${basePlate(['+', '−'])}<path d="M62 56a24 24 0 0 1 48 0Z" fill="#c89956" stroke="#7d5924" stroke-width="1.6"/><circle cx="86" cy="40" r="4" fill="#374952"/><rect x="116" y="42" width="12" height="22" rx="2" fill="#bd7150"/><circle cx="114" cy="34" r="5" fill="#374952"/>`
    )
  },
  gear: {
    name: 'Geared drive',
    spec: 'High-torque motor · 30 Ω',
    summary: 'Uses a gear reduction box to trade shaft speed for high turning force.',
    howToUse: [
      'Wire + and − across a 6 V supply just like a DC motor.',
      'Use the geared drive whenever a direct motor stalls under heavy mechanical load.',
      'Reversing battery polarity reverses the gearbox output.'
    ],
    terminals: [
      { pin: '+', name: 'Drive +', role: 'Forward motor input' },
      { pin: '−', name: 'Drive −', role: 'Return motor lead' }
    ],
    diagramSvg: diagWrap(
      `<path d="M22 55h34M126 55h34"/><circle cx="78" cy="55" r="22"/><circle cx="112" cy="55" r="14"/>${dLbl(78, 59, 'M')}${dLbl(46, 43, '+')}${dLbl(134, 43, '−')}`
    ),
    illustrationSvg: svgWrap(
      `${basePlate(['+', '−'])}<rect x="46" y="24" width="88" height="44" rx="4" fill="#236967" stroke="#174442"/><circle cx="70" cy="46" r="11" fill="#d4814b" stroke="#73421e" stroke-dasharray="4 3" stroke-width="3"/><circle cx="102" cy="46" r="18" fill="#dba758" stroke="#7e5b24" stroke-dasharray="5 3" stroke-width="3.5"/><circle cx="102" cy="46" r="5" fill="#374952"/>`
    )
  },
  servo: {
    name: 'Servo + controller',
    spec: '60 Ω · needs over 3 V',
    summary: 'Holds an output horn at the dialed angle whenever powered above 3 V.',
    howToUse: [
      'Connect + and − across at least 3.1 V to power the controller.',
      'Select the servo and move its Angle slider (or the lesson control) between −45° and +45°.',
      'Without power, the servo horn stays frozen where it was.'
    ],
    terminals: [
      { pin: '+', name: 'Power +', role: 'Controller positive input' },
      { pin: '−', name: 'Power −', role: 'Controller negative return' }
    ],
    diagramSvg: diagWrap(
      `<path d="M22 55h36M122 55h36M90 35l22-16"/><rect x="58" y="35" width="64" height="40" rx="5"/><circle cx="90" cy="35" r="3"/>${dLbl(90, 59, 'SERVO')}`
    ),
    illustrationSvg: svgWrap(
      `${basePlate(['+', '−'])}<rect x="44" y="32" width="44" height="38" rx="4" fill="#255781" stroke="#16354f"/><rect x="64" y="18" width="46" height="10" rx="5" fill="#f8e9bd" stroke="#857551"/><circle cx="70" cy="23" r="6" fill="#f8e9bd" stroke="#857551"/><rect x="98" y="38" width="32" height="32" rx="4" fill="#374952"/><circle cx="114" cy="54" r="10" fill="#f8e9bd"/><path d="M114 54v-8" stroke="#c77943" stroke-width="2.5" stroke-linecap="round"/>`
    )
  },
  jack: {
    name: 'Test socket',
    spec: 'Diagnostic test supply',
    summary: 'Delivers the voltage and polarity of whichever cable or channel is plugged into the test bay.',
    howToUse: [
      'Wire opposite LEDs or meters across pins 1 and 2.',
      'Switch the activity socket menu between Known +, Known −, and unknown cables.',
      'Used in Mystery cables to identify polarity and dead lines.'
    ],
    terminals: [
      { pin: '1', name: 'Pin 1', role: 'Socket contact 1' },
      { pin: '2', name: 'Pin 2', role: 'Socket contact 2' }
    ],
    diagramSvg: diagWrap(
      `<rect x="48" y="26" width="84" height="58" rx="8"/><circle cx="72" cy="55" r="7"/><circle cx="108" cy="55" r="7"/><path d="M72 62v28M108 62v28"/>${dLbl(72, 41, '1')}${dLbl(108, 41, '2')}`
    ),
    illustrationSvg: svgWrap(
      `${basePlate(['1', '2'])}<rect x="46" y="22" width="88" height="48" rx="6" fill="#385868" stroke="#223640"/><circle cx="72" cy="46" r="10" fill="#b48542"/><circle cx="72" cy="46" r="5" fill="#282d32"/><circle cx="108" cy="46" r="10" fill="#b48542"/><circle cx="108" cy="46" r="5" fill="#282d32"/>`
    )
  },
  relay: {
    name: 'Sensor switch',
    spec: 'Closes C–NO above 5 kΩ',
    summary: 'Watches a photoresistor across L1 and L2. When the sensor goes dark (over 5,000 Ω), C closes to NO.',
    howToUse: [
      'Connect a photoresistor directly between L1 and L2.',
      'Wire a battery, your lamp or load, C, and NO in a separate loop.',
      'Darken the photoresistor to snap C–NO shut and switch the load on.'
    ],
    terminals: [
      { pin: 'L1', name: 'Sensor 1', role: 'Connects to photoresistor lead 1' },
      { pin: 'L2', name: 'Sensor 2', role: 'Connects to photoresistor lead 2' },
      { pin: 'C', name: 'Common', role: 'Switched circuit input' },
      { pin: 'NO', name: 'Normally open', role: 'Closes to C in darkness' }
    ],
    diagramSvg: diagWrap(
      `<rect x="30" y="34" width="44" height="42" rx="4"/><path d="M74 45h30l28-14m0 24h24"/>${dLbl(52, 59, 'SENSE')}<circle cx="104" cy="45" r="3.5"/><circle cx="132" cy="55" r="3.5"/>${dLbl(104, 72, 'C')}${dLbl(136, 72, 'NO')}`
    ),
    illustrationSvg: svgWrap(
      `${basePlate(['L1', 'L2', 'C', 'NO'])}<rect x="40" y="42" width="38" height="24" rx="4" fill="#bd6a38" stroke="#753d1c"/><path d="M50 32h60" stroke="#374952" stroke-width="5" stroke-linecap="round"/><rect x="108" y="42" width="12" height="24" rx="2" fill="#d3ab5d"/>`
    )
  },
  transistor: {
    name: 'NPN transistor',
    spec: '0.7 V Base turn-on',
    summary: 'Uses a tiny current from Base (B) to Emitter (E) to switch a much larger current from Collector (C) to Emitter (E).',
    howToUse: [
      'Connect Emitter E toward battery −.',
      'Place your lamp or load between battery + and Collector C.',
      'Feed a small positive signal through a resistor into Base B to switch C–E on.'
    ],
    terminals: [
      { pin: 'C', name: 'Collector', role: 'Switched load return side' },
      { pin: 'B', name: 'Base', role: 'Control input (> 0.7 V vs E)' },
      { pin: 'E', name: 'Emitter', role: 'Common negative return' }
    ],
    diagramSvg: diagWrap(
      `<circle cx="96" cy="55" r="24"/><path d="M32 55h46M78 36v38M78 46l30-18V14M78 64l30 18v14m-11-12 11 4-5-10"/>${dLbl(118, 26, 'C')}${dLbl(48, 45, 'B')}${dLbl(118, 94, 'E')}`
    ),
    illustrationSvg: svgWrap(
      `${basePlate(['C', 'B', 'E'])}<rect x="64" y="24" width="52" height="24" rx="3" fill="#c89e54" stroke="#785822"/><rect x="72" y="34" width="36" height="22" rx="4" fill="#2c313b"/><path d="M76 56l-20 16M90 56v16M104 56l20 16" stroke="#c87d4b" stroke-width="3"/><circle cx="90" cy="43" r="4" fill="#ffb847"/>`
    )
  },
  coil: {
    name: 'Coil relay',
    spec: '120 Ω coil · 3 V pickup',
    summary: 'An electromagnet between A and B moves a switch arm C from NC to NO when powered.',
    howToUse: [
      'Wire a control path through A and B (3 V or more pulls the arm down).',
      'Common C connects to NC while off, and snaps to NO while energized.',
      'Use C and NC to invert a signal, or loop NC back to A for a relay oscillator.'
    ],
    terminals: [
      { pin: 'A', name: 'Coil A', role: 'Electromagnet lead 1' },
      { pin: 'B', name: 'Coil B', role: 'Electromagnet lead 2' },
      { pin: 'C', name: 'Common', role: 'Moving contact arm' },
      { pin: 'NC', name: 'Norm. closed', role: 'Connected to C when off' },
      { pin: 'NO', name: 'Norm. open', role: 'Connected to C when energized' }
    ],
    diagramSvg: diagWrap(
      `<path d="M22 36h20c0-10 12-10 12 0c0-10 12-10 12 0c0-10 12-10 12 0h12M90 36v32H22M110 34h24l24-10M134 22h22M134 52h22"/>${dLbl(28, 26, 'A')}${dLbl(28, 82, 'B')}${dLbl(108, 49, 'C')}${dLbl(146, 16, 'NC')}${dLbl(146, 65, 'NO')}`
    ),
    illustrationSvg: svgWrap(
      `${basePlate(['A', 'B', 'C', 'NC', 'NO'])}<rect x="44" y="38" width="42" height="26" rx="4" fill="#bd6a38" stroke="#6f3919"/><path d="M46 28h66" stroke="#374952" stroke-width="5" stroke-linecap="round"/><rect x="108" y="42" width="10" height="24" fill="#d8af5c"/><rect x="124" y="34" width="10" height="32" fill="#afb9b6"/>`
    )
  },
  gate: {
    name: 'Logic gate',
    spec: '3 V logic · 6 V output',
    summary: 'Compares inputs A and B against 3 V and drives output Q to 6 V (high) or 0 V (low).',
    howToUse: [
      'Always wire the − pin to battery − or the shared circuit ground.',
      'Select the gate to choose its mode: NAND, NOR, AND, OR, XOR, or NOT.',
      'In NOT mode, pin B is hidden and only A, Q, and − are used.',
      'Never connect two gate outputs together directly, or an output short will occur.'
    ],
    terminals: [
      { pin: 'A', name: 'Input A', role: 'High when ≥ 3 V above −' },
      { pin: 'B', name: 'Input B', role: 'High when ≥ 3 V above − (hidden in NOT mode)' },
      { pin: 'Q', name: 'Output Q', role: 'Drives 6 V (on) or 0 V (off)' },
      { pin: '−', name: 'Ground −', role: 'Must join 0 V reference' }
    ],
    diagramSvg: diagWrap(
      `<path d="M26 42h34M26 68h34M60 28h28a27 27 0 0 1 0 54H60ZM124 55h30"/><circle cx="119" cy="55" r="4"/>${dLbl(36, 36, 'A')}${dLbl(36, 82, 'B')}${dLbl(146, 48, 'Q')}`
    ),
    illustrationSvg: svgWrap(
      `${basePlate(['A', 'B', 'Q', '−'])}<rect x="44" y="24" width="92" height="44" rx="5" fill="#262c38" stroke="#c99d53" stroke-width="2"/><text x="90" y="50" text-anchor="middle" font-size="14" font-weight="700" font-family="monospace" fill="#f3dfb0">NAND</text><circle cx="90" cy="60" r="4" fill="#ffbd4a"/>`
    )
  },
  clock: {
    name: 'Pulse clock',
    spec: '0.5 to 4 Hz · 6 V square wave',
    summary: 'Generates repeating 6 V and 0 V pulses between + and − without needing an external battery.',
    howToUse: [
      'Wire − to your circuit ground (bus bar or − rail) and + to a lamp, gate, or latch CK.',
      'Select the clock to adjust its speed from 0.5 Hz to 4 Hz.',
      'Press power to start and reset the clock cycle.'
    ],
    terminals: [
      { pin: '+', name: 'Pulse +', role: 'Alternating 6 V / 0 V output' },
      { pin: '−', name: 'Ground −', role: '0 V clock return' }
    ],
    diagramSvg: diagWrap(
      `<rect x="44" y="24" width="92" height="58" rx="6"/><path d="M58 64h14V42h18v22h18V42h16v22M136 53h20M24 53h20"/>${dLbl(32, 46, '−')}${dLbl(148, 46, '+')}`
    ),
    illustrationSvg: svgWrap(
      `${basePlate(['+', '−'])}<rect x="46" y="22" width="88" height="48" rx="4" fill="#374952" stroke="#bd914a" stroke-width="2"/><circle cx="90" cy="46" r="17" fill="#f4ead0" stroke="#bd914a" stroke-width="2.5"/><path d="M90 46V34m0 12 8 6" stroke="#374952" stroke-width="2.5" stroke-linecap="round"/><circle cx="122" cy="30" r="4" fill="#ffc14d"/>`
    )
  },
  latch: {
    name: 'Memory cell',
    spec: 'Rising-edge D flip-flop',
    summary: 'Remembers 1 bit (0 or 1). When CK rises from low to high, it copies D onto output Q and holds it.',
    howToUse: [
      'Always wire − to the circuit ground (0 V).',
      'Send the value you want to store into D, then pulse CK high to save it on Q.',
      'Select the memory cell and click Clear bit to reset it to 0.'
    ],
    terminals: [
      { pin: 'D', name: 'Data D', role: 'Bit value to capture on clock edge' },
      { pin: 'CK', name: 'Clock CK', role: 'Captures D on 0 V → 6 V edge' },
      { pin: 'Q', name: 'Output Q', role: 'Holds stored 6 V or 0 V bit' },
      { pin: '−', name: 'Ground −', role: 'Must join 0 V reference' }
    ],
    diagramSvg: diagWrap(
      `<rect x="52" y="22" width="76" height="66" rx="4"/><path d="M24 38h28M24 72h28M52 64l12 8-12 8M128 38h28"/>${dLbl(38, 32, 'D')}${dLbl(36, 66, 'CK')}${dLbl(142, 32, 'Q')}${dLbl(90, 58, 'MEM')}`
    ),
    illustrationSvg: svgWrap(
      `${basePlate(['D', 'CK', 'Q', '−'])}<rect x="44" y="22" width="92" height="48" rx="4" fill="#2d3a4b" stroke="#cba055" stroke-width="2"/><text x="90" y="38" text-anchor="middle" font-size="10" font-weight="700" font-family="monospace" fill="#e8d39f">D LATCH</text><circle cx="90" cy="54" r="9" fill="#ffbe4c" stroke="#374952" stroke-width="2"/>`
    )
  },
  display: {
    name: '4-bit readout',
    spec: 'Binary 0 to 15 screen',
    summary: 'Reads four binary inputs weighted 1, 2, 4, and 8 and displays their sum from 0 to 15.',
    howToUse: [
      'Always connect − to the circuit ground (0 V).',
      'Wire logic signals, switches, or memory Q pins into inputs 1, 2, 4, and 8.',
      'Any input ≥ 3 V adds its weight (1 + 4 = 5, 2 + 8 = 10).'
    ],
    terminals: [
      { pin: '1', name: 'Bit 1', role: 'Adds 1 when high' },
      { pin: '2', name: 'Bit 2', role: 'Adds 2 when high' },
      { pin: '4', name: 'Bit 4', role: 'Adds 4 when high' },
      { pin: '8', name: 'Bit 8', role: 'Adds 8 when high' },
      { pin: '−', name: 'Ground −', role: '0 V reference return' }
    ],
    diagramSvg: diagWrap(
      `<rect x="64" y="16" width="84" height="78" rx="5"/><path d="M26 28h38M26 46h38M26 64h38M26 82h38"/>${dLbl(42, 24, '1')}${dLbl(42, 42, '2')}${dLbl(42, 60, '4')}${dLbl(42, 78, '8')}${dLbl(106, 61, '0..15')}`
    ),
    illustrationSvg: svgWrap(
      `${basePlate(['1', '2', '4', '8', '−'])}<rect x="42" y="16" width="96" height="54" rx="5" fill="#222a36" stroke="#c69b51" stroke-width="2.5"/><rect x="50" y="22" width="80" height="34" rx="3" fill="#131922"/><text x="90" y="47" text-anchor="middle" font-size="22" font-weight="700" font-family="monospace" fill="#ffca67">10</text><circle cx="60" cy="63" r="3" fill="#5b4d38"/><circle cx="80" cy="63" r="3" fill="#ffc154"/><circle cx="100" cy="63" r="3" fill="#5b4d38"/><circle cx="120" cy="63" r="3" fill="#ffc154"/>`
    )
  },
  cannon: {
    name: 'Ball cannon',
    spec: '2.4 s cadence · voltage aim',
    summary: 'Fires basketballs at the hoop every 2.4 s using terminal voltage as launch power, then discharges to 0 V.',
    howToUse: [
      'Wire + and − through your voltage-shaping circuit (avoid raw 6 V direct, which bricks and overloads on discharge).',
      'Watch the parabola arc: 3.8 V to 4.7 V scores cleanly, below falls short, above hits high off the backboard.',
      'After firing, it dumps its terminals to 0 V so any connected capacitor starts a fresh charge cycle.'
    ],
    terminals: [
      { pin: '+', name: 'Launch +', role: 'High-impedance sense input (1 MΩ idle)' },
      { pin: '−', name: 'Return −', role: 'Negative sense return' }
    ],
    diagramSvg: diagWrap(
      `<path d="M26 70h26M126 70h28"/><rect x="52" y="48" width="44" height="30" rx="5"/><path d="M84 54 128 24l10 14-44 28Z"/>${dLbl(90, 96, '1 MΩ / shot')}`
    ),
    illustrationSvg: svgWrap(
      `${basePlate(['+', '−'])}<rect x="46" y="46" width="88" height="28" rx="4" fill="#2b262a" stroke="#b98b44" stroke-width="1.5"/><path d="M74 52 122 22l11 16-46 28Z" fill="#c99e54" stroke="#6f4d1e" stroke-width="1.4"/><circle cx="62" cy="59" r="7" fill="#ffae42"/>`
    )
  }
};

export function getComponentGuide(kind) {
  return COMPONENT_GUIDES[kind] || {
    name: kind,
    spec: 'Circuit module',
    summary: 'Connect terminals in a complete circuit loop.',
    howToUse: ['Drag onto the workbench and click two gold terminals to wire.'],
    terminals: [
      { pin: '●', name: 'Terminal 1', role: 'Connection post' },
      { pin: '●', name: 'Terminal 2', role: 'Connection post' }
    ],
    diagramSvg: diagWrap('<path d="M30 55h120"/>'),
    illustrationSvg: svgWrap(basePlate())
  };
}
