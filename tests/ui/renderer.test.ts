import { describe, expect, it } from 'vitest';
import { startLevel, type MatchState } from '../../src/game/match.js';
import { CanvasRenderer } from '../../src/ui/renderer.js';

function renderSpy(backing = { width: 360, height: 640 }, css = backing) {
  const text: string[] = [];
  const labels: { value: string; x: number; y: number }[] = [];
  const transforms: number[][] = [];
  let rectangles = 0;
  const context = {
    clearRect() {}, fillRect() { rectangles += 1; }, beginPath() {}, arc() {}, fill() {}, stroke() {},
    fillText(value: string, x: number, y: number) { text.push(value); labels.push({ value, x, y }); },
    setTransform(...values: number[]) { transforms.push(values); }, save() {}, restore() {}, translate() {}, rotate() {},
    set fillStyle(_value: string) {}, set strokeStyle(_value: string) {}, set lineWidth(_value: number) {},
    set font(_value: string) {}, set textAlign(_value: CanvasTextAlign) {}, set textBaseline(_value: CanvasTextBaseline) {},
  } as unknown as CanvasRenderingContext2D;
  return {
    canvas: {
      width: backing.width,
      height: backing.height,
      getContext: () => context,
      getBoundingClientRect: () => ({ left: 0, top: 0, width: css.width, height: css.height }),
    } as unknown as HTMLCanvasElement,
    text,
    labels,
    transforms,
    get rectangles() { return rectangles; },
  };
}

describe('CanvasRenderer', () => {
  it('draws HUD labels and all 64 tiles without mutating MatchState', () => {
    const state = startLevel(2, 7);
    const fixture = renderSpy();
    const snapshot = JSON.stringify(state);

    new CanvasRenderer(fixture.canvas).render(state);

    expect(fixture.text).toEqual(expect.arrayContaining(['LEVEL 2', 'MOVES 22', 'SCORE 0', 'ICE 0/12']));
    expect(fixture.rectangles).toBeGreaterThanOrEqual(64);
    expect(JSON.stringify(state)).toBe(snapshot);
  });

  it('renders ice, each booster, and a status effect when present', () => {
    const base = startLevel(1, 3);
    const state: MatchState = { ...base, status: 'won', board: base.board.map((row, rowIndex) => row.map((tile, column) =>
      rowIndex === 0 && column === 0 ? { ...tile, ice: true, booster: 'rowRocket' } :
      rowIndex === 0 && column === 1 ? { ...tile, booster: 'columnRocket' } :
      rowIndex === 0 && column === 2 ? { ...tile, booster: 'bomb' } : tile,
    )) };
    const fixture = renderSpy();

    new CanvasRenderer(fixture.canvas).render(state);

    expect(fixture.text).toEqual(expect.arrayContaining(['❄', '➜', '⇩', '✦', 'LEVEL COMPLETE!']));
  });

  it('renders both exact level 4 goals at the same time', () => {
    const fixture = renderSpy();

    new CanvasRenderer(fixture.canvas).render(startLevel(4, 9));

    expect(fixture.text).toEqual(expect.arrayContaining(['ICE 0/16', 'SCORE 0/1500']));
  });

  it('draws in CSS pixels after scaling a Retina backing store', () => {
    const fixture = renderSpy({ width: 1080, height: 1920 }, { width: 360, height: 640 });

    new CanvasRenderer(fixture.canvas).render(startLevel(1, 9));

    expect(fixture.transforms[0]).toEqual([3, 0, 0, 3, 0, 0]);
    expect(fixture.labels.find(({ value }) => value === 'LEVEL 1')).toEqual({ value: 'LEVEL 1', x: 180, y: 38 });
  });
});
