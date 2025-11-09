import { jest } from '@jest/globals';

// Mock the adapters BEFORE importing the scheduler
jest.unstable_mockModule('../adapters/wiki.js', () => ({
  fetchShutdowns: jest.fn()
}));

jest.unstable_mockModule('../adapters/newsapi.js', () => ({
  fetchNews: jest.fn(),
  fetchTopHeadlines: jest.fn()
}));

// Import after mocking
const { initUpdateScheduler } = await import('../services/updateScheduler.js');
const { fetchShutdowns } = await import('../adapters/wiki.js');
const { fetchNews, fetchTopHeadlines } = await import('../adapters/newsapi.js');

describe('Update Scheduler', () => {
  let mockCache;
  let mockLogger;
  let scheduler;

  beforeEach(() => {
    // Create mock cache
    mockCache = {
      set: jest.fn(),
      get: jest.fn()
    };

    // Create mock logger
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };

    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up scheduler if it exists
    if (scheduler && scheduler.stop) {
      scheduler.stop();
    }
  });

  describe('Initialization', () => {
    test('should initialize scheduler with valid inputs', () => {
      expect(() => {
        scheduler = initUpdateScheduler(mockCache, mockLogger, 'test-api-key');
      }).not.toThrow();

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Initializing automated update scheduler')
      );
    });

    test('should throw error if cache is missing', () => {
      expect(() => {
        initUpdateScheduler(null, mockLogger, 'test-api-key');
      }).toThrow('Cache object is required');
    });

    test('should throw error if logger is missing', () => {
      expect(() => {
        initUpdateScheduler(mockCache, null, 'test-api-key');
      }).toThrow('Logger object is required');
    });

    test('should log initialization with correct schedule info', () => {
      scheduler = initUpdateScheduler(mockCache, mockLogger, 'test-api-key');

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          schedule: expect.stringContaining('Every 6 hours'),
          timezone: 'America/New_York'
        }),
        expect.stringContaining('Update scheduler initialized')
      );
    });
  });

  describe('Scheduler Management', () => {
    test('should return scheduler object with stop method', () => {
      scheduler = initUpdateScheduler(mockCache, mockLogger, 'test-api-key');

      expect(scheduler).toHaveProperty('task');
      expect(scheduler).toHaveProperty('stop');
      expect(scheduler).toHaveProperty('performScheduledUpdate');
      expect(typeof scheduler.stop).toBe('function');
    });

    test('should stop scheduler when stop is called', () => {
      scheduler = initUpdateScheduler(mockCache, mockLogger, 'test-api-key');
      
      scheduler.stop();

      expect(mockLogger.info).toHaveBeenCalledWith('Update scheduler stopped');
    });
  });

  describe('Manual Update Trigger', () => {
    test('should allow manual update triggering', async () => {
      // Setup mock
      fetchShutdowns.mockResolvedValue([
        { id: 1, year: 2025, duration: 35 }
      ]);

      scheduler = initUpdateScheduler(mockCache, mockLogger, 'test-api-key');

      // Manually trigger update
      await scheduler.performScheduledUpdate();

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Starting scheduled data update cycle')
      );
    });
  });

  describe('Error Handling', () => {
    test('should handle errors during shutdown data update', async () => {
      fetchShutdowns.mockRejectedValue(new Error('Network error'));

      scheduler = initUpdateScheduler(mockCache, mockLogger, 'test-api-key');

      await scheduler.performScheduledUpdate();

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Network error'
        }),
        expect.stringContaining('Failed to update shutdown data')
      );
    });

    test('should skip news update if API key is not configured', async () => {
      scheduler = initUpdateScheduler(mockCache, mockLogger, null);

      await scheduler.performScheduledUpdate();

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('NewsAPI key not configured')
      );
    });
  });
});
