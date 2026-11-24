import { newTrial, assessFinal } from './challenges.js';
import { units, starterBoard, observeUnit, newHistory } from './units.js';
import { unitRoom, themeColors, makeUnitPart, updateDeviceVisual } from './unit-scenes.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { LEVELS, existingLevels, solveCircuit, applyStep } from './circuit.js';
import { BOARD, boardPosition, partFits, findSpace } from './workbench.js';
import { LESSONS, stepSatisfied, restoreProgress, encodeProgress, canAccessLevel, nextPlayLevel } from './lessons.js';
import { makeReadingLamp, makeReadingRoom, makeHouseLamp } from './reading-room.js';
import { pliersCursor, wireUnderPointer } from './pliers.js';
import { icon, diagram } from './visuals.js';
import { freshActivity, conditions, measureActivity, deviceNames, pins } from './activities.js';
import { activityControls } from './activity-controls.js';
import { createActivityScene } from './activity-scenes.js';
import { unlockedToolbelt, mainframeProgress, mainframeBlueprintSvg, TOOLBELT_UNLOCKS } from './observatory.js';
import { createShortEffects, playShortSound } from './short-effects.js';
export function initWorkshop({ userId = null, accountProgress = null, cloudReady = false, cloudError = false, onReady = null } = {}) {
  const events = new AbortController();
  const listen = (target, type, fn, options = {}) => target.addEventListener(type, fn, typeof options === 'boolean' ? { capture: options, signal: events.signal } : { ...options, signal: events.signal });

  const $ = id => document.getElementById(id), names = { battery: 'Battery', lamp: 'Lamp', switch: 'Switch', resistor: 'Resistor', capacitor: 'Capacitor', led: 'LED signal', motor: 'DC motor', ...deviceNames };
  $('landing').hidden = false; $('game').hidden = true; $('progress').hidden = true; $('win').hidden = true; $('completion-status').textContent = ''; $('selection').hidden = true;
  for (const d of document.querySelectorAll('dialog[open]')) d.close();
  let circuitState = null, hoverTerminal = null, lessonStep = 0, skipTeaching = false, wonThisVisit = false, panMode = false, simActive = false;
  const buttonTimers = new Map();
  let level = 0, lastLevel = null, parts = [], wires = [], powered = false, selected = null, pending = null, drag = null, serial = 0, completed = [], boards = {}, sound = false, explosiveShorts = false, faultLatched = false, recentBlast = false, blastTimer = null, toastTimer, branchProof = false, game = false, cloudSaveTimer = null, cloudSavePending = null, cloudSaveInFlight = false;
  const lastKey = userId ? `little-circuit-last:user:${userId}` : 'little-circuit-last';
  const shortModeKey = 'little-circuit-short-mode';
  try {
    explosiveShorts = localStorage.getItem(shortModeKey) === 'explosive';
  } catch { }
  try {
    if (userId) {
      const cached = JSON.parse(localStorage.getItem(`little-circuit-v5:user:${userId}`) || 'null');
      ({ completed, boards } = restoreProgress(accountProgress ?? cached));
    } else {
      const stored = JSON.parse(localStorage.getItem('little-circuit-v5') || localStorage.getItem('little-circuit-v3') || 'null'), previous = JSON.parse(localStorage.getItem('little-circuit-v2') || 'null'), legacy = JSON.parse(localStorage.getItem('little-circuit-v1') || 'null');
      ({ completed, boards } = restoreProgress(stored, legacy, previous));
    }
    const savedLast = localStorage.getItem(lastKey);
    if (savedLast) {
      const idx = LEVELS.findIndex(l => l.id === savedLast);
      if (idx >= 0 && LEVELS[idx].id !== 'sandbox') lastLevel = idx;
    }
  } catch (error) { console.error('Unable to restore saved progress.', error); }
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, .1, 20000); camera.position.set(12, 15, 16);
  let renderer; try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch { $('hero-scene').innerHTML = '<p class="no-webgl">This workshop needs WebGL. Please open it in a browser with hardware acceleration enabled.</p>'; throw new Error('WebGL unavailable'); }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.setClearColor('#d9c7ac', 0); renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .9; renderer.domElement.tabIndex = 0; $('hero-scene').append(renderer.domElement);
  const controls = new OrbitControls(camera, renderer.domElement); controls.target.set(0, 0, 0); controls.enableDamping = true; controls.minDistance = 9; controls.maxDistance = 100; controls.maxPolarAngle = Math.PI * .44; controls.enablePan = true; controls.screenSpacePanning = false;
  scene.add(new THREE.HemisphereLight('#fff3dc', '#80664c', 2.7)); const sun = new THREE.DirectionalLight('#fff1d9', 3.3); sun.position.set(-6, 14, 8); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -15, right: 15, top: 15, bottom: -15 }); sun.shadow.normalBias = .035; scene.add(sun, sun.target);
  function woodTexture(dark = false) { const c = document.createElement('canvas'); c.width = 512; c.height = 256; const x = c.getContext('2d'); x.fillStyle = dark ? '#705039' : '#c89c68'; x.fillRect(0, 0, 512, 256); let seed = 42; const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }; for (let i = 0; i < 340; i++) { const y = rand() * 256; x.strokeStyle = dark ? `rgba(30,15,5,${rand() * .13})` : `rgba(93,49,19,${rand() * .16})`; x.lineWidth = rand() * 2 + .3; x.beginPath(); for (let j = 0; j <= 16; j++) { const px = j * 32, py = y + Math.sin(j * .5 + i) * 2 + Math.sin(j * 1.4 + i) * .6; j ? x.lineTo(px, py) : x.moveTo(px, py) } x.stroke() } for (let i = 1; i < 5; i++) { x.fillStyle = '#4f2e191f'; x.fillRect(0, i * 51, 512, 2) } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
  const oak = new THREE.MeshStandardMaterial({ map: woodTexture(), roughness: .85 }), walnut = new THREE.MeshStandardMaterial({ map: woodTexture(true), roughness: .75 }), brass = new THREE.MeshStandardMaterial({ color: '#b58b49', metalness: .72, roughness: .33 }), ceramic = new THREE.MeshStandardMaterial({ color: '#e5ddc9', roughness: .6 }), dark = new THREE.MeshStandardMaterial({ color: '#45403a', roughness: .55 }), red = new THREE.MeshStandardMaterial({ color: '#b65b43', roughness: .55 });
  const offBulbColor = new THREE.Color('#c9baa0'), dimLampColor = new THREE.Color('#b84412'), midLampColor = new THREE.Color('#f49a2a'), brightLampColor = new THREE.Color('#fff1b8'), lampGlowColor = new THREE.Color();
  function box(w, h, d, mat, parent, x = 0, y = 0, z = 0, r = .08) { const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, r), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; }
  function cylinder(r, h, mat, parent, x, y, z) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 32), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; }
  function label(text, parent, x, y, z, size = 1.1, color = '#544334', pin = false) { const c = document.createElement('canvas'); c.width = pin ? 160 : 512; c.height = pin ? 120 : 128; const ctx = c.getContext('2d'); ctx.fillStyle = color; ctx.font = pin ? 'bold 64px monospace' : '500 54px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; const metrics = ctx.measureText(text); const dy = Number.isFinite(metrics.actualBoundingBoxAscent) && Number.isFinite(metrics.actualBoundingBoxDescent) ? (metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2 : 0; ctx.fillText(text, c.width / 2, c.height / 2 + dy, c.width - 14); const texture = new THREE.CanvasTexture(c); texture.colorSpace = THREE.SRGBColorSpace; const m = new THREE.Mesh(new THREE.PlaneGeometry(size, pin ? size * .75 : size / 4), new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false })); m.rotation.x = pin ? 0 : -Math.PI / 2; m.position.set(x, y, z); m.userData.ownedMaterial = true; parent.add(m); return m; }
  const table = new THREE.Group(); scene.add(table); box(BOARD.width + .6, .55, BOARD.depth + .6, walnut, table, 0, -.37, 0, .16); box(BOARD.width, .22, BOARD.depth, oak, table, 0, .01, 0, .12); box(BOARD.width + 1.2, .2, BOARD.depth + 1.2, walnut, table, 0, -.72, 0, .1);
  for (const x of [-BOARD.width / 2 + .6, BOARD.width / 2 - .6]) for (const z of [-BOARD.depth / 2 + .6, BOARD.depth / 2 - .6]) { cylinder(.085, .025, brass, table, x, .14, z); box(.1, .006, .012, dark, table, x, .155, z, .002) }
  const grid = new THREE.GridHelper(BOARD.width - 2, (BOARD.width - 2) * 2, '#6d4e31', '#8b6741'); grid.scale.z = (BOARD.depth - 2) / (BOARD.width - 2); grid.material.transparent = true; grid.material.opacity = .10; grid.position.y = .125; table.add(grid); label('LITTLE CIRCUIT', table, 0, .14, BOARD.depth / 2 - .5, 2.2, '#775839');
  const continuousTexture = oak.map.clone(); continuousTexture.wrapS = continuousTexture.wrapT = THREE.RepeatWrapping; continuousTexture.repeat.set(500, 500); continuousTexture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy()); continuousTexture.needsUpdate = true;
  const freeSurface = new THREE.Mesh(new THREE.PlaneGeometry(10000, 10000), new THREE.MeshStandardMaterial({ map: continuousTexture, roughness: .85 })); freeSurface.rotation.x = -Math.PI / 2; freeSurface.position.y = .12; freeSurface.receiveShadow = true; freeSurface.visible = false; scene.add(freeSurface);
  const freeGrid = new THREE.GridHelper(200, 400, '#6d4e31', '#8b6741'); freeGrid.position.y = .125; freeGrid.material.transparent = true; freeGrid.material.opacity = .07; freeGrid.visible = false; scene.add(freeGrid);
  let readingRoom = null, activeRoom = null, history = newHistory(), trial = newTrial(), activity = freshActivity(), capMoving = false, lastTick = 0, lastFrame = 0;
  let shadeDrag = null, fixture = null, refreshActivityControls = () => { };
  const rooms = new Map();
  const benchTop = table.children[1], benchFrame = [table.children[0], table.children[2]];
  const paintedTop = new THREE.MeshStandardMaterial({ roughness: .77 });
  const paintedFrame = new THREE.MeshStandardMaterial({ roughness: .54, metalness: .32 });
  const unitOf = l => units.find(u => u.name === l.unit);
  const unitLevels = l => LEVELS.filter(other => other.unit === l.unit);
  const lessonNumber = l => unitLevels(l).indexOf(l) + 1;
  function reversible() { return game && ['LEDs', 'Motors', 'Workshop'].includes(LEVELS[level].unit); }
  function inReadingRoom() { return game && LEVELS[level].unit === 'Resistors'; }
  const houseLights = { Reading: 'Reading lamp', Landing: 'Landing light', Stairs: 'Stair light' };
  function houseChallenge() { return game && LEVELS[level].id === 'house-breaker'; }
  function partName(kind) { if (kind === 'lamp' && houseChallenge()) return 'House light'; return inReadingRoom() && kind === 'lamp' ? 'Table lamp' : names[kind]; }
  function partSpec(kind, part = null) { if (kind === 'battery') return (part?.voltage || 6) + ' V'; if (kind === 'lamp') return '20 Ω'; return ''; }
  function setRoom() {
    if (inReadingRoom() && !readingRoom) readingRoom = makeReadingRoom(walnut);
    const theme = game && unitOf(LEVELS[level]).theme;
    if (theme && !rooms.has(theme)) rooms.set(theme, unitRoom(theme));
    activeRoom = inReadingRoom() ? readingRoom : rooms.get(theme);
    scene.background = activeRoom?.texture || null;
    ground.visible = !activeRoom;
    $('workshop').dataset.theme = theme || '';
    benchTop.material = theme ? paintedTop : oak;
    for (const frame of benchFrame) frame.material = theme ? paintedFrame : walnut;
    if (theme) { paintedTop.color.set(themeColors[theme].top); paintedFrame.color.set(themeColors[theme].edge); }

  }
  function isFree() { return game && LEVELS[level].id === 'sandbox'; }
  function updateSurface() { const free = isFree(); if (game && !free) { const x = Math.max(-BOARD.width / 2, Math.min(BOARD.width / 2, controls.target.x)), z = Math.max(-BOARD.depth / 2, Math.min(BOARD.depth / 2, controls.target.z)); camera.position.x += x - controls.target.x; camera.position.z += z - controls.target.z; controls.target.x = x; controls.target.z = z; } table.visible = !free; table.scale.set(game ? 1 : .5, 1, game ? 1 : .5); freeSurface.visible = free; freeGrid.visible = free; controls.maxDistance = free ? 160 : 100; const x = controls.target.x, z = controls.target.z; freeSurface.position.x = Math.floor(x / 20) * 20; freeSurface.position.z = Math.floor(z / 20) * 20; freeGrid.position.x = Math.round(x * 2) / 2; freeGrid.position.z = Math.round(z * 2) / 2; }
  function setPanMode(enabled) { panMode = enabled; $('pan').classList.toggle('selected', enabled); $('pan').setAttribute('aria-pressed', String(enabled)); controls.mouseButtons.LEFT = enabled ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE; controls.touches.ONE = enabled ? THREE.TOUCH.PAN : THREE.TOUCH.ROTATE; }
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ opacity: .12 })); ground.rotation.x = -Math.PI / 2; ground.position.y = -1; ground.receiveShadow = true; scene.add(ground);
  const componentGroup = new THREE.Group(), wireGroup = new THREE.Group(); scene.add(componentGroup, wireGroup); let preview = null; const terminals = new Map();
  let pliersActive = false, highlightedLead = null, grip = null;
  const liftedLeads = new Map();
  const openPliers = pliersCursor(false), closedPliers = pliersCursor(true);

  function highlightLead(lead) {
    if (highlightedLead === lead) return;
    if (highlightedLead) highlightedLead.material.emissive.setHex(0);
    highlightedLead = lead;
    if (lead) lead.material.emissive.setHex(0xc47a27);
  }
  function setPliers(active) {
    pliersActive = active;
    grip = null;
    highlightLead(null);
    if (active) { cancelWire(); select(null); setPanMode(false); hoverTerminal = null; }
    $('pliers').setAttribute('aria-pressed', String(active));
    $('pliers').classList.toggle('selected', active);
    $('pliers-hint').hidden = !active;
    $('pliers-hint').textContent = 'Choose a wire to remove';
    renderer.domElement.style.cursor = active ? openPliers : '';
  }
  function syncPliers() {
    $('pliers').disabled = !wires.length;
    if (!wires.length && pliersActive) setPliers(false);
  }
  function pickLead(event) {
    return wireUnderPointer(event, renderer.domElement, camera, wireGroup.children, componentGroup.children);
  }
  function pullLead(lead) {
    const index = wires.indexOf(lead.userData.endpoints);
    if (index < 0) return;
    wires.splice(index, 1);
    activity.cut = true;
    highlightLead(null);
    scene.add(lead);
    for (const bead of lead.children) bead.visible = false;
    lead.material.transparent = true;
    lead.material.depthWrite = false;
    liftedLeads.set(lead, performance.now());
    updateCircuit(); syncPliers(); saveState(); beep();
  }
  function animateLiftedLeads(now) {
    for (const [lead, start] of liftedLeads) {
      const t = Math.min(1, Math.max(0, (now - start) / 170));
      lead.position.y = .45 * t;
      lead.material.opacity = 1 - t * t;
      if (t === 1) { liftedLeads.delete(lead); disposeObject(lead); }
    }
  }
  function disposeObject(obj) { obj.traverse(o => { o.geometry?.dispose(); o.userData.instrumentMaterials?.forEach(m => m.dispose()); if (o.userData.ownedMaterial) { o.material?.map?.dispose(); o.material?.dispose() } }); obj.removeFromParent(); }
  function makePart(p) {
    const g = new THREE.Group(); g.position.set(p.x, .14, p.z); p.rotation = ((Number(p.rotation) || 0) % 4 + 4) % 4; g.rotation.y = -p.rotation * Math.PI / 2; g.userData.part = p; componentGroup.add(g); p.mesh = g; p.rings = []; box(2.3, .2, 1.55, walnut, g, 0, .1, 0, .1); box(2.14, .07, 1.4, ceramic, g, 0, .24, 0, .06);
    if (['capacitor', 'led', 'motor'].includes(p.kind) || deviceNames[p.kind]) makeUnitPart(p, g);
    if (p.kind === 'battery') { const cell = cylinder(.39, 1.27, dark, g, 0, .69, 0); cell.rotation.z = Math.PI / 2; const cap = cylinder(.4, .34, red, g, -.47, .69, 0); cap.rotation.z = Math.PI / 2; const tip = cylinder(.17, .09, brass, g, -.7, .69, 0); tip.rotation.z = Math.PI / 2; p.batteryBody = [cell, cap, tip]; label('6 V', g, 0, 1.095, 0, .58, '#f5e2c0'); }
    if (p.kind === 'lamp' && houseChallenge() && Object.hasOwn(houseLights, p.role)) Object.assign(p, makeHouseLamp(g, p.role, brass, walnut));
    else if (p.kind === 'lamp' && inReadingRoom()) Object.assign(p, makeReadingLamp(g, brass, walnut));
    else if (p.kind === 'lamp') { cylinder(.43, .13, brass, g, 0, .35, 0); cylinder(.27, .3, dark, g, 0, .52, 0); const mat = new THREE.MeshStandardMaterial({ color: '#e8c780', emissive: '#ffb43e', emissiveIntensity: 0, roughness: .25, transparent: true, opacity: .88 }); const bulb = new THREE.Mesh(new THREE.SphereGeometry(.49, 32, 24), mat); bulb.position.set(0, 1, 0); bulb.scale.y = 1.14; bulb.castShadow = true; bulb.userData.ownedMaterial = true; g.add(bulb); p.bulb = bulb; const halo = new THREE.Mesh(new THREE.SphereGeometry(.74, 24, 16), new THREE.MeshBasicMaterial({ color: '#ffcf6b', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); halo.position.set(0, 1, 0); halo.userData.ownedMaterial = true; g.add(halo); p.halo = halo; const light = new THREE.PointLight('#ffbf5f', 0, 8, 2); light.position.set(0, 1.3, 0); g.add(light); p.light = light; }
    if (p.kind === 'switch') { box(.75, .16, .65, dark, g, 0, .38, 0); const lever = box(.12, .12, .85, brass, g, 0, .58, 0, .03); lever.rotation.x = p.closed ? 0 : -.55; lever.userData.switch = p; p.lever = lever; }
    if (p.kind === 'resistor') { const r = cylinder(.19, .9, new THREE.MeshStandardMaterial({ color: '#cba477', roughness: .8 }), g, 0, .53, 0); r.rotation.z = Math.PI / 2; for (const x of [-.28, -.14, .15]) { const band = cylinder(.198, .065, x < 0 ? dark : red, g, x, .53, 0); band.rotation.z = Math.PI / 2; } label('Ω', g, 0, .28, .52, .7); }
    const marks = pins[p.kind] ?? (p.kind === 'led' ? ['A', 'K'] : ['●', '●']);
    const namedPins = p.kind === 'battery' || p.kind === 'led' || !!pins[p.kind];
    if (namedPins) box(2.17, .32, .095, dark, g, 0, .23, .75, .03);
    for (let i = 0; i < marks.length; i++) {
      const x = marks.length === 2 ? (i === 0 ? -.91 : .91) : ((i / (marks.length - 1)) - .5) * (marks.length > 4 ? 1.96 : 1.74); const rTerm = marks.length > 4 ? .115 : .14, rHit = marks.length > 4 ? .19 : .24, rRing = marks.length > 4 ? .175 : .21; const terminal = cylinder(rTerm, .2, brass, g, x, .4, .55); terminal.userData.terminal = p.id + ':' + i; const hit = new THREE.Mesh(new THREE.SphereGeometry(rHit, 12, 8), new THREE.MeshBasicMaterial({ visible: false })); hit.position.set(x, .49, .55); hit.userData.terminal = p.id + ':' + i; hit.userData.ownedMaterial = true; g.add(hit); terminals.set(p.id + ':' + i, hit); const ring = new THREE.Mesh(new THREE.TorusGeometry(rRing, .027, 8, 24), new THREE.MeshBasicMaterial({ color: '#ffda7e', transparent: true, opacity: 0 })); ring.rotation.x = -Math.PI / 2; ring.position.set(x, .52, .55); ring.userData.ownedMaterial = true; g.add(ring); p.rings.push(ring); if (p.kind === 'battery') {
        p.polarityMarks ??= []; p.polarityMarks.push(label(i === 0 ? '+' : '−', g, x, .23, .806, .44, '#fff0cc', true));
      } else if (namedPins) label(marks[i], g, x, .23, .806, marks.length > 4 ? .36 : .42, '#fff0cc', true);
    }
    if (p.kind === 'battery' && p.reversed) showPolarity(p);
    const spec = partSpec(p.kind, p), baseName = houseLights[p.role] || p.role || partName(p.kind);
    label((spec ? `${baseName} · ${spec}` : baseName).toUpperCase(), g, 0, .282, -.6, spec ? 1.32 : .95); return p;
  }
  function showPolarity(p) {
    const [plus, minus] = p.polarityMarks;
    plus.position.x = p.reversed ? .91 : -.91; minus.position.x = -plus.position.x;
    p.batteryBody[1].position.x = p.reversed ? .47 : -.47; p.batteryBody[2].position.x = p.reversed ? .7 : -.7;
  }
  function terminalPosition(id) { const o = terminals.get(id); if (!o) return null; return o.getWorldPosition(new THREE.Vector3()); }
  const wireColors = ['#a95e45', '#536d7d', '#c69848', '#72836a'];
  function wireMesh(a, b, color) { const lift = Math.min(1.3, .35 + a.distanceTo(b) * .11); const curve = new THREE.CatmullRomCurve3([a, a.clone().add(new THREE.Vector3(0, .3, 0)), a.clone().lerp(b, .35).add(new THREE.Vector3(0, lift, 0)), a.clone().lerp(b, .7).add(new THREE.Vector3(0, lift, 0)), b.clone().add(new THREE.Vector3(0, .3, 0)), b]); const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 36, .037, 8, false), new THREE.MeshStandardMaterial({ color, roughness: .65 })); m.castShadow = true; m.userData.ownedMaterial = true; m.userData.curve = curve; return m; }
  function redrawWires() { highlightLead(null); grip = null; syncPliers(); for (const c of [...wireGroup.children]) disposeObject(c); scene.updateMatrixWorld(true); for (let i = 0; i < wires.length; i++) { const a = terminalPosition(wires[i].a), b = terminalPosition(wires[i].b); if (a && b) { const mesh = wireMesh(a, b, wireColors[i % 4]); mesh.userData.endpoints = wires[i]; mesh.userData.pickPoints = mesh.userData.curve.getSpacedPoints(36); for (let j = 0; j < 3; j++) { const bead = new THREE.Mesh(new THREE.SphereGeometry(.062, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffe3a1' })); bead.visible = false; bead.userData.ownedMaterial = true; mesh.add(bead); } wireGroup.add(mesh); } } if (faultLatched && circuitState?.short) shortEffects.syncSmoke(faultGeometry(circuitState)); }
  function clearPreview() { if (preview) { disposeObject(preview); preview = null; } }
  function cancelWire() { pending = null; clearPreview(); $('wire-hint').hidden = true; }
  function toast(msg) { $('toast').textContent = msg; $('toast').classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').classList.remove('show'), 3500); }
  function beep(success = false) { if (!sound) return; try { const ctx = new AudioContext(), o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = success ? 660 : 370; g.gain.setValueAtTime(.035, ctx.currentTime); g.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + .3); o.connect(g).connect(ctx.destination); o.start(); o.stop(ctx.currentTime + .3); o.onended = () => ctx.close(); } catch { } }
  const shortEffects = createShortEffects(scene, disposeObject);
  const shakeOffset = new THREE.Vector3();
  function syncShortMode() {
    const btn = $('short-mode');
    if (!btn) return;
    btn.classList.toggle('explosive', explosiveShorts);
    btn.setAttribute('aria-checked', String(explosiveShorts));
    btn.title = explosiveShorts ? 'Short-circuit mode: Explosive. Switch to Smoke.' : 'Short-circuit mode: Smoke (non-destructive). Switch to Explosive.';
    const labelEl = btn.querySelector('.footer-toggle-label');
    if (labelEl) labelEl.textContent = explosiveShorts ? 'Shorts: Explosive' : 'Shorts: Smoke';
  }
  syncShortMode();
  function faultGeometry(s) {
    const wireObjs = new Set((s.shortWires || []).map(i => wires[i]).filter(Boolean));
    const wireMeshes = wireGroup.children.filter(m => wireObjs.has(m.userData.endpoints));
    const points = wireMeshes.map(m => m.userData.curve.getPoint(.5).clone());
    const faultIds = new Set(s.shortParts || []);
    for (const p of parts) if (faultIds.has(p.id)) points.push(new THREE.Vector3(p.x, .55, p.z));
    const center = new THREE.Vector3();
    if (points.length) {
      for (const pt of points) center.add(pt);
      center.divideScalar(points.length);
    } else center.set(0, .5, 0);
    return { center, points, wireMeshes, wireObjs, faultIds };
  }
  function triggerShort(s, env) {
    const geom = faultGeometry(s);
    if (sound) playShortSound(explosiveShorts);
    if (!explosiveShorts) {
      faultLatched = true; powered = false;
      shortEffects.triggerSmoke({ center: geom.center, points: geom.points, wireMeshes: geom.wireMeshes, reason: s.shortReason });
      const msg = s.shortReason === 'overload'
        ? 'Circuit overload (over 3 A). Reduce parallel loads.'
        : s.shortReason === 'output-short'
          ? 'Output short. Disconnect the conflicting output.'
          : 'Short circuit. Remove the fault path and restore power.';
      toast(msg);
      return s;
    }
    faultLatched = false; powered = false; recentBlast = true;
    clearTimeout(blastTimer);
    blastTimer = setTimeout(() => { recentBlast = false; if (game && !circuitState?.short && !activity.tripped) { $('board-status').classList.remove('fault'); $('board-status').title = 'Power off'; $('board-status').setAttribute('aria-label', 'Power off'); } }, 2200);
    const blownIds = geom.faultIds;
    const blownMeshes = [];
    for (const p of parts) {
      if (!blownIds.has(p.id)) continue;
      clearTimeout(buttonTimers.get(p.id)); buttonTimers.delete(p.id);
      if (p.light) p.light.intensity = 0;
      if (p.halo) p.halo.material.opacity = 0;
      if (p.bulb?.material) p.bulb.material.emissiveIntensity = 0;
      if (p.lens) p.lens.emissiveIntensity = 0;
      if (selected === p) select(null);
      if (pending?.startsWith(p.id + ':')) cancelWire();
      if (drag?.p === p) { drag = null; controls.enabled = true; }
      for (let i = 0; i < (p.rings?.length || 0); i++) terminals.delete(p.id + ':' + i);
      componentGroup.remove(p.mesh);
      blownMeshes.push({ mesh: p.mesh, origin: new THREE.Vector3(p.x, .14, p.z) });
    }
    parts = parts.filter(p => !blownIds.has(p.id));
    wires = wires.filter(w => !geom.wireObjs.has(w) && !blownIds.has(w.a.split(':')[0]) && !blownIds.has(w.b.split(':')[0]));
    const shockParts = [];
    for (const p of parts) {
      const dist = Math.hypot(p.x - geom.center.x, p.z - geom.center.z);
      if (dist <= 7.5 && p.mesh) shockParts.push({ mesh: p.mesh, distance: dist });
    }
    redrawWires(); syncPliers(); saveState();
    shortEffects.triggerExplosion({ center: geom.center, points: geom.points, blownMeshes, shockParts, reason: s.shortReason });
    const nextState = solveCircuit(parts, wires, 0, env);
    Object.assign(nextState, env); circuitState = nextState;
    toast(LEVELS[level].layout ? 'Short circuit! Circuit exploded. Use Reset to restore.' : 'Short circuit! Circuit exploded.');
    return nextState;
  }
  async function flushCloudSave() {
    if (!userId || !cloudReady || !cloudSavePending || cloudSaveInFlight) return;
    const body = cloudSavePending; cloudSavePending = null;
    cloudSaveInFlight = true;
    try {
      const response = await fetch('/api/progress', { method: 'PUT', headers: { 'content-type': 'application/json' }, body, keepalive: true, signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error(`Cloud progress request failed with status ${response.status}.`);
    } catch (error) {
      cloudReady = false; cloudSavePending = null;
      console.error('Cloud progress save failed; the local account save is still available.', error);
      toast('Cloud save failed. Saved on this device.');
    } finally {
      cloudSaveInFlight = false;
      if (cloudSavePending && cloudReady) void flushCloudSave();
    }
  }
  function saveState(quiet = true) {
    if (!game) return;
    boards[level] = { parts: parts.map(({ id, kind, x, z, rotation, closed, resistance, charge, reversed, capacitance, color, role, gateMode, clockHz, bit, outputHigh }) => ({ id, kind, x, z, rotation, closed, resistance, charge, reversed, capacitance, color, role, gateMode, clockHz, bit, outputHigh })), wires: wires.map(w => ({ ...w })), view: { camera: camera.position.toArray(), target: controls.target.toArray(), pan: panMode } };
    const progress = encodeProgress(completed, boards), body = JSON.stringify(userId ? { userId, progress } : progress);
    try {
      localStorage.setItem(userId ? `little-circuit-v5:user:${userId}` : 'little-circuit-v5', JSON.stringify(progress));
      if (!quiet) toast(userId ? (cloudReady ? 'Saved; syncing account' : 'Saved on this device') : 'Saved');
    } catch (error) { if (!quiet) toast('Save unavailable'); console.error('Unable to save progress on this device.', error); return; }
    if (userId && cloudReady) { cloudSavePending = body; clearTimeout(cloudSaveTimer); cloudSaveTimer = setTimeout(() => { void flushCloudSave(); }, 500); }
  }
  function unlocked(i) { return canAccessLevel(i, completed, !!userId); }
  function showGuide() {
    saveState(); $('levels').replaceChildren(); $('unit-links').replaceChildren(); for (const { name: unit, label: unitLabel, theme } of units) {
      const heading = document.createElement('h3'); heading.className = 'unit-divider'; heading.textContent = unitLabel; heading.dataset.theme = theme || ''; $('levels').append(heading);
      const jump = document.createElement('button'); jump.textContent = unit; jump.dataset.theme = theme || ''; jump.onclick = () => heading.scrollIntoView({ block: 'start' }); $('unit-links').append(jump);
      LEVELS.forEach((l, i) => { if (l.unit !== unit) return; const b = document.createElement('button'); b.className = 'level-card' + (i === level ? ' current' : ''); b.dataset.level = i; b.disabled = !unlocked(i); b.innerHTML = `<span class="level-num">${l.id === 'sandbox' ? '∞' : lessonNumber(l)}</span><span class="level-thumb">${diagram(l.diagram)}</span><strong>${l.title}</strong><span class="lock">${!unlocked(i) ? icon('lock') : completed.includes(i) ? icon('check') : ''}</span>`; b.onclick = () => { $('guide').close(); startLevel(i) }; $('levels').append(b); });
    } $('guide').showModal();
  }
  const LESSON_ENDINGS = ['A complete loop lets current flow through the lamp and back to the battery.', 'Opening the switch breaks the loop. Closing it restores the path.', 'Series lamps carry the same current and share the battery voltage.', 'Each parallel lamp gets the full battery voltage.', 'One branch can open while current keeps flowing through the other.', 'More resistance means less current and a dimmer lamp.', '40 Ω + the 20 Ω lamp gives 60 Ω. At 6 V, that is 0.10 A.', 'Series resistance adds: 80 Ω from the resistors plus the 20 Ω lamp makes 100 Ω (0.060 A).', 'Two parallel resistors totaling 20 Ω plus the 20 Ω lamp make 40 Ω (0.15 A).', 'Each lamp branch has its own current. Changing one branch’s resistance changes that branch’s current.'];
  function refreshTeaching() { document.querySelectorAll('.lesson-focus').forEach(e => e.classList.remove('lesson-focus')); const steps = LESSONS[level]; if (!game || skipTeaching || lessonStep >= steps.length) { $('teaching').hidden = true; return; } const state = { ...circuitState, branchControl: branchProof }; while (lessonStep < steps.length && steps[lessonStep].when && stepSatisfied(steps[lessonStep].when, { parts, wires, pending, powered, state })) lessonStep++; const current = steps[lessonStep]; if (!current) { $('teaching').hidden = true; return; } $('teaching').hidden = false; $('teaching-count').textContent = `${unitOf(LEVELS[level]).label} · ${lessonStep + 1} / ${steps.length}`; $('teaching-title').textContent = current.title; $('teaching-text').textContent = current.text; $('teaching-next').hidden = !!current.when; $('teaching-action').textContent = current.when ? 'Complete this step on the board' : ''; document.querySelector(current.target)?.classList.add('lesson-focus'); }

  function runActivity(action, value) {
    if (action === 'test' || action === 'release') {
      activity.previous = activity.rang ? activity.seconds : activity.previous;
      for (const part of parts) if (part.kind === 'capacitor') part.charge = action === 'release' ? 6 : 0;
      Object.assign(activity, { seconds: 0, lastVoltage: 0, rang: false, running: true, passed: false });
      activity.seen.clear(); powered = true;
    } else if (action === 'send' || action === 'bonus') {
      if (action === 'bonus') {
        activity.bonus = true; activity.order = 'left';
        $('challenge-target').textContent = 'Left bin · arrival light';
        $('activity-goal').textContent = 'Connect the photoresistor to L1 and L2. Use C and NO to switch the arrival LED. Send a crate to the left bin.';
        $('activity-goal').hidden = false;
      }
      Object.assign(activity, {
        position: 0, running: action === 'send', sawArrival: false, litBefore: false,
        delivered: false, message: action === 'bonus' ? 'Sensor order · left bin' : ''
      });
      if (action === 'send') powered = true;
    } else if (action === 'tag' && powered && activity.calibrated) {
      activity.tags[activity.socket] = value;
      const tagged = Object.keys(activity.tags).length;
      activity.passed = ['Cable A', 'Cable B', 'Cable C'].every((name, i) => activity.tags[name] === activity.cables[i]);
      activity.message = activity.passed ? 'All three cables identified' : tagged === 3 ? 'Check the cable tags' : tagged + ' / 3 cables tagged';
    }
    updateCircuit();
  }
  function updateMainframeBadge() {
    const p = mainframeProgress(completed, LEVELS);
    $('mainframe-count').textContent = `${p.onlineCount} / ${p.totalCount}`;
    return p;
  }
  function showMainframe() {
    const p = updateMainframeBadge();
    $('mainframe-summary').textContent = p.coreBooted
      ? `Observatory Mainframe online (${p.onlineCount} / ${p.totalCount} systems). All Free build tools are ready.`
      : `Bring all 5 Workshop feeds and 6 Observatory modules online to boot the Observatory Mainframe (${p.onlineCount} / ${p.totalCount}).`;
    $('mainframe-blueprint').innerHTML = mainframeBlueprintSvg(p);
    const sections = $('mainframe-sections'); sections.replaceChildren();
    const addSection = (title, items, render) => {
      const h = document.createElement('h3'); h.className = 'mainframe-section-title'; h.textContent = title; sections.append(h);
      const grid = document.createElement('div'); grid.className = 'mainframe-grid';
      for (const item of items) grid.append(render(item));
      sections.append(grid);
    };
    addSection('Observatory Core Modules', p.cores, core => {
      const b = document.createElement('button'); b.className = 'system-chip' + (core.online ? ' online' : '');
      b.disabled = !unlocked(core.levelIndex);
      b.innerHTML = `<strong>${core.title}</strong><span>${core.subsystem} · ${core.online ? 'Online' : 'Offline'}</span>`;
      b.onclick = () => { $('mainframe').close(); startLevel(core.levelIndex); };
      return b;
    });
    addSection('Workshop Support Feeds', p.feeds, feed => {
      const b = document.createElement('button'); b.className = 'system-chip' + (feed.online ? ' online' : '');
      b.disabled = !unlocked(feed.nextLevelIndex);
      b.innerHTML = `<strong>${feed.name}</strong><span>${feed.unit} · ${feed.doneCount} / ${feed.totalCount}</span>`;
      b.onclick = () => { $('mainframe').close(); startLevel(feed.nextLevelIndex); };
      return b;
    });
    const belt = $('toolbelt-section'); belt.replaceChildren();
    const bh = document.createElement('h3'); bh.className = 'mainframe-section-title'; bh.textContent = 'Free Build Toolbelt'; belt.append(bh);
    const unlockedSet = unlockedToolbelt(completed, LEVELS, !!userId);
    const bgrid = document.createElement('div'); bgrid.className = 'toolbelt-grid';
    for (const item of TOOLBELT_UNLOCKS) {
      const ok = unlockedSet.has(item.kind), src = LEVELS.find(other => other.id === item.byLevel);
      const div = document.createElement('div'); div.className = 'toolbelt-chip ' + (ok ? 'unlocked' : 'locked');
      div.innerHTML = `<span class="svg-icon">${icon(item.kind)}</span><div><div>${item.label}</div><small>${ok ? 'Unlocked' : src ? src.title : 'Observatory'}</small></div>`;
      bgrid.append(div);
    }
    belt.append(bgrid);
    $('mainframe').showModal();
  }
  function pulseButton(p, holdMs = 260) {
    if (!p || p.kind !== 'button') return;
    clearTimeout(buttonTimers.get(p.id));
    p.closed = true; updateCircuit();
    buttonTimers.set(p.id, setTimeout(() => { buttonTimers.delete(p.id); p.closed = false; updateCircuit(); }, holdMs));
  }
  function updateCircuit(dt = 0, switchEvent = {}) {
    const lesson = LEVELS[level];
    const env = conditions(parts, activity, lesson.id);
    let s = solveCircuit(parts, wires, powered ? dt : 0, env);
    Object.assign(s, env); circuitState = s;
    let changed = false;
    if (powered && !s.short) {
      changed = applyStep(parts, s);
      if (changed) {
        s = solveCircuit(parts, wires, 0, env);
        Object.assign(s, env); circuitState = s;
      }
    }
    if (powered && s.short) {
      s = triggerShort(s, env);
      changed = false;
    } else if (!s.short && faultLatched) {
      faultLatched = false;
      shortEffects.stopSmoke(wireGroup.children);
    } else if (s.short && faultLatched) {
      shortEffects.syncSmoke(faultGeometry(s));
    }
    capMoving = false;
    for (const p of parts) {
      if (p.kind === 'capacitor') {
        p.needle.rotation.z = 1.12 - 2.24 * Math.min(1, Math.abs(p.charge || 0) / 6);
        if (Math.abs(s.currents[p.id] || 0) > .000015) capMoving = true;
      }
      if (p.kind === 'led') p.lens.emissiveIntensity = powered && !s.short ? Math.max(0, s.currents[p.id] || 0) * 22 : 0;
    }
    simActive = capMoving || !!s.hasPendingTransition || changed || buttonTimers.size > 0;
    observeUnit(parts, wires, s, history, powered);
    s.controlledStop = !!history.stopped && s.rpm === 0;
    s.backupLight = s.backupLight && !!history.openedSupply;
    if (game && lesson.activity) {
      if (lesson.id === 'house-breaker' && powered && s.current > .4201) {
        activity.tripped = true; powered = false; toast('Breaker tripped at ' + s.current.toFixed(2) + ' A');
      }
      const rang = activity.rang;
      measureActivity(lesson, parts, wires, s, activity, powered, dt);
      if (!rang && activity.rang) beep(true);
      if (activity.bonus && activity.delivered) $('activity-goal').hidden = true;
      fixture?.update(activity, parts, s, powered, mainframeProgress(completed, LEVELS));
      refreshActivityControls(powered);
    }
    if (game && lesson.challenge && !lesson.activity && lesson.id !== 'resistor-challenge') assessFinal(lesson.id, parts, wires, s, trial, { powered, dt, ...switchEvent });
    s.unitGoal = lesson.check(s);
    const instrument = $('instrument');
    const activeKinds = parts.some(p => ['capacitor', 'motor', 'led'].includes(p.kind));
    instrument.hidden = !activeKinds || !!lesson.activity;
    if (activeKinds) {
      const readings = [];
      if (parts.some(p => p.kind === 'capacitor')) readings.push(s.capVoltage.toFixed(2) + ' V');
      if (parts.some(p => p.kind === 'motor')) readings.push((powered ? s.rpm : 0) + ' rpm');
      if (parts.some(p => p.kind === 'led')) readings.push((powered ? s.activeLEDs.length : 0) + ' lit');
      instrument.textContent = readings.join(' · ');
    }
    for (const p of parts) if (p.kind === 'lamp') {
      const current = powered && !s.short ? Math.abs(s.currents[p.id] || 0) : 0;
      const ratio = Math.min(1, current / .3);
      const levelGlow = ratio > .04 ? Math.pow(ratio, 1.4) : 0;
      if (levelGlow <= .45) lampGlowColor.lerpColors(dimLampColor, midLampColor, levelGlow / .45);
      else lampGlowColor.lerpColors(midLampColor, brightLampColor, (levelGlow - .45) / .55);
      if (inReadingRoom()) {
        p.bulb.material.emissive.copy(lampGlowColor);
        p.bulb.material.emissiveIntensity = levelGlow > 0 ? .3 + levelGlow * 5.2 : 0;
        if (p.glass) p.glass.emissiveIntensity = levelGlow * .9;
        p.light.color.copy(lampGlowColor);
        p.light.intensity = levelGlow * 130;
      } else {
        p.bulb.material.emissive.copy(lampGlowColor);
        p.bulb.material.emissiveIntensity = levelGlow > 0 ? .25 + levelGlow * 4.5 : 0;
        p.bulb.material.color.copy(offBulbColor).lerp(lampGlowColor, Math.min(1, levelGlow * 1.4));
        p.light.color.copy(lampGlowColor);
        p.light.intensity = levelGlow * 18;
        if (p.halo) {
          p.halo.material.color.copy(lampGlowColor);
          p.halo.material.opacity = levelGlow * .45;
          p.halo.scale.setScalar(.85 + levelGlow * .45);
        }
      }
    }
    const rcLamps = parts.filter(p => p.kind === 'lamp');
    const rcText = [0, 1].map(idx => `Lamp ${idx + 1}: ${(powered && rcLamps[idx] ? Math.abs(s.currents[rcLamps[idx].id] || 0) : 0).toFixed(2)} A`).join(' · ');
    $('power').classList.toggle('on', powered); $('power').setAttribute('aria-pressed', String(powered)); $('power').setAttribute('aria-label', powered ? 'Turn off power' : 'Turn on power'); $('power').title = powered ? 'Turn off power' : 'Turn on power'; $('current').textContent = `${powered ? s.current.toFixed(LEVELS[level].id === 'series-resistors' ? 3 : 2) : (LEVELS[level].id === 'series-resistors' ? '0.000' : '0.00')} A`; const flowing = powered && Object.values(s.currents).some(v => Math.abs(v) > .0001); const state = s.short ? 'Short circuit' : recentBlast ? 'Circuit exploded' : activity.tripped ? 'Breaker tripped' : powered ? (flowing ? 'Current flowing' : 'Open circuit') : 'Power off'; $('board-status').classList.toggle('flowing', flowing); $('board-status').classList.toggle('fault', s.short || recentBlast || !!activity.tripped); $('board-status').title = state; $('board-status').setAttribute('aria-label', state); $('empty-prompt').hidden = parts.length > 0; $('challenge-readings').hidden = !lesson.challenge && !lesson.activity && lesson.id !== 'resistor-challenge'; $('challenge-readings').textContent = s.designReading ?? (lesson.id === 'resistor-challenge' ? rcText : '');
    s.branchControl = branchProof;
    refreshTeaching();
    if (game && powered && !s.short && LEVELS[level].check(s) && (skipTeaching || lessonStep >= LESSONS[level].length) && !wonThisVisit) { wonThisVisit = true; if (!completed.includes(level)) completed.push(level); saveState(); updateMainframeBadge(); $('goal-icon').innerHTML = icon('check'); $('goal-icon').setAttribute('aria-label', 'Complete'); $('goal-picture').classList.add('complete'); const unlockedNames = (LEVELS[level].unlocks || []).map(k => deviceNames[k]).filter(Boolean); const baseEnd = LEVELS[level].ending || LESSON_ENDINGS[existingLevels.indexOf(LEVELS[level])] || ''; $('win-learning').textContent = unlockedNames.length ? `${baseEnd} Toolbelt unlocked: ${unlockedNames.join(', ')}.` : baseEnd; $('next').innerHTML = (LEVELS[level + 1]?.id === 'sandbox' ? 'Free build' : LEVELS[level + 1]?.unit !== LEVELS[level].unit ? 'Start ' + LEVELS[level + 1].unit.toLowerCase() : 'Next') + icon('next'); updateProgress(); $('win').hidden = false; $('activity-goal').hidden = true; $('completion-status').textContent = 'Level complete.'; beep(true); }
  }
  function toggleSwitch(p) {
    if (powered && p.closed) {
      history.stopped = false;
      history.openedSupply = circuitState.current > .025 && Math.abs(circuitState.currents[p.id] || 0) > .025;
    }
    const before = solveCircuit(parts, wires); p.closed = !p.closed; p.lever.rotation.x = p.closed ? 0 : -.55; const after = solveCircuit(parts, wires);
    const motor = parts.find(part => part.kind === 'motor');
    if (powered && !p.closed && motor && circuitState.halfSpeed && Math.abs(before.currents[p.id] || 0) > .09 && Math.abs(after.currents[motor.id] || 0) < .001) history.stopped = true;
    if (powered && LEVELS[level].id === 'branches' && !before.short && !after.short && ((before.lit === 1 && after.lit === 2) || (before.lit === 2 && after.lit === 1))) branchProof = true; select(p); updateCircuit(0, { before, switched: p }); saveState();
  }
  function select(p) { selected = p; $('selection').hidden = !p; if (!p) return; const spec = partSpec(p.kind, p), title = houseLights[p.role] || p.role || partName(p.kind); $('selection-name').textContent = spec ? `${title} · ${spec}` : title; $('value-label').hidden = p.kind !== 'resistor'; $('reverse').hidden = p.kind !== 'battery' || !reversible(); $('toggle').hidden = p.kind !== 'switch'; $('gate-mode-label').hidden = p.kind !== 'gate'; $('clock-rate-label').hidden = p.kind !== 'clock'; $('press-button').hidden = p.kind !== 'button'; $('reset-latch').hidden = p.kind !== 'latch'; if (p.kind === 'switch') { $('toggle').setAttribute('aria-label', p.closed ? 'Open switch' : 'Close switch'); $('toggle').title = p.closed ? 'Open switch' : 'Close switch'; $('toggle').classList.toggle('closed', p.closed); } if (p.kind === 'resistor') { $('resistor-value').value = p.resistance; $('resistor-output').textContent = p.resistance + ' Ω'; } if (p.kind === 'gate') $('gate-mode').value = p.gateMode || 'NAND'; if (p.kind === 'clock') $('clock-rate').value = String(p.clockHz || 1); }
  function fits(x, z, kind, except, rotation = 0) { return partFits(parts, x, z, kind, inReadingRoom(), except, rotation); }
  function rotateSelected() {
    if (!selected) return;
    const nextRot = ((selected.rotation || 0) + 1) % 4;
    let pos = boardPosition(selected.x, selected.z, isFree(), selected.kind, inReadingRoom(), nextRot);
    if (!fits(pos.x, pos.z, selected.kind, selected, nextRot)) {
      pos = findSpace(parts.filter(q => q !== selected), pos, isFree(), selected.kind, inReadingRoom(), nextRot);
    }
    if (!pos) return toast('Not enough room to rotate');
    selected.rotation = nextRot; selected.x = pos.x; selected.z = pos.z;
    selected.mesh.position.set(pos.x, .14, pos.z);
    selected.mesh.rotation.y = -nextRot * Math.PI / 2;
    redrawWires();
    if (selected.kind === 'photo') updateCircuit();
    saveState(); beep();
  }
  function addPart(kind, pos) {
    if (pliersActive) setPliers(false); const free = isFree(); if (parts.length >= (free ? BOARD.freeLimit : BOARD.lessonLimit)) return toast('Component limit reached'); if (kind === 'jack' && parts.some(p => p.kind === 'jack')) return toast('The tester has one socket'); if (kind === 'battery' && parts.some(p => p.kind === 'battery')) return toast('1 battery per board'); let location = pos ? boardPosition(pos.x, pos.z, free, kind, inReadingRoom()) : null; if (!location || !fits(location.x, location.z, kind)) location = findSpace(parts, { x: Math.round(controls.target.x * 2) / 2, z: Math.round(controls.target.z * 2) / 2 }, free, kind, inReadingRoom()); if (!location) return toast('No space here'); const role = kind === 'lamp' && houseChallenge() ? Object.keys(houseLights).find(role => !parts.some(p => p.role === role)) : undefined;
    const extra = kind === 'gate' ? { gateMode: 'NAND', outputHigh: true } : kind === 'clock' ? { clockHz: 1, phase: 0, high: false } : kind === 'latch' ? { bit: 0, prevClk: null } : {};
    const p = makePart({ id: 'p' + (++serial), kind, role, ...location, rotation: 0, closed: false, resistance: 30, ...extra }); parts.push(p); select(p); updateCircuit(); saveState(); beep(); return p;
  }

  function resetParts() { shadeDrag = null; fixture?.dispose(); fixture = null; refreshActivityControls = () => { }; setPliers(false); clearTimeout(blastTimer); faultLatched = false; recentBlast = false; shortEffects.clear(); for (const t of buttonTimers.values()) clearTimeout(t); buttonTimers.clear(); for (const lead of liftedLeads.keys()) disposeObject(lead); liftedLeads.clear(); cancelWire(); for (const c of [...componentGroup.children]) disposeObject(c); terminals.clear(); parts = []; wires = []; redrawWires(); select(null); powered = false; simActive = false; branchProof = false; history = newHistory(); trial = newTrial(); activity = freshActivity(); capMoving = false; lastTick = 0; }
  function startLevel(i, restart = false) {
    if (game && !restart) saveState(); game = true; level = i; setRoom(); lessonStep = 0; skipTeaching = false; wonThisVisit = false; resetParts(); updateMainframeBadge(); setPanMode(false); $('landing').hidden = true; $('game').hidden = false; $('viewport').append(renderer.domElement); $('win').hidden = true; $('completion-status').textContent = ''; $('hint').hidden = true; const l = LEVELS[i];
    if (l.id !== 'sandbox') { lastLevel = i; try { localStorage.setItem(lastKey, l.id); } catch { } }
    fixture = createActivityScene(l, scene);
    $('activity-goal').hidden = !l.activity; $('activity-goal').textContent = l.activity ? l.goal : '';
    $('replay-lesson').hidden = !!l.activity;
    $('challenge-readings').classList.toggle('meter-reading', false);
    $('game').dataset.activity = l.id;
    if (l.activity) skipTeaching = true;
    refreshActivityControls = activityControls($('activity-controls'), l, activity, runActivity);
    $('reset').title = l.layout ? 'Restart experiment' : 'Clear board'; $('reset').setAttribute('aria-label', $('reset').title);
    $('power').hidden = $('current').hidden = false;
    $('progress').hidden = false; updateProgress(); $('unit-name').textContent = unitOf(l).label; $('level-number').textContent = l.id === 'sandbox' ? '∞' : String(lessonNumber(l)).padStart(2, '0') + ' / ' + String(unitLevels(l).length).padStart(2, '0'); $('challenge-target').hidden = !l.target; $('challenge-target').textContent = l.target ? `Target: ${l.target}` : ''; $('level-title').textContent = l.title; $('goal-picture').innerHTML = diagram(l.diagram); $('goal-picture').setAttribute('aria-label', l.goal); $('goal-picture').classList.toggle('complete', completed.includes(i)); $('goal-icon').innerHTML = completed.includes(i) ? icon('check') : '○'; $('goal-icon').setAttribute('aria-label', completed.includes(i) ? 'Complete' : 'Incomplete'); $('hint').textContent = l.hint; $('parts').replaceChildren();
    const free = isFree(), unlockedSet = free ? unlockedToolbelt(completed, LEVELS, !!userId) : null;
    for (const kind of l.parts) {
      const locked = free && !unlockedSet.has(kind);
      const spec = partSpec(kind);
      const b = document.createElement('button'); b.className = 'part' + (locked ? ' locked' : ''); b.dataset.kind = kind; b.setAttribute('aria-label', (locked ? 'Locked: ' : 'Add ') + partName(kind) + (spec ? ` (${spec})` : '')); b.innerHTML = `<span class="part-icon">${icon(inReadingRoom() && !houseChallenge() && kind === 'lamp' ? 'tableLamp' : kind)}</span><span class="part-label">${partName(kind)}</span>${spec ? `<span class="part-spec">${spec}</span>` : ''}${locked ? `<span class="part-lock">${icon('lock')}</span>` : ''}`;
      if (locked) {
        const req = TOOLBELT_UNLOCKS.find(u => u.kind === kind), src = LEVELS.find(other => other.id === req?.byLevel);
        listen(b, 'click', () => toast(src ? `Complete ${src.title} in Observatory to unlock ${partName(kind)}` : `Unlock in Unit 5 · Observatory`));
      } else {
        listen(b, 'pointerdown', e => startBinDrag(e, kind)); listen(b, 'click', e => { if (e.detail === 0) addPart(kind) });
      }
      $('parts').append(b);
    }
    const starter = starterBoard(l);
    const saved = restart ? starter : (boards[i] || starter); if (saved && Array.isArray(saved.parts) && Array.isArray(saved.wires)) {
      for (const p of saved.parts.slice(0, isFree() ? BOARD.freeLimit : BOARD.lessonLimit)) {
        if (!l.parts.includes(p.kind) || !/^p\d+$/.test(p.id) || !Number.isFinite(p.x) || !Number.isFinite(p.z) || parts.some(q => q.id === p.id) || p.kind === 'battery' && parts.some(q => q.kind === 'battery')) continue; serial = Math.max(serial, Number(p.id.slice(1))); const original = starter?.parts.find(q => q.id === p.id && q.kind === p.kind);
        const gateMode = ['NAND', 'NOR', 'AND', 'OR', 'XOR', 'NOT'].includes(p.gateMode) ? p.gateMode : original?.gateMode || 'NAND';
        const clockHz = [.5, 1, 2, 4].includes(Number(p.clockHz)) ? Number(p.clockHz) : original?.clockHz || 1;
        const rotation = ((Number(p.rotation) || 0) % 4 + 4) % 4;
        parts.push(makePart({ ...original, ...p, ...boardPosition(p.x, p.z, isFree(), p.kind, inReadingRoom(), rotation), rotation, resistance: Math.max(10, Math.min(100, Number(p.resistance) || 30)), closed: Boolean(p.closed ?? original?.closed), charge: Number.isFinite(p.charge) ? Math.max(-6, Math.min(6, p.charge)) : 0, reversed: !!p.reversed, gateMode, clockHz, bit: p.bit ? 1 : 0, outputHigh: p.outputHigh !== undefined ? !!p.outputHigh : !!original?.outputHigh, prevClk: null }));
      } wires = saved.wires.slice(0, 512).filter(w => terminals.has(w.a) && terminals.has(w.b) && w.a !== w.b);
    }
    if (!saved && inReadingRoom()) parts.push(makePart({ id: 'p' + (++serial), kind: 'lamp', x: 2, z: 0 }));
    redrawWires(); updateCircuit(); resetCamera(); if (saved?.view && [saved.view.camera, saved.view.target].every(v => Array.isArray(v) && v.length === 3 && v.every(Number.isFinite)) && saved.view.camera[1] > .2) { camera.position.fromArray(saved.view.camera); controls.target.fromArray(saved.view.target); setPanMode(!!saved.view.pan); controls.update(); updateSurface(); } resize();
  }
  function resetCamera() { let x = 0, z = 0; if (game && parts.length) { const xs = parts.map(p => p.x), zs = parts.map(p => p.z); x = (Math.min(...xs) + Math.max(...xs)) / 2; z = (Math.min(...zs) + Math.max(...zs)) / 2; } controls.target.set(x, activeRoom ? 1.6 : 0, z); if (activeRoom) camera.position.set(x + 3, 12.6, z + 26); else camera.position.set(x + (game ? 14 : 12), game ? 19 : 15, z + (game ? 19 : 16)); controls.update(); updateSurface(); }

  const ray = new THREE.Raycaster(), pointer = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -.14);
  function setRay(e) { const r = renderer.domElement.getBoundingClientRect(); pointer.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); ray.setFromCamera(pointer, camera); }
  function boardPoint(e) { setRay(e); const p = ray.ray.intersectPlane(plane, new THREE.Vector3()); if (!p) return null; return boardPosition(p.x, p.z, isFree()); }
  function hits(e) { setRay(e); scene.updateMatrixWorld(true); return ray.intersectObjects(componentGroup.children, true); }
  function handleTerminal(id) { if (!pending) { pending = id; $('wire-hint').hidden = false; refreshTeaching(); beep(); } else if (pending === id) { cancelWire(); } else { if (wires.some(w => w.a === pending && w.b === id || w.b === pending && w.a === id)) return toast('Already connected'); wires.push({ a: pending, b: id }); cancelWire(); redrawWires(); updateCircuit(); saveState(); beep(); } }
  listen(renderer.domElement, 'pointerdown', e => {
    if (!game || e.button !== 0) return; renderer.domElement.focus({ preventScroll: true });
    if (pliersActive) {
      if (!e.isPrimary) { grip = null; highlightLead(null); return; }
      const lead = pickLead(e);
      highlightLead(lead);
      grip = lead ? { lead, id: e.pointerId, x: e.clientX, y: e.clientY } : null;
      renderer.domElement.style.cursor = grip ? closedPliers : openPliers;
      return;
    }
    const h = hits(e);
    if (!pending && fixture?.shadeHandle) {
      const hit = ray.intersectObject(fixture.shadeHandle, true)[0];
      if (hit && (!h[0] || hit.distance < h[0].distance)) {
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -hit.point.y);
        shadeDrag = { plane, offset: activity.shadow - hit.point.x }; controls.enabled = false;
        renderer.domElement.setPointerCapture(e.pointerId); e.stopImmediatePropagation(); return;
      }
    }
    const t = h.find(h => h.object.userData.terminal); if (t) { controls.enabled = false; handleTerminal(t.object.userData.terminal); return; } if (pending) return; const first = h[0]; if (!first) { select(null); return; } let obj = first.object; while (obj && !obj.userData.part) obj = obj.parent; const p = obj?.userData.part; if (!p) return; select(p); controls.enabled = false; const start = boardPoint(e); drag = { p, start, x: p.x, z: p.z, px: e.clientX, py: e.clientY, moved: false }; if (p.kind === 'button') { p.closed = true; p.pressedAt = performance.now(); clearTimeout(buttonTimers.get(p.id)); buttonTimers.delete(p.id); updateCircuit(); } renderer.domElement.setPointerCapture(e.pointerId);
  }, true);
  listen(renderer.domElement, 'pointermove', e => {
    if (!game) return;
    if (pliersActive) {
      if (grip && Math.hypot(e.clientX - grip.x, e.clientY - grip.y) > 7) grip = null;
      highlightLead(e.buttons ? grip?.lead || null : pickLead(e));
      renderer.domElement.style.cursor = grip ? closedPliers : openPliers;
      return;
    }
    if (shadeDrag) {
      setRay(e); const point = ray.ray.intersectPlane(shadeDrag.plane, new THREE.Vector3());
      if (point) {
        activity.shadow = THREE.MathUtils.clamp(point.x + shadeDrag.offset, -6, 6);
        $('activity-controls').querySelector('input').value = activity.shadow; updateCircuit();
      }
      return;
    }
    if (pending) { const p = boardPoint(e), a = terminalPosition(pending); clearPreview(); if (a && p) { preview = wireMesh(a, new THREE.Vector3(p.x, .6, p.z), '#cda357'); scene.add(preview); } renderer.domElement.style.cursor = 'crosshair'; return; } if (drag) { const pos = boardPoint(e); if (!pos || !drag.start) return; if (!drag.moved && Math.hypot(e.clientX - drag.px, e.clientY - drag.py) > 5) { drag.moved = true; if (drag.p.kind === 'button' && drag.p.closed) { drag.p.closed = false; updateCircuit(); } } const { x, z } = boardPosition(drag.x + pos.x - drag.start.x, drag.z + pos.z - drag.start.z, isFree(), drag.p.kind, inReadingRoom(), drag.p.rotation || 0); if (fits(x, z, drag.p.kind, drag.p, drag.p.rotation || 0)) { Object.assign(drag.p, { x, z }); drag.p.mesh.position.set(x, .14, z); redrawWires(); if (drag.p.kind === 'photo') updateCircuit(); } return; } const h = hits(e); hoverTerminal = h.find(v => v.object.userData.terminal)?.object.userData.terminal || null; renderer.domElement.style.cursor = hoverTerminal ? 'crosshair' : h.length ? 'grab' : 'default';
  });
  function endPointer() { shadeDrag = null; if (drag) { if (drag.p.kind === 'switch' && !drag.moved) { toggleSwitch(drag.p); } else if (drag.p.kind === 'button' && !drag.moved) { const btn = drag.p, remain = Math.max(0, 260 - (performance.now() - (btn.pressedAt || 0))); clearTimeout(buttonTimers.get(btn.id)); if (remain <= 15) { btn.closed = false; updateCircuit(); } else { buttonTimers.set(btn.id, setTimeout(() => { buttonTimers.delete(btn.id); btn.closed = false; updateCircuit(); }, remain)); } } saveState(); drag = null; } controls.enabled = true; }
  listen(renderer.domElement, 'pointerup', e => {
    if (pliersActive) {
      const lead = grip?.lead;
      if (lead && grip.id === e.pointerId && Math.hypot(e.clientX - grip.x, e.clientY - grip.y) <= 7 && pickLead(e) === lead) pullLead(lead);
      grip = null; renderer.domElement.style.cursor = pliersActive ? openPliers : '';
    }
    endPointer();
  });
  listen(renderer.domElement, 'pointerleave', () => { if (!grip) highlightLead(null); });
  listen(renderer.domElement, 'pointercancel', () => { grip = null; highlightLead(null); if (pliersActive) renderer.domElement.style.cursor = openPliers; }); listen(renderer.domElement, 'pointercancel', endPointer); listen(window, 'pointerup', () => controls.enabled = true);
  function startBinDrag(e, kind) { if (e.button !== 0) return; e.preventDefault(); const sx = e.clientX, sy = e.clientY; let moved = false, ghost; const move = ev => { if (Math.hypot(ev.clientX - sx, ev.clientY - sy) > 5) moved = true; if (moved) { if (!ghost) { ghost = document.createElement('div'); ghost.className = 'drag-ghost'; ghost.innerHTML = icon(inReadingRoom() && !houseChallenge() && kind === 'lamp' ? 'tableLamp' : kind); document.body.append(ghost) } ghost.style.left = ev.clientX - 28 + 'px'; ghost.style.top = ev.clientY - 28 + 'px'; } }; const up = ev => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', cancel); ghost?.remove(); if (!moved) { addPart(kind); return; } const r = renderer.domElement.getBoundingClientRect(); if (ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom) addPart(kind, boardPoint(ev)); }; const cancel = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', cancel); ghost?.remove(); }; listen(window, 'pointermove', move); listen(window, 'pointerup', up); listen(window, 'pointercancel', cancel); }
  function removeSelected() { if (!selected) return; cancelWire(); const p = selected; wires = wires.filter(w => !w.a.startsWith(p.id + ':') && !w.b.startsWith(p.id + ':')); p.rings.forEach((_, i) => terminals.delete(p.id + ':' + i)); disposeObject(p.mesh); parts = parts.filter(q => q !== p); select(null); redrawWires(); updateCircuit(); saveState(); }
  $('play').onclick = () => startLevel(nextPlayLevel(completed, lastLevel, !!userId)); for (const id of ['guide-button', 'landing-guide']) $(id).onclick = showGuide; for (const id of ['mainframe-button', 'landing-mainframe']) $(id).onclick = showMainframe; $('open-freebuild').onclick = () => { $('mainframe').close(); startLevel(LEVELS.length - 1); };
  $('home').onclick = () => { if (game) saveState(); game = false; setRoom(); setPanMode(false); resetParts(); $('game').hidden = true; $('landing').hidden = false; $('progress').hidden = true; $('teaching').hidden = true; document.querySelectorAll('.lesson-focus').forEach(e => e.classList.remove('lesson-focus')); $('hero-scene').append(renderer.domElement); hero(); resize(); };
  for (const b of document.querySelectorAll('.close-dialog')) b.onclick = () => b.closest('dialog').close(); $('help-button').onclick = () => $('help').showModal(); $('cancel-wire').onclick = cancelWire; document.querySelector('.close-help').onclick = () => $('help').close(); $('teaching-next').onclick = () => { lessonStep++; updateCircuit(); }; $('skip-teaching').onclick = () => { skipTeaching = true; updateCircuit(); }; $('replay-lesson').onclick = () => { lessonStep = 0; skipTeaching = false; refreshTeaching(); }; $('hint-button').onclick = () => $('hint').hidden = !$('hint').hidden; $('save').onclick = () => saveState(false); $('camera').onclick = resetCamera; $('pan').onclick = () => { if (pliersActive) setPliers(false); setPanMode(!panMode); };
  $('power').onclick = () => {
    cancelWire(); powered = !powered; activity.tripped = false; recentBlast = false; clearTimeout(blastTimer);
    for (const t of buttonTimers.values()) clearTimeout(t); buttonTimers.clear();
    for (const p of parts) {
      if (p.kind === 'button') p.closed = false;
      if (p.kind === 'coil') { p.relayTimer = 0; if (!powered) p.energized = false; }
      if (p.kind === 'gate') { p.gateTimer = 0; if (LEVELS[level].id === 'mainframe-boot' && powered) p.outputHigh = ['NOT', 'NAND', 'NOR'].includes(p.gateMode); }
      if (p.kind === 'latch') { p.prevClk = null; if (LEVELS[level].id === 'mainframe-boot' && powered) p.bit = 0; }
      if (p.kind === 'clock' && (!powered || LEVELS[level].id === 'mainframe-boot')) { p.phase = 0; p.high = false; }
    }
    updateCircuit(); beep();
  }; $('pliers').onclick = () => {
    setPliers(!pliersActive);
    renderer.domElement.focus({ preventScroll: true });
  }; $('reset').onclick = () => { if (LEVELS[level].layout) { startLevel(level, true); saveState(); return; } lessonStep = 0; skipTeaching = false; wonThisVisit = false; resetParts(); boards[level] = { parts: [], wires: [] }; $('win').hidden = true; $('completion-status').textContent = ''; updateCircuit(); saveState(); }; $('rotate').onclick = rotateSelected; $('delete').onclick = removeSelected;
  $('reverse').onclick = () => { if (selected?.kind === 'battery' && reversible()) { selected.reversed = !selected.reversed; showPolarity(selected); updateCircuit(); saveState(); } };
  $('toggle').onclick = () => { if (selected?.kind === 'switch') { toggleSwitch(selected); } };
  $('gate-mode').onchange = e => { if (selected?.kind === 'gate') { selected.gateMode = e.target.value; selected.outputHigh = ['NAND', 'NOR', 'NOT'].includes(selected.gateMode); updateCircuit(); saveState(); } };
  $('clock-rate').onchange = e => { if (selected?.kind === 'clock') { selected.clockHz = Number(e.target.value); updateCircuit(); saveState(); } };
  $('press-button').onclick = () => { if (selected?.kind === 'button') pulseButton(selected); };
  $('reset-latch').onclick = () => { if (selected?.kind === 'latch') { selected.bit = 0; updateCircuit(); saveState(); } };
  $('resistor-value').oninput = e => { if (selected?.kind === 'resistor') { selected.resistance = Number(e.target.value); $('resistor-output').textContent = selected.resistance + ' Ω'; updateCircuit(); saveState(); } };
  $('next').onclick = () => { if (level < LEVELS.length - 1) startLevel(level + 1) }; $('sound').onclick = () => { sound = !sound; $('sound').setAttribute('aria-pressed', sound); $('sound').innerHTML = icon(sound ? 'sound' : 'mute'); $('sound').title = sound ? 'Mute sound' : 'Enable sound'; $('sound').setAttribute('aria-label', $('sound').title); beep(); }; $('short-mode').onclick = () => { explosiveShorts = !explosiveShorts; try { localStorage.setItem(shortModeKey, explosiveShorts ? 'explosive' : 'smoke'); } catch { } syncShortMode(); beep(); };
  listen(window, 'keydown', e => {
    if (e.key === 'Escape') { cancelWire(); if (pliersActive) setPliers(false); } if (!game || document.querySelector('dialog[open]') || ['INPUT', 'BUTTON', 'SELECT'].includes(document.activeElement.tagName)) return; if (pliersActive && document.activeElement === renderer.domElement) {
      const leads = wireGroup.children;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const index = leads.indexOf(highlightedLead), step = e.key === 'ArrowRight' ? 1 : -1;
        const next = index < 0 ? (step > 0 ? 0 : leads.length - 1) : (index + step + leads.length) % leads.length;
        highlightLead(leads[next]); $('pliers-hint').textContent = 'Wire ' + (next + 1) + ' of ' + leads.length + ' · Enter to remove'; return;
      }
      if (['Enter', 'Delete', 'Backspace'].includes(e.key)) {
        e.preventDefault(); if (highlightedLead && !e.repeat) { pullLead(highlightedLead); $('pliers-hint').textContent = 'Choose a wire to remove'; } return;
      }
    }
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); removeSelected(); } if (e.key === 'r' || e.key === 'R') { e.preventDefault(); rotateSelected(); } if (e.code === 'Space') { e.preventDefault(); $('power').click(); } if (selected && e.key.startsWith('Arrow')) { e.preventDefault(); const x = selected.x + (e.key === 'ArrowLeft' ? -.5 : e.key === 'ArrowRight' ? .5 : 0), z = selected.z + (e.key === 'ArrowUp' ? -.5 : e.key === 'ArrowDown' ? .5 : 0); const next = boardPosition(x, z, isFree(), selected.kind, inReadingRoom(), selected.rotation || 0); if (fits(next.x, next.z, selected.kind, selected, selected.rotation || 0)) { selected.x = next.x; selected.z = next.z; selected.mesh.position.set(next.x, .14, next.z); redrawWires(); updateCircuit(); saveState(); } }
  });
  function hero() { parts = [makePart({ id: 'hero1', kind: 'battery', x: -2.8, z: -.8 }), makePart({ id: 'hero2', kind: 'lamp', x: 1.2, z: -.8 }), makePart({ id: 'hero3', kind: 'switch', x: .1, z: 2, closed: true })]; wires = [{ a: 'hero1:0', b: 'hero2:0' }, { a: 'hero2:1', b: 'hero3:1' }, { a: 'hero3:0', b: 'hero1:1' }]; redrawWires(); powered = true; updateCircuit(); resetCamera(); }
  function resize() { const container = game ? $('viewport') : $('hero-scene'); const w = container.clientWidth, h = container.clientHeight; if (!w || !h) return; renderer.setSize(w, h); camera.aspect = w / h; camera.zoom = Math.min(1, Math.max(.4, camera.aspect / .95)); camera.updateProjectionMatrix(); } const observer = new ResizeObserver(resize); observer.observe(document.body); listen(window, 'resize', resize);
  function updateProgress() { const row = $('progress'); row.replaceChildren(); const unit = LEVELS[level].unit; LEVELS.forEach((l, i) => { if (l.unit !== unit) return; const b = document.createElement('button'); b.className = 'progress-dot' + (i === level ? ' active' : '') + (completed.includes(i) ? ' done' : ''); b.disabled = !unlocked(i); b.title = l.title; b.setAttribute('aria-label', `${l.unit}: ${l.title}`); b.setAttribute('aria-current', i === level ? 'step' : 'false'); b.innerHTML = completed.includes(i) ? icon('check') : l.id === 'sandbox' ? '∞' : `${lessonNumber(l)}`; b.onclick = () => startLevel(i); row.append(b); }); }

  controls.addEventListener('end', saveState);
  hero(); resize(); updateMainframeBadge(); if (cloudError) toast('Cloud storage unavailable. Saved on this device.');
  const requestedUnit = new URLSearchParams(window.location.search).get('unit')?.toLowerCase();
  const entry = LEVELS.findIndex(l => unitOf(l).theme && l.unit.toLowerCase() === requestedUnit);
  if (entry >= 0) startLevel(entry);
  let readySent = false;
  renderer.setAnimationLoop(time => {
    animateLiftedLeads(time);
    const elapsed = Math.min(.15, (time - lastFrame) / 1000); lastFrame = time;
    shortEffects.update(elapsed);
    const ticking = simActive || LEVELS[level].machine || activity.running;
    if (powered && ticking && time - lastTick >= 50) { const dt = Math.min(.2, (time - lastTick) / 1000); lastTick = time; updateCircuit(dt); }
    else if (!ticking || !powered) lastTick = time;
    for (const p of parts) if (deviceNames[p.kind]) updateDeviceVisual(p, circuitState, activity, powered, elapsed);
    for (const p of parts) if (p.kind === 'motor' && p.rotor) {
      const loadedMachine = LEVELS[level].machine && LEVELS[level].id !== 'belt-drive';
      if (powered && !loadedMachine) {
        p.stallBase = null; p.rotor.rotation.z -= (circuitState.currents[p.id] || 0) * 900 * 2 * Math.PI / 60 * elapsed;
      } else if (powered && loadedMachine && Math.abs(circuitState?.currents?.[p.id] || 0) > .08 && !activity.speed) {
        p.stallBase ??= p.rotor.rotation.z; p.rotor.rotation.z = p.stallBase + Math.sin(time * .06) * .024;
      } else if (p.stallBase != null) { p.rotor.rotation.z = p.stallBase; p.stallBase = null; }
    }
    if (game && (LEVELS[level].machine || LEVELS[level].unit === 'Observatory') && fixture) fixture.update(activity, parts, circuitState, powered, mainframeProgress(completed, LEVELS));
    controls.update(); updateSurface(); ground.position.x = controls.target.x; ground.position.z = controls.target.z; sun.position.set(controls.target.x - 6, 14, controls.target.z + 8); sun.target.position.set(controls.target.x, 0, controls.target.z); for (const p of parts) for (let i = 0; i < p.rings.length; i++) { const active = game && (pending === p.id + ':' + i || hoverTerminal === p.id + ':' + i || !skipTeaching && level === 0 && lessonStep >= 3 && lessonStep <= 5); p.rings[i].material.opacity = active ? .7 + Math.sin(time * .006) * .3 : 0; } for (const wire of wireGroup.children) { const e = wire.userData.endpoints, current = powered && circuitState && e ? (circuitState.voltages[e.a] - circuitState.voltages[e.b]) / .01 : 0; wire.children.forEach((bead, i) => { bead.visible = powered && Math.abs(current) > .01; if (bead.visible) { const t = ((time * .00012 * Math.sign(current) + i / 3) % 1 + 1) % 1; bead.position.copy(wire.userData.curve.getPoint(t)); } }); } const shaking = shortEffects.getCameraOffset(shakeOffset); if (shaking) camera.position.add(shakeOffset); activeRoom?.draw(renderer, camera); renderer.render(scene, camera); if (shaking) camera.position.sub(shakeOffset); if (!readySent) { readySent = true; onReady?.(); }
  });
  return () => { saveState(); clearTimeout(cloudSaveTimer); if (cloudSavePending) void flushCloudSave(); events.abort(); observer.disconnect(); clearTimeout(toastTimer); clearTimeout(blastTimer); for (const t of buttonTimers.values()) clearTimeout(t); buttonTimers.clear(); shortEffects.dispose(); document.querySelectorAll('.drag-ghost').forEach(e => e.remove()); renderer.setAnimationLoop(null); controls.removeEventListener('end', saveState); controls.dispose(); fixture?.dispose(); readingRoom?.dispose(); for (const room of rooms.values()) room.dispose(); paintedTop.dispose(); paintedFrame.dispose(); const materials = new Set(), geometries = new Set(), textures = new Set(); scene.traverse(o => { if (o.geometry) geometries.add(o.geometry); if (o.material) for (const m of Array.isArray(o.material) ? o.material : [o.material]) { materials.add(m); for (const v of Object.values(m)) if (v?.isTexture) textures.add(v); } }); geometries.forEach(g => g.dispose()); textures.forEach(t => t.dispose()); materials.forEach(m => m.dispose()); sun.shadow.dispose(); renderer.dispose(); renderer.domElement.remove(); for (const e of document.querySelectorAll('#workshop button,#workshop input,#workshop select')) { e.onclick = null; e.oninput = null; e.onchange = null; } };
}
