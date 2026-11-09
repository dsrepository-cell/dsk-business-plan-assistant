import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { KNOWN_ICON_NAMES } from './icons';

// Every icon name the seed stores in the database must be in the icon map, or the UI shows a fallback circle.
describe('icon map covers the seeded industries', () => {
  const cfg = JSON.parse(readFileSync('kit/04_config/sectors.json', 'utf8')) as {
    sectors: { icon: string; questions: { icon: string }[] }[];
  };
  const used = new Set(cfg.sectors.flatMap((s) => [s.icon, ...s.questions.map((q) => q.icon)]));
  it.each([...used])('%s', (name) => expect(KNOWN_ICON_NAMES).toContain(name));
});
