/**
 * Seedable Pseudo-Random Number Generator (Mulberry32)
 * Garantiert deterministische und reproduzierbare Simulationsergebnisse für Tests und "Was-wäre-wenn"-Szenarien.
 */
export class SeededRandom {
  private state: number;

  constructor(seed: number = 42) {
    this.state = seed >>> 0;
    if (this.state === 0) {
      this.state = 1;
    }
  }

  getState(): number {
    return this.state >>> 0;
  }

  static fromState(state: number): SeededRandom {
    const rng = new SeededRandom(1);
    rng.state = state >>> 0;
    if (rng.state === 0) {
      rng.state = 1;
    }
    return rng;
  }

  /**
   * Gibt eine Pseudozufallszahl zwischen 0 (inklusive) und 1 (exklusive) zurück.
   */
  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Gibt eine ganzzahlige Zufallszahl zwischen min (inklusive) und max (inklusive) zurück.
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Gibt ein zufälliges Element aus einem Array zurück.
   */
  choice<T>(items: T[]): T {
    if (items.length === 0) {
      throw new Error('Cannot pick from empty array');
    }
    const idx = this.nextInt(0, items.length - 1);
    return items[idx];
  }

  /**
   * Testet eine Wahrscheinlichkeit (0.0 bis 1.0). Gibt true zurück, wenn das Ereignis eintritt.
   */
  chance(probability: number): boolean {
    return this.next() < probability;
  }

  /**
   * Normalverteilter Zufallswert (Box-Muller Transform) für realistische Marktschwankungen
   */
  nextGaussian(mean: number = 0, stdev: number = 1): number {
    let u = 0;
    let v = 0;
    while (u === 0) u = this.next(); // u != 0
    while (v === 0) v = this.next();
    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return mean + z * stdev;
  }
}
