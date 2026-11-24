import * as THREE from 'three';

function makeScorchTexture() {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  const g = ctx.createRadialGradient(32, 32, 4, 32, 32, 30);
  g.addColorStop(0, 'rgba(22, 16, 12, 0.88)');
  g.addColorStop(0.42, 'rgba(42, 30, 21, 0.56)');
  g.addColorStop(0.76, 'rgba(58, 42, 30, 0.18)');
  g.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function reducedMotion() {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/** Play synthesized Web Audio short-circuit crackle (smoke) or boom (explosive). */
export function playShortSound(explosive = false) {
  try {
    const AudioCtx = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const duration = explosive ? 0.72 : 0.34;
    const len = Math.floor(ctx.sampleRate * duration);
    const noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const ch = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;

    if (!explosive) {
      const zap = ctx.createOscillator();
      const zapGain = ctx.createGain();
      zap.type = 'sawtooth';
      zap.frequency.setValueAtTime(340, now);
      zap.frequency.exponentialRampToValueAtTime(85, now + 0.13);
      zapGain.gain.setValueAtTime(0.06, now);
      zapGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
      zap.connect(zapGain).connect(ctx.destination);
      zap.start(now);
      zap.stop(now + 0.16);

      const hiss = ctx.createBufferSource();
      hiss.buffer = noiseBuf;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1850, now);
      filter.Q.value = 1.6;
      const hissGain = ctx.createGain();
      hissGain.gain.setValueAtTime(0.085, now);
      hissGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.33);
      hiss.connect(filter).connect(hissGain).connect(ctx.destination);
      hiss.start(now);
      hiss.stop(now + 0.34);

      setTimeout(() => { try { ctx.close(); } catch { } }, 430);
      return;
    }

    const boom = ctx.createOscillator();
    const boomGain = ctx.createGain();
    boom.type = 'sine';
    boom.frequency.setValueAtTime(150, now);
    boom.frequency.exponentialRampToValueAtTime(28, now + 0.42);
    boomGain.gain.setValueAtTime(0.24, now);
    boomGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.46);
    boom.connect(boomGain).connect(ctx.destination);
    boom.start(now);
    boom.stop(now + 0.48);

    const blast = ctx.createBufferSource();
    blast.buffer = noiseBuf;
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(1150, now);
    lowpass.frequency.exponentialRampToValueAtTime(180, now + 0.65);
    const blastGain = ctx.createGain();
    blastGain.gain.setValueAtTime(0.18, now);
    blastGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.68);
    blast.connect(lowpass).connect(blastGain).connect(ctx.destination);
    blast.start(now);
    blast.stop(now + 0.7);

    const crack = ctx.createBufferSource();
    crack.buffer = noiseBuf;
    const crackFilter = ctx.createBiquadFilter();
    crackFilter.type = 'bandpass';
    crackFilter.frequency.setValueAtTime(2400, now);
    crackFilter.Q.value = 1.1;
    const crackGain = ctx.createGain();
    crackGain.gain.setValueAtTime(0.14, now);
    crackGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    crack.connect(crackFilter).connect(crackGain).connect(ctx.destination);
    crack.start(now);
    crack.stop(now + 0.17);

    setTimeout(() => { try { ctx.close(); } catch { } }, 820);
  } catch { }
}

