import { fetchShutdowns } from '../adapters/wiki.js';

describe('Wiki Adapter', () => {
  test('fetchShutdowns returns an array', async () => {
    const shutdowns = await fetchShutdowns();
    expect(Array.isArray(shutdowns)).toBe(true);
    expect(shutdowns.length).toBeGreaterThan(0);
  });

  test('shutdown objects have required fields', async () => {
    const shutdowns = await fetchShutdowns();
    const shutdown = shutdowns[0];
    
    expect(shutdown).toHaveProperty('id');
    expect(shutdown).toHaveProperty('date');
    expect(shutdown).toHaveProperty('duration');
    expect(shutdown).toHaveProperty('president');
    expect(shutdown).toHaveProperty('source');
  });

  test('data is sanitized and safe', async () => {
    const shutdowns = await fetchShutdowns();
    
    for (const shutdown of shutdowns) {
      // Check for script tags
      expect(shutdown.date).not.toMatch(/<script/i);
      expect(shutdown.description || '').not.toMatch(/<script/i);
      
      // Check for event handlers
      expect(shutdown.date).not.toMatch(/on\w+\s*=/i);
      expect(shutdown.description || '').not.toMatch(/on\w+\s*=/i);
      
      // Check for reasonable length
      expect(shutdown.date.length).toBeLessThan(500);
      if (shutdown.description) {
        expect(shutdown.description.length).toBeLessThan(5000);
      }
    }
  });

  test('returns limited number of rows', async () => {
    const shutdowns = await fetchShutdowns();
    expect(shutdowns.length).toBeLessThanOrEqual(100);
  });

  test('date fields are validated', async () => {
    const shutdowns = await fetchShutdowns();
    
    for (const shutdown of shutdowns) {
      // Date should be a non-empty string
      expect(typeof shutdown.date).toBe('string');
      expect(shutdown.date.length).toBeGreaterThan(0);
    }
  });
});
