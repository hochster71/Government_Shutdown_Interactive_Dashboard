import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { body, validationResult } from 'express-validator';
import NodeCache from 'node-cache';
import dotenv from 'dotenv';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { fetchShutdowns } from './adapters/wiki.js';
import { fetchNews, fetchTopHeadlines } from './adapters/newsapi.js';
import { initUpdateScheduler } from './services/updateScheduler.js';

// Load environment variables
dotenv.config({ path: '../.env' });

// Fail fast if global fetch is not available
if (typeof fetch === 'undefined') {
  console.error('❌ FATAL: Global fetch is not available. Please use Node.js 18 or later.');
  process.exit(1);
}

// Configure structured logging
const logLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');
const logger = pino({
  level: logLevel,
  transport: process.env.NODE_ENV !== 'production' ? {
    target: 'pino-pretty',
    options: { colorize: true }
  } : undefined
});

const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';

// CORS Configuration
const ALLOWED_ORIGIN = isProduction 
  ? process.env.ALLOWED_ORIGIN 
  : (process.env.ALLOWED_ORIGIN || 'http://localhost:5173');

if (isProduction && !process.env.ALLOWED_ORIGIN) {
  logger.warn('⚠️  ALLOWED_ORIGIN not set in production. CORS will be restrictive.');
}

// Initialize cache (TTL: 1 hour = 3600 seconds)
const cache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });

// Security Headers with Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // unsafe-inline needed for Vite in dev
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow embedding for development
}));

// HTTP Request Logging
app.use(pinoHttp({ logger }));

// CORS Configuration
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    if (isProduction) {
      // In production, only allow configured origin
      if (origin === ALLOWED_ORIGIN) {
        callback(null, true);
      } else {
        logger.warn({ origin, allowed: ALLOWED_ORIGIN }, 'CORS origin rejected');
        callback(new Error('Not allowed by CORS'));
      }
    } else {
      // In development, allow localhost origins
      if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true
}));

// JSON body parser with size limit
app.use(express.json({ limit: '100kb' }));

// Rate limiting: max 100 requests per 15 minutes with informative headers
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn({ ip: req.ip }, 'Rate limit exceeded');
    res.status(429).json({
      error: 'Too many requests',
      message: 'You have exceeded the rate limit. Please try again later.',
      retryAfter: res.getHeader('RateLimit-Reset')
    });
  }
});

app.use('/api/', limiter);

// Store scheduler instance for management
let updateScheduler = null;

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    scheduler: updateScheduler ? 'active' : 'inactive'
  });
});

/**
 * GET /api/sources
 * Returns list of data sources with attribution
 */
app.get('/api/sources', (req, res) => {
  const sources = [
    {
      name: 'Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Government_shutdowns_in_the_United_States',
      description: 'Historical shutdown data, dates, and durations',
      license: 'CC BY-SA 3.0',
      type: 'primary'
    },
    {
      name: 'NewsAPI',
      url: 'https://newsapi.org/',
      description: 'Real-time news articles about government shutdowns',
      license: 'Proprietary',
      type: 'news',
      enabled: !!process.env.NEWSAPI_KEY && process.env.NEWSAPI_KEY !== 'your_newsapi_key_here'
    },
    {
      name: 'GovInfo.gov',
      url: 'https://www.govinfo.gov/',
      description: 'Official government documents and legislative records',
      license: 'Public Domain',
      type: 'government'
    }
  ];

  res.json({ sources, timestamp: new Date().toISOString() });
});

/**
 * GET /api/shutdowns
 * Fetches historical government shutdown data from Wikipedia
 * Implements caching to minimize requests
 */
