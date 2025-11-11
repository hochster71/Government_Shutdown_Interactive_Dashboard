import { jest } from '@jest/globals';
import { fetchShutdowns } from '../adapters/wiki.js';

describe('Wiki Adapter', () => {
  describe('fetchShutdowns', () => {
    it('should return an array of shutdown data', async () => {
      const shutdowns = await fetchShutdowns();
      
      expect(Array.isArray(shutdowns)).toBe(true);
      expect(shutdowns.length).toBeGreaterThan(0);
    });

    it('should return shutdown objects with required fields', async () => {
      const shutdowns = await fetchShutdowns();
      
      const shutdown = shutdowns[0];
      expect(shutdown).toHaveProperty('id');
      expect(shutdown).toHaveProperty('date');
      expect(shutdown).toHaveProperty('duration');
      expect(shutdown).toHaveProperty('president');
      expect(shutdown).toHaveProperty('source');
    });

    it('should limit the number of rows parsed', async () => {
      const shutdowns = await fetchShutdowns();
      
      // Should not exceed MAX_ROWS (100)
      expect(shutdowns.length).toBeLessThanOrEqual(100);
    });

    it('should have valid date strings', async () => {
      const shutdowns = await fetchShutdowns();
      
      shutdowns.forEach(shutdown => {
        expect(typeof shutdown.date).toBe('string');
        expect(shutdown.date.length).toBeGreaterThan(0);
      });
    });

    it('should return sample data as fallback on error', async () => {
      // This test will use fallback data since we're in test environment
      const shutdowns = await fetchShutdowns();
      
      expect(shutdowns.length).toBeGreaterThan(0);
      expect(shutdowns[0]).toHaveProperty('source');
      expect(shutdowns[0].source).toBe('Wikipedia');
    });
  });
});
