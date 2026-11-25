const HISTORY_PART_FIELDS = [
  'id',
  'kind',
  'x',
  'z',
  'layer',
  'rotation',
  'closed',
  'throwB',
  'resistance',
  'wiper',
  'fuseRating',
  'blown',
  'reversed',
  'voltage',
  'capacitance',
  'color',
  'role',
  'gateMode',
  'clockHz',
  'bit',
  'lux',
  'dial'
];

function cloneBoardState(snap) {
  const rawParts = Array.isArray(snap?.parts) ? snap.parts : [];
  const rawWires = Array.isArray(snap?.wires) ? snap.wires : [];
  const parts = rawParts.map(p => {
    const clean = {};
    for (const key of HISTORY_PART_FIELDS) {
      if (p[key] !== undefined) clean[key] = p[key];
    }
    return clean;
  });
  const wires = rawWires.map(w => ({ a: w.a, b: w.b }));
  return JSON.parse(JSON.stringify({ parts, wires }));
}

export function boardHistoryKey(snap) {
  return JSON.stringify(cloneBoardState(snap));
}

export function createBoardHistory(maxEntries = 60) {
  const limit = Math.max(2, Math.round(Number(maxEntries) || 60));
  let stack = [];
  let index = -1;
  let lastKey = '';
  let lastTag = null;
  let lastTime = 0;

  return {
    reset(snap) {
      const copy = cloneBoardState(snap);
      stack = [copy];
      index = 0;
      lastKey = JSON.stringify(copy);
      lastTag = null;
      lastTime = 0;
    },
    record(snap, coalesceTag = null, now = Date.now()) {
      const copy = cloneBoardState(snap);
      const key = JSON.stringify(copy);
      if (index >= 0 && key === lastKey) return false;
      if (coalesceTag && coalesceTag === lastTag && now - lastTime < 750 && index > 0) {
        stack[index] = copy;
        lastKey = key;
        lastTime = now;
        return true;
      }
      if (index < stack.length - 1) stack.length = index + 1;
      stack.push(copy);
      while (stack.length > limit) stack.shift();
      index = stack.length - 1;
      lastKey = key;
      lastTag = coalesceTag || null;
      lastTime = now;
      return true;
    },
    undo() {
      if (index <= 0) return null;
      index -= 1;
      const copy = cloneBoardState(stack[index]);
      lastKey = JSON.stringify(copy);
      lastTag = null;
      lastTime = 0;
      return copy;
    },
    redo() {
      if (index < 0 || index >= stack.length - 1) return null;
      index += 1;
      const copy = cloneBoardState(stack[index]);
      lastKey = JSON.stringify(copy);
      lastTag = null;
      lastTime = 0;
      return copy;
    },
    canUndo() {
      return index > 0;
    },
    canRedo() {
      return index >= 0 && index < stack.length - 1;
    },
    size() {
      return stack.length;
    }
  };
}
