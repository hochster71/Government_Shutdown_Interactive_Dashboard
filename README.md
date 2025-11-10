# US Government Shutdown Interactive Dashboard

An interactive, dark-themed dashboard for visualizing and analyzing US Government shutdown data, including historical timelines, economic impacts, and real-time news coverage.

**Created by Michael Hoch**

## Features

- 📊 **Interactive Timeline**: Visualize all US government shutdowns with detailed information
- 🔄 **Sankey Diagram**: Explore relationships between causes, affected agencies, and resolutions
- 💰 **Impact Calculator**: Calculate and visualize economic impacts of shutdowns
- 📰 **Live News Feed**: Real-time news articles related to government shutdowns
- ⏰ **Automated Updates**: Data refreshes every 6 hours to ensure latest information
- 🎨 **Dark Theme**: Professional dark theme optimized for data visualization
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile devices

## Tech Stack

### Frontend
- **React** with TypeScript
- **Vite** for fast development and building
- **D3.js** for advanced data visualizations
- **Chart.js** for interactive charts
- **DOMPurify** for XSS protection
- **Axios** with centralized API client
- Custom dark theme CSS

### Backend
- **Node.js 18+** with Express
- **Helmet** for security headers (CSP, X-Frame-Options, etc.)
- **Pino** for structured logging
- **Express-validator** for input validation
- **Cheerio** for web scraping Wikipedia data
- **Node-cache** for efficient data caching
- **Express-rate-limit** for API protection
- **Node-cron** for automated data updates every 6 hours
- Native fetch API with AbortController for timeouts
- NewsAPI integration for real-time news

### Security Features
- 🔒 Content Security Policy (CSP) headers
- 🛡️ Input validation and sanitization (client and server)
- 🚫 XSS protection with DOMPurify
- ⏱️ Request timeouts and rate limiting
- 📝 Structured logging with sensitive data filtering
- 🔐 CORS hardening for production
- 🚦 Graceful error handling (no stack traces in production)
- ⏰ Automated data updates with secure scheduling
- 🔍 Dependency vulnerability monitoring

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- (Optional) NewsAPI key from https://newsapi.org/

### Installation

1. Clone the repository:
```bash
git clone https://github.com/hochster71/Government_Shutdown_Interactive_Dashboard.git
cd Government_Shutdown_Interactive_Dashboard
```

2. Install dependencies:
```bash
npm run install:all
```

3. Configure environment variables:
```bash
cp .env.example .env
# Edit .env and add your NewsAPI key (optional)
```

### Development

Run both backend and frontend in development mode:
```bash
npm run dev
```

Or run them separately:
```bash
# Terminal 1 - Backend (runs on port 3001)
npm run dev:backend

# Terminal 2 - Frontend (runs on port 5173)
npm run dev:frontend
```

Then open http://localhost:5173 in your browser.

### Production Build

Build both frontend and backend:
```bash
npm run build
```

Start the production server:
```bash
npm start
```

The application will be available at http://localhost:3001

## Project Structure

```
├── backend/                # Backend API server
│   ├── server.js          # Express server with API endpoints
│   ├── services/          # Background services
│   │   └── updateScheduler.js # Automated data update scheduler
│   ├── adapters/          # Data source adapters
│   │   ├── wiki.js        # Wikipedia scraper
│   │   └── newsapi.js     # NewsAPI client
│   ├── tests/             # Backend unit tests
│   └── package.json
├── frontend/              # React frontend application
│   ├── src/
│   │   ├── components/    # React components
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Timeline.tsx
│   │   │   ├── SankeyDiagram.tsx
│   │   │   ├── ImpactCalculator.tsx
│   │   │   └── SourceCitations.tsx
│   │   ├── theme/         # Custom styling
│   │   │   └── dark.css
│   │   ├── App.tsx        # Main application component
│   │   └── main.tsx       # Application entry point
│   ├── index.html
│   ├── package.json
│   └── README.md
├── .env.example           # Environment variables template
├── SOURCES.md             # Data sources and attributions
├── LICENSE                # MIT License
└── package.json           # Root package configuration
```

