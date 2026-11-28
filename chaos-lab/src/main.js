import { newTrial, assessFinal } from './challenges.js';
import { units, starterBoard, observeUnit, newHistory } from './units.js';
import { unitRoom, themeColors, makeUnitPart, updateDeviceVisual } from './unit-scenes.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { LEVELS, existingLevels, solveCircuit, applyStep } from './circuit.js';
import { BOARD, FREE_BOARD, boardPosition, partFits, findSpace } from './workbench.js';
import { LESSONS, stepSatisfied, restoreProgress, encodeProgress, mergeProgress, needsCloudSync, canAccessLevel, levelLockReason, chapterGateLevel, nextPlayLevel } from './lessons.js';
import { makeReadingLamp, makeReadingRoom, makeHouseLamp } from './reading-room.js';
import { pliersCursor, wireUnderPointer } from './pliers.js';
import { icon, diagram } from './visuals.js';
import { freshActivity, conditions, measureActivity, deviceNames, pins } from './activities.js';
import { activityControls } from './activity-controls.js';
import { createActivityScene } from './activity-scenes.js';
import { unlockedToolbelt, mainframeProgress, mainframeBlueprintSvg, TOOLBELT_UNLOCKS, FREE_BUILD_PARTS } from './observatory.js';
import { LIBRARY_SHELVES, LIBRARY_UNLOCKS } from './library.js';
import { masterProgress } from './master.js';
import { getComponentGuide } from './component-guide.js';
import { createShortEffects, playShortSound } from './short-effects.js';
import { createSoundEngine } from './sound.js';
import { createFirstLightScene } from './first-light.js';
import { createBoardHistory } from './history.js';
import { LAYER_HEIGHT, MAX_LAYERS, clampLayer, layerY, SANDBOX_CATEGORIES, filterSandboxParts, normalizeSandboxSlots, mergeSandboxSlots, probePartReading } from './sandbox.js';
export function initWorkshop({ userId = null, accountProgress = null, cloudReady = false, cloudError = false, onReady = null } = {}) {
  const events = new AbortController();
  const listen = (target, type, fn, options = {}) => target.addEventListener(type, fn, typeof options === 'boolean' ? { capture: options, signal: events.signal } : { ...options, signal: events.signal });

  const $ = id => document.getElementById(id), names = { battery: 'Battery', lamp: 'Lamp', switch: 'Switch', resistor: 'Resistor', capacitor: 'Capacitor', led: 'LED signal', motor: 'DC motor', ...deviceNames };
  $('landing').hidden = false; $('game').hidden = true; $('progress').hidden = true; $('win').hidden = true; $('completion-status').textContent = ''; $('selection').hidden = true;
  for (const d of document.querySelectorAll('dialog[open]')) d.close();
  let circuitState = null, hoverTerminal = null, lessonStep = 0, skipTeaching = false, wonThisVisit = false, panMode = false, simActive = false;
  let firstLight = null, firstLightScore = null, firstLightTimer = null;
  const buttonTimers = new Map();
  let level = 0, lastLevel = null, parts = [], wires = [], powered = false, selected = null, pending = null, drag = null, serial = 0, completed = [], boards = {}, sound = true, explosiveShorts = false, faultLatched = false, recentBlast = false, blastTimer = null, toastTimer, branchProof = false, game = false, cloudSaveTimer = null, cloudRetryTimer = null, cloudSavePending = null, cloudSaveInFlight = false, cloudSaveDisabled = false, cloudRetryCount = 0, cloudNeedsInitialSync = false;
  const lastKey = userId ? `little-circuit-last:user:${userId}` : 'little-circuit-last';
  const shortModeKey = 'little-circuit-short-mode';
  const soundKey = 'little-circuit-sound';
  const slotsKey = userId ? `little-circuit-sandbox-slots:user:${userId}` : 'little-circuit-sandbox-slots';
  const unlockKey = userId ? `little-circuit-unlock-all:user:${userId}` : null;
  let sandboxSlots = normalizeSandboxSlots(null), unlockAll = false;
  const boardHistory = createBoardHistory(60);
  let activeLayer = 0, sandboxCategory = 'all', hoveredPart = null;
  try {
    explosiveShorts = localStorage.getItem(shortModeKey) === 'explosive';
    sound = localStorage.getItem(soundKey) !== '0';
    if (unlockKey) unlockAll = localStorage.getItem(unlockKey) === '1';
  } catch { }
  function setCloudStatus(mode, text) {
    const el = $('account-save-status');
    if (!el || !userId) return;
    el.textContent = text;
    el.classList.remove('syncing', 'saved', 'warn');
    if (mode) el.classList.add(mode);
  }
  const sfx = createSoundEngine({ enabled: sound });
  function syncSoundButton() {
    const btn = $('sound');
    if (!btn) return;
    btn.setAttribute('aria-pressed', String(sound));
    btn.innerHTML = icon(sound ? 'sound' : 'mute');
    btn.title = sound ? 'Mute sound' : 'Enable sound';
    btn.setAttribute('aria-label', btn.title);
  }
  syncSoundButton();
  try {
    let restoredSlots = null;
    if (userId) {
      const cached = JSON.parse(localStorage.getItem(`little-circuit-v5:user:${userId}`) || 'null');
      const merged = mergeProgress(accountProgress, cached);
      const restored = restoreProgress(merged);
      completed = restored.completed;
      boards = restored.boards;
      restoredSlots = restored.sandboxSlots;
      if (restored.lastLevel !== null) lastLevel = restored.lastLevel;
      unlockAll = unlockAll || restored.unlockAll;
      cloudNeedsInitialSync = needsCloudSync(merged, accountProgress);
      try {
        localStorage.setItem(`little-circuit-v5:user:${userId}`, JSON.stringify(merged));
        if (lastLevel !== null && LEVELS[lastLevel]) localStorage.setItem(lastKey, LEVELS[lastLevel].id);
        if (unlockKey) localStorage.setItem(unlockKey, unlockAll ? '1' : '0');
      } catch { }
    } else {
      const stored = JSON.parse(localStorage.getItem('little-circuit-v5') || localStorage.getItem('little-circuit-v3') || 'null'), previous = JSON.parse(localStorage.getItem('little-circuit-v2') || 'null'), legacy = JSON.parse(localStorage.getItem('little-circuit-v1') || 'null');
      ({ completed, boards, sandboxSlots: restoredSlots } = restoreProgress(stored, legacy, previous));
    }
    if (lastLevel === null) {
      const savedLast = localStorage.getItem(lastKey);
      if (savedLast) {
        const idx = LEVELS.findIndex(l => l.id === savedLast);
        if (idx >= 0 && LEVELS[idx].id !== 'sandbox') lastLevel = idx;
      }
    }
    const rawLocalSlots = JSON.parse(localStorage.getItem(slotsKey) || 'null');
    sandboxSlots = mergeSandboxSlots(restoredSlots, rawLocalSlots);
    const sandboxIdx = LEVELS.findIndex(l => l.id === 'sandbox');
    if (sandboxIdx >= 0 && boards[sandboxIdx]?.parts?.length && !sandboxSlots.slots.some(s => s.parts.length)) {
      sandboxSlots.slots[0] = { ...sandboxSlots.slots[0], ...boards[sandboxIdx], name: 'Build 1', updatedAt: Date.now() };
    }
    try { localStorage.setItem(slotsKey, JSON.stringify(sandboxSlots)); } catch { }
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
  function label(text, parent, x, y, z, size = 1.1, color = '#544334', pin = false) { const c = document.createElement('canvas'); c.width = pin ? 160 : 512; c.height = pin ? 120 : 128; const ctx = c.getContext('2d'); ctx.fillStyle = color; ctx.font = pin ? 'bold 64px monospace' : '500 54px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; const metrics = ctx.measureText(text); const dy = Number.isFinite(metrics.actualBoundingBoxAscent) && Number.isFinite(metrics.actualBoundingBoxDescent) ? (metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2 : 0; ctx.fillText(text, c.width / 2, c.height / 2 + dy, c.width - 14); const texture = new THREE.CanvasTexture(c); texture.colorSpace = THREE.SRGBColorSpace; const m = new THREE.Mesh(new THREE.PlaneGeometry(size, pin ? size * .75 : size / 4), new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false })); m.rotation.x = pin ? 0 : -Math.PI / 2; m.position.set(x, y, z); m.userData.ownedMaterial = true; m.userData.ctx = ctx; m.userData.tex = texture; parent.add(m); return m; }
  const table = new THREE.Group(); scene.add(table); box(BOARD.width + .6, .55, BOARD.depth + .6, walnut, table, 0, -.37, 0, .16); box(BOARD.width, .22, BOARD.depth, oak, table, 0, .01, 0, .12); box(BOARD.width + 1.2, .2, BOARD.depth + 1.2, walnut, table, 0, -.72, 0, .1);
  for (const x of [-BOARD.width / 2 + .6, BOARD.width / 2 - .6]) for (const z of [-BOARD.depth / 2 + .6, BOARD.depth / 2 - .6]) { cylinder(.085, .025, brass, table, x, .14, z); box(.1, .006, .012, dark, table, x, .155, z, .002) }
  const grid = new THREE.GridHelper(BOARD.width - 2, (BOARD.width - 2) * 2, '#6d4e31', '#8b6741'); grid.scale.z = (BOARD.depth - 2) / (BOARD.width - 2); grid.material.transparent = true; grid.material.opacity = .10; grid.position.y = .125; table.add(grid); label('LITTLE CIRCUIT', table, 0, .14, BOARD.depth / 2 - .5, 2.2, '#775839');
  const freeWoodTex = oak.map.clone(); freeWoodTex.wrapS = freeWoodTex.wrapT = THREE.RepeatWrapping; freeWoodTex.repeat.set(3, 2.5); freeWoodTex.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy()); freeWoodTex.needsUpdate = true;
  const freeTable = new THREE.Group(); scene.add(freeTable); freeTable.visible = false;
  const greenhouseTopMat = new THREE.MeshStandardMaterial({ color: '#e2bc86', map: freeWoodTex, roughness: .78 });
  const greenhouseFrameMat = new THREE.MeshStandardMaterial({ color: '#1b5142', roughness: .48, metalness: .36 });
  box(FREE_BOARD.width + .8, .56, FREE_BOARD.depth + .8, greenhouseFrameMat, freeTable, 0, -.37, 0, .16);
  box(FREE_BOARD.width, .22, FREE_BOARD.depth, greenhouseTopMat, freeTable, 0, .01, 0, .12);
  box(FREE_BOARD.width + 1.5, .2, FREE_BOARD.depth + 1.5, greenhouseFrameMat, freeTable, 0, -.72, 0, .1);
  for (const lx of [-FREE_BOARD.width / 2 + 1.2, FREE_BOARD.width / 2 - 1.2]) {
    for (const lz of [-FREE_BOARD.depth / 2 + 1.2, FREE_BOARD.depth / 2 - 1.2]) {
      box(.85, 9, .85, greenhouseFrameMat, freeTable, lx, -4.6, lz, .08);
    }
  }
  for (const fx of [-FREE_BOARD.width / 2 + .6, FREE_BOARD.width / 2 - .6]) {
    for (const fz of [-FREE_BOARD.depth / 2 + .6, FREE_BOARD.depth / 2 - .6]) {
      cylinder(.1, .03, brass, freeTable, fx, .14, fz);
    }
  }
  const terraMat = new THREE.MeshStandardMaterial({ color: '#cf6440', roughness: .75 });
  const soilMat = new THREE.MeshStandardMaterial({ color: '#422c20', roughness: .95 });
  const leafA = new THREE.MeshStandardMaterial({ color: '#33884d', roughness: .75 });
  const leafB = new THREE.MeshStandardMaterial({ color: '#64b856', roughness: .75 });
  const bloomColors = ['#ffaa2b', '#f25c54', '#ea63a5', '#9b74f5'].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: .55 }));
  const leafGeo = new THREE.SphereGeometry(.48, 10, 8), bloomGeo = new THREE.SphereGeometry(.19, 8, 6);
  const cornerSigns = [[-1, -1, 0], [1, -1, 1], [-1, 1, 2], [1, 1, 3]];
  for (const [sx, sz, bi] of cornerSigns) {
    const px = sx * (FREE_BOARD.width / 2 + 1.15), pz = sz * (FREE_BOARD.depth / 2 + 1.15);
    const arm = box(1.8, .22, 1.8, greenhouseFrameMat, freeTable, px - sx * .4, -.35, pz - sz * .4, .08); arm.raycast = () => { };
    const pot = cylinder(.82, 1.15, terraMat, freeTable, px, .15, pz); pot.raycast = () => { };
    const soil = cylinder(.72, .12, soilMat, freeTable, px, .7, pz); soil.raycast = () => { };
    for (const [dx, dy, dz, lm] of [[0, 1.1, 0, leafA], [-.32, .95, .28, leafB], [.34, 1.0, -.24, leafB]]) {
      const lf = new THREE.Mesh(leafGeo, lm); lf.position.set(px + dx, dy, pz + dz); lf.castShadow = true; lf.raycast = () => { }; freeTable.add(lf);
    }
    for (const [dx, dy, dz, ci] of [[-.22, 1.48, .22, bi], [.26, 1.42, -.16, (bi + 1) % 4], [.04, 1.56, .08, (bi + 2) % 4]]) {
      const bl = new THREE.Mesh(bloomGeo, bloomColors[ci]); bl.position.set(px + dx, dy, pz + dz); bl.raycast = () => { }; freeTable.add(bl);
    }
  }
  const freeGrid = new THREE.GridHelper(FREE_BOARD.width - 2, (FREE_BOARD.width - 2) * 2, '#2b6e59', '#65a889');
  freeGrid.scale.z = (FREE_BOARD.depth - 2) / (FREE_BOARD.width - 2);
  freeGrid.material.transparent = true; freeGrid.material.opacity = .18; freeGrid.position.y = .125; freeGrid.raycast = () => { };
  freeTable.add(freeGrid);
  label('GREENHOUSE BENCH · FREE BUILD', freeTable, 0, .14, FREE_BOARD.depth / 2 - .6, 3.8, '#1b4f3f');
  const layerDecks = [null];
  for (let l = 1; l < MAX_LAYERS; l++) {
    const deck = new THREE.Group();
    deck.position.y = layerY(l) - .02;
    const glassMat = new THREE.MeshBasicMaterial({ color: '#e6f7ee', transparent: true, opacity: .18, depthWrite: false, side: THREE.DoubleSide });
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(FREE_BOARD.width - .6, FREE_BOARD.depth - .6), glassMat);
    glass.rotation.x = -Math.PI / 2; glass.raycast = () => { }; glass.userData.ownedMaterial = true;
    const railMat = new THREE.MeshStandardMaterial({ color: '#b58b49', metalness: .65, roughness: .35, transparent: true, opacity: .82 });
    for (const side of [-1, 1]) {
      const fb = new THREE.Mesh(new THREE.BoxGeometry(FREE_BOARD.width, .09, .18), railMat);
      fb.position.set(0, 0, side * (FREE_BOARD.depth / 2 - .15)); fb.raycast = () => { };
      const lr = new THREE.Mesh(new THREE.BoxGeometry(.18, .09, FREE_BOARD.depth), railMat);
      lr.position.set(side * (FREE_BOARD.width / 2 - .15), 0, 0); lr.raycast = () => { };
      deck.add(fb, lr);
    }
    const postGeo = new THREE.CylinderGeometry(.13, .13, LAYER_HEIGHT, 12);
    for (const px of [-FREE_BOARD.width / 2 + .6, FREE_BOARD.width / 2 - .6]) {
      for (const pz of [-FREE_BOARD.depth / 2 + .6, FREE_BOARD.depth / 2 - .6]) {
        const post = new THREE.Mesh(postGeo, railMat);
        post.position.set(px, -LAYER_HEIGHT / 2, pz); post.raycast = () => { };
        deck.add(post);
      }
    }
    const deckGrid = new THREE.GridHelper(FREE_BOARD.width - 2, FREE_BOARD.width - 2, '#3d634a', '#7da383');
    deckGrid.scale.z = (FREE_BOARD.depth - 2) / (FREE_BOARD.width - 2);
    deckGrid.position.y = .015; deckGrid.material.transparent = true; deckGrid.material.opacity = .24; deckGrid.raycast = () => { };
    deck.add(glass, deckGrid); deck.visible = false; scene.add(deck);
    layerDecks.push({ group: deck, glassMat, railMat, gridMat: deckGrid.material });
  }
  let readingRoom = null, activeRoom = null, history = newHistory(), trial = newTrial(), activity = freshActivity(), capMoving = false, lastTick = 0, lastFrame = 0;
  let shadeDrag = null, fixture = null, refreshActivityControls = () => { };
  const rooms = new Map();
  const benchTop = table.children[1], benchFrame = [table.children[0], table.children[2]];
  const paintedTop = new THREE.MeshStandardMaterial({ roughness: .77 });
  const paintedFrame = new THREE.MeshStandardMaterial({ roughness: .54, metalness: .32 });
  const unitOf = l => units.find(u => u.name === l.unit);
  const unitLevels = l => LEVELS.filter(other => other.unit === l.unit);
  const lessonNumber = l => unitLevels(l).indexOf(l) + 1;
  function reversible() { return game && ['LEDs', 'Motors', 'Library', 'Workshop'].includes(LEVELS[level].unit); }
  function inReadingRoom() { return game && LEVELS[level].unit === 'Resistors'; }
  const houseLights = { Reading: 'Reading lamp', Landing: 'Landing light', Stairs: 'Stair light' };
  function houseChallenge() { return game && LEVELS[level].id === 'house-breaker'; }
  function partName(kind) { if (kind === 'lamp' && houseChallenge()) return 'House light'; return inReadingRoom() && kind === 'lamp' ? 'Table lamp' : names[kind]; }
  function partSpec(kind, part = null) {
    if (kind === 'battery') return (part?.voltage || 6) + ' V';
    if (kind === 'lamp') return '20 Ω';
    if (kind === 'pot') return '100 Ω';
    if (kind === 'fuse') return (part?.fuseRating || 0.35).toFixed(2) + ' A';
    if (kind === 'diode') return '0.7 V';
    if (kind === 'meter') return '±6 V';
    if (kind === 'cannon') return '1 shot / 2.4 s';
    return '';
  }
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
  function updateSurface() {
    const free = isFree();
    if (game) {
      const area = free ? { width: 36, depth: 24 } : BOARD;
      const x = Math.max(-area.width / 2, Math.min(area.width / 2, controls.target.x));
      const z = Math.max(-area.depth / 2, Math.min(area.depth / 2, controls.target.z));
      camera.position.x += x - controls.target.x; camera.position.z += z - controls.target.z;
      controls.target.x = x; controls.target.z = z;
    }
    table.visible = !free; table.scale.set(game ? 1 : .5, 1, game ? 1 : .5);
    freeTable.visible = free;
    controls.maxDistance = free ? 54 : 100;
    for (let l = 1; l < MAX_LAYERS; l++) {
      const d = layerDecks[l];
      const showDeck = free && (activeLayer >= l || parts.some(p => clampLayer(p.layer) >= l));
      d.group.visible = showDeck;
      if (showDeck) {
        d.glassMat.opacity = activeLayer === l ? .22 : .10;
        d.gridMat.opacity = activeLayer === l ? .30 : .12;
        d.railMat.opacity = activeLayer === l ? .92 : .55;
      }
    }
  }
  function syncLayerButtons() {
    const el = $('layer-switcher');
    if (!el) return;
    el.hidden = !(game && isFree());
    for (const btn of el.querySelectorAll('.layer-btn')) {
      const l = Number(btn.dataset.layer);
      btn.classList.toggle('active', l === activeLayer);
      btn.setAttribute('aria-pressed', String(l === activeLayer));
    }
  }
  function setActiveLayer(nextLayer) {
    const targetLayer = isFree() ? clampLayer(nextLayer) : 0;
    const dy = layerY(targetLayer) - layerY(activeLayer);
    activeLayer = targetLayer;
    if (Math.abs(dy) > .01) {
      controls.target.y += dy;
      camera.position.y += dy;
      controls.update();
    }
    syncLayerButtons();
    updateSurface();
  }
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
    updateCircuit(); syncPliers(); saveState(); sfx.play('wireSnip');
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
  function drawBatteryVoltageLabel(p) {
    if (!p?.batteryVoltCtx || !p?.batteryVoltTex) return;
    const ctx = p.batteryVoltCtx, c = ctx.canvas;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = '#f5e2c0'; ctx.font = '500 54px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText((p.voltage || 6) + ' V', c.width / 2, c.height / 2, c.width - 14);
    p.batteryVoltTex.needsUpdate = true;
  }
  function makePart(p) {
    p.layer = isFree() ? clampLayer(p.layer) : 0;
    const g = new THREE.Group(); g.position.set(p.x, layerY(p.layer), p.z); p.rotation = ((Number(p.rotation) || 0) % 4 + 4) % 4; g.rotation.y = -p.rotation * Math.PI / 2; g.userData.part = p; componentGroup.add(g); p.mesh = g; p.rings = []; box(2.3, .2, 1.55, walnut, g, 0, .1, 0, .1); box(2.14, .07, 1.4, ceramic, g, 0, .24, 0, .06);
    if (['capacitor', 'led', 'motor'].includes(p.kind) || deviceNames[p.kind]) makeUnitPart(p, g);
    if (p.kind === 'battery') { const cell = cylinder(.39, 1.27, dark, g, 0, .69, 0); cell.rotation.z = Math.PI / 2; const cap = cylinder(.4, .34, red, g, -.47, .69, 0); cap.rotation.z = Math.PI / 2; const tip = cylinder(.17, .09, brass, g, -.7, .69, 0); tip.rotation.z = Math.PI / 2; p.batteryBody = [cell, cap, tip]; const vMesh = label((p.voltage || 6) + ' V', g, 0, 1.095, 0, .58, '#f5e2c0'); p.batteryVoltCtx = vMesh.userData.ctx; p.batteryVoltTex = vMesh.userData.tex; }
    if (p.kind === 'lamp' && houseChallenge() && Object.hasOwn(houseLights, p.role)) Object.assign(p, makeHouseLamp(g, p.role, brass, walnut));
    else if (p.kind === 'lamp' && inReadingRoom()) Object.assign(p, makeReadingLamp(g, brass, walnut));
    else if (p.kind === 'lamp') { cylinder(.43, .13, brass, g, 0, .35, 0); cylinder(.27, .3, dark, g, 0, .52, 0); if (p.role === 'Target bulb') { const collar = new THREE.Mesh(new THREE.TorusGeometry(.52, .05, 10, 28), brass); collar.rotation.x = Math.PI / 2; collar.position.set(0, .3, 0); g.add(collar); } const mat = new THREE.MeshStandardMaterial({ color: '#e8c780', emissive: '#ffb43e', emissiveIntensity: 0, roughness: .25, transparent: true, opacity: .88 }); const bulb = new THREE.Mesh(new THREE.SphereGeometry(.49, 32, 24), mat); bulb.position.set(0, 1, 0); bulb.scale.y = 1.14; bulb.castShadow = true; bulb.userData.ownedMaterial = true; g.add(bulb); p.bulb = bulb; const halo = new THREE.Mesh(new THREE.SphereGeometry(.74, 24, 16), new THREE.MeshBasicMaterial({ color: '#ffcf6b', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); halo.position.set(0, 1, 0); halo.userData.ownedMaterial = true; g.add(halo); p.halo = halo; const light = new THREE.PointLight('#ffbf5f', 0, 8, 2); light.position.set(0, 1.3, 0); g.add(light); p.light = light; }
    if (p.kind === 'switch') { box(.75, .16, .65, dark, g, 0, .38, 0); const lever = box(.12, .12, .85, brass, g, 0, .58, 0, .03); lever.rotation.x = p.closed ? 0 : -.55; lever.userData.switch = p; p.lever = lever; }
    if (p.kind === 'resistor') { const r = cylinder(.19, .9, new THREE.MeshStandardMaterial({ color: '#cba477', roughness: .8 }), g, 0, .53, 0); r.rotation.z = Math.PI / 2; for (const x of [-.28, -.14, .15]) { const band = cylinder(.198, .065, x < 0 ? dark : red, g, x, .53, 0); band.rotation.z = Math.PI / 2; } label('Ω', g, 0, .28, .52, .7); }
    const marks = pins[p.kind] ?? (p.kind === 'led' ? ['A', 'K'] : ['●', '●']);
    const namedPins = p.kind === 'battery' || p.kind === 'led' || !!pins[p.kind];
    if (namedPins) box(2.17, .32, .095, dark, g, 0, .23, .75, .03);
    p.pinSlots = [];
    for (let i = 0; i < marks.length; i++) {
      const x = marks.length === 2 ? (i === 0 ? -.91 : .91) : ((i / (marks.length - 1)) - .5) * (marks.length > 4 ? 1.96 : 1.74); const rTerm = marks.length > 4 ? .115 : .14, rHit = marks.length > 4 ? .19 : .24, rRing = marks.length > 4 ? .175 : .21; const terminal = cylinder(rTerm, .2, brass, g, x, .4, .55); terminal.userData.terminal = p.id + ':' + i; const hit = new THREE.Mesh(new THREE.SphereGeometry(rHit, 12, 8), new THREE.MeshBasicMaterial({ visible: false })); hit.position.set(x, .49, .55); hit.userData.terminal = p.id + ':' + i; hit.userData.ownedMaterial = true; g.add(hit); terminals.set(p.id + ':' + i, hit); const ring = new THREE.Mesh(new THREE.TorusGeometry(rRing, .027, 8, 24), new THREE.MeshBasicMaterial({ color: '#ffda7e', transparent: true, opacity: 0 })); ring.rotation.x = -Math.PI / 2; ring.position.set(x, .52, .55); ring.userData.ownedMaterial = true; g.add(ring); p.rings.push(ring);
      let labelMesh = null;
      if (p.kind === 'battery') {
        p.polarityMarks ??= []; labelMesh = label(i === 0 ? '+' : '−', g, x, .23, .806, .44, '#fff0cc', true); p.polarityMarks.push(labelMesh);
      } else if (namedPins) labelMesh = label(marks[i], g, x, .23, .806, marks.length > 4 ? .36 : .42, '#fff0cc', true);
      p.pinSlots.push({ terminal, hit, ring, labelMesh });
    }
    if (p.kind === 'battery' && p.reversed) showPolarity(p);
    if (p.kind === 'gate') syncGatePins(p);
    const spec = partSpec(p.kind, p), baseName = houseLights[p.role] || p.role || partName(p.kind);
    label((spec ? `${baseName} · ${spec}` : baseName).toUpperCase(), g, 0, .282, -.6, spec ? 1.32 : .95); return p;
  }
  function syncGatePins(p) {
    if (!p || p.kind !== 'gate' || !p.pinSlots || p.pinSlots.length < 4) return;
    const isNot = p.gateMode === 'NOT';
    const slotB = p.pinSlots[1];
    slotB.terminal.visible = !isNot;
    slotB.hit.visible = !isNot;
    slotB.ring.visible = !isNot;
    if (slotB.labelMesh) slotB.labelMesh.visible = !isNot;
    slotB.terminal.userData.terminal = isNot ? null : p.id + ':1';
    slotB.hit.userData.terminal = isNot ? null : p.id + ':1';
    if (isNot) {
      if (pending === p.id + ':1') cancelWire();
      if (hoverTerminal === p.id + ':1') hoverTerminal = null;
      wires = wires.filter(w => w.a !== p.id + ':1' && w.b !== p.id + ':1');
    }
    const xs = isNot ? [-.87, 0, 0, .87] : [-.87, -.29, .29, .87];
    for (let i = 0; i < 4; i++) {
      const slot = p.pinSlots[i];
      slot.terminal.position.x = xs[i];
      slot.hit.position.x = xs[i];
      slot.ring.position.x = xs[i];
      if (slot.labelMesh) slot.labelMesh.position.x = xs[i];
    }
  }
  function showPolarity(p) {
    p.shownReversed = !!p.reversed;
    const [plus, minus] = p.polarityMarks;
    plus.position.x = p.reversed ? .91 : -.91; minus.position.x = -plus.position.x;
    p.batteryBody[1].position.x = p.reversed ? .47 : -.47; p.batteryBody[2].position.x = p.reversed ? .7 : -.7;
  }
  function terminalPosition(id) { const o = terminals.get(id); if (!o) return null; return o.getWorldPosition(new THREE.Vector3()); }
  const wireColors = ['#a95e45', '#536d7d', '#c69848', '#72836a'];
  function wireMesh(a, b, color) {
    let curve;
    if (Math.abs(a.y - b.y) > .5) {
      const midY = (a.y + b.y) * .5;
      curve = new THREE.CatmullRomCurve3([
        a,
        a.clone().add(new THREE.Vector3(0, .38, 0)),
        new THREE.Vector3(a.x * .68 + b.x * .32, a.y + (b.y > a.y ? .55 : -.35), a.z * .68 + b.z * .32),
        new THREE.Vector3((a.x + b.x) * .5, midY, (a.z + b.z) * .5),
        new THREE.Vector3(a.x * .32 + b.x * .68, b.y + (a.y > b.y ? .55 : -.35), a.z * .32 + b.z * .68),
        b.clone().add(new THREE.Vector3(0, .38, 0)),
        b
      ]);
    } else {
      const lift = Math.min(1.3, .35 + a.distanceTo(b) * .11);
      curve = new THREE.CatmullRomCurve3([a, a.clone().add(new THREE.Vector3(0, .3, 0)), a.clone().lerp(b, .35).add(new THREE.Vector3(0, lift, 0)), a.clone().lerp(b, .7).add(new THREE.Vector3(0, lift, 0)), b.clone().add(new THREE.Vector3(0, .3, 0)), b]);
    }
    const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, .037, 8, false), new THREE.MeshStandardMaterial({ color, roughness: .65 })); m.castShadow = true; m.userData.ownedMaterial = true; m.userData.curve = curve; return m;
  }
  function redrawWires() { highlightLead(null); grip = null; syncPliers(); for (const c of [...wireGroup.children]) disposeObject(c); scene.updateMatrixWorld(true); for (let i = 0; i < wires.length; i++) { const a = terminalPosition(wires[i].a), b = terminalPosition(wires[i].b); if (a && b) { const mesh = wireMesh(a, b, wireColors[i % 4]); mesh.userData.endpoints = wires[i]; mesh.userData.pickPoints = mesh.userData.curve.getSpacedPoints(36); for (let j = 0; j < 3; j++) { const bead = new THREE.Mesh(new THREE.SphereGeometry(.062, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffe3a1' })); bead.visible = false; bead.userData.ownedMaterial = true; mesh.add(bead); } wireGroup.add(mesh); } } if (faultLatched && circuitState?.short) shortEffects.syncSmoke(faultGeometry(circuitState)); }
  function clearPreview() { if (preview) { disposeObject(preview); preview = null; } }
  function cancelWire() { pending = null; clearPreview(); $('wire-hint').hidden = true; }
  function toast(msg) { $('toast').textContent = msg; $('toast').classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').classList.remove('show'), 3500); }
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
  async function flushCloudSave({ unloading = false } = {}) {
    if (!userId || cloudSaveDisabled || !cloudSavePending || cloudSaveInFlight) return;
    const body = cloudSavePending; cloudSavePending = null;
    cloudSaveInFlight = true;
    if (!unloading) setCloudStatus('syncing', 'Syncing…');
    try {
      const byteLen = new TextEncoder().encode(body).byteLength;
      const opts = {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body,
        signal: AbortSignal.timeout(15000)
      };
      // Only attach keepalive during unload and strictly below the 64 KiB browser limit
      if (unloading && byteLen < 60000) opts.keepalive = true;
      const response = await fetch('/api/progress', opts);
      if (response.status === 401 || response.status === 403) {
        cloudSaveDisabled = true;
        cloudSavePending = null;
        clearTimeout(cloudRetryTimer);
        setCloudStatus('warn', 'Sign in to sync');
        console.error(`Cloud progress save rejected (${response.status}); saved on this device.`);
        if (!unloading) toast('Account session expired. Saved on this device.');
        return;
      }
      if (!response.ok) throw new Error(`Cloud progress request failed with status ${response.status}.`);
      cloudRetryCount = 0;
      cloudReady = true;
      setCloudStatus('saved', 'Saved to account');
      const resData = await response.json().catch(() => null);
      if (resData?.progress) {
        try {
          localStorage.setItem(`little-circuit-v5:user:${userId}`, JSON.stringify(resData.progress));
          const serverRestored = restoreProgress(resData.progress);
          for (const idx of serverRestored.completed) {
            if (!completed.includes(idx)) completed.push(idx);
          }
        } catch { }
      }
    } catch (error) {
      if (!cloudSavePending) cloudSavePending = body;
      console.error('Cloud progress save failed; the local account save is still available.', error);
      if (!unloading && !cloudSaveDisabled) {
        if (cloudRetryCount < 3) {
          const delay = 1500 * Math.pow(2, cloudRetryCount++);
          clearTimeout(cloudRetryTimer);
          cloudRetryTimer = setTimeout(() => { void flushCloudSave(); }, delay);
          setCloudStatus('warn', 'Retrying sync…');
        } else {
          setCloudStatus('warn', 'Saved locally');
          toast('Cloud sync offline. Saved on this device.');
        }
      }
    } finally {
      cloudSaveInFlight = false;
      if (cloudSavePending && !cloudSaveDisabled && !unloading) void flushCloudSave();
    }
  }
  const round2 = v => Math.round((Number(v) || 0) * 100) / 100;
  function snapshotBoard() {
    return {
      parts: parts.map(p => {
        const item = { id: p.id, kind: p.kind, x: p.x, z: p.z };
        const layer = clampLayer(p.layer);
        if (layer) item.layer = layer;
        if (p.rotation) item.rotation = p.rotation;
        for (const k of ['closed', 'throwB', 'resistance', 'wiper', 'fuseRating', 'blown', 'charge', 'reversed', 'voltage', 'capacitance', 'color', 'role', 'gateMode', 'clockHz', 'bit', 'outputHigh', 'conducting', 'lux', 'dial']) {
          if (p[k] !== undefined) item[k] = p[k];
        }
        return item;
      }),
      wires: wires.map(w => ({ ...w })),
      view: { camera: camera.position.toArray().map(round2), target: controls.target.toArray().map(round2), pan: panMode },
      updatedAt: Date.now()
    };
  }
  function writeProgress({ quiet = true, immediate = false, localOnly = false } = {}) {
    const progress = encodeProgress(completed, boards, sandboxSlots, { lastLevel, unlockAll, updatedAt: Date.now() });
    try {
      localStorage.setItem(userId ? `little-circuit-v5:user:${userId}` : 'little-circuit-v5', JSON.stringify(progress));
      if (userId && lastLevel !== null && LEVELS[lastLevel]) localStorage.setItem(lastKey, LEVELS[lastLevel].id);
      if (unlockKey) localStorage.setItem(unlockKey, unlockAll ? '1' : '0');
      if (!quiet) toast(userId ? (!cloudSaveDisabled ? 'Saved; syncing account' : 'Saved on this device') : 'Saved');
    } catch (error) {
      if (!quiet) toast('Save unavailable');
      console.error('Unable to save progress on this device.', error);
      return;
    }
    if (userId && !localOnly && !cloudSaveDisabled) {
      cloudSavePending = JSON.stringify({ userId, progress });
      clearTimeout(cloudSaveTimer);
      clearTimeout(cloudRetryTimer);
      if (immediate) void flushCloudSave();
      else cloudSaveTimer = setTimeout(() => { void flushCloudSave(); }, 450);
    }
  }
  function persistSandboxSlots() {
    try { localStorage.setItem(slotsKey, JSON.stringify(sandboxSlots)); } catch { }
  }
  function renderSandboxSlots() {
    const wrap = $('sandbox-slots');
    if (!wrap) return;
    const free = game && isFree();
    wrap.hidden = !free;
    if (!free) return;
    const activeSlot = sandboxSlots.slots[sandboxSlots.active];
    const nameInput = $('slot-name');
    if (nameInput && document.activeElement !== nameInput) nameInput.value = activeSlot?.name || `Build ${sandboxSlots.active + 1}`;
    const tabs = $('slot-tabs');
    tabs.replaceChildren();
    sandboxSlots.slots.forEach((slot, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'slot-tab' + (idx === sandboxSlots.active ? ' active' : '') + (slot.parts?.length ? ' filled' : '');
      btn.textContent = String(idx + 1);
      btn.title = slot.name || `Build ${idx + 1}`;
      btn.setAttribute('aria-label', `${slot.name || `Build ${idx + 1}`}${slot.parts?.length ? ' (saved)' : ' (empty)'}`);
      btn.setAttribute('aria-selected', String(idx === sandboxSlots.active));
      btn.onclick = () => switchSandboxSlot(idx);
      tabs.append(btn);
    });
  }
  function switchSandboxSlot(idx) {
    if (!isFree() || idx === sandboxSlots.active || idx < 0 || idx >= sandboxSlots.slots.length) return;
    const snap = snapshotBoard();
    boards[level] = snap;
    const cur = sandboxSlots.slots[sandboxSlots.active];
    sandboxSlots.slots[sandboxSlots.active] = { name: cur?.name || `Build ${sandboxSlots.active + 1}`, ...snap, updatedAt: Date.now() };
    sandboxSlots.active = idx;
    const target = sandboxSlots.slots[idx];
    boards[level] = { parts: target.parts || [], wires: target.wires || [], view: target.view || null };
    persistSandboxSlots();
    startLevel(level, false, true);
    saveState(true, { skipHistory: true });
    sfx.play('ui');
  }
  function renderHoverProbe() {
    const el = $('hover-probe');
    if (!el) return;
    if (!game || !isFree() || !hoveredPart || !parts.includes(hoveredPart) || drag || pending || pliersActive) {
      el.hidden = true;
      return;
    }
    const info = probePartReading(hoveredPart, circuitState, powered, partName(hoveredPart.kind));
    if (!info) { el.hidden = true; return; }
    if (!el.firstChild) {
      el.innerHTML = '<div class="hover-probe-head"><strong/><span class="hover-probe-layer"/></div><div class="hover-probe-vals"><span/><span/><span/></div><div class="hover-probe-detail"/>';
    }
    el.classList.toggle('fault', info.status === 'fault');
    el.querySelector('strong').textContent = info.title;
    el.querySelector('.hover-probe-layer').textContent = info.meta;
    const vals = el.querySelectorAll('.hover-probe-vals span');
    vals[0].textContent = info.voltage;
    vals[1].textContent = info.current;
    vals[2].textContent = info.power;
    const det = el.querySelector('.hover-probe-detail');
    det.textContent = info.detail || '';
    det.hidden = !info.detail;
    el.hidden = false;
  }
  function saveState(quiet = true, opts = {}) {
    if (!game) return;
    const snap = snapshotBoard();
    if (!opts.skipHistory) {
      boardHistory.record(snap, opts.coalesceTag || null);
      syncUndoButtons();
    }
    boards[level] = snap;
    if (isFree()) {
      const cur = sandboxSlots.slots[sandboxSlots.active];
      sandboxSlots.slots[sandboxSlots.active] = { name: cur?.name || `Build ${sandboxSlots.active + 1}`, ...snap, updatedAt: Date.now() };
      persistSandboxSlots();
      renderSandboxSlots();
    }
    writeProgress({ quiet, immediate: !!opts.immediate, localOnly: !!opts.localOnly });
  }
  function unlocked(i) { return canAccessLevel(i, completed, !!userId, unlockAll); }
  function lockReason(i) { return levelLockReason(i, completed, !!userId, unlockAll); }
  function triggerSignIn() {
    const btn = document.querySelector('#account-controls .account-button');
    if (btn) btn.click();
    else toast('Sign in to unlock all chapters');
  }
  function showGuide() {
    saveState();
    const banner = $('guide-banner');
    if (banner) {
      banner.replaceChildren();
      const note = document.createElement('span');
      const action = document.createElement('button');
      action.type = 'button';
      action.className = 'paper-button';
      if (userId) {
        note.textContent = "Chapters unlock after beating the previous chapter's final challenge.";
        action.textContent = `Unlock all levels: ${unlockAll ? 'ON' : 'OFF'}`;
        action.setAttribute('aria-pressed', String(unlockAll));
        action.onclick = () => {
          unlockAll = !unlockAll;
          if (unlockKey) { try { localStorage.setItem(unlockKey, unlockAll ? '1' : '0'); } catch { } }
          writeProgress({ quiet: true, immediate: true });
          showGuide();
          updateProgress();
        };
      } else {
        note.textContent = 'Tutorial and level 1 of each chapter are open. Sign in to unlock all chapters.';
        action.textContent = 'Sign in to unlock';
        action.onclick = () => {
          $('guide').close();
          triggerSignIn();
        };
      }
      banner.append(note, action);
    }
    $('levels').replaceChildren(); $('unit-links').replaceChildren(); for (const { name: unit, label: unitLabel, theme } of units) {
      const heading = document.createElement('h3'); heading.className = 'unit-divider'; heading.dataset.theme = theme || '';
      const headingTitle = document.createElement('span'); headingTitle.textContent = unitLabel;
      heading.append(headingTitle);
      if (userId && !unlockAll) {
        const gate = chapterGateLevel(unit);
        const gateIdx = gate ? LEVELS.indexOf(gate) : -1;
        if (gate && gateIdx >= 0 && !completed.includes(gateIdx)) {
          const lockNote = document.createElement('span');
          lockNote.className = 'unit-lock-note';
          lockNote.textContent = `Complete ${gate.title} to unlock`;
          heading.append(lockNote);
        }
      }
      $('levels').append(heading);
      const jump = document.createElement('button'); jump.textContent = unit; jump.dataset.theme = theme || ''; jump.onclick = () => heading.scrollIntoView({ block: 'start' }); $('unit-links').append(jump);
      LEVELS.forEach((l, i) => {
        if (l.unit !== unit) return;
        const isOpen = unlocked(i), reason = lockReason(i);
        const b = document.createElement('button');
        b.className = 'level-card' + (i === level ? ' current' : '');
        b.dataset.level = i;
        b.disabled = !isOpen;
        if (reason) b.title = reason;
        b.innerHTML = `<span class="level-num">${l.id === 'sandbox' ? '∞' : lessonNumber(l)}</span><span class="level-thumb">${diagram(l.diagram)}</span><span class="level-card-title"><strong>${l.title}</strong>${reason ? `<span class="level-lock-hint">${reason}</span>` : ''}</span><span class="lock">${!isOpen ? icon('lock') : completed.includes(i) ? icon('check') : ''}</span>`;
        b.onclick = () => { $('guide').close(); startLevel(i); };
        $('levels').append(b);
      });
    }
    if (!$('guide').open) $('guide').showModal();
  }
  const LESSON_ENDINGS = ['A complete loop lets current flow through the lamp and back to the battery.', 'Opening the switch breaks the loop. Closing it restores the path.', 'Series lamps carry the same current and share the battery voltage.', 'Each parallel lamp gets the full battery voltage.', 'One branch can open while current keeps flowing through the other.', 'More resistance means less current and a dimmer lamp.', '40 Ω + the 20 Ω lamp gives 60 Ω. At 6 V, that is 0.10 A.', 'Series resistance adds: 80 Ω from the resistors plus the 20 Ω lamp makes 100 Ω (0.060 A).', 'Two parallel resistors totaling 20 Ω plus the 20 Ω lamp make 40 Ω (0.15 A).', 'Each lamp branch has its own current. Changing one branch’s resistance changes that branch’s current.'];
  function refreshTeaching() { document.querySelectorAll('.lesson-focus').forEach(e => e.classList.remove('lesson-focus')); const steps = LESSONS[level]; if (!game || skipTeaching || lessonStep >= steps.length) { $('teaching').hidden = true; return; } const state = { ...circuitState, branchControl: branchProof }; while (lessonStep < steps.length && steps[lessonStep].when && stepSatisfied(steps[lessonStep].when, { parts, wires, pending, powered, state, activity })) lessonStep++; const current = steps[lessonStep]; if (!current) { $('teaching').hidden = true; return; } $('teaching').hidden = false; $('teaching-count').textContent = `${unitOf(LEVELS[level]).label} · ${lessonStep + 1} / ${steps.length}`; $('teaching-title').textContent = current.title; $('teaching-text').textContent = current.text; $('teaching-next').hidden = !!current.when; $('teaching-action').textContent = current.when ? 'Complete this step on the board' : ''; document.querySelector(current.target)?.classList.add('lesson-focus'); }

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
  function updateLibraryBadge() {
    const unlockedSet = unlockedToolbelt(completed, LEVELS, false);
    const unlockedNew = LIBRARY_UNLOCKS.filter(u => unlockedSet.has(u.kind)).length;
    const totalParts = FREE_BUILD_PARTS.length;
    const baseCount = totalParts - LIBRARY_UNLOCKS.length;
    $('library-count').textContent = `${baseCount + unlockedNew} / ${totalParts}`;
    return { unlockedSet, unlockedNew, totalNew: LIBRARY_UNLOCKS.length, totalParts, baseCount };
  }
  function updateMasterBadge() {
    const p = masterProgress(completed, LEVELS);
    $('master-count').textContent = `${p.doneCount} / ${p.totalCount}`;
    return p;
  }
  function showMaster() {
    const p = updateMasterBadge();
    $('master-summary').textContent = `Open-ended proving builds with no step-by-step guides (${p.doneCount} / ${p.totalCount} solved).`;
    const list = $('master-list');
    list.replaceChildren();
    for (const item of p.items) {
      const row = document.createElement('div');
      row.className = 'master-row' + (item.parentId ? ' sub' : '') + (item.done ? ' done' : '');
      row.innerHTML = `<span class="master-code">${item.code}</span><div class="master-thumb">${diagram(item.diagram)}</div><div class="master-meta"><div class="master-title-row"><strong>${item.title}</strong><span class="master-diff">${item.difficulty}</span></div><p class="master-goal">${item.goal}</p></div><div class="master-actions"><span class="master-done">${item.done ? 'Solved' : 'Unsolved'}</span><button class="paper-button">${item.done ? 'Replay' : 'Open challenge'}</button></div>`;
      row.querySelector('.paper-button').onclick = () => {
        $('master').close();
        startLevel(item.levelIndex);
      };
      list.append(row);
    }
    if (!$('master').open) $('master').showModal();
  }
  function showComponentGuide(kind) {
    const guide = getComponentGuide(kind);
    const displayName = houseChallenge() && kind === 'lamp'
      ? 'House light'
      : (inReadingRoom() && kind === 'lamp' ? 'Table lamp' : guide.name);
    $('guide-title').textContent = displayName;
    $('guide-spec').textContent = guide.spec || '';
    $('guide-diagram').innerHTML = guide.diagramSvg || '';
    $('guide-illustration').innerHTML = guide.illustrationSvg || '';
    $('guide-summary').textContent = guide.summary || '';

    const usage = $('guide-usage');
    usage.replaceChildren();
    for (const tip of guide.howToUse || []) {
      const li = document.createElement('li');
      li.textContent = tip;
      usage.append(li);
    }

    const terms = $('guide-terminals');
    terms.replaceChildren();
    for (const t of guide.terminals || []) {
      const row = document.createElement('div');
      row.className = 'guide-terminal-row';
      row.innerHTML = `<span class="guide-pin">${t.pin}</span><strong>${t.name}</strong><span>${t.role}</span>`;
      terms.append(row);
    }

    const unlockedSet = unlockedToolbelt(completed, LEVELS, false);
    const req = LIBRARY_UNLOCKS.find(u => u.kind === kind);
    const status = $('guide-status');
    const action = $('guide-unlock-action');
    if (!req) {
      status.textContent = 'Included in Free build';
      status.className = 'guide-status unlocked';
      action.hidden = true;
      action.onclick = null;
    } else if (unlockedSet.has(kind)) {
      status.textContent = 'Unlocked in Free build';
      status.className = 'guide-status unlocked';
      const challengeIdx = LEVELS.findIndex(l => l.id === req.challengeId);
      if (challengeIdx >= 0 && (!game || LEVELS[level].id !== req.challengeId)) {
        action.hidden = false;
        action.textContent = `Practice: ${LEVELS[challengeIdx].title}`;
        action.onclick = () => {
          for (const d of document.querySelectorAll('dialog[open]')) d.close();
          startLevel(challengeIdx);
        };
      } else {
        action.hidden = true;
        action.onclick = null;
      }
    } else {
      status.textContent = 'Locked in Free build';
      status.className = 'guide-status locked';
      const challengeIdx = LEVELS.findIndex(l => l.id === req.challengeId);
      if (challengeIdx >= 0) {
        action.hidden = false;
        action.textContent = `Learn in The Library: ${LEVELS[challengeIdx].title}`;
        action.onclick = () => {
          for (const d of document.querySelectorAll('dialog[open]')) d.close();
          startLevel(challengeIdx);
        };
      } else {
        action.hidden = true;
        action.onclick = null;
      }
    }

    $('component-guide').showModal();
  }
  let libraryFilter = 'all';
  function showLibrary(nextFilter = libraryFilter) {
    libraryFilter = nextFilter;
    const { unlockedSet, unlockedNew, totalNew } = updateLibraryBadge();
    $('library-summary').textContent = `Complete a guided build to learn and unlock each component in Free build (${unlockedNew} / ${totalNew} unlocked). Click ? on any card to see how it works.`;

    const filters = $('library-filters');
    filters.replaceChildren();
    const filterItems = [
      { id: 'all', label: 'All' },
      { id: 'locked', label: 'To unlock' },
      { id: 'unlocked', label: 'Unlocked' },
      ...LIBRARY_SHELVES.map(s => ({ id: s.id, label: s.title }))
    ];
    for (const f of filterItems) {
      const btn = document.createElement('button');
      btn.className = 'library-filter' + (libraryFilter === f.id ? ' active' : '');
      btn.textContent = f.label;
      btn.onclick = () => showLibrary(f.id);
      filters.append(btn);
    }

    const container = $('library-shelves');
    container.replaceChildren();
    for (const shelf of LIBRARY_SHELVES) {
      if (!['all', 'locked', 'unlocked', shelf.id].includes(libraryFilter)) continue;
      const items = LIBRARY_UNLOCKS.filter(item => {
        if (item.shelf !== shelf.id) return false;
        const isUnlocked = unlockedSet.has(item.kind);
        if (libraryFilter === 'locked') return !isUnlocked;
        if (libraryFilter === 'unlocked') return isUnlocked;
        return true;
      });
      if (!items.length) continue;

      const h = document.createElement('h3');
      h.className = 'mainframe-section-title';
      h.textContent = shelf.title;
      container.append(h);

      const grid = document.createElement('div');
      grid.className = 'library-grid';
      for (const item of items) {
        const ok = unlockedSet.has(item.kind);
        const chIdx = LEVELS.findIndex(l => l.id === item.challengeId);
        const ch = LEVELS[chIdx];
        const guide = getComponentGuide(item.kind);
        const card = document.createElement('div');
        card.className = 'library-card ' + (ok ? 'unlocked' : 'locked');
        card.innerHTML = `<div class="library-card-top"><span class="svg-icon">${icon(item.kind)}</span><div><strong>${item.label}</strong><small>${guide.spec}</small></div><button class="part-help library-card-help" title="How to use ${item.label}" aria-label="How to use ${item.label}">?</button></div><p class="library-card-goal">${ch ? ch.goal : guide.summary}</p><div class="library-card-foot"><span class="library-badge">${ok ? 'Unlocked' : 'Locked'}</span><button class="paper-button library-play-btn">${ok ? 'Replay' : 'Learn part'}</button></div>`;
        card.querySelector('.library-card-help').onclick = () => showComponentGuide(item.kind);
        card.querySelector('.library-play-btn').onclick = () => {
          if (chIdx >= 0) {
            $('library').close();
            startLevel(chIdx);
          }
        };
        grid.append(card);
      }
      container.append(grid);
    }
    if (!container.childElementCount) {
      const empty = document.createElement('p');
      empty.className = 'library-empty';
      empty.textContent = libraryFilter === 'locked'
        ? 'Every component in the library is unlocked.'
        : 'No components match this filter yet.';
      container.append(empty);
    }
    if (!$('library').open) $('library').showModal();
  }
  function showMainframe() {
    const p = updateMainframeBadge();
    $('mainframe-summary').textContent = p.coreBooted
      ? `Observatory Mainframe online (${p.onlineCount} / ${p.totalCount} systems). All Observatory modules are ready in Free build.`
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
    const bh = document.createElement('h3'); bh.className = 'mainframe-section-title'; bh.textContent = 'Observatory Toolbelt'; belt.append(bh);
    const unlockedSet = unlockedToolbelt(completed, LEVELS, false);
    const bgrid = document.createElement('div'); bgrid.className = 'toolbelt-grid';
    for (const item of TOOLBELT_UNLOCKS) {
      const ok = unlockedSet.has(item.kind), src = LEVELS.find(other => other.id === item.byLevel);
      const div = document.createElement('div'); div.className = 'toolbelt-chip ' + (ok ? 'unlocked' : 'locked');
      div.innerHTML = `<span class="svg-icon">${icon(item.kind)}</span><div><div>${item.label}</div><small>${ok ? 'Unlocked' : src ? src.title : 'Observatory'}</small></div><button class="part-help toolbelt-help" title="How to use ${item.label}" aria-label="How to use ${item.label}">?</button>`;
      div.querySelector('.toolbelt-help').onclick = () => showComponentGuide(item.kind);
      bgrid.append(div);
    }
    belt.append(bgrid);
    const flBtn = $('mainframe-first-light');
    if (flBtn) {
      flBtn.hidden = !(p.coreBooted || unlockAll);
      flBtn.textContent = p.coreBooted ? 'Replay First Light' : 'Preview First Light';
    }
    $('mainframe').showModal();
  }
  function syncFirstLightSound() {
    const btn = $('fl-sound');
    if (!btn) return;
    btn.setAttribute('aria-pressed', String(sound));
    btn.innerHTML = icon(sound ? 'sound' : 'mute');
    btn.title = sound ? 'Mute sound' : 'Enable sound';
    btn.setAttribute('aria-label', btn.title);
  }
  function stopFirstLight({ openFreeBuild = false } = {}) {
    clearTimeout(firstLightTimer);
    if (!firstLight) return;
    firstLightScore?.stop();
    firstLightScore = null;
    firstLight.dispose();
    firstLight = null;
    $('first-light').hidden = true;
    $('fl-flash').style.opacity = '0';
    renderer.setClearColor('#d9c7ac', 0);
    renderer.toneMappingExposure = .9;
    const host = game ? $('viewport') : $('hero-scene');
    if (host) host.append(renderer.domElement);
    resize();
    if (openFreeBuild) startLevel(LEVELS.length - 1);
  }
  function startFirstLight() {
    clearTimeout(firstLightTimer);
    if (firstLight) stopFirstLight();
    for (const d of document.querySelectorAll('dialog[open]')) d.close();
    cancelWire();
    if (pliersActive) setPliers(false);
    if (game) saveState(true, { skipHistory: true });
    const prog = mainframeProgress(completed, LEVELS);
    firstLight = createFirstLightScene({ onlineCount: prog.onlineCount, totalCount: prog.totalCount });
    firstLight.setPixelRatio(renderer.getPixelRatio());
    renderer.setClearColor('#040713', 1);
    renderer.toneMappingExposure = 1.08;
    $('fl-eyebrow').textContent = firstLight.state.eyebrow;
    $('fl-title').textContent = firstLight.state.title;
    $('fl-sub').textContent = firstLight.state.sub;
    $('fl-progress-fill').style.width = '0%';
    $('fl-flash').style.opacity = '0';
    $('fl-replay').hidden = true;
    $('fl-freebuild').hidden = true;
    $('fl-exit').textContent = 'Skip';
    $('first-light').hidden = false;
    $('first-light-stage').append(renderer.domElement);
    syncFirstLightSound();
    resize();
    firstLightScore = sfx.startFirstLightScore();
  }
  function pulseButton(p, holdMs = 260) {
    if (!p || p.kind !== 'button') return;
    clearTimeout(buttonTimers.get(p.id));
    p.closed = true; sfx.play('buttonPress'); updateCircuit();
    buttonTimers.set(p.id, setTimeout(() => { buttonTimers.delete(p.id); p.closed = false; updateCircuit(); }, holdMs));
  }
  function updateCircuit(dt = 0, switchEvent = {}) {
    const lesson = LEVELS[level];
    const env = conditions(parts, activity, lesson.id);
    let s = solveCircuit(parts, wires, powered ? dt : 0, env);
    Object.assign(s, env); circuitState = s;
    let changed = false;
    if (powered && Object.keys(s.nextFuses || {}).length > 0) {
      for (const p of parts) {
        if (p.kind === 'fuse' && s.nextFuses[p.id]?.blown && !p.blown) {
          p.blown = true;
          changed = true;
        }
      }
      if (changed) {
        toast('Fuse blew to protect the circuit. Select it to replace.');
        sfx.play('fuseBlow');
        if (selected?.kind === 'fuse') select(selected);
        s = solveCircuit(parts, wires, 0, env);
        Object.assign(s, env); circuitState = s;
      }
    }
    if (powered && !s.short) {
      const prevCoils = new Map(parts.filter(p => p.kind === 'coil').map(p => [p.id, !!p.energized]));
      const stepped = applyStep(parts, s);
      let relayClicked = false;
      for (const p of parts) {
        if (p.kind === 'coil' && prevCoils.has(p.id) && !!p.energized !== prevCoils.get(p.id)) relayClicked = true;
        if (p.kind === 'relay') {
          const closed = !!s.relayContacts?.[p.id];
          if (p._relayClosed !== undefined && p._relayClosed !== closed) relayClicked = true;
          p._relayClosed = closed;
        }
      }
      if (relayClicked && game) sfx.play('relay');
      if (stepped) {
        changed = true;
        s = solveCircuit(parts, wires, 0, env);
        Object.assign(s, env); circuitState = s;
      }
    } else {
      for (const p of parts) if (p.kind === 'relay') p._relayClosed = undefined;
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
    let bellJustRang = false;
    if (game && lesson.activity) {
      if (lesson.id === 'house-breaker' && powered && s.current > .4201) {
        activity.tripped = true; powered = false; toast('Breaker tripped at ' + s.current.toFixed(2) + ' A');
      }
      const rang = activity.rang;
      measureActivity(lesson, parts, wires, s, activity, powered, dt);
      for (const p of parts) if (p.kind === 'battery' && p.rogue && p.reversed !== p.shownReversed) showPolarity(p);
      if (!rang && activity.rang) { sfx.play('bell'); bellJustRang = true; }
      if (activity.mc?.events?.length) {
        for (const ev of activity.mc.events) sfx.play(ev);
        activity.mc.events.length = 0;
      }
      if (activity.bonus && activity.delivered) $('activity-goal').hidden = true;
      fixture?.update(activity, parts, s, powered, mainframeProgress(completed, LEVELS));
      refreshActivityControls(powered);
    }
    for (const p of parts) if (p.kind === 'bell') {
      const high = powered && !s.short && Math.abs((s.voltages?.[p.id + ':0'] || 0) - (s.voltages?.[p.id + ':1'] || 0)) >= 3;
      if (high && p._bellHigh === false && !bellJustRang && game) sfx.play('bell');
      p._bellHigh = high;
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
    renderHoverProbe();
    if (game && powered && !s.short && LEVELS[level].check(s) && (LEVELS[level].activity || skipTeaching || lessonStep >= LESSONS[level].length) && !wonThisVisit) { wonThisVisit = true; if (!completed.includes(level)) completed.push(level); saveState(true, { immediate: true }); updateMainframeBadge(); updateLibraryBadge(); updateMasterBadge(); $('teaching').hidden = true; $('goal-icon').innerHTML = icon('check'); $('goal-icon').setAttribute('aria-label', 'Complete'); $('goal-picture').classList.add('complete'); const unlockedNames = (LEVELS[level].unlocks || []).map(k => names[k] || deviceNames[k]).filter(Boolean); const baseEnd = LEVELS[level].ending || LESSON_ENDINGS[existingLevels.indexOf(LEVELS[level])] || ''; $('win-learning').textContent = unlockedNames.length ? `${baseEnd} Unlocked in Free build: ${unlockedNames.join(', ')}.` : baseEnd; const nextIdx = level + 1; const nextOpen = nextIdx < LEVELS.length && unlocked(nextIdx); $('next').innerHTML = nextOpen ? ((LEVELS[nextIdx]?.id === 'sandbox' ? 'Free build' : LEVELS[nextIdx]?.unit !== LEVELS[level].unit ? 'Start ' + LEVELS[nextIdx].unit.toLowerCase() : 'Next') + icon('next')) : (!userId && nextIdx < LEVELS.length ? ('Sign in to continue' + icon('lock')) : ('Open levels' + icon('levels'))); updateProgress(); $('win').hidden = false; $('activity-goal').hidden = true; $('completion-status').textContent = 'Level complete.'; sfx.play('win'); if (LEVELS[level].id === 'mainframe-boot') { clearTimeout(firstLightTimer); firstLightTimer = setTimeout(() => { if (game && !firstLight) startFirstLight(); }, 950); } }
  }
  function toggleSwitch(p) {
    if (powered && p.closed) {
      history.stopped = false;
      history.openedSupply = circuitState.current > .025 && Math.abs(circuitState.currents[p.id] || 0) > .025;
    }
    const before = solveCircuit(parts, wires); p.closed = !p.closed; sfx.play(p.closed ? 'switchOn' : 'switchOff'); p.lever.rotation.x = p.closed ? 0 : -.55; const after = solveCircuit(parts, wires);
    const motor = parts.find(part => part.kind === 'motor');
    if (powered && !p.closed && motor && circuitState.halfSpeed && Math.abs(before.currents[p.id] || 0) > .09 && Math.abs(after.currents[motor.id] || 0) < .001) history.stopped = true;
    if (powered && LEVELS[level].id === 'branches' && !before.short && !after.short && ((before.lit === 1 && after.lit === 2) || (before.lit === 2 && after.lit === 1))) branchProof = true; select(p); updateCircuit(0, { before, switched: p }); saveState();
  }
  function toggleSpdt(p) {
    p.throwB = !p.throwB;
    sfx.play(p.throwB ? 'switchOn' : 'switchOff');
    select(p); updateCircuit(); saveState();
  }
  function select(p) {
    selected = p; $('selection').hidden = !p; if (!p) return;
    const spec = partSpec(p.kind, p), title = houseLights[p.role] || p.role || partName(p.kind);
    $('selection-name').textContent = spec ? `${title} · ${spec}` : title;
    const free = isFree();
    $('battery-volt-label').hidden = !(free && p.kind === 'battery');
    $('part-layer-label').hidden = !free;
    if (free && p.kind === 'battery') { const v = p.voltage || 6; $('battery-volt').value = String(v); $('battery-volt-output').textContent = v + ' V'; }
    if (free) $('part-layer').value = String(clampLayer(p.layer));
    $('value-label').hidden = p.kind !== 'resistor';
    $('pot-label').hidden = p.kind !== 'pot';
    $('fuse-rating-label').hidden = p.kind !== 'fuse';
    $('replace-fuse').hidden = !(p.kind === 'fuse' && p.blown);
    const hidePhotoSlider = p.kind !== 'photo' || ['light-meter', 'dispatch'].includes(LEVELS[level].id);
    $('photo-lux-label').hidden = hidePhotoSlider;
    const hideServoSlider = p.kind !== 'servo' || ['servo-gate', 'dispatch'].includes(LEVELS[level].id);
    $('servo-dial-label').hidden = hideServoSlider;
    $('reverse').hidden = p.kind !== 'battery' || !reversible();
    $('toggle').hidden = p.kind !== 'switch' && p.kind !== 'spdt';
    $('gate-mode-label').hidden = p.kind !== 'gate';
    $('clock-rate-label').hidden = p.kind !== 'clock';
    $('press-button').hidden = p.kind !== 'button';
    $('reset-latch').hidden = p.kind !== 'latch';
    $('rotate').disabled = !!p.locked;
    $('rotate').title = p.locked ? 'Fixed court fixture' : 'Rotate part (R)';
    $('delete').disabled = !!p.fixed;
    $('delete').title = p.fixed ? 'Fixed circuit part' : 'Remove part';
    if (p.kind === 'switch') { $('toggle').setAttribute('aria-label', p.closed ? 'Open switch' : 'Close switch'); $('toggle').title = p.closed ? 'Open switch' : 'Close switch'; $('toggle').classList.toggle('closed', p.closed); }
    if (p.kind === 'spdt') { $('toggle').setAttribute('aria-label', p.throwB ? 'Switch to A' : 'Switch to B'); $('toggle').title = p.throwB ? 'Switch to A' : 'Switch to B'; $('toggle').classList.toggle('closed', !!p.throwB); }
    if (p.kind === 'resistor') { $('resistor-value').value = p.resistance; $('resistor-output').textContent = p.resistance + ' Ω'; }
    if (p.kind === 'pot') { const pct = Math.round((p.wiper ?? 0.5) * 100); $('pot-value').value = String(pct); $('pot-output').textContent = pct + '%'; }
    if (p.kind === 'fuse') { $('fuse-rating').value = String(p.fuseRating || 0.35); }
    if (!hidePhotoSlider) { const lux = Math.round(p.lux ?? 100); $('photo-lux').value = String(lux); $('photo-lux-output').textContent = lux <= 25 ? 'Dark' : lux >= 75 ? 'Bright' : lux + '%'; }
    if (!hideServoSlider) { const deg = Math.round(p.dial ?? 0); $('servo-dial').value = String(deg); $('servo-dial-output').textContent = deg + '°'; }
    if (p.kind === 'gate') $('gate-mode').value = p.gateMode || 'NAND';
    if (p.kind === 'clock') $('clock-rate').value = String(p.clockHz || 1);
  }
  function fits(x, z, kind, except, rotation = 0, layer = 0) { return partFits(parts, x, z, kind, inReadingRoom(), except, rotation, layer); }
  function rotateSelected() {
    if (!selected || selected.locked) return;
    const nextRot = ((selected.rotation || 0) + 1) % 4;
    const layer = clampLayer(selected.layer);
    let pos = boardPosition(selected.x, selected.z, isFree(), selected.kind, inReadingRoom(), nextRot);
    if (!fits(pos.x, pos.z, selected.kind, selected, nextRot, layer)) {
      pos = findSpace(parts.filter(q => q !== selected), pos, isFree(), selected.kind, inReadingRoom(), nextRot, layer);
    }
    if (!pos) return toast('Not enough room to rotate');
    selected.rotation = nextRot; selected.x = pos.x; selected.z = pos.z;
    selected.mesh.position.set(pos.x, layerY(layer), pos.z);
    selected.mesh.rotation.y = -nextRot * Math.PI / 2;
    redrawWires();
    if (selected.kind === 'photo') updateCircuit();
    saveState(); sfx.play('rotate');
  }
  function addPart(kind, pos) {
    if (pliersActive) setPliers(false); const free = isFree(), layer = free ? activeLayer : 0; if (parts.length >= (free ? BOARD.freeLimit : BOARD.lessonLimit)) return toast('Component limit reached'); if (kind === 'jack' && parts.some(p => p.kind === 'jack')) return toast('The tester has one socket'); if (kind === 'battery' && parts.some(p => p.kind === 'battery')) return toast('1 battery per board'); if (kind === 'cannon' && parts.some(p => p.kind === 'cannon')) return toast('1 cannon per board'); let location = pos ? boardPosition(pos.x, pos.z, free, kind, inReadingRoom()) : null; if (!location || !fits(location.x, location.z, kind, null, 0, layer)) location = findSpace(parts, { x: Math.round(controls.target.x * 2) / 2, z: Math.round(controls.target.z * 2) / 2 }, free, kind, inReadingRoom(), 0, layer); if (!location) return toast('No space here'); const role = kind === 'lamp' && houseChallenge() ? Object.keys(houseLights).find(role => !parts.some(p => p.role === role)) : undefined;
    const extra = kind === 'gate'
      ? { gateMode: 'NAND', outputHigh: true }
      : kind === 'clock'
        ? { clockHz: 1, phase: 0, high: false }
        : kind === 'latch'
          ? { bit: 0, prevClk: null }
          : kind === 'pot'
            ? { wiper: 0.5 }
            : kind === 'fuse'
              ? { fuseRating: 0.35, blown: false }
              : kind === 'spdt'
                ? { throwB: false }
                : kind === 'photo'
                  ? { lux: 100 }
                  : kind === 'servo'
                    ? { dial: 0 }
                    : kind === 'transistor'
                      ? { conducting: false }
                      : kind === 'battery'
                        ? { voltage: 6 }
                        : {};
    const p = makePart({ id: 'p' + (++serial), kind, role, ...location, layer, rotation: 0, closed: false, resistance: 30, ...extra }); parts.push(p); select(p); updateCircuit(); saveState(); sfx.play('place'); return p;
  }

  function resetParts() { hoveredPart = null; renderHoverProbe(); shadeDrag = null; fixture?.dispose(); fixture = null; refreshActivityControls = () => { }; setPliers(false); clearTimeout(blastTimer); faultLatched = false; recentBlast = false; shortEffects.clear(); for (const t of buttonTimers.values()) clearTimeout(t); buttonTimers.clear(); for (const lead of liftedLeads.keys()) disposeObject(lead); liftedLeads.clear(); cancelWire(); for (const c of [...componentGroup.children]) disposeObject(c); terminals.clear(); parts = []; wires = []; redrawWires(); select(null); powered = false; simActive = false; branchProof = false; history = newHistory(); trial = newTrial(); activity = freshActivity(); capMoving = false; lastTick = 0; }
  function renderPartsTray(l) {
    $('parts').replaceChildren();
    const free = isFree(), unlockedSet = free ? unlockedToolbelt(completed, LEVELS, false) : null;
    const list = free ? filterSandboxParts(l.trayParts || l.parts, sandboxCategory) : (l.trayParts || l.parts);
    for (const kind of list) {
      const locked = free && !unlockedSet.has(kind);
      const spec = partSpec(kind);
      const slot = document.createElement('div'); slot.className = 'part-slot';
      const b = document.createElement('button'); b.className = 'part' + (locked ? ' locked' : ''); b.dataset.kind = kind; b.setAttribute('aria-label', (locked ? 'Locked: ' : 'Add ') + partName(kind) + (spec ? ` (${spec})` : '')); b.innerHTML = `<span class="part-icon">${icon(inReadingRoom() && !houseChallenge() && kind === 'lamp' ? 'tableLamp' : kind)}</span><span class="part-label">${partName(kind)}</span>${spec ? `<span class="part-spec">${spec}</span>` : ''}${locked ? `<span class="part-lock">${icon('lock')}</span>` : ''}`;
      if (locked) {
        listen(b, 'click', () => showComponentGuide(kind));
      } else {
        listen(b, 'pointerdown', e => startBinDrag(e, kind)); listen(b, 'click', e => { if (e.detail === 0) addPart(kind) });
      }
      const helpBtn = document.createElement('button');
      helpBtn.className = 'part-help';
      helpBtn.type = 'button';
      helpBtn.textContent = '?';
      helpBtn.title = `How to use ${partName(kind)}`;
      helpBtn.setAttribute('aria-label', `How to use ${partName(kind)}`);
      listen(helpBtn, 'pointerdown', e => e.stopPropagation());
      listen(helpBtn, 'click', e => { e.stopPropagation(); showComponentGuide(kind); });
      slot.append(b, helpBtn);
      $('parts').append(slot);
    }
  }
  function renderSandboxCategories(l) {
    const bar = $('sandbox-categories');
    if (!bar) return;
    const free = game && isFree();
    bar.hidden = !free;
    if (!free) return;
    bar.replaceChildren();
    for (const cat of SANDBOX_CATEGORIES) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cat-tab' + (sandboxCategory === cat.id ? ' active' : '');
      btn.textContent = cat.label;
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', String(sandboxCategory === cat.id));
      btn.onclick = () => {
        sandboxCategory = cat.id;
        renderSandboxCategories(l);
        renderPartsTray(l);
      };
      bar.append(btn);
    }
  }
  function syncUndoButtons() {
    const btn = $('undo');
    if (btn) btn.disabled = !game || !boardHistory.canUndo();
  }
  function applyBoardSnapshot(saved, l = LEVELS[level]) {
    const prevSelectedId = selected?.id || null;
    hoveredPart = null; renderHoverProbe(); shadeDrag = null; setPliers(false); clearTimeout(blastTimer); faultLatched = false; recentBlast = false; shortEffects.clear();
    for (const t of buttonTimers.values()) clearTimeout(t); buttonTimers.clear();
    for (const lead of liftedLeads.keys()) disposeObject(lead); liftedLeads.clear();
    cancelWire();
    for (const c of [...componentGroup.children]) disposeObject(c);
    terminals.clear(); parts = []; wires = [];
    const starter = starterBoard(l);
    if (saved && Array.isArray(saved.parts) && Array.isArray(saved.wires)) {
      for (const p of saved.parts.slice(0, isFree() ? BOARD.freeLimit : BOARD.lessonLimit)) {
        if (!l.parts.includes(p.kind) || !/^p\d+$/.test(p.id) || !Number.isFinite(p.x) || !Number.isFinite(p.z) || parts.some(q => q.id === p.id) || p.kind === 'battery' && parts.some(q => q.kind === 'battery')) continue;
        serial = Math.max(serial, Number(p.id.slice(1)));
        const original = starter?.parts.find(q => q.id === p.id && q.kind === p.kind);
        const gateMode = ['NAND', 'NOR', 'AND', 'OR', 'XOR', 'NOT'].includes(p.gateMode) ? p.gateMode : original?.gateMode || 'NAND';
        const clockHz = [.5, 1, 2, 4].includes(Number(p.clockHz)) ? Number(p.clockHz) : original?.clockHz || 1;
        const locked = Boolean(original?.locked);
        const layer = isFree() ? clampLayer(p.layer) : 0;
        const voltage = isFree() && Number.isFinite(Number(p.voltage)) ? Math.max(3, Math.min(12, Math.round(Number(p.voltage)))) : 6;
        const rotation = locked ? (original.rotation || 0) : ((Number(p.rotation) || 0) % 4 + 4) % 4;
        const coords = locked ? { x: original.x, z: original.z } : boardPosition(p.x, p.z, isFree(), p.kind, inReadingRoom(), rotation);
        parts.push(makePart({ ...original, ...p, ...coords, layer, voltage, rotation, fixed: Boolean(p.fixed ?? original?.fixed), locked, rogue: Boolean(p.rogue ?? original?.rogue), resistance: Math.max(10, Math.min(100, Number(p.resistance) || 30)), closed: Boolean(p.closed ?? original?.closed), throwB: Boolean(p.throwB ?? original?.throwB), wiper: Number.isFinite(p.wiper) ? Math.max(0, Math.min(1, p.wiper)) : original?.wiper ?? 0.5, fuseRating: [.2, .35, .5].includes(Number(p.fuseRating)) ? Number(p.fuseRating) : original?.fuseRating || .35, blown: Boolean(p.blown ?? original?.blown), conducting: Boolean(p.conducting ?? original?.conducting), lux: Number.isFinite(p.lux) ? Math.max(0, Math.min(100, p.lux)) : original?.lux ?? 100, dial: Number.isFinite(p.dial) ? Math.max(-45, Math.min(45, p.dial)) : original?.dial ?? 0, charge: Number.isFinite(p.charge) ? Math.max(-6, Math.min(6, p.charge)) : 0, reversed: !!p.reversed, gateMode, clockHz, bit: p.bit ? 1 : 0, outputHigh: p.outputHigh !== undefined ? !!p.outputHigh : !!original?.outputHigh, prevClk: null }));
      }
      wires = saved.wires.slice(0, 512).filter(w => terminals.has(w.a) && terminals.has(w.b) && w.a !== w.b);
    }
    if (!saved && inReadingRoom()) parts.push(makePart({ id: 'p' + (++serial), kind: 'lamp', x: 2, z: 0 }));
    const restoredSel = prevSelectedId ? parts.find(q => q.id === prevSelectedId) || null : null;
    select(restoredSel);
    redrawWires(); syncPliers(); updateCircuit();
  }
  function undoBoard() {
    if (!game) return;
    const snap = boardHistory.undo();
    if (!snap) return;
    applyBoardSnapshot(snap);
    saveState(true, { skipHistory: true });
    syncUndoButtons();
    sfx.play('ui');
  }
  function redoBoard() {
    if (!game) return;
    const snap = boardHistory.redo();
    if (!snap) return;
    applyBoardSnapshot(snap);
    saveState(true, { skipHistory: true });
    syncUndoButtons();
    sfx.play('ui');
  }
  function startLevel(i, restart = false, skipPreSave = false) {
    if (game && !restart && !skipPreSave) saveState(); game = true; level = i; activeLayer = 0; setRoom(); lessonStep = 0; skipTeaching = false; wonThisVisit = false; resetParts(); updateMainframeBadge(); updateLibraryBadge(); updateMasterBadge(); setPanMode(false); $('landing').hidden = true; $('game').hidden = false; $('viewport').append(renderer.domElement); $('win').hidden = true; $('completion-status').textContent = ''; $('hint').hidden = true; const l = LEVELS[i];
    if (l.id !== 'sandbox') { lastLevel = i; writeProgress({ quiet: true, immediate: false }); }
    if (isFree() && !restart) {
      const activeSlot = sandboxSlots.slots[sandboxSlots.active];
      if (activeSlot && (activeSlot.parts.length || !boards[i])) {
        boards[i] = { parts: activeSlot.parts, wires: activeSlot.wires, view: activeSlot.view };
      }
    }
    fixture = createActivityScene(l, scene);
    $('activity-goal').hidden = !l.activity; $('activity-goal').textContent = l.activity ? l.goal : '';
    $('replay-lesson').hidden = !!l.master;
    $('challenge-readings').classList.toggle('meter-reading', false);
    $('game').dataset.activity = l.id;
    if (l.master) skipTeaching = true;
    refreshActivityControls = activityControls($('activity-controls'), l, activity, runActivity);
    $('reset').title = l.layout ? 'Restart experiment' : 'Clear board'; $('reset').setAttribute('aria-label', $('reset').title);
    $('power').hidden = $('current').hidden = false;
    $('progress').hidden = false; updateProgress(); $('unit-name').textContent = unitOf(l).label; $('level-number').textContent = l.id === 'sandbox' ? '∞' : l.master ? 'Challenge ' + l.code : String(lessonNumber(l)).padStart(2, '0') + ' / ' + String(unitLevels(l).length).padStart(2, '0'); $('challenge-target').hidden = !l.target; $('challenge-target').textContent = l.target ? `Target: ${l.target}` : ''; $('level-title').textContent = l.title; $('goal-picture').innerHTML = diagram(l.diagram); $('goal-picture').setAttribute('aria-label', l.goal); $('goal-picture').classList.toggle('complete', completed.includes(i)); $('goal-icon').innerHTML = completed.includes(i) ? icon('check') : '○'; $('goal-icon').setAttribute('aria-label', completed.includes(i) ? 'Complete' : 'Incomplete'); $('hint').textContent = l.hint;
    syncLayerButtons(); renderSandboxSlots(); renderSandboxCategories(l); renderPartsTray(l);
    const starter = starterBoard(l);
    const saved = restart ? starter : (boards[i] || starter);
    applyBoardSnapshot(saved, l);
    resetCamera(); if (saved?.view && [saved.view.camera, saved.view.target].every(v => Array.isArray(v) && v.length === 3 && v.every(Number.isFinite)) && saved.view.camera[1] > .2) { camera.position.fromArray(saved.view.camera); controls.target.fromArray(saved.view.target); setPanMode(!!saved.view.pan); controls.update(); updateSurface(); } resize();
    boardHistory.reset(snapshotBoard());
    syncUndoButtons();
  }
  function resetCamera() { let x = 0, z = 0; const free = game && isFree(), yOff = free ? activeLayer * LAYER_HEIGHT : 0; if (game && parts.length) { const xs = parts.map(p => p.x), zs = parts.map(p => p.z); x = (Math.min(...xs) + Math.max(...xs)) / 2; z = (Math.min(...zs) + Math.max(...zs)) / 2; } controls.target.set(x, (free ? 2.2 : activeRoom ? 1.6 : 0) + yOff, z); if (free) camera.position.set(x + 4, 17 + yOff, z + 34); else if (activeRoom) camera.position.set(x + 3, 12.6 + yOff, z + 26); else camera.position.set(x + (game ? 14 : 12), (game ? 19 : 15) + yOff, z + (game ? 19 : 16)); controls.update(); updateSurface(); }

  const ray = new THREE.Raycaster(), pointer = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -.14);
  function setRay(e) { const r = renderer.domElement.getBoundingClientRect(); pointer.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); ray.setFromCamera(pointer, camera); }
  function boardPoint(e, layer = isFree() ? activeLayer : 0) { setRay(e); plane.constant = -layerY(layer); const p = ray.ray.intersectPlane(plane, new THREE.Vector3()); if (!p) return null; return boardPosition(p.x, p.z, isFree()); }
  function hits(e) { setRay(e); scene.updateMatrixWorld(true); return ray.intersectObjects(componentGroup.children, true); }
  function handleTerminal(id) { if (!pending) { pending = id; $('wire-hint').hidden = false; refreshTeaching(); sfx.play('wireStart'); } else if (pending === id) { cancelWire(); } else { if (wires.some(w => w.a === pending && w.b === id || w.b === pending && w.a === id)) return toast('Already connected'); wires.push({ a: pending, b: id }); cancelWire(); redrawWires(); updateCircuit(); saveState(); sfx.play('wireConnect'); } }
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
    const t = h.find(h => h.object.userData.terminal); if (t) { controls.enabled = false; handleTerminal(t.object.userData.terminal); return; } if (pending) return; const first = h[0]; if (!first) { select(null); return; } let obj = first.object; while (obj && !obj.userData.part) obj = obj.parent; const p = obj?.userData.part; if (!p) return; select(p); if (p.locked) return; controls.enabled = false; const start = boardPoint(e); drag = { p, start, x: p.x, z: p.z, px: e.clientX, py: e.clientY, moved: false }; if (p.kind === 'button') { p.closed = true; p.pressedAt = performance.now(); clearTimeout(buttonTimers.get(p.id)); buttonTimers.delete(p.id); sfx.play('buttonPress'); updateCircuit(); } renderer.domElement.setPointerCapture(e.pointerId);
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
    if (pending) { const layer = isFree() ? activeLayer : 0; const p = boardPoint(e, layer), a = terminalPosition(pending); clearPreview(); if (a && p) { preview = wireMesh(a, new THREE.Vector3(p.x, layerY(layer) + .46, p.z), '#cda357'); scene.add(preview); } renderer.domElement.style.cursor = 'crosshair'; hoveredPart = null; renderHoverProbe(); return; } if (drag) { const layer = clampLayer(drag.p.layer); const pos = boardPoint(e, layer); if (!pos || !drag.start) return; if (!drag.moved && Math.hypot(e.clientX - drag.px, e.clientY - drag.py) > 5) { drag.moved = true; if (drag.p.kind === 'button' && drag.p.closed) { drag.p.closed = false; updateCircuit(); } } const { x, z } = boardPosition(drag.x + pos.x - drag.start.x, drag.z + pos.z - drag.start.z, isFree(), drag.p.kind, inReadingRoom(), drag.p.rotation || 0); if (fits(x, z, drag.p.kind, drag.p, drag.p.rotation || 0, layer)) { Object.assign(drag.p, { x, z }); drag.p.mesh.position.set(x, layerY(layer), z); redrawWires(); if (drag.p.kind === 'photo') updateCircuit(); } hoveredPart = null; renderHoverProbe(); return; } const h = hits(e); hoverTerminal = h.find(v => v.object.userData.terminal)?.object.userData.terminal || null; let hoverObj = h[0]?.object; while (hoverObj && !hoverObj.userData.part) hoverObj = hoverObj.parent; hoveredPart = hoverObj?.userData.part || null; renderHoverProbe(); renderer.domElement.style.cursor = hoverTerminal ? 'crosshair' : h.length ? 'grab' : 'default';
  });
  function endPointer() { shadeDrag = null; if (drag) { if (drag.p.kind === 'switch' && !drag.moved) { toggleSwitch(drag.p); } else if (drag.p.kind === 'spdt' && !drag.moved) { toggleSpdt(drag.p); } else if (drag.p.kind === 'button' && !drag.moved) { const btn = drag.p, remain = Math.max(0, 260 - (performance.now() - (btn.pressedAt || 0))); clearTimeout(buttonTimers.get(btn.id)); if (remain <= 15) { btn.closed = false; updateCircuit(); } else { buttonTimers.set(btn.id, setTimeout(() => { buttonTimers.delete(btn.id); btn.closed = false; updateCircuit(); }, remain)); } } saveState(); drag = null; } controls.enabled = true; }
  listen(renderer.domElement, 'pointerup', e => {
    if (pliersActive) {
      const lead = grip?.lead;
      if (lead && grip.id === e.pointerId && Math.hypot(e.clientX - grip.x, e.clientY - grip.y) <= 7 && pickLead(e) === lead) pullLead(lead);
      grip = null; renderer.domElement.style.cursor = pliersActive ? openPliers : '';
    }
    endPointer();
  });
  listen(renderer.domElement, 'pointerleave', () => { hoveredPart = null; renderHoverProbe(); if (!grip) highlightLead(null); });
  listen(renderer.domElement, 'pointercancel', () => { hoveredPart = null; renderHoverProbe(); grip = null; highlightLead(null); if (pliersActive) renderer.domElement.style.cursor = openPliers; }); listen(renderer.domElement, 'pointercancel', endPointer); listen(window, 'pointerup', () => controls.enabled = true);
  function startBinDrag(e, kind) { if (e.button !== 0) return; e.preventDefault(); const sx = e.clientX, sy = e.clientY; let moved = false, ghost; const move = ev => { if (Math.hypot(ev.clientX - sx, ev.clientY - sy) > 5) moved = true; if (moved) { if (!ghost) { ghost = document.createElement('div'); ghost.className = 'drag-ghost'; ghost.innerHTML = icon(inReadingRoom() && !houseChallenge() && kind === 'lamp' ? 'tableLamp' : kind); document.body.append(ghost) } ghost.style.left = ev.clientX - 28 + 'px'; ghost.style.top = ev.clientY - 28 + 'px'; } }; const up = ev => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', cancel); ghost?.remove(); if (!moved) { addPart(kind); return; } const r = renderer.domElement.getBoundingClientRect(); if (ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom) addPart(kind, boardPoint(ev)); }; const cancel = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', cancel); ghost?.remove(); }; listen(window, 'pointermove', move); listen(window, 'pointerup', up); listen(window, 'pointercancel', cancel); }
  function removeSelected() { if (!selected || selected.fixed) return; cancelWire(); const p = selected; wires = wires.filter(w => !w.a.startsWith(p.id + ':') && !w.b.startsWith(p.id + ':')); p.rings.forEach((_, i) => terminals.delete(p.id + ':' + i)); disposeObject(p.mesh); parts = parts.filter(q => q !== p); select(null); redrawWires(); updateCircuit(); saveState(); sfx.play('remove'); }
  $('play').onclick = () => startLevel(nextPlayLevel(completed, lastLevel, !!userId, unlockAll)); $('landing-freebuild').onclick = () => startLevel(LEVELS.length - 1); $('guide-button').onclick = showGuide; $('mainframe-button').onclick = showMainframe; $('library-button').onclick = () => showLibrary(); for (const id of ['master-button', 'landing-master']) $(id).onclick = showMaster; $('open-freebuild').onclick = () => { $('mainframe').close(); startLevel(LEVELS.length - 1); }; $('mainframe-first-light').onclick = () => { $('mainframe').close(); startFirstLight(); }; $('mainframe-open-library').onclick = () => { $('mainframe').close(); showLibrary(); }; $('library-freebuild').onclick = () => { $('library').close(); startLevel(LEVELS.length - 1); }; $('guide-close-action').onclick = () => $('component-guide').close(); $('selection-help').onclick = () => { if (selected) showComponentGuide(selected.kind); };
  $('fl-exit').onclick = () => stopFirstLight();
  $('fl-replay').onclick = () => startFirstLight();
  $('fl-freebuild').onclick = () => stopFirstLight({ openFreeBuild: true });
  $('fl-sound').onclick = () => {
    $('sound').click();
    syncFirstLightSound();
    if (firstLight) {
      if (sound) firstLightScore = sfx.startFirstLightScore();
      else { firstLightScore?.stop(); firstLightScore = null; }
    }
  };
  for (const btn of $('layer-switcher').querySelectorAll('.layer-btn')) btn.onclick = () => { const prev = activeLayer; setActiveLayer(Number(btn.dataset.layer)); if (activeLayer !== prev) sfx.play('ui'); };
  $('slot-name').oninput = e => { if (!isFree()) return; sandboxSlots.slots[sandboxSlots.active].name = e.target.value.slice(0, 32) || `Build ${sandboxSlots.active + 1}`; sandboxSlots.slots[sandboxSlots.active].updatedAt = Date.now(); persistSandboxSlots(); renderSandboxSlots(); saveState(true, { skipHistory: true }); };
  $('slot-clear').onclick = () => { if (isFree()) $('reset').click(); };
  for (const id of ['library', 'master', 'component-guide']) listen($(id), 'click', e => { if (e.target === $(id)) $(id).close(); });
  $('home').onclick = () => { if (game) saveState(); game = false; syncUndoButtons(); activeLayer = 0; syncLayerButtons(); setRoom(); setPanMode(false); resetParts(); $('game').hidden = true; $('landing').hidden = false; $('progress').hidden = true; $('teaching').hidden = true; document.querySelectorAll('.lesson-focus').forEach(e => e.classList.remove('lesson-focus')); $('hero-scene').append(renderer.domElement); hero(); resize(); };
  for (const b of document.querySelectorAll('.close-dialog')) b.onclick = () => b.closest('dialog').close(); $('help-button').onclick = () => $('help').showModal(); $('cancel-wire').onclick = cancelWire; document.querySelector('.close-help').onclick = () => $('help').close(); $('teaching-next').onclick = () => { lessonStep++; updateCircuit(); }; $('skip-teaching').onclick = () => { skipTeaching = true; updateCircuit(); }; $('replay-lesson').onclick = () => { lessonStep = 0; skipTeaching = false; refreshTeaching(); }; $('hint-button').onclick = () => $('hint').hidden = !$('hint').hidden; $('save').onclick = () => saveState(false, { immediate: true }); $('undo').onclick = undoBoard; $('camera').onclick = resetCamera; $('pan').onclick = () => { if (pliersActive) setPliers(false); setPanMode(!panMode); };
  $('power').onclick = () => {
    cancelWire(); powered = !powered; activity.tripped = false; recentBlast = false; clearTimeout(blastTimer);
    for (const t of buttonTimers.values()) clearTimeout(t); buttonTimers.clear();
    for (const p of parts) {
      if (p.kind === 'button') p.closed = false;
      if (p.kind === 'coil') { p.relayTimer = 0; if (!powered) p.energized = false; }
      if (p.kind === 'gate') { p.gateTimer = 0; if (LEVELS[level].id === 'mainframe-boot' && powered) p.outputHigh = ['NOT', 'NAND', 'NOR'].includes(p.gateMode); }
      if (p.kind === 'latch') { p.prevClk = null; if (LEVELS[level].id === 'mainframe-boot' && powered) p.bit = 0; }
      if (p.kind === 'clock' && (!powered || LEVELS[level].id === 'mainframe-boot')) { p.phase = 0; p.high = false; }
      if (p.kind === 'transistor') { p.transTimer = 0; if (!powered) p.conducting = false; }
      if (p.kind === 'cannon') p.discharging = false;
      if (p.kind === 'battery' && p.rogue && !powered) { p.reversed = false; showPolarity(p); }
    }
    const wantPower = powered;
    updateCircuit();
    if (!wantPower || !circuitState?.short) sfx.play(wantPower ? 'powerOn' : 'powerOff');
  }; $('pliers').onclick = () => {
    setPliers(!pliersActive);
    renderer.domElement.focus({ preventScroll: true });
  }; $('reset').onclick = () => {
    const l = LEVELS[level];
    lessonStep = 0; skipTeaching = false; wonThisVisit = false;
    powered = false; simActive = false; branchProof = false;
    history = newHistory(); trial = newTrial(); activity = freshActivity();
    $('win').hidden = true; $('completion-status').textContent = '';
    applyBoardSnapshot(l.layout ? starterBoard(l) : { parts: [], wires: [] }, l);
    saveState();
  }; $('rotate').onclick = rotateSelected; $('delete').onclick = removeSelected;
  $('reverse').onclick = () => { if (selected?.kind === 'battery' && reversible()) { selected.reversed = !selected.reversed; showPolarity(selected); sfx.play('flip'); updateCircuit(); saveState(); } };
  $('toggle').onclick = () => { if (selected?.kind === 'switch') toggleSwitch(selected); else if (selected?.kind === 'spdt') toggleSpdt(selected); };
  $('gate-mode').onchange = e => { if (selected?.kind === 'gate') { selected.gateMode = e.target.value; selected.outputHigh = ['NAND', 'NOR', 'NOT'].includes(selected.gateMode); syncGatePins(selected); redrawWires(); updateCircuit(); saveState(); } };
  $('clock-rate').onchange = e => { if (selected?.kind === 'clock') { selected.clockHz = Number(e.target.value); updateCircuit(); saveState(); } };
  $('press-button').onclick = () => { if (selected?.kind === 'button') pulseButton(selected); };
  $('reset-latch').onclick = () => { if (selected?.kind === 'latch') { selected.bit = 0; updateCircuit(); saveState(); } };
  $('battery-volt').oninput = e => {
    if (selected?.kind === 'battery' && isFree()) {
      selected.voltage = Math.max(3, Math.min(12, Math.round(Number(e.target.value) || 6)));
      drawBatteryVoltageLabel(selected);
      $('battery-volt-output').textContent = selected.voltage + ' V';
      $('selection-name').textContent = `${partName('battery')} · ${partSpec('battery', selected)}`;
      updateCircuit(); saveState(true, { coalesceTag: 'battery-volt:' + selected.id });
    }
  };
  $('part-layer').onchange = e => {
    if (!selected || !isFree()) return;
    const nextLayer = clampLayer(e.target.value);
    if (nextLayer === clampLayer(selected.layer)) return;
    let pos = { x: selected.x, z: selected.z };
    if (!fits(pos.x, pos.z, selected.kind, selected, selected.rotation || 0, nextLayer)) {
      pos = findSpace(parts.filter(q => q !== selected), pos, true, selected.kind, false, selected.rotation || 0, nextLayer);
    }
    if (!pos) { $('part-layer').value = String(clampLayer(selected.layer)); return toast('No space on that layer'); }
    selected.layer = nextLayer; selected.x = pos.x; selected.z = pos.z;
    selected.mesh.position.set(pos.x, layerY(nextLayer), pos.z);
    redrawWires(); setActiveLayer(nextLayer); updateCircuit(); saveState(); sfx.play('rotate');
  };
  $('resistor-value').oninput = e => { if (selected?.kind === 'resistor') { selected.resistance = Number(e.target.value); $('resistor-output').textContent = selected.resistance + ' Ω'; updateCircuit(); saveState(true, { coalesceTag: 'resistor-value:' + selected.id }); } };
  $('pot-value').oninput = e => { if (selected?.kind === 'pot') { const pct = Number(e.target.value); selected.wiper = pct / 100; $('pot-output').textContent = pct + '%'; updateCircuit(); saveState(true, { coalesceTag: 'pot-value:' + selected.id }); } };
  $('fuse-rating').onchange = e => { if (selected?.kind === 'fuse') { selected.fuseRating = Number(e.target.value); $('selection-name').textContent = `${partName('fuse')} · ${partSpec('fuse', selected)}`; updateCircuit(); saveState(); } };
  $('replace-fuse').onclick = () => { if (selected?.kind === 'fuse') { selected.blown = false; select(selected); updateCircuit(); saveState(); sfx.play('fuseReplace'); } };
  $('photo-lux').oninput = e => { if (selected?.kind === 'photo') { const lux = Number(e.target.value); selected.lux = lux; $('photo-lux-output').textContent = lux <= 25 ? 'Dark' : lux >= 75 ? 'Bright' : lux + '%'; updateCircuit(); saveState(true, { coalesceTag: 'photo-lux:' + selected.id }); } };
  $('servo-dial').oninput = e => { if (selected?.kind === 'servo') { const deg = Number(e.target.value); selected.dial = deg; $('servo-dial-output').textContent = deg + '°'; updateCircuit(); saveState(true, { coalesceTag: 'servo-dial:' + selected.id }); } };
  $('next').onclick = () => {
    const nextIdx = level + 1;
    if (nextIdx < LEVELS.length && unlocked(nextIdx)) startLevel(nextIdx);
    else if (!userId && nextIdx < LEVELS.length) { toast('Sign in to unlock the rest of this chapter'); triggerSignIn(); }
    else showGuide();
  }; $('sound').onclick = () => { sound = !sound; try { localStorage.setItem(soundKey, sound ? '1' : '0'); } catch { } sfx.setEnabled(sound); syncSoundButton(); if (sound) sfx.play('ui'); }; $('short-mode').onclick = () => { explosiveShorts = !explosiveShorts; try { localStorage.setItem(shortModeKey, explosiveShorts ? 'explosive' : 'smoke'); } catch { } syncShortMode(); sfx.play('ui'); };
  listen(window, 'keydown', e => {
    if (firstLight) {
      if (e.key === 'Escape') { e.preventDefault(); stopFirstLight(); }
      return;
    }
    if (e.key === 'Escape') { cancelWire(); if (pliersActive) setPliers(false); }
    if (game && !document.querySelector('dialog[open]') && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) && (e.ctrlKey || e.metaKey) && !e.altKey) {
      const k = e.key.toLowerCase();
      if (k === 'z') { e.preventDefault(); if (e.shiftKey) redoBoard(); else undoBoard(); return; }
      if (k === 'y' && !e.shiftKey) { e.preventDefault(); redoBoard(); return; }
    }
    if (!game || document.querySelector('dialog[open]') || ['INPUT', 'BUTTON', 'SELECT'].includes(document.activeElement.tagName)) return; if (pliersActive && document.activeElement === renderer.domElement) {
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
    if (isFree() && ['1', '2', '3'].includes(e.key)) { e.preventDefault(); const prev = activeLayer; setActiveLayer(Number(e.key) - 1); if (activeLayer !== prev) sfx.play('ui'); return; }
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); removeSelected(); } if (e.key === 'r' || e.key === 'R') { e.preventDefault(); rotateSelected(); } if (e.code === 'Space') { e.preventDefault(); $('power').click(); } if (selected && !selected.locked && e.key.startsWith('Arrow')) { e.preventDefault(); const layer = clampLayer(selected.layer); const x = selected.x + (e.key === 'ArrowLeft' ? -.5 : e.key === 'ArrowRight' ? .5 : 0), z = selected.z + (e.key === 'ArrowUp' ? -.5 : e.key === 'ArrowDown' ? .5 : 0); const next = boardPosition(x, z, isFree(), selected.kind, inReadingRoom(), selected.rotation || 0); if (fits(next.x, next.z, selected.kind, selected, selected.rotation || 0, layer)) { selected.x = next.x; selected.z = next.z; selected.mesh.position.set(next.x, layerY(layer), next.z); redrawWires(); updateCircuit(); saveState(); } }
  });
  function hero() { parts = [makePart({ id: 'hero1', kind: 'battery', x: -2.8, z: -.8 }), makePart({ id: 'hero2', kind: 'lamp', x: 1.2, z: -.8 }), makePart({ id: 'hero3', kind: 'switch', x: .1, z: 2, closed: true })]; wires = [{ a: 'hero1:0', b: 'hero2:0' }, { a: 'hero2:1', b: 'hero3:1' }, { a: 'hero3:0', b: 'hero1:1' }]; redrawWires(); powered = true; updateCircuit(); resetCamera(); }
  function resize() {
    if (firstLight) {
      const flStage = $('first-light-stage');
      const w = flStage.clientWidth, h = flStage.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h);
      firstLight.camera.aspect = w / h;
      firstLight.camera.updateProjectionMatrix();
      return;
    }
    const container = game ? $('viewport') : $('hero-scene'); const w = container.clientWidth, h = container.clientHeight; if (!w || !h) return; renderer.setSize(w, h); camera.aspect = w / h; camera.zoom = Math.min(1, Math.max(.4, camera.aspect / .95)); camera.updateProjectionMatrix();
  } const observer = new ResizeObserver(resize); observer.observe(document.body); listen(window, 'resize', resize);
  function updateProgress() {
    const row = $('progress');
    row.replaceChildren();
    const current = LEVELS[level], unit = current.unit;
    row.classList.toggle('compact', unit === 'Library');
    LEVELS.forEach((l, i) => {
      if (l.unit !== unit) return;
      if (unit === 'Library' && l.shelf !== current.shelf) return;
      const b = document.createElement('button');
      b.className = 'progress-dot' + (i === level ? ' active' : '') + (completed.includes(i) ? ' done' : '');
      const reason = lockReason(i);
      b.disabled = !unlocked(i);
      b.title = reason ? `${l.title} (${reason})` : l.title;
      b.setAttribute('aria-label', `${l.unit}: ${l.title}`);
      b.setAttribute('aria-current', i === level ? 'step' : 'false');
      b.innerHTML = completed.includes(i) ? icon('check') : l.id === 'sandbox' ? '∞' : l.master ? l.code : `${lessonNumber(l)}`;
      b.onclick = () => startLevel(i);
      row.append(b);
    });
  }

  const onControlsEnd = () => saveState(true, { skipHistory: true, localOnly: true });
  controls.addEventListener('end', onControlsEnd);
  listen(window, 'online', () => { cloudRetryCount = 0; if (cloudSavePending && !cloudSaveDisabled) void flushCloudSave(); });
  listen(document, 'visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      saveState(true, { localOnly: true, skipHistory: true });
      clearTimeout(cloudSaveTimer);
      if (cloudSavePending) void flushCloudSave({ unloading: true });
    }
  });
  listen(window, 'pagehide', () => {
    saveState(true, { localOnly: true, skipHistory: true });
    clearTimeout(cloudSaveTimer);
    if (cloudSavePending) void flushCloudSave({ unloading: true });
  });
  if (userId) {
    if (cloudNeedsInitialSync) writeProgress({ quiet: true, immediate: true });
    else if (cloudError) setCloudStatus('warn', 'Saved locally');
  }
  hero(); resize(); updateMainframeBadge(); updateLibraryBadge(); updateMasterBadge(); if (cloudError && !cloudNeedsInitialSync) toast('Cloud load timed out. Saved on this device.');
  const queryParams = new URLSearchParams(window.location.search);
  const requestedUnit = queryParams.get('unit')?.toLowerCase();
  const entry = LEVELS.findIndex(l => unitOf(l).theme && l.unit.toLowerCase() === requestedUnit);
  if (entry >= 0) startLevel(entry);
  if (queryParams.get('firstlight') === '1') startFirstLight();
  let readySent = false;
  renderer.setAnimationLoop(time => {
    const elapsed = Math.min(.15, (time - lastFrame) / 1000); lastFrame = time;
    if (firstLight) {
      const fl = firstLight.update(elapsed);
      $('fl-eyebrow').textContent = fl.eyebrow;
      $('fl-title').textContent = fl.title;
      $('fl-sub').textContent = fl.sub;
      $('fl-progress-fill').style.width = `${Math.round(fl.progress * 100)}%`;
      $('fl-flash').style.opacity = String(fl.flash.toFixed(3));
      if (fl.finished && $('fl-replay').hidden) {
        $('fl-replay').hidden = false;
        $('fl-freebuild').hidden = false;
        $('fl-exit').textContent = 'Return to workshop';
      }
      renderer.render(firstLight.scene, firstLight.camera);
      if (!readySent) { readySent = true; onReady?.(); }
      return;
    }
    animateLiftedLeads(time);
    shortEffects.update(elapsed);
    const ticking = simActive || LEVELS[level].machine || (LEVELS[level].master && ['mc-basketball', 'mc-basketball-raw', 'mc-flip-proof'].includes(LEVELS[level].id)) || activity.running;
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
    if (game && (LEVELS[level].machine || LEVELS[level].unit === 'Observatory' || LEVELS[level].master) && fixture) fixture.update(activity, parts, circuitState, powered, mainframeProgress(completed, LEVELS));
    controls.update(); updateSurface(); ground.position.x = controls.target.x; ground.position.z = controls.target.z; sun.position.set(controls.target.x - 6, 14, controls.target.z + 8); sun.target.position.set(controls.target.x, 0, controls.target.z); for (const p of parts) for (let i = 0; i < p.rings.length; i++) { const active = game && (pending === p.id + ':' + i || hoverTerminal === p.id + ':' + i || !skipTeaching && level === 0 && lessonStep >= 3 && lessonStep <= 5); p.rings[i].material.opacity = active ? .7 + Math.sin(time * .006) * .3 : 0; } for (const wire of wireGroup.children) { const e = wire.userData.endpoints, current = powered && circuitState && e ? (circuitState.voltages[e.a] - circuitState.voltages[e.b]) / .01 : 0; wire.children.forEach((bead, i) => { bead.visible = powered && Math.abs(current) > .01; if (bead.visible) { const t = ((time * .00012 * Math.sign(current) + i / 3) % 1 + 1) % 1; bead.position.copy(wire.userData.curve.getPoint(t)); } }); } const shaking = shortEffects.getCameraOffset(shakeOffset); if (shaking) camera.position.add(shakeOffset); activeRoom?.draw(renderer, camera); renderer.render(scene, camera); if (shaking) camera.position.sub(shakeOffset); if (!readySent) { readySent = true; onReady?.(); }
  });
  return () => { saveState(true, { localOnly: true, skipHistory: true }); clearTimeout(firstLightTimer); stopFirstLight(); clearTimeout(cloudSaveTimer); clearTimeout(cloudRetryTimer); if (cloudSavePending) void flushCloudSave({ unloading: true }); events.abort(); observer.disconnect(); clearTimeout(toastTimer); clearTimeout(blastTimer); for (const t of buttonTimers.values()) clearTimeout(t); buttonTimers.clear(); sfx.dispose(); shortEffects.dispose(); document.querySelectorAll('.drag-ghost').forEach(e => e.remove()); renderer.setAnimationLoop(null); controls.removeEventListener('end', onControlsEnd); controls.dispose(); fixture?.dispose(); readingRoom?.dispose(); for (const room of rooms.values()) room.dispose(); paintedTop.dispose(); paintedFrame.dispose(); const materials = new Set(), geometries = new Set(), textures = new Set(); scene.traverse(o => { if (o.geometry) geometries.add(o.geometry); if (o.material) for (const m of Array.isArray(o.material) ? o.material : [o.material]) { materials.add(m); for (const v of Object.values(m)) if (v?.isTexture) textures.add(v); } }); geometries.forEach(g => g.dispose()); textures.forEach(t => t.dispose()); materials.forEach(m => m.dispose()); sun.shadow.dispose(); renderer.dispose(); renderer.domElement.remove(); for (const e of document.querySelectorAll('#workshop button,#workshop input,#workshop select')) { e.onclick = null; e.oninput = null; e.onchange = null; } };
}
