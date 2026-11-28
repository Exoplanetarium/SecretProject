export const LAYER_HEIGHT = 4.5;
export const MAX_LAYERS = 3;
export const SANDBOX_SLOT_COUNT = 5;

export function clampLayer(layer) {
  const n = Math.round(Number(layer) || 0);
  return Math.max(0, Math.min(MAX_LAYERS - 1, n));
}

export function layerY(layer = 0) {
  return 0.14 + clampLayer(layer) * LAYER_HEIGHT;
}

export const SANDBOX_CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'basic', label: 'Basic', kinds: ['battery', 'lamp', 'switch', 'resistor', 'capacitor', 'led', 'rail', 'fuse'] },
  { id: 'control', label: 'Control', kinds: ['button', 'spdt', 'pot', 'diode', 'transistor', 'comparator', 'coil', 'relay', 'photo'] },
  { id: 'motion', label: 'Motion', kinds: ['motor', 'gear', 'servo', 'rgb', 'bell'] },
  { id: 'logic', label: 'Logic', kinds: ['gate', 'latch', 'clock', 'display', 'meter'] }
];

export function filterSandboxParts(parts, categoryId = 'all') {
  if (!categoryId || categoryId === 'all') return [...parts];
  const cat = SANDBOX_CATEGORIES.find(c => c.id === categoryId);
  if (!cat || !cat.kinds) return [...parts];
  const allowed = new Set(cat.kinds);
  return parts.filter(kind => allowed.has(kind));
}

export function defaultSandboxSlots() {
  return {
    active: 0,
    slots: Array.from({ length: SANDBOX_SLOT_COUNT }, (_, i) => ({
      name: `Build ${i + 1}`,
      parts: [],
      wires: [],
      view: null,
      updatedAt: 0
    }))
  };
}

export function normalizeSandboxSlots(raw) {
  const base = defaultSandboxSlots();
  if (!raw || typeof raw !== 'object') return base;
  const activeIdx = Math.round(Number(raw.active));
  base.active = Number.isInteger(activeIdx) && activeIdx >= 0 && activeIdx < SANDBOX_SLOT_COUNT ? activeIdx : 0;
  if (Array.isArray(raw.slots)) {
    for (let i = 0; i < SANDBOX_SLOT_COUNT; i++) {
      const s = raw.slots[i];
      if (!s || typeof s !== 'object') continue;
      const name = typeof s.name === 'string' && s.name.trim() ? s.name.trim().slice(0, 32) : `Build ${i + 1}`;
      const parts = Array.isArray(s.parts) ? s.parts.slice(0, 128) : [];
      const wires = Array.isArray(s.wires) ? s.wires.slice(0, 512) : [];
      const view = s.view && typeof s.view === 'object' ? s.view : null;
      const updatedAt = Number.isFinite(Number(s.updatedAt)) ? Number(s.updatedAt) : 0;
      base.slots[i] = { name, parts, wires, view, updatedAt };
    }
  }
  return base;
}

export function mergeSandboxSlots(cloudRaw, localRaw) {
  if (!cloudRaw && !localRaw) return defaultSandboxSlots();
  if (!cloudRaw) return normalizeSandboxSlots(localRaw);
  if (!localRaw) return normalizeSandboxSlots(cloudRaw);
  const cloud = normalizeSandboxSlots(cloudRaw);
  const local = normalizeSandboxSlots(localRaw);
  const merged = defaultSandboxSlots();
  let maxCloud = 0;
  let maxLocal = 0;
  for (let i = 0; i < SANDBOX_SLOT_COUNT; i++) {
    const c = cloud.slots[i];
    const l = local.slots[i];
    const cAt = c.updatedAt || 0;
    const lAt = l.updatedAt || 0;
    if (cAt > maxCloud) maxCloud = cAt;
    if (lAt > maxLocal) maxLocal = lAt;
    const preferLocal = lAt > cAt || (lAt === cAt && c.parts.length === 0 && l.parts.length > 0);
    merged.slots[i] = preferLocal ? l : c;
  }
  merged.active = maxLocal > maxCloud ? local.active : cloud.active;
  return merged;
}