app.get('/api/shutdowns', async (req, res) => {
  try {
    // Check cache first
    const cachedData = cache.get('shutdowns');
    if (cachedData) {
      return res.json({
        data: cachedData,
        cached: true,
        timestamp: new Date().toISOString()
      });
    }

    // Fetch fresh data
    const shutdowns = await fetchShutdowns();
    
    // Cache the result
    cache.set('shutdowns', shutdowns);

    res.json({
      data: shutdowns,
      cached: false,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error({ error: error.message, stack: error.stack }, 'Error in /api/shutdowns');
    res.status(500).json({
      error: 'Failed to fetch shutdown data',
      message: isProduction ? 'An error occurred while fetching data' : error.message
    });
  }
});

/**
 * GET /api/news
 * Proxies requests to NewsAPI for government shutdown news
 * Query params: query, pageSize, sortBy
 */
app.get('/api/news', [
  // Input validation
  body('query').optional().isString().trim().isLength({ max: 500 }),
  body('pageSize').optional().isInt({ min: 1, max: 100 }),
  body('sortBy').optional().isIn(['publishedAt', 'relevancy', 'popularity'])
], async (req, res) => {
  // Check validation results
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validation error', 
      details: errors.array() 
    });
  }

  try {
    const apiKey = process.env.NEWSAPI_KEY;
    const cacheKey = `news_${req.query.query || 'default'}`;
    
    // Check cache first (shorter TTL for news: 30 minutes)
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return res.json({
        ...cachedData,
        cached: true,
        timestamp: new Date().toISOString()
      });
    }

    // Fetch fresh data
    const options = {
      query: req.query.query,
      pageSize: parseInt(req.query.pageSize) || 20,
      sortBy: req.query.sortBy || 'publishedAt'
    };

    const newsData = await fetchNews(apiKey, options);
    
    // Cache the result (30 minutes = 1800 seconds)
    cache.set(cacheKey, newsData, 1800);

    res.json({
      ...newsData,
      cached: false,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error({ error: error.message, stack: error.stack }, 'Error in /api/news');
    res.status(500).json({
      error: 'Failed to fetch news',
      message: isProduction ? 'An error occurred while fetching news' : error.message,
      articles: []
    });
  }
});

/**
 * GET /api/news/headlines
 * Fetches top political headlines
 */
