import { getProspects, getRankedProspects, getProspectsByTier, getProspectCount } from '../prospects';

describe('Prospects', () => {
  test('should have at least 100 prospects', () => {
    expect(getProspectCount()).toBeGreaterThanOrEqual(100);
  });

  test('all prospects should have required fields', () => {
    const prospects = getProspects();
    for (const p of prospects) {
      expect(p.id).toBeGreaterThan(0);
      expect(p.name).toBeTruthy();
      expect(p.address.address_line1).toBeTruthy();
      expect(p.address.address_city).toBeTruthy();
      expect(p.address.address_state).toBeTruthy();
      expect(p.address.address_zip).toBeTruthy();
      expect(p.category).toBeTruthy();
      expect(p.tier).toBeTruthy();
      expect(p.score).toBeGreaterThanOrEqual(0);
      expect(p.score).toBeLessThanOrEqual(100);
    }
  });

  test('ranked prospects should be sorted by score descending', () => {
    const ranked = getRankedProspects();
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i - 1].score).toBeGreaterThanOrEqual(ranked[i].score);
    }
  });

  test('should have anchor tier prospects', () => {
    const anchors = getProspectsByTier('anchor');
    expect(anchors.length).toBeGreaterThan(0);
    expect(anchors.every((p) => p.tier === 'anchor')).toBe(true);
  });

  test('should have all four tiers represented', () => {
    const prospects = getProspects();
    const tiers = new Set(prospects.map((p) => p.tier));
    expect(tiers.has('anchor')).toBe(true);
    expect(tiers.has('impact')).toBe(true);
    expect(tiers.has('sponsor')).toBe(true);
    expect(tiers.has('supporter')).toBe(true);
  });

  test('unique IDs', () => {
    const prospects = getProspects();
    const ids = prospects.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
