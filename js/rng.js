// Seedovaný generátor náhodných čísel (mulberry32): stejný seed dá vždy stejný příklad.
export function makeRng(seed) {
  let a = Number(seed) >>> 0;
  return function rng() {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Nový seed: 32bitové nezáporné celé číslo.
export function randomSeed() {
  try {
    const c = globalThis.crypto;
    if (c?.getRandomValues) return c.getRandomValues(new Uint32Array(1))[0];
  } catch { /* spadne na Math.random */ }
  return Math.floor(Math.random() * 4294967296) >>> 0;
}
