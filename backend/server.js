import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { body, query, validationResult } from 'express-validator';
import NodeCache from 'node-cache';
import dotenv from 'dotenv';
import { fetchShutdowns } from './adapters/wiki.js';
import { fetchNews, fetchTopHeadlines } from './adapters/newsapi.js';

// Load environment variables
dotenv.config({ path: '../.env' });

const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'http://localhost:5173';

// Initialize cache (TTL: 1 hour = 3600 seconds)
const cache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });

// Security Middleware - Helmet
app.use(helmet({
  contentSecurityPolicy: NODE_ENV === 'production' ? undefined : false,
  crossOriginEmbedderPolicy: NODE_ENV === 'production' ? true : false
}));

// CORS Middleware - Tightened for production
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    // In production, only allow configured origin
    if (NODE_ENV === 'production') {
      if (origin === ALLOWED_ORIGIN) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    } else {
      // In development, allow configured origin
      if (origin === ALLOWED_ORIGIN || origin === 'http://localhost:5173') {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '100kb' })); // Limit body size

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
 * Query params: query, pageSize, sortBy (validated)
 */
app.get('/api/news', [
  query('query').optional().isString().trim().isLength({ max: 500 }).escape(),
  query('pageSize').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('sortBy').optional().isIn(['publishedAt', 'relevancy', 'popularity'])
], async (req, res) => {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Invalid input parameters',
        details: errors.array() 
      });
    }

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
    const message = NODE_ENV === 'production' 
      ? 'Failed to fetch news'
      : error.message;
    res.status(500).json({
      error: 'Failed to fetch news',
      message,
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
  body('duration').isInt({ min: 1, max: 365 }).withMessage('Duration must be between 1 and 365 days'),
  body('affectedWorkers').optional().isInt({ min: 1000, max: 3000000 }).withMessage('Affected workers must be between 1,000 and 3,000,000'),
  body('year').optional().isInt({ min: 1970, max: 2100 }).withMessage('Year must be between 1970 and 2100')
], (req, res) => {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Invalid input parameters',
        details: errors.array() 
      });
    }

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
    const message = NODE_ENV === 'production' 
      ? 'Failed to calculate impact'
      : error.message;
    res.status(500).json({
      error: 'Failed to calculate impact',
      message
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
  
  // Don't expose stack traces in production
  const message = NODE_ENV === 'production' 
    ? 'An error occurred while processing your request'
    : err.message;
  
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Government Shutdown Dashboard API Server`);
  console.log(`🚀 Running on http://localhost:${PORT}`);
  console.log(`📊 CORS enabled for: ${ALLOWED_ORIGIN}`);
  console.log(`🔒 Environment: ${NODE_ENV}`);
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

export default app;