## API Endpoints

The backend provides the following REST API endpoints:

- `GET /api/sources` - List all data sources with attribution
- `GET /api/shutdowns` - Retrieve historical shutdown data from Wikipedia
- `GET /api/news` - Get latest news articles about government shutdowns
- `GET /api/govinfo/:type` - Proxy to GovInfo.gov for official documents
- `POST /api/impact/calc` - Calculate economic impact based on parameters

All endpoints implement caching and rate limiting for optimal performance.

## Automated Data Updates

The backend automatically refreshes government shutdown data every 6 hours to ensure the dashboard displays the most current information:

- **Schedule**: Updates run at 0:00, 6:00, 12:00, and 18:00 Eastern Time
- **Data Sources Updated**:
  - Wikipedia shutdown data (historical and current)
  - NewsAPI articles (if API key is configured)
  - Top political headlines
- **Startup Behavior**: Initial data fetch occurs 5 seconds after server starts
- **Error Handling**: Failed updates are logged but don't affect server operation
- **Security**: Uses secure cron scheduling with proper timezone handling

The scheduler runs in the background and logs all update activity for monitoring and debugging.

## Configuration

### Environment Variables

- `NEWSAPI_KEY` - API key for NewsAPI (optional, but recommended)
- `PORT` - Backend server port (default: 3001)
- `NODE_ENV` - Environment mode (development/production)
- `LOG_LEVEL` - Logging level: debug, info, warn, error (default: debug in dev, info in prod)
- `ALLOWED_ORIGIN` - CORS allowed origin (required in production, default: http://localhost:5173 in dev)

See `.env.example` for all available options.

### Graceful Fallbacks

The application works without API keys:
- Without NewsAPI key: News feed shows informational message
- API failures: Cached data is served with appropriate messaging
- Network issues: User-friendly error messages with retry options

## Testing

### Backend Tests

Run backend unit tests:
```bash
cd backend
npm test
```

Run tests in watch mode:
```bash
cd backend
npm run test:watch
```

### Frontend Build

Build the frontend to check for TypeScript errors:
```bash
cd frontend
npm run build
```

Lint the frontend code:
```bash
cd frontend
npm run lint
```

### CI/CD

This project includes a GitHub Actions workflow that automatically:
- Runs backend tests
- Builds and lints the frontend
- Performs security audits

The workflow runs on pushes to `main` and `feature/*` branches, and on pull requests.

## Security Best Practices

This application implements several security best practices:

1. **Input Validation**: All user inputs are validated on both client and server
2. **Output Sanitization**: DOMPurify sanitizes content before rendering
3. **CSP Headers**: Content Security Policy prevents XSS attacks
4. **Rate Limiting**: API endpoints are rate-limited to prevent abuse
5. **Request Timeouts**: All external requests have timeouts to prevent hanging
6. **CORS Hardening**: Production requires explicit origin configuration
7. **Error Handling**: Stack traces are never exposed in production
8. **Structured Logging**: Pino logger provides audit trails without leaking sensitive data
9. **Dependency Security**: Regular audits via `npm audit`
10. **Native Fetch**: Uses Node 18+ native fetch instead of third-party HTTP clients

## Data Sources

This dashboard aggregates data from:
- Wikipedia (Government shutdowns historical data)
- NewsAPI (Real-time news coverage)
- GovInfo.gov (Official government documents)

See [SOURCES.md](SOURCES.md) for complete attribution and licensing information.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

**Michael Hoch**

## Acknowledgments

- Data sourced from Wikipedia, NewsAPI, and GovInfo.gov
- Built with React, D3.js, and Express
- Inspired by the need for transparent government data visualization

## Support

For issues, questions, or suggestions, please open an issue on GitHub.