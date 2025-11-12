import { jest } from '@jest/globals';

// Import the actual module to test sanitization functions
import * as wikiModule from '../adapters/wiki.js';

// Mock fetch globally for tests
global.fetch = jest.fn();

const mockShutdownData = [
  {
    id: 1,
    date: 'December 22, 2018 – January 25, 2019',
    duration: '34 days',
    president: 'Donald Trump',
    congress: '115th/116th',
    description: 'Longest shutdown in US history.',
    affectedAgencies: ['DHS', 'DOJ'],
    source: 'Wikipedia'
  },
  {
    id: 2,
    date: 'October 1–17, 2013',
    duration: '16 days',
    president: 'Barack Obama',
    congress: '113th',
    description: 'Dispute over Affordable Care Act funding.',
    affectedAgencies: ['National Parks', 'EPA'],
    source: 'Wikipedia'
  }
];

describe('Wiki Adapter', () => {
  beforeEach(() => {
    // Mock successful fetch response with clean HTML
    global.fetch.mockResolvedValue({
      ok: true,
      headers: {
        get: () => 'text/html'
      },
      text: async () => `
        <html>
          <table class="wikitable">
            <tr>
              <th>Date</th>
              <th>Duration</th>
              <th>President</th>
            </tr>
            <tr>
              <td>December 22, 2018 – January 25, 2019</td>
              <td>34 days</td>
              <td>Donald Trump</td>
            </tr>
          </table>
        </html>
      `
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('fetchShutdowns returns an array', async () => {
    const shutdowns = await wikiModule.fetchShutdowns();
    expect(Array.isArray(shutdowns)).toBe(true);
    expect(shutdowns.length).toBeGreaterThan(0);
  });

  test('shutdown objects have required fields', async () => {
    const shutdowns = await wikiModule.fetchShutdowns();
    const shutdown = shutdowns[0];
    
    expect(shutdown).toHaveProperty('id');
    expect(shutdown).toHaveProperty('date');
    expect(shutdown).toHaveProperty('duration');
    expect(shutdown).toHaveProperty('president');
    expect(shutdown).toHaveProperty('source');
  });

  test('data is sanitized and safe', async () => {
    const shutdowns = await wikiModule.fetchShutdowns();
    
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

  test('sanitization removes script tags from malicious HTML', async () => {
    // Mock fetch with malicious HTML
    global.fetch.mockResolvedValue({
      ok: true,
      headers: {
        get: () => 'text/html'
      },
      text: async () => `
        <html>
          <table class="wikitable">
            <tr>
              <th>Date</th>
              <th>Duration</th>
              <th>President</th>
            </tr>
            <tr>
              <td>December 22, 2018<script>alert('xss')</script></td>
              <td>34 days</td>
              <td>Trump<img src=x onerror="alert('xss')"></td>
              <td></td>
              <td>Description with <script>malicious()</script> code</td>
            </tr>
          </table>
        </html>
      `
    });

    const shutdowns = await wikiModule.fetchShutdowns();
    
    // Verify script tags are removed
    for (const shutdown of shutdowns) {
      expect(shutdown.date).not.toContain('<script');
      expect(shutdown.date).not.toContain('</script>');
      expect(shutdown.president).not.toContain('onerror');
      expect(shutdown.description || '').not.toContain('<script');
      expect(shutdown.description || '').not.toContain('</script>');
    }
  });

  test('returns limited number of rows', async () => {
    const shutdowns = await wikiModule.fetchShutdowns();
    expect(shutdowns.length).toBeLessThanOrEqual(100);
  });

  test('date fields are validated', async () => {
    const shutdowns = await wikiModule.fetchShutdowns();
    
    for (const shutdown of shutdowns) {
      // Date should be a non-empty string
      expect(typeof shutdown.date).toBe('string');
      expect(shutdown.date.length).toBeGreaterThan(0);
    }
  });

  test('returns fallback data when fetch fails', async () => {
    // Mock fetch failure
    global.fetch.mockRejectedValue(new Error('Network error'));

    const shutdowns = await wikiModule.fetchShutdowns();
    
    // Should return sample data as fallback
    expect(Array.isArray(shutdowns)).toBe(true);
    expect(shutdowns.length).toBeGreaterThan(0);
    expect(shutdowns[0]).toHaveProperty('source', 'Wikipedia');
  });

  test('validates content-type header', async () => {
    // Mock fetch with wrong content-type
    global.fetch.mockResolvedValue({
      ok: true,
      headers: {
        get: () => 'application/json'
      },
      text: async () => '{}'
    });

    const shutdowns = await wikiModule.fetchShutdowns();
    
    // Should return fallback data when content-type is wrong
    expect(Array.isArray(shutdowns)).toBe(true);
    expect(shutdowns.length).toBeGreaterThan(0);
  });
});