app.get('/api/news/headlines', async (req, res) => {
  try {
    const apiKey = process.env.NEWSAPI_KEY;
    const cacheKey = 'headlines';
    
    // Check cache
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return res.json({
        ...cachedData,
        cached: true,
        timestamp: new Date().toISOString()
      });
    }

    // Fetch fresh data
    const options = {
      category: req.query.category || 'politics',
      country: req.query.country || 'us',
      pageSize: parseInt(req.query.pageSize) || 10
    };

    const newsData = await fetchTopHeadlines(apiKey, options);
    
    // Cache the result (30 minutes)
    cache.set(cacheKey, newsData, 1800);

    res.json({
      ...newsData,
      cached: false,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error({ error: error.message, stack: error.stack }, 'Error in /api/news/headlines');
    res.status(500).json({
      error: 'Failed to fetch headlines',
      message: isProduction ? 'An error occurred while fetching headlines' : error.message,
      articles: []
    });
  }
});

/**
 * GET /api/govinfo/:type
 * Proxy endpoint for GovInfo.gov
 * This is a placeholder - actual implementation would require GovInfo API integration
 */
app.get('/api/govinfo/:type', (req, res) => {
  const { type } = req.params;
  
  // Placeholder response
  res.json({
    message: 'GovInfo integration coming soon',
    type,
    suggestedUrl: `https://www.govinfo.gov/app/search/${encodeURIComponent(type)}`,
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /api/impact/calc
 * Calculate economic impact of a government shutdown
 * Body: { duration: number (days), affectedWorkers: number, year: number }
 */
app.post('/api/impact/calc', [
  // Input validation
  body('duration').isInt({ min: 1, max: 365 }).withMessage('Duration must be between 1 and 365 days'),
  body('affectedWorkers').optional().isInt({ min: 1000, max: 3000000 }).withMessage('Affected workers must be between 1,000 and 3,000,000'),
  body('year').optional().isInt({ min: 1970, max: 2100 }).withMessage('Year must be between 1970 and 2100')
], (req, res) => {
  // Check validation results
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validation error', 
      details: errors.array() 
    });
  }

  try {
    const { duration, affectedWorkers, year } = req.body;

    // Base calculations (simplified model)
    const avgDailyCostPerWorker = 400; // Average daily cost per federal worker
    const economicMultiplier = 1.5; // Economic multiplier effect
    const workers = affectedWorkers || 800000; // Default estimate
    
    // Calculate direct impact
    const directImpact = duration * workers * avgDailyCostPerWorker;
    
    // Calculate total economic impact with multiplier
    const totalImpact = directImpact * economicMultiplier;
    
    // Calculate GDP impact (as percentage)
    const annualGDP = 25000000000000; // ~$25 trillion (approximate US GDP)
    const gdpImpact = (totalImpact / annualGDP) * 100;

    // Lost productivity
    const lostProductivity = directImpact * 0.2; // 20% permanent loss estimate

    const result = {
      inputs: {
        duration,
        affectedWorkers: workers,
        year: year || new Date().getFullYear()
      },
      impacts: {
        directImpact: Math.round(directImpact),
        totalEconomicImpact: Math.round(totalImpact),
        lostProductivity: Math.round(lostProductivity),
        gdpImpactPercent: gdpImpact.toFixed(4)
      },
      formatted: {
        directImpact: `$${(directImpact / 1000000000).toFixed(2)}B`,
        totalEconomicImpact: `$${(totalImpact / 1000000000).toFixed(2)}B`,
        lostProductivity: `$${(lostProductivity / 1000000000).toFixed(2)}B`,
        gdpImpact: `${gdpImpact.toFixed(4)}%`
      },
      note: 'Estimates based on historical data and economic models. Actual impacts may vary.',
      timestamp: new Date().toISOString()
    };

    res.json(result);
  } catch (error) {
    logger.error({ error: error.message, stack: error.stack }, 'Error in /api/impact/calc');
    res.status(500).json({
      error: 'Failed to calculate impact',
      message: isProduction ? 'An error occurred during calculation' : error.message
    });
  }
});

// Serve static assets with cache headers
app.use('/static', express.static('public', {
  maxAge: '1d',
  etag: true,
  lastModified: true
}));

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.url}`,
    availableEndpoints: [
      'GET /health',
      'GET /api/sources',
      'GET /api/shutdowns',
      'GET /api/news',
      'GET /api/news/headlines',
      'GET /api/govinfo/:type',
      'POST /api/impact/calc'
    ]
  });
});

// Error handler - don't leak stack traces in production
app.use((err, req, res, next) => {
  logger.error({ error: err.message, stack: err.stack }, 'Server error');
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: isProduction ? 'An unexpected error occurred' : err.message
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  if (updateScheduler) {
    updateScheduler.stop();
  }
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  if (updateScheduler) {
    updateScheduler.stop();
  }
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

// Only start the server if this file is run directly (not imported for testing)
let server;
if (process.env.NODE_ENV !== 'test') {
  server = app.listen(PORT, () => {
    logger.info({
      port: PORT,
      env: NODE_ENV,
      corsOrigin: ALLOWED_ORIGIN,
      newsApiConfigured: !!process.env.NEWSAPI_KEY
    }, 'Government Shutdown Dashboard API Server started');
    
    console.log(`✅ Government Shutdown Dashboard API Server`);
    console.log(`🚀 Running on http://localhost:${PORT}`);
    console.log(`📊 CORS enabled for: ${ALLOWED_ORIGIN}`);
    console.log(`🔑 NewsAPI: ${process.env.NEWSAPI_KEY ? 'Configured ✓' : 'Not configured (optional)'}`);
    console.log(`🔒 Security: Helmet enabled with CSP`);
    console.log(`📝 Logging: ${logLevel} level`);
    console.log(`\n📚 Available endpoints:`);
    console.log(`   GET  /health`);
    console.log(`   GET  /api/sources`);
    console.log(`   GET  /api/shutdowns`);
    console.log(`   GET  /api/news`);
    console.log(`   GET  /api/news/headlines`);
    console.log(`   GET  /api/govinfo/:type`);
    console.log(`   POST /api/impact/calc`);
    
    // Initialize automated update scheduler after server starts
    try {
      updateScheduler = initUpdateScheduler(cache, logger, process.env.NEWSAPI_KEY);
      console.log(`\n⏰ Automated updates: Every 6 hours (ET)`);
    } catch (error) {
      logger.error({ error: error.message }, 'Failed to initialize update scheduler');
      console.error(`⚠️  Warning: Update scheduler failed to initialize`);
    }
  });
}

export default app;
export { server, updateScheduler };