export function probePartReading(part, state, powered, displayName) {
  if (!part) return null;
  const layer = clampLayer(part.layer);
  const title = part.role || displayName || part.kind;
  const meta = `L${layer + 1}`;
  if (!powered || !state) {
    return {
      title,
      meta,
      voltage: '0.00 V',
      current: '0.000 A',
      power: '0.00 W',
      detail: 'Power off',
      status: 'off'
    };
  }
  if (state.short) {
    const faulted = (state.shortParts || []).includes(part.id);
    return {
      title,
      meta,
      voltage: '0.00 V',
      current: 'FAULT',
      power: '0.00 W',
      detail: faulted ? 'Shorted / overloaded' : 'Short circuit active',
      status: 'fault'
    };
  }

  let v = 0;
  if (part.kind === 'battery') {
    v = part.voltage || 6;
  } else if (part.kind === 'meter') {
    v = state.meterVoltages?.[part.id] ?? ((state.voltages?.[part.id + ':0'] || 0) - (state.voltages?.[part.id + ':1'] || 0));
  } else if (part.kind === 'pot') {
    v = (state.voltages?.[part.id + ':0'] || 0) - (state.voltages?.[part.id + ':2'] || 0);
  } else if (part.kind === 'spdt') {
    v = (state.voltages?.[part.id + ':0'] || 0) - (state.voltages?.[part.id + ':' + (part.throwB ? 2 : 1)] || 0);
  } else if (part.kind === 'gate' || part.kind === 'latch' || part.kind === 'comparator') {
    v = (state.voltages?.[part.id + ':2'] || 0) - (state.voltages?.[part.id + ':3'] || 0);
  } else if (part.kind === 'display') {
    v = state.displayValues?.[part.id] ?? 0;
  } else {
    v = (state.voltages?.[part.id + ':0'] || 0) - (state.voltages?.[part.id + ':1'] || 0);
  }

  let amps = 0;
  if (part.kind === 'battery') {
    amps = state.current || 0;
  } else if (part.kind === 'rgb') {
    amps = (state.currents?.[part.id + '/0'] || 0) + (state.currents?.[part.id + '/1'] || 0) + (state.currents?.[part.id + '/2'] || 0);
  } else if (part.kind === 'pot') {
    amps = state.currents?.[part.id + '/1'] || 0;
  } else {
    amps = state.currents?.[part.id] || 0;
  }

  const watts = Math.abs(v * amps);
  let detail = '';
  if (part.kind === 'battery') detail = `Supply ${(part.voltage || 6)} V`;
  else if (part.kind === 'motor' || part.kind === 'gear') detail = `${Math.round((amps || 0) * 900)} rpm`;
  else if (part.kind === 'capacitor') detail = `Stored ${Math.abs(part.charge || 0).toFixed(2)} V`;
  else if (part.kind === 'fuse') detail = part.blown ? 'Blown (open)' : `Intact · ${(part.fuseRating || 0.35).toFixed(2)} A max`;
  else if (part.kind === 'resistor') detail = `${part.resistance || 30} Ω`;
  else if (part.kind === 'pot') detail = `Wiper ${Math.round((part.wiper ?? 0.5) * 100)}%`;
  else if (part.kind === 'gate') detail = `${part.gateMode || 'NAND'} · OUT ${part.outputHigh ? 'HIGH' : 'LOW'}`;
  else if (part.kind === 'comparator') detail = `OUT ${part.outputHigh ? 'HIGH' : 'LOW'}`;
  else if (part.kind === 'latch') detail = `Stored bit ${part.bit ? 1 : 0}`;
  else if (part.kind === 'clock') detail = `${part.clockHz || 1} Hz · ${part.high ? 'HIGH' : 'LOW'}`;
  else if (part.kind === 'display') detail = `Value ${state.displayValues?.[part.id] ?? 0}`;
  else if (part.kind === 'coil') detail = part.energized ? 'Energized (NO)' : 'Idle (NC)';
  else if (part.kind === 'switch' || part.kind === 'button') detail = part.closed ? 'Closed' : 'Open';
  else if (part.kind === 'photo') detail = `Light ${Math.round(part.lux ?? 100)}%`;
  else if (part.kind === 'servo') detail = `Dial ${Math.round(part.dial ?? 0)}°`;

  return {
    title,
    meta,
    voltage: part.kind === 'display' ? `${Math.abs(amps).toFixed(2)} A` : `${v.toFixed(2)} V`,
    current: `${Math.abs(amps).toFixed(3)} A`,
    power: `${watts.toFixed(2)} W`,
    detail,
    status: Math.abs(amps) > 0.001 || Math.abs(v) > 0.05 ? 'active' : 'idle'
  };
}
