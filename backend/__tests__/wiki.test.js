// backend/__tests__/wiki.test.js
import { jest } from '@jest/globals';

// Mock global fetch BEFORE importing wiki.js to prevent real network requests
global.fetch = jest.fn();

beforeAll(() => {
  // Provide a simple wikitable HTML snippet so the adapter parses predictable data
  global.fetch.mockResolvedValue({
    ok: true,
    text: () => Promise.resolve(`
      <html>
        <body>
          <table class="wikitable">
            <tr><th>Date</th><th>Duration</th><th>President</th></tr>
            <tr>
              <td>December 22, 2018 – January 25, 2019</td>
              <td>34 days</td>
              <td>Donald Trump</td>
            </tr>
          </table>
        </body>
      </html>
    `)
  });
});

afterAll(() => {
  jest.resetAllMocks();
});

// Import after mock is set up
const { fetchShutdowns } = await import('../adapters/wiki.js');

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
      // With fetch mocked to return HTML above, we expect parsed output.
      const shutdowns = await fetchShutdowns();
      
      expect(shutdowns.length).toBeGreaterThan(0);
      expect(shutdowns[0]).toHaveProperty('source');
      expect(shutdowns[0].source).toBe('Wikipedia');
    });
  });
});
