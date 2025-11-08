import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import NodeCache from 'node-cache';
import dotenv from 'dotenv';
import { body, query, validationResult } from 'express-validator';
import { fetchShutdowns } from './adapters/wiki.js';
import { fetchNews, fetchTopHeadlines } from './adapters/newsapi.js';

// Load environment variables
dotenv.config({ path: '../.env' });

const app = express();
const PORT = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

// Initialize cache (TTL: 1 hour = 3600 seconds)
const cache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

// Middleware
app.use(cors({
  origin: CORS_ORIGIN,
  credentials: true
}));

app.use(express.json({ limit: '10kb' })); // Limit payload size to prevent DOS

// Validation error handler middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validation failed',
      details: errors.array() 
    });
  }
  next();
};

// Rate limiting: max 100 requests per 15 minutes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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
    console.error('Error in /api/shutdowns:', error);
    res.status(500).json({
      error: 'Failed to fetch shutdown data',
      message: error.message
    });
  }
});

/**
 * GET /api/news
 * Proxies requests to NewsAPI for government shutdown news
 * Query params: query, pageSize, sortBy
 */
app.get('/api/news', [
  query('query').optional().isString().trim().isLength({ max: 500 }),
  query('pageSize').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('sortBy').optional().isIn(['publishedAt', 'relevancy', 'popularity']),
  handleValidationErrors
], async (req, res) => {
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
    console.error('Error in /api/news:', error);
    res.status(500).json({
      error: 'Failed to fetch news',
      message: error.message,
      articles: []
    });
  }
});

/**
 * GET /api/news/headlines
 * Fetches top political headlines
 */
app.get('/api/news/headlines', [
  query('category').optional().isIn(['politics', 'business', 'general']),
  query('country').optional().isLength({ min: 2, max: 2 }),
  query('pageSize').optional().isInt({ min: 1, max: 100 }).toInt(),
  handleValidationErrors
], async (req, res) => {
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
    console.error('Error in /api/news/headlines:', error);
    res.status(500).json({
      error: 'Failed to fetch headlines',
      message: error.message,
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
  body('duration').isInt({ min: 1, max: 365 }).toInt(),
  body('affectedWorkers').optional().isInt({ min: 1, max: 5000000 }).toInt(),
  body('year').optional().isInt({ min: 1900, max: 2100 }).toInt(),
  handleValidationErrors
], (req, res) => {
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
    console.error('Error in /api/impact/calc:', error);
    res.status(500).json({
      error: 'Failed to calculate impact',
      message: error.message
    });
  }
});

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

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Government Shutdown Dashboard API Server`);
  console.log(`🚀 Running on http://localhost:${PORT}`);
  console.log(`📊 CORS enabled for: ${CORS_ORIGIN}`);
  console.log(`🔑 NewsAPI: ${process.env.NEWSAPI_KEY ? 'Configured ✓' : 'Not configured (optional)'}`);
  console.log(`\n📚 Available endpoints:`);
  console.log(`   GET  /health`);
  console.log(`   GET  /api/sources`);
  console.log(`   GET  /api/shutdowns`);
  console.log(`   GET  /api/news`);
  console.log(`   GET  /api/news/headlines`);
  console.log(`   GET  /api/govinfo/:type`);
  console.log(`   POST /api/impact/calc`);
});