/** Manages 3D short-circuit smoke emitters, charred wires, and blast effects in Three.js. */
export function createShortEffects(scene, disposeObject) {
  const fxGroup = new THREE.Group();
  scene.add(fxGroup);

  const flashLight = new THREE.PointLight('#ff9a3c', 0, 22, 1.8);
  fxGroup.add(flashLight);

  const sparkGeo = new THREE.SphereGeometry(0.055, 6, 4);
  const debrisGeo = new THREE.BoxGeometry(0.14, 0.08, 0.12);
  const smokeGeo = new THREE.SphereGeometry(0.24, 10, 8);
  const ringGeo = new THREE.RingGeometry(0.32, 0.56, 32);
  const scorchGeo = new THREE.PlaneGeometry(2.6, 2.6);
  const scorchTexture = makeScorchTexture();

  const debrisColors = [0x5d402b, 0xb58b49, 0xe5ddc9, 0x3b352f];
  const sparkColors = [0xffdf7a, 0xff9a36, 0xff6229, 0xfff3c4];
  const smokeColors = [0x6e665e, 0x554d45, 0x827970];
  const fireCoreColor = new THREE.Color('#fff3be');
  const fireMidColor = new THREE.Color('#ff7e1f');
  const fireEndColor = new THREE.Color('#3b342e');

  const particles = [];
  const puffs = [];
  const rings = [];
  const scorchMarks = [];
  const emitters = [];
  const flyingParts = [];
  const shockHops = [];
  const hotWires = new Map();

  let flashState = { age: 0, duration: 0, peak: 0 };
  let shakeState = { age: 0, duration: 0, intensity: 0 };

  function removeFxMesh(mesh) {
    fxGroup.remove(mesh);
    mesh.material?.dispose();
  }

  function spawnSpark(origin, speedMin, speedMax, scale = 1, debris = false) {
    const colorList = debris ? debrisColors : sparkColors;
    const color = colorList[Math.floor(Math.random() * colorList.length)];
    const mat = debris
      ? new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: color === 0xb58b49 ? 0.55 : 0.1 })
      : new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 });
    const mesh = new THREE.Mesh(debris ? debrisGeo : sparkGeo, mat);
    mesh.position.copy(origin);
    mesh.scale.setScalar(scale);
    fxGroup.add(mesh);
    const angle = Math.random() * Math.PI * 2;
    const horiz = speedMin + Math.random() * (speedMax - speedMin);
    particles.push({
      mesh,
      vx: Math.cos(angle) * horiz,
      vy: 2.2 + Math.random() * (debris ? 7.2 : 4.5),
      vz: Math.sin(angle) * horiz,
      rx: (Math.random() - 0.5) * 14,
      ry: (Math.random() - 0.5) * 14,
      rz: (Math.random() - 0.5) * 14,
      age: 0,
      life: debris ? 0.65 + Math.random() * 0.45 : 0.32 + Math.random() * 0.28,
      baseScale: scale
    });
  }

  function spawnPuff(origin, {
    fireball = false,
    startScale = 0.45,
    endScale = 1.65,
    startOpacity = 0.42,
    life = 1.15,
    rise = 1.45
  } = {}) {
    if (puffs.length >= 36) {
      const oldest = puffs.shift();
      removeFxMesh(oldest.mesh);
    }
    const color = fireball
      ? fireCoreColor.getHex()
      : smokeColors[Math.floor(Math.random() * smokeColors.length)];
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: startOpacity,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(smokeGeo, mat);
    mesh.position.set(
      origin.x + (Math.random() - 0.5) * 0.26,
      Math.max(0.22, origin.y + Math.random() * 0.18),
      origin.z + (Math.random() - 0.5) * 0.26
    );
    mesh.scale.setScalar(startScale);
    fxGroup.add(mesh);
    puffs.push({
      mesh,
      vx: (Math.random() - 0.5) * (fireball ? 2.4 : 0.48),
      vy: rise + Math.random() * 0.65,
      vz: (Math.random() - 0.5) * (fireball ? 2.4 : 0.48),
      age: 0,
      life,
      startScale,
      endScale,
      startOpacity,
      fireball
    });
  }

  function charWires(wireMeshes) {
    for (const wire of wireMeshes) {
      if (!wire?.material) continue;
      if (wire.userData.baseColor === undefined) {
        wire.userData.baseColor = wire.material.color.getHex();
      }
      wire.material.color.setHex(0x2c241e);
      wire.material.emissive.setHex(0xff4f1a);
      wire.material.emissiveIntensity = 1.6;
      hotWires.set(wire, 1.2);
    }
  }

  function restoreWire(wire) {
    if (!wire?.material) return;
    if (wire.userData.baseColor !== undefined) {
      wire.material.color.setHex(wire.userData.baseColor);
      delete wire.userData.baseColor;
    }
    wire.material.emissive.setHex(0);
    wire.material.emissiveIntensity = 0;
  }

  function stopSmoke(allWireMeshes = []) {
    emitters.length = 0;
    for (const wire of allWireMeshes) restoreWire(wire);
    for (const wire of hotWires.keys()) restoreWire(wire);
    hotWires.clear();
  }

  function syncSmoke({ points = [], wireMeshes = [] } = {}) {
    if (points.length && emitters.length) {
      const count = Math.min(4, points.length);
      for (let i = 0; i < count; i++) {
        if (emitters[i]) {
          emitters[i].x = points[i].x;
          emitters[i].y = points[i].y;
          emitters[i].z = points[i].z;
        }
      }
    }
    for (const wire of wireMeshes) {
      if (!wire?.material) continue;
      if (wire.userData.baseColor === undefined) {
        wire.userData.baseColor = wire.material.color.getHex();
      }
      wire.material.color.setHex(0x2c241e);
      if (!hotWires.has(wire)) {
        wire.material.emissive.setHex(0xff4f1a);
        wire.material.emissiveIntensity = 0.18;
      }
    }
  }

  function triggerSmoke({ center, points = [], wireMeshes = [] } = {}) {
    const focus = center ?? points[0] ?? new THREE.Vector3(0, 0.4, 0);
    flashLight.position.set(focus.x, Math.max(0.75, focus.y + 0.5), focus.z);
    flashLight.intensity = 14;
    flashState = { age: 0, duration: 0.28, peak: 14 };

    const sources = points.length ? points : [focus];
    for (let i = 0; i < 18; i++) {
      spawnSpark(sources[i % sources.length], 1.4, 4.2, 0.85, false);
    }
    for (const src of sources.slice(0, 4)) {
      spawnPuff(src, { startScale: 0.38, endScale: 1.5, startOpacity: 0.45, life: 1.1, rise: 1.45 });
    }

    charWires(wireMeshes);

    emitters.length = 0;
    for (const src of sources.slice(0, 4)) {
      emitters.push({ x: src.x, y: src.y, z: src.z, remaining: 12, cooldown: 0.16 });
    }
  }

  function triggerExplosion({ center, points = [], blownMeshes = [], shockParts = [] } = {}) {
    stopSmoke();
    const focus = center ?? points[0] ?? new THREE.Vector3(0, 0.4, 0);
    flashLight.position.set(focus.x, Math.max(0.9, focus.y + 0.65), focus.z);
    flashLight.intensity = 45;
    flashState = { age: 0, duration: 0.55, peak: 45 };

    if (!reducedMotion()) {
      shakeState = { age: 0, duration: 0.38, intensity: 0.45 };
    } else {
      shakeState = { age: 0, duration: 0, intensity: 0 };
    }

    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffc66e,
      transparent: true,
      opacity: 0.78,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(focus.x, 0.16, focus.z);
    fxGroup.add(ring);
    rings.push({ mesh: ring, age: 0, life: 0.45, maxScale: 7.5 });

    const scorchMat = scorchTexture
      ? new THREE.MeshBasicMaterial({ map: scorchTexture, transparent: true, opacity: 0.85, depthWrite: false })
      : new THREE.MeshBasicMaterial({ color: 0x1b140f, transparent: true, opacity: 0.5, depthWrite: false });
    const scorch = new THREE.Mesh(scorchGeo, scorchMat);
    scorch.rotation.x = -Math.PI / 2;
    scorch.rotation.z = Math.random() * Math.PI * 2;
    scorch.position.set(focus.x, 0.148, focus.z);
    scorch.scale.setScalar(0.85 + Math.min(0.65, blownMeshes.length * 0.12));
    fxGroup.add(scorch);
    scorchMarks.push(scorch);
    while (scorchMarks.length > 8) {
      removeFxMesh(scorchMarks.shift());
    }

    const sources = points.length ? points : [focus];
    for (let i = 0; i < 7; i++) {
      spawnPuff(sources[i % sources.length], {
        fireball: true,
        startScale: 0.72,
        endScale: 3.1,
        startOpacity: 0.85,
        life: 0.95 + Math.random() * 0.35,
        rise: 2.3
      });
    }
    for (let i = 0; i < 28; i++) {
      spawnSpark(sources[i % sources.length], 2.5, 8.2, 1.15, false);
    }
    for (let i = 0; i < 14; i++) {
      spawnSpark(sources[i % sources.length], 2.0, 6.8, 1.0, true);
    }

    for (const item of blownMeshes) {
      if (!item?.mesh) continue;
      const origin = item.origin ?? item.mesh.position;
      item.mesh.position.set(origin.x, origin.y ?? 0.14, origin.z);
      fxGroup.add(item.mesh);
      const dx = origin.x - focus.x;
      const dz = origin.z - focus.z;
      const len = Math.hypot(dx, dz);
      const nx = len > 0.05 ? dx / len : Math.cos(Math.random() * Math.PI * 2);
      const nz = len > 0.05 ? dz / len : Math.sin(Math.random() * Math.PI * 2);
      const speed = 3.2 + Math.random() * 3.8;
      flyingParts.push({
        mesh: item.mesh,
        vx: nx * speed + (Math.random() - 0.5) * 1.4,
        vy: 6.5 + Math.random() * 4.0,
        vz: nz * speed + (Math.random() - 0.5) * 1.4,
        rx: (Math.random() - 0.5) * 9,
        ry: (Math.random() - 0.5) * 9,
        rz: (Math.random() - 0.5) * 9,
        age: 0,
        life: 1.65,
        puffTimer: 0
      });
    }

    if (!reducedMotion()) {
      for (const item of shockParts) {
        if (!item?.mesh) continue;
        const dist = item.distance ?? 2;
        const atten = Math.max(0.18, 1 - dist / 8.5);
        shockHops.push({
          mesh: item.mesh,
          age: 0,
          duration: 0.42,
          delay: Math.min(0.12, dist * 0.018),
          amp: 0.34 * atten,
          tiltX: (Math.random() - 0.5) * 0.24 * atten,
          tiltZ: (Math.random() - 0.5) * 0.24 * atten
        });
      }
    }
  }

  function update(elapsed) {
    const dt = Math.min(0.1, Math.max(0, elapsed || 0));

    if (flashState.duration > 0) {
      flashState.age += dt;
      const t = Math.min(1, flashState.age / flashState.duration);
      flashLight.intensity = flashState.peak * Math.pow(1 - t, 2);
      if (t >= 1) {
        flashLight.intensity = 0;
        flashState.duration = 0;
      }
    }

    if (shakeState.duration > 0) {
      shakeState.age += dt;
      if (shakeState.age >= shakeState.duration) shakeState.duration = 0;
    }

    for (const [wire, rem] of hotWires) {
      const next = rem - dt;
      if (!wire.parent || next <= 0) {
        if (wire.material && wire.userData.baseColor !== undefined) {
          wire.material.emissive.setHex(0xff4f1a);
          wire.material.emissiveIntensity = 0.18;
        }
        hotWires.delete(wire);
      } else {
        hotWires.set(wire, next);
        if (wire.material) wire.material.emissiveIntensity = 0.18 + (1.6 - 0.18) * (next / 1.2);
      }
    }

    for (let i = emitters.length - 1; i >= 0; i--) {
      const em = emitters[i];
      em.remaining -= dt;
      if (em.remaining <= 0) {
        emitters.splice(i, 1);
        continue;
      }
      em.cooldown -= dt;
      if (em.cooldown <= 0) {
        em.cooldown = 0.2 + Math.random() * 0.06;
        spawnPuff(em, { startScale: 0.34, endScale: 1.55, startOpacity: 0.38, life: 1.25, rise: 1.35 });
      }
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const pt = particles[i];
      pt.age += dt;
      if (pt.age >= pt.life) {
        removeFxMesh(pt.mesh);
        particles.splice(i, 1);
        continue;
      }
      pt.vy -= 18 * dt;
      pt.mesh.position.x += pt.vx * dt;
      pt.mesh.position.y += pt.vy * dt;
      pt.mesh.position.z += pt.vz * dt;
      if (pt.mesh.position.y < 0.15) {
        pt.mesh.position.y = 0.15;
        pt.vy = Math.abs(pt.vy) * 0.36;
        pt.vx *= 0.72;
        pt.vz *= 0.72;
      }
      pt.mesh.rotation.x += pt.rx * dt;
      pt.mesh.rotation.y += pt.ry * dt;
      pt.mesh.rotation.z += pt.rz * dt;
      const t = pt.age / pt.life;
      pt.mesh.scale.setScalar(pt.baseScale * Math.max(0.15, 1 - t * 0.75));
      if (pt.mesh.material.transparent) pt.mesh.material.opacity = 1 - t;
    }

    for (let i = puffs.length - 1; i >= 0; i--) {
      const pf = puffs[i];
      pf.age += dt;
      if (pf.age >= pf.life) {
        removeFxMesh(pf.mesh);
        puffs.splice(i, 1);
        continue;
      }
      const t = pf.age / pf.life;
      pf.mesh.position.x += pf.vx * dt;
      pf.mesh.position.y += pf.vy * dt;
      pf.mesh.position.z += pf.vz * dt;
      pf.vx *= Math.pow(0.2, dt);
      pf.vz *= Math.pow(0.2, dt);
      pf.mesh.scale.setScalar(pf.startScale + (pf.endScale - pf.startScale) * t);
      pf.mesh.material.opacity = pf.startOpacity * Math.pow(1 - t, 1.35);
      if (pf.fireball) {
        if (t < 0.28) pf.mesh.material.color.lerpColors(fireCoreColor, fireMidColor, t / 0.28);
        else pf.mesh.material.color.lerpColors(fireMidColor, fireEndColor, (t - 0.28) / 0.72);
      }
    }

    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i];
      r.age += dt;
      if (r.age >= r.life) {
        removeFxMesh(r.mesh);
        rings.splice(i, 1);
        continue;
      }
      const t = r.age / r.life;
      r.mesh.scale.setScalar(1 + r.maxScale * (1 - Math.pow(1 - t, 2)));
      r.mesh.material.opacity = 0.78 * (1 - t);
    }

    for (let i = flyingParts.length - 1; i >= 0; i--) {
      const fp = flyingParts[i];
      fp.age += dt;
      if (fp.age >= fp.life) {
        disposeObject(fp.mesh);
        flyingParts.splice(i, 1);
        continue;
      }
      fp.vy -= 20 * dt;
      fp.mesh.position.x += fp.vx * dt;
      fp.mesh.position.y += fp.vy * dt;
      fp.mesh.position.z += fp.vz * dt;
      if (fp.mesh.position.y < 0.14) {
        fp.mesh.position.y = 0.14;
        fp.vy = Math.abs(fp.vy) * 0.3;
        fp.vx *= 0.68;
        fp.vz *= 0.68;
      }
      fp.mesh.rotation.x += fp.rx * dt;
      fp.mesh.rotation.y += fp.ry * dt;
      fp.mesh.rotation.z += fp.rz * dt;
      fp.puffTimer += dt;
      if (fp.puffTimer >= 0.09 && fp.age < fp.life * 0.72) {
        fp.puffTimer = 0;
        spawnPuff(fp.mesh.position, { startScale: 0.28, endScale: 0.95, startOpacity: 0.34, life: 0.75, rise: 0.9 });
      }
      if (fp.age > fp.life * 0.75) {
        const shrink = Math.max(0.01, (fp.life - fp.age) / (fp.life * 0.25));
        fp.mesh.scale.setScalar(shrink);
      }
    }

    for (let i = shockHops.length - 1; i >= 0; i--) {
      const hp = shockHops[i];
      hp.age += dt;
      if (hp.age < hp.delay) continue;
      const localAge = hp.age - hp.delay;
      if (!hp.mesh.parent || localAge >= hp.duration) {
        hp.mesh.position.y = 0.14;
        hp.mesh.rotation.x = 0;
        hp.mesh.rotation.z = 0;
        shockHops.splice(i, 1);
        continue;
      }
      const t = localAge / hp.duration;
      const arc = Math.sin(t * Math.PI);
      hp.mesh.position.y = 0.14 + hp.amp * arc;
      hp.mesh.rotation.x = hp.tiltX * arc;
      hp.mesh.rotation.z = hp.tiltZ * arc;
    }
  }

  function getCameraOffset(outVec) {
    if (shakeState.duration <= 0 || reducedMotion()) return false;
    const t = 1 - Math.min(1, shakeState.age / shakeState.duration);
    const amp = shakeState.intensity * t * t;
    outVec.set(
      (Math.random() * 2 - 1) * amp,
      (Math.random() * 2 - 1) * amp * 0.7,
      (Math.random() * 2 - 1) * amp
    );
    return true;
  }

  function clear() {
    emitters.length = 0;
    hotWires.clear();
    flashLight.intensity = 0;
    flashState = { age: 0, duration: 0, peak: 0 };
    shakeState = { age: 0, duration: 0, intensity: 0 };
    for (const pt of particles) removeFxMesh(pt.mesh);
    particles.length = 0;
    for (const pf of puffs) removeFxMesh(pf.mesh);
    puffs.length = 0;
    for (const r of rings) removeFxMesh(r.mesh);
    rings.length = 0;
    for (const s of scorchMarks) removeFxMesh(s);
    scorchMarks.length = 0;
    for (const fp of flyingParts) disposeObject(fp.mesh);
    flyingParts.length = 0;
    for (const hp of shockHops) {
      hp.mesh.position.y = 0.14;
      hp.mesh.rotation.x = 0;
      hp.mesh.rotation.z = 0;
    }
    shockHops.length = 0;
  }

  function dispose() {
    clear();
    scene.remove(fxGroup);
    sparkGeo.dispose();
    debrisGeo.dispose();
    smokeGeo.dispose();
    ringGeo.dispose();
    scorchGeo.dispose();
    scorchTexture?.dispose();
  }

  return {
    triggerSmoke,
    syncSmoke,
    stopSmoke,
    triggerExplosion,
    update,
    getCameraOffset,
    clear,
    dispose
  };
}
