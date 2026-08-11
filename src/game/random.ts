export interface Random {
  nextInt(upperExclusive: number): number;
}

export class SeededRandom implements Random {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  nextInt(upperExclusive: number): number {
    if (!Number.isInteger(upperExclusive) || upperExclusive <= 0) {
      throw new Error('The upper bound must be a positive integer.');
    }

    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let value = this.state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) % upperExclusive;
  }
}
