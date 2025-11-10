# Backend Testing Guide

This guide explains the testing patterns and best practices used in the backend test suite.

## Test Infrastructure

### Technologies Used

- **Jest** - Testing framework
- **Supertest** - HTTP assertion library for API testing
- **ES Modules** - Modern JavaScript module system
- **Mocking** - jest.unstable_mockModule for ES module mocking

## Running Tests

```bash
# Run all tests
npm test

# Watch mode (auto-rerun on changes)
npm run test:watch

# Verbose output
npm run test:verbose

# Coverage report
npm run test:coverage
```

## Test Structure

```
tests/
├── impact.test.js          # API endpoint tests (impact calculator, security)
├── updateScheduler.test.js # Scheduler service tests
└── wiki.test.js           # Wikipedia adapter tests
```

## Common Patterns

### 1. ES Module Mocking

For mocking ES modules, use `jest.unstable_mockModule` **before** importing:

```javascript
import { jest } from '@jest/globals';

// Mock BEFORE import
jest.unstable_mockModule('../adapters/wiki.js', () => ({
  fetchShutdowns: jest.fn()
}));

// Import AFTER mocking
const { fetchShutdowns } = await import('../adapters/wiki.js');
```

### 2. Async Resource Cleanup

Always clean up async resources (timers, cron tasks, etc.) to prevent hanging tests:

```javascript
let scheduler;
const schedulers = []; // Track all instances

beforeEach(() => {
  // Setup
});

afterEach(() => {
  // Clean up all instances
  schedulers.forEach(s => {
    if (s && s.stop) {
      s.stop();
    }
  });
  schedulers = [];
});

test('example test', () => {
  scheduler = initScheduler();
  schedulers.push(scheduler); // Track for cleanup
  // ... test code ...
});
```

### 3. API Testing with Supertest

```javascript
import request from 'supertest';
import app from '../server.js';

test('POST endpoint', async () => {
  const response = await request(app)
    .post('/api/endpoint')
    .send({ data: 'value' });

  expect(response.status).toBe(200);
  expect(response.body).toHaveProperty('key');
});
```

### 4. Silent Logging in Tests

The test environment automatically suppresses logs:

```javascript
// In server.js and other files
const logger = pino({
  level: process.env.NODE_ENV === 'test' ? 'silent' : logLevel,
  // ...
});

// In adapters
if (process.env.NODE_ENV !== 'test') {
  console.log('This only logs outside tests');
}
```

## Important Notes

### NODE_OPTIONS Environment Variable

Tests require `NODE_OPTIONS='--experimental-vm-modules'` for ES module support in Jest. This is automatically set in the `npm test` script.

**Why?** Jest doesn't fully support ES modules yet, so Node's experimental VM modules feature is required.

### No forceExit

The Jest config does **not** use `forceExit: true`. All tests properly clean up async operations:

- Cron tasks are stopped
- Timeouts are cleared
- Network connections are closed

### Test Environment Detection

Code can detect test mode using:

```javascript
if (process.env.NODE_ENV === 'test') {
  // Test-specific behavior
}
```

This is used to:
- Suppress logging
- Skip initial schedulers/timers
- Provide test-friendly defaults

## Debugging Failed Tests

### Open Handles Warning

If you see "Jest has detected the following open handle":

1. Check that all cron tasks are stopped in `afterEach`
2. Verify timeouts are cleared
3. Ensure async operations complete
4. Run with `--detectOpenHandles` to see specific handles

```bash
NODE_ENV=test NODE_OPTIONS='--experimental-vm-modules' npx jest --detectOpenHandles
```

### Timeout Errors

If tests timeout:

1. Check that async operations are properly awaited
2. Verify mock implementations resolve/reject
3. Increase timeout in jest.config.json if needed (currently 30s)

### Flaky Tests

If tests pass/fail inconsistently:

1. Check for race conditions in async code
2. Verify proper cleanup in afterEach
3. Ensure tests don't depend on execution order
4. Check for shared state between tests

## Best Practices

### ✅ DO

- Always clean up async resources in afterEach/afterAll
- Use proper mocking for external dependencies
- Test both success and error cases
- Use descriptive test names
- Group related tests with describe blocks
- Track instances in arrays for cleanup

### ❌ DON'T

- Leave cron tasks or timers running
- Make real network calls in tests
- Use forceExit as a workaround
- Share state between tests
- Rely on test execution order
- Mock internal implementation details

## Adding New Tests

When adding new tests:

1. Follow existing patterns in the test suite
2. Add proper cleanup for any async resources
3. Mock external dependencies
4. Test error cases, not just happy paths
5. Ensure tests run independently
6. Update this guide if introducing new patterns

## Example: Complete Test File

```javascript
import { jest } from '@jest/globals';

// Mock dependencies
jest.unstable_mockModule('../dependency.js', () => ({
  someFunction: jest.fn()
}));

// Import after mocking
const { someFunction } = await import('../dependency.js');
const { moduleUnderTest } = await import('../module.js');

describe('Module Under Test', () => {
  let instance;
  const instances = [];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up all instances
    instances.forEach(i => {
      if (i && i.cleanup) {
        i.cleanup();
      }
    });
    instances = [];
  });

  describe('Feature Group', () => {
    test('should do something', async () => {
      someFunction.mockResolvedValue({ data: 'value' });
      
      instance = moduleUnderTest.init();
      instances.push(instance);

      const result = await instance.doSomething();
      
      expect(result).toBeDefined();
      expect(someFunction).toHaveBeenCalled();
    });

    test('should handle errors', async () => {
      someFunction.mockRejectedValue(new Error('Test error'));
      
      instance = moduleUnderTest.init();
      instances.push(instance);

      await expect(instance.doSomething()).rejects.toThrow('Test error');
    });
  });
});
```

## Troubleshooting Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/ladjs/supertest)
- [Node.js ES Modules](https://nodejs.org/api/esm.html)
- [Jest ES Modules Support](https://jestjs.io/docs/ecmascript-modules)
