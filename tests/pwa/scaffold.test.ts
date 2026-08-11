import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('PWA scaffold', () => {
  it('declares the game canvas and portrait viewport metadata', () => {
    const html = readFileSync('index.html', 'utf8');

    expect(html).toContain('id="game"');
    expect(html).toContain('viewport-fit=cover');
  });

  it('uses relative page assets for the GitHub Pages repository subpath', () => {
    const html = readFileSync('index.html', 'utf8');
    const vite = readFileSync('vite.config.ts', 'utf8');

    expect(vite).toContain("base: '/CrystalFruitMatch/'");
    expect(html).toContain('href="./manifest.webmanifest"');
    expect(html).toContain('src="./src/main.ts"');
  });
});
