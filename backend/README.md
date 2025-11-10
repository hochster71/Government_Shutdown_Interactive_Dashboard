# Government Shutdown Dashboard - Backend API

Backend API server for the Government Shutdown Interactive Dashboard.

## Features

- RESTful API for historical government shutdown data
- Wikipedia data scraping with retry logic and fallback
- NewsAPI integration for real-time news articles
- Economic impact calculator
- Rate limiting and security headers (Helmet)
- Structured logging with Pino
- Automated data updates every 6 hours
- Request caching with NodeCache

## Requirements

- Node.js 18 or later (required for native `fetch` API)
- npm 8 or later

## Installation

```bash
npm ci
```

## Configuration

Create a `.env` file in the project root (parent directory):

```env
# Optional: NewsAPI key for real-time news
NEWSAPI_KEY=your_newsapi_key_here

# Optional: Allowed CORS origin in production
ALLOWED_ORIGIN=https://your-frontend-domain.com

# Optional: Server port (default: 3001)
PORT=3001

# Optional: Log level (debug, info, warn, error)
LOG_LEVEL=info
```

## Running the Server

### Development Mode (with auto-restart)

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

## Testing

### Run All Tests

```bash
npm test
```

### Watch Mode (runs tests on file changes)

```bash
npm run test:watch
```

### Verbose Output

```bash
npm run test:verbose
```

### Coverage Report

```bash
npm run test:coverage
```

### Test Configuration

The test suite uses Jest with ES modules support. Due to Node.js requirements for ES modules in Jest:

- **`NODE_OPTIONS='--experimental-vm-modules'`** is required for Jest to work with ES modules
- This is automatically set in the `npm test` script
- Tests run with `NODE_ENV=test` which:
  - Suppresses logger output (silent mode)
  - Prevents the server from auto-starting
  - Disables the initial scheduled data update
  - Suppresses console noise from retry logic

### Test Structure

```
tests/
├── impact.test.js          # Impact calculator and API security tests
├── updateScheduler.test.js # Automated update scheduler tests
└── wiki.test.js           # Wikipedia adapter tests
```

### Key Test Features

- **Async Lifecycle Management**: All tests properly clean up async resources (cron tasks, timeouts)
- **Mocking**: External dependencies are mocked to prevent network calls during tests
- **No Force Exit**: Tests complete cleanly without requiring `forceExit`
- **Detailed Logging**: Error messages and logs help diagnose issues
- **Security Validation**: Tests verify security headers, rate limiting, and input validation

## API Endpoints

### Health Check
- `GET /health` - Server health status

### Data Sources
- `GET /api/sources` - List of data sources with attribution

### Shutdown Data
- `GET /api/shutdowns` - Historical government shutdown data

### News
- `GET /api/news` - Search news articles about government shutdowns
- `GET /api/news/headlines` - Top political headlines

### Impact Calculator
- `POST /api/impact/calc` - Calculate economic impact of a shutdown
  - Body: `{ duration: number, affectedWorkers?: number, year?: number }`

### Government Info (Placeholder)
- `GET /api/govinfo/:type` - Placeholder for GovInfo.gov integration

## Architecture

### Services
- **updateScheduler.js** - Automated data updates every 6 hours using cron

### Adapters
- **wiki.js** - Wikipedia data scraping with retry logic and sanitization
- **newsapi.js** - NewsAPI integration for real-time news

### Security Features
- Helmet for security headers (CSP, XSS protection, etc.)
- CORS configuration
- Rate limiting (100 requests per 15 minutes)
- Input validation with express-validator
- JSON body size limit (100kb)
- Request logging with Pino
- No stack traces in production error responses

## Troubleshooting

### Tests failing with "Jest has detected the following open handle"
- Ensure all cron tasks and timeouts are properly stopped in `afterEach` hooks
- This should not happen with the current configuration

### "Global fetch is not available" error
- Upgrade to Node.js 18 or later
- The server checks for native fetch on startup and fails fast if unavailable

### Experimental VM Modules warning
- This is expected when running tests with ES modules
- It's a Node.js experimental feature warning and can be safely ignored
- The warning does not indicate a problem with the tests

## License

MIT
