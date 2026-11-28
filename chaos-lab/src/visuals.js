import { observatorySketches } from './observatory.js';
import { transistorSketches } from './transistors.js';
import { foundationSketches } from './foundations.js';
import { comparatorSketches } from './comparators.js';
import { logicSketches } from './logic-unit.js';
import { librarySketches } from './library.js';
import { masterSketches } from './master.js';
const paths = {
    play: '<path d="m9 5 11 7-11 7Z" fill="currentColor" stroke="none"/>',
    levels: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    power: '<path d="M12 3v9m-6-7a9 9 0 1 0 12 0"/>',
    pliers: '<g transform="rotate(-35 12 12)"><path d="m9 2 1 6 3 3c2 2 3 6 4 10m-2-19-1 6-3 3c-2 2-3 6-4 10"/><path d="m8.7 15-2 6m8.6-6 2 6" stroke-width="3.3"/><circle cx="12" cy="10" r="1.6" fill="currentColor"/></g>',
    reset: '<path d="M4 10a8 8 0 1 1 1 8M4 3v7h7"/>',
    undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
    rotate: '<path d="M20 10a8 8 0 1 0-1.5 8M20 3v7h-7"/>',
    camera: '<circle cx="12" cy="12" r="7"/><path d="M12 1v6m0 10v6M1 12h6m10 0h6"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 1 1 5 2c-2 1-2 2-2 3m0 3h.01"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    trash: '<path d="M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7"/>',
    save: '<path d="M4 3h14l3 3v15H3V3Zm3 0v7h10V3M7 21v-7h10v7"/>',
    sound: '<path d="M4 9h4l5-5v16l-5-5H4Zm13-3a9 9 0 0 1 0 12m-1-9a4 4 0 0 1 0 6"/>',
    mute: '<path d="M4 9h4l5-5v16l-5-5H4Zm13 0 5 6m0-6-5 6"/>',
    spark: '<path d="M13 2 4.5 13.5H12L11 22l8.5-11.5H12Z"/>',
    check: '<path d="m5 12 5 5L20 7"/>',
    lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    bulb: '<path d="M9 18h6m-6 3h6M8 14a6 6 0 1 1 8 0l-1 2H9Z"/>',
    wire: '<circle cx="4" cy="17" r="2"/><circle cx="20" cy="7" r="2"/><path d="M6 17c8 0 0-10 12-10"/>',
    hand: '<path d="M8 12V5a2 2 0 0 1 4 0v7-3a2 2 0 0 1 4 0v4-2a2 2 0 0 1 4 0v5c0 4-3 6-6 6h-2c-2 0-3-1-4-3L3 13a2 2 0 0 1 3-2l2 2"/>',
    next: '<path d="m8 5 8 7-8 7"/>',
    battery: '<rect x="3" y="6" width="17" height="12" rx="2"/><path d="M20 10h2v4h-2M6 10v4m-2-2h4m6 0h3"/>',
    tableLamp: '<path d="m7 3-3 10h16L17 3ZM12 13v6m-5 2c0-2 10-2 10 0ZM17 13v3"/>',
    lamp: '<path d="M8 15a7 7 0 1 1 8 0l-1 3H9ZM9 21h6M2 3l2 2m16-2-2 2M12 0v2"/>',
    switch: '<circle cx="4" cy="16" r="2"/><circle cx="20" cy="16" r="2"/><path d="m6 15 12-9M2 21h20"/>',
    resistor: '<path d="M1 12h4l2-6 4 12 4-12 2 6h6"/>',
    capacitor: '<path d="M2 12h7m0-7v14m6-14v14m0-7h7"/>',
    led: '<path d="M2 15h5V9l8 6-8 6v-6m8-6v12m0-6h7M12 7l4-4m-3 0h3v3m1 3 4-4m-3 0h3v3"/>',
    motor: '<circle cx="12" cy="12" r="8"/><path d="M1 12h3m16 0h3M8.5 15V9l3.5 4 3.5-4v6"/>',
    photo: '<circle cx="12" cy="14" r="7.5"/><path d="M1 14h5l2-3 3 6 3-6 2 3h7M5 1l3 4H5m5-4 3 4h-3"/>',
    rgb: '<path d="M4 15v-4a8 8 0 0 1 16 0v4ZM6 15v6m4-6v7m4-7v6m4-6v5"/><circle cx="8.5" cy="11.5" r="1.3"/><circle cx="12" cy="7.5" r="1.3"/><circle cx="15.5" cy="11.5" r="1.3"/>',
    bell: '<path d="M4 16c2-2 2-3 2-6a6 6 0 0 1 12 0c0 3 0 4 2 6ZM10 19a2 2 0 0 0 4 0M3 5 1 8m20-3 2 3"/>',
    gear: '<path d="m10 3 .5-2h3l.5 2 2 1 2-.6 1.6 2.6-1.4 1.6v2l1.4 1.6-1.6 2.6-2-.6-2 1-.5 2h-3l-.5-2-2-1-2 .6-1.6-2.6L5.8 10V8L4.4 6.4 6 3.8l2 .6Z"/><circle cx="12" cy="8.8" r="2.7"/><path d="M3 13v6h5l2 3h8v-6m0 2h4"/>',
    servo: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M2 14h2m16 0h2M9 11V7m6 4V7M3 4l8 1 8-3 1 2-8 4-9-2Z"/><circle cx="11.8" cy="6.5" r=".6"/>',
    jack: '<rect x="2" y="5" width="20" height="15" rx="3"/><circle cx="7.5" cy="12" r="2.4"/><circle cx="16.5" cy="12" r="2.4"/>',
    relay: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M1 8h5c1-5 3-5 4 0 1-5 3-5 4 0h9M1 16h6l8-4m2 4h6M11.5 9v3" />',
    coil: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M1 8h4c1-4 3-4 4 0 1-4 3-4 4 0h3M1 15h6l8-4m2 0h6m-6 5h6"/>',
    button: '<path d="M2 17h6m8 0h6M8 17h8M9 12h6M12 7v5m-3-5h6"/>',
    rail: '<path d="M3 9h18v6H3Z"/><circle cx="6.5" cy="12" r="1"/><circle cx="10.2" cy="12" r="1"/><circle cx="13.8" cy="12" r="1"/><circle cx="17.5" cy="12" r="1"/>',
    gate: '<path d="M2 8h4M2 16h4M6 5h6a7 7 0 0 1 0 14H6ZM19 12h3"/>',
    latch: '<rect x="5" y="4" width="14" height="16" rx="2"/><path d="M2 9h3m-3 6h3m14-6h3M5 13l3 2-3 2"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2M7 18h2v-2h2v2h2v-2h2v2h2"/>',
    display: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 7h6v5H9Zm0 5v5h6v-5"/>',
    diode: '<path d="M2 12h6M16 12h6M8 6v12l8-6ZM16 6v12"/>',
    spdt: '<circle cx="4" cy="12" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="19" cy="18" r="2"/><path d="M2 12h0m4-1 11-5"/>',
    pot: '<circle cx="12" cy="10" r="6"/><path d="M12 10 16 6M4 19h4m4 0v-3m4 3h4"/>',
    fuse: '<rect x="6" y="7" width="12" height="10" rx="4"/><path d="M2 12h4m12 0h4M8 12c1.5-3 2.5 3 4 0s2.5 3 4 0"/>',
    meter: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 14a6 6 0 0 1 10 0m-5 0 3-5"/>',
    transistor: '<circle cx="13" cy="12" r="7.5"/><path d="M2 12h7m0-5v10m0-7 7-5m-7 9 7 5m-3-1 3 1-1-3"/>',
    comparator: '<path d="M2 8h4M2 16h4M6 4l13 8-13 8ZM19 12h3M8.5 9h3M10 7.5v3M8.5 15h3"/>',
    cannon: '<rect x="3" y="13" width="9" height="6" rx="2"/><path d="M9 14 19 6l2 3-9 8M2 19h14"/><circle cx="20" cy="4" r="2"/>',
    master: '<path d="M8 4h8v5a4 4 0 0 1-8 0ZM8 6H5a2 2 0 0 0 0 4h3M16 6h3a2 2 0 0 1 0 4h-3M12 13v5M8 20h8"/>',
    library: '<path d="M4 5h6a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H4Zm16 0h-6a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h6Z"/>',
    observatory: '<path d="M4 18h16M6 18a6 6 0 0 1 12 0"/><circle cx="12" cy="7" r="2.2"/><path d="M12 2v2m0 6v2M7 7h2m6 0h2m-8.5-3.5 1.4 1.4m4.2 4.2 1.4 1.4m0-7-1.4 1.4m-4.2 4.2-1.4 1.4"/>',
    sandbox: '<path d="M3 8h18v13H3ZM7 8V4h4v4m3 0V2h4v6M7 14h10"/>'
};
export function icon(name) { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.bulb}</svg>`; }
export function diagram(index) {
    const goals = {
        'lamp-control-challenge': [['Lamp 1', 'On / off'], ['Lamp 2', 'On / off']],
        'backup-challenge': [['Charge', '4 V'], ['Backup', '3 s']],
        'signal-challenge': [['Forward', '0.04 A'], ['Reverse', '0.04 A']],
        'speed-challenge': [['Low', '90 rpm'], ['High', '180 rpm']]
    };
    if (goals[index]) return `<svg class="circuit-diagram" viewBox="0 0 200 96" role="img" aria-label="${goals[index].flat().join(' ')}"><path d="M100 19v58"/>${goals[index].map(([label, target], i) => `<text x="${50 + i * 100}" y="37" text-anchor="middle">${label}</text><text x="${50 + i * 100}" y="65" text-anchor="middle">${target}</text>`).join('')}</svg>`;
    if (activitySketches[index]) {
        const [description, drawing] = activitySketches[index];
        return `<svg class="circuit-diagram" viewBox="0 0 200 104" role="img" aria-label="${description}">${drawing}</svg>`;
    }
    if (typeof index === 'string') return unitDiagram(index);
    if (index === 9) return `<svg class="circuit-diagram challenge-diagram" viewBox="0 0 200 112" role="img" aria-label="Two lamps with target currents of 0.10 A and 0.20 A"><circle cx="50" cy="40" r="17"/><path d="m40 30 20 20m-20 0 20-20"/><circle cx="150" cy="40" r="17"/><path d="m140 30 20 20m-20 0 20-20"/><text x="50" y="85" text-anchor="middle">0.10 A</text><text x="150" y="85" text-anchor="middle">0.20 A</text></svg>`;
    const battery = '<path d="M24 20h76M24 20v28m-14 0h28m-21 14h14m-7 0v30h76"/><text x="40" y="46">+</text>';
    const bulb = (x, y, dim = false) => `<g class="diagram-lamp ${dim === 'off' ? 'off' : dim ? 'dim' : ''}"><circle cx="${x}" cy="${y}" r="13"/><path d="m${x - 7} ${y - 7} 14 14m-14 0 14-14"/><g class="rays"><path d="M${x} ${y - 22}v-4m0 52v-4m-22-22h-4m52 0h-4m-38-16-3-3m35 35 3 3m-35 0-3 3m35-35 3-3"/></g></g>`;
    let detail = '';
    if (index === 7) detail = `<path d="M100 20h60v23m0 26v23h-60"/>${bulb(160, 56, true)}<path class="paper-cut" d="M48 20h34m25 0h35"/><path d="m48 20 5-7 6 14 6-14 6 14 6-14 5 7m25 0 5-7 6 14 6-14 6 14 6-14 6 7"/>`;
    if (index === 8) detail = '<path d="M100 20h60m-60 0v10m60-10v10M100 58h60v9m0 22v3h-60M100 56v2m60-2v2"/><path d="m100 30-6 4 12 5-12 5 12 5-12 5 6 2m60-26-6 4 12 5-12 5 12 5-12 5 6 2"/><circle class="diagram-lamp" cx="160" cy="78" r="11"/><path d="m154 72 12 12m-12 0 12-12"/>';
    if (index === 7 || index === 8) return `<svg class="circuit-diagram" viewBox="0 0 200 112" role="img" aria-label="${index === 7 ? 'Two series resistors and a lamp' : 'Parallel resistor pair in series with a lamp'}">${battery}${detail}</svg>`;
    if (index < 3) { detail = `<path d="M100 20h60v23m0 26v23h-60"/>${bulb(160, 56, index === 2)}`; if (index === 1) detail += '<path class="paper-cut" d="M61 20h27"/><path d="m60 20 28-13"/><circle cx="60" cy="20" r="2"/><circle cx="90" cy="20" r="2"/>'; if (index === 2) detail += '<path class="paper-cut" d="M60 20h34"/><path d="m60 20 5-7 6 14 6-14 6 14 6-14 5 7"/>'; }
    else if (index === 3) detail = `<path d="M100 20h60v7m0 26v6m0 26v7h-60"/>${bulb(160, 40, true)}${bulb(160, 72, true)}`;
    else detail = `<path d="M100 20h65m-60 0v23m0 26v23m60-72v23m0 26v23H100"/>${bulb(105, 56)}${bulb(165, 56, index === 5 ? 'off' : false)}${index === 5 ? '<path class="paper-cut" d="M130 20h25"/><path d="m130 20 25-12"/>' : ''}`;
    if (index === 6) return `<svg class="circuit-diagram" viewBox="0 0 200 112" role="img" aria-label="Free build"><path d="M30 76h140M50 76V48h35v28m20 0V30h35v46M60 48V32h15v16m39-18V18h17v12"/><circle cx="166" cy="27" r="13"/><path d="M166 9V2m0 43v-5m18-13h7m-43 0h-7"/></svg>`;
    return `<svg class="circuit-diagram" viewBox="0 0 200 112" role="img" aria-label="${['Lamp on', 'Switch and lamp', 'Resistor and lamp', 'Two series lamps', 'Two parallel lamps', 'Switch one branch'][index]}">${battery}${detail}</svg>`;
}

const sketchLabel = (x, y, text) => `<text x="${x}" y="${y}" text-anchor="middle">${text}</text>`;
const placed = (x, y, drawing, angle = 0) => `<g transform="translate(${x} ${y}) rotate(${angle})">${drawing}</g>`;
const sketchLamp = '<circle r="11"/><path d="m-8-8 16 16m-16 0L8-8"/>';
const sketchCap = '<path d="M0-12v8m-10 0h20m-20 8h20M0 4v8"/>';
const sketchLed = '<path d="M0-12v5m-6 0H6L0 5ZM-6 5H6M0 5v7m8-14 6-5m-4 0h4v4m-4 6 6-5m-4 0h4v4"/>';
const supply = '<path d="M30 19v23m-10 0h20m-16 8h12m-6 0v36"/><text x="40" y="37">+</text>';
const crate = '<rect x="-12" y="-22" width="24" height="22" rx="1"/><path d="m-9-3 18-16M-9-19 9-3"/>';
function compareLoop(x, farads) {
    return placed(x, 0, `<path d="M-22 31V20h45v20m0 22v15h-45V55"/>${placed(-22, 43, sketchCap)}${placed(23, 51, sketchLamp)}${sketchLabel(0, 98, farads)}`);
}
function conveyor(width) {
    return `<rect x="0" y="0" width="${width}" height="18" rx="9"/><circle cx="9" cy="9" r="4"/><circle cx="${width - 9}" cy="9" r="4"/><path d="M20 9h${width - 40}" stroke-dasharray="4 7"/>`;
}
const activitySketches = {
    'light-meter': ['Light falling on a photoresistor connected across an ohmmeter',
        `<path d="M54 42h37v10h36m36 0h10v30H42V54"/><circle cx="42" cy="42" r="12"/>${sketchLabel(42, 47, 'Ω')}<circle cx="145" cy="52" r="18"/><path d="M127 52h9l3-6 5 12 5-12 4 6h10M116 14l14 17m-7-2 7 2-1-7m1-15 13 17m-7-2 7 2-1-7"/>`],
    'house-breaker': ['Reading lamp on its own branch and two stair lamps in series, asking where to put the resistor',
        `<path d="M28 12v24m-10 0h20m-16 8h12m-6 0v32"/><text class="obs-lbl" x="39" y="32" text-anchor="middle">+</text><path d="M28 12h140v11m0 20v2m0 20v11H28M82 12v22m0 20v22"/><circle class="obs-dot" cx="82" cy="12" r="2.1"/><circle class="obs-dot" cx="82" cy="76" r="2.1"/>${placed(82, 44, '<circle r="10"/><path d="m-7-7 14 14m-14 0L7-7"/>')}${placed(168, 33, '<circle r="10"/><path d="m-7-7 14 14m-14 0L7-7"/>')}${placed(168, 55, '<circle r="10"/><path d="m-7-7 14 14m-14 0L7-7"/>')}<text class="obs-sm" x="100" y="95" text-anchor="middle">Where would you put the resistor?</text>`],
    'capacity-compare': ['Two separate lamp circuits, with a 0.10 F and a 0.22 F capacitor',
        compareLoop(49, '0.10 F') + compareLoop(149, '0.22 F')],
    'timer-bell': ['A timer set to three seconds and a bell with a three volt threshold',
        `<circle cx="52" cy="45" r="24"/><path d="M52 21v-6m-6-3h12m-6 33 14-12m-14-6v3m19 15h-3m-16 18v-3m-18-15h3M92 45h17m-5-5 5 5-5 5M131 57c5-5 5-10 5-17a14 14 0 0 1 28 0c0 7 0 12 5 17Zm14 5q5 8 10 0m14-36q6 4 7 11m-45-11q-6 4-7 11"/>${sketchLabel(52, 92, '3 s')}${sketchLabel(150, 92, '3 V')}`],
    'led-series': ['One current path through two forward-facing LED signals',
        `${supply}<path d="M30 19h109v5m0 24v11m0 24v3H30"/>${placed(139, 36, sketchLed)}${placed(139, 71, sketchLed)}`],
    'led-parallel': ['Two forward-facing LED signals on independent branches',
        `${supply}<path d="M30 19h129v21m0 24v22H30m68-67v21m0 24v22"/>${placed(98, 52, sketchLed)}${placed(159, 52, sketchLed)}`],
    'rgb-mix': ['Four terminals on a stage light and its magenta cue',
        `<rect x="23" y="20" width="70" height="43" rx="6"/><circle cx="58" cy="41" r="15"/><circle cx="54" cy="43" r="3" fill="#bf5145"/><circle cx="58" cy="35" r="3" fill="#55916e"/><circle cx="63" cy="43" r="3" fill="#5279af"/><path d="M32 63v10m17-10v10m17-10v10m17-10v10m22-33 44-18m-44 25 44 17"/>${['R', 'G', 'B', '−'].map((c, i) => sketchLabel(32 + i * 17, 90, c)).join('')}<ellipse cx="158" cy="44" rx="15" ry="24" fill="#b663a2" fill-opacity=".7"/>`],
    'rgb-fade': ['Red and blue channels fade as a capacitor discharges',
        `${placed(30, 45, sketchCap)}<path d="M30 33V19h26m-26 38v22h26M84 14v65h90"/>${sketchLabel(66, 43, 'mA')}<path d="M84 23c19 0 28 20 47 37s28 16 43 17" stroke="#af514b"/><path d="M84 25c12 0 20 25 31 41s20 12 27 13" stroke="#526fa5" stroke-dasharray="4 3"/>${sketchLabel(137, 97, 'Time')}`],
    'cable-tester': ['Test socket pointing to three mystery cables A, B, and C to identify Forward, Reverse, or Dead',
        `<rect x="14" y="28" width="46" height="36" rx="5"/><circle cx="27" cy="46" r="3.5"/><circle cx="47" cy="46" r="3.5"/><text class="obs-sm" x="37" y="22" text-anchor="middle">Socket</text><path d="M66 46h22m-5-4 5 4-5 4"/><rect x="96" y="12" width="88" height="18" rx="4"/><rect x="96" y="37" width="88" height="18" rx="4"/><rect x="96" y="62" width="88" height="18" rx="4"/><text class="obs-sm" x="140" y="24" text-anchor="middle">Cable A · ?</text><text class="obs-sm" x="140" y="49" text-anchor="middle">Cable B · ?</text><text class="obs-sm" x="140" y="74" text-anchor="middle">Cable C · ?</text><text class="obs-sm" x="100" y="96" text-anchor="middle">Forward · Reverse · Dead</text>`],
    'belt-drive': ['A crate can travel both directions along the belt',
        `${placed(25, 57, conveyor(150))}${placed(100, 56, crate)}<path d="M50 41h28m-22-6-6 6 6 6m66-6h28m-6-6 6 6-6 6M49 75v11m103-11v11"/>`],
    'loaded-drive': ['A geared roller raises a loaded crate on an incline',
        `<path d="M28 86h144m-15 0V43"/>${placed(24, 66, conveyor(152), -16)}${placed(92, 46, crate, -16)}<circle cx="45" cy="77" r="9"/><circle cx="45" cy="77" r="3"/><path d="m45 65 0 3m12 9h-3m-9 12v-3m-12-9h3m75-41 25-7m-7-3 7 3-4 7"/>`],
    'servo-gate': ['A pivoting sorting gate selects either chute',
        `<path d="M84 91V69L37 23m25-10 38 38 38-38m25 10-47 46v22"/><path d="M100 70 67 37l-5 5 34 32Z" fill="#b68e50" fill-opacity=".28"/><circle cx="100" cy="72" r="5"/><path d="m106 67 30-30M68 34q32-18 64 0" stroke-dasharray="4 4"/>`],
    'dispatch': ['A loaded conveyor delivers a crate into the selected bin',
        `${placed(15, 57, conveyor(108), -16)}${placed(52, 46, crate, -16)}<path d="m122 33 28 18m-6-1 6 1-2-6m-45 17 14 9m-5-1 5 1-2-5" /><path d="m99 74 4 20h26l4-20m7-17 5 24h27l5-24"/><path d="m151 68 4 4 9-10"/>`],
    ...foundationSketches,
    ...transistorSketches,
    ...comparatorSketches,
    ...logicSketches,
    ...observatorySketches,
    ...librarySketches,
    ...masterSketches
};

function unitDiagram(type) {
    const motor = '<circle cx="0" cy="0" r="13"/><path d="M-6 5V-5l6 7 6-7V5"/>';
    const cap = '<path d="M0-13v9m-11 0h22m-22 8h22M0 4v9"/>';
    const led = '<path d="M0-13v5m-8 0H8L0 6Zm0 14V6m-8 0H8m3-9 7-6m-4 0h4v4m-5 8 7-6m-4 0h4v4"/>';
    const lamp = '<circle r="13"/><path d="m-9-9 18 18m0-18L-9 9"/>';
    const branch = (x, symbol, reverse = false) => `<path d="M${x} 20v23m0 26v23"/><g transform="translate(${x} 56) rotate(${reverse ? 180 : 0})">${symbol}</g>`;
    const isMotor = type.startsWith('motor'), isLed = type.startsWith('led'), extra = type === 'backup' || type === 'led-pair';
    const symbol = isMotor ? motor : isLed ? led : cap;
    const series = ['rc', 'led-r', 'motor-r', 'motor-control'].includes(type), sw = ['backup', 'motor-control'].includes(type);
    let top = 'M25 20h';
    if (series) top += '15l4 -6 5 12 5 -12 5 12 5 -12 5 6H';
    else top += '52H';
    top += sw ? '85m0 0 21 -10m2 10h52' : '160';
    return `<svg class="circuit-diagram" viewBox="0 0 200 112" role="img" aria-label="${type.replaceAll('-', ' ')} circuit"><path d="${top}M25 20v28m-12 0h24m-18 9h12m-6 0v35h135"/><text x="35" y="43">+</text>${branch(160, extra && isLed ? led : symbol, extra && isLed)}${extra ? branch(120, type === 'backup' ? lamp : led) : ''}</svg>`;
}
