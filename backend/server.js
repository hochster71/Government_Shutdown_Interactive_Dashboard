import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { body, query, validationResult } from 'express-validator';
import NodeCache from 'node-cache';
import dotenv from 'dotenv';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { fetchShutdowns } from './adapters/wiki.js';
import { fetchNews, fetchTopHeadlines } from './adapters/newsapi.js';
import { initUpdateScheduler } from './services/updateScheduler.js';
import fs from 'fs/promises';
import path from 'path';
import * as cheerio from 'cheerio';

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
  level: process.env.NODE_ENV === 'test' ? 'silent' : logLevel,
  transport: (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') ? {
    target: 'pino-pretty',
    options: { colorize: true }
  } : undefined
});

const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'http://localhost:5173';

// Initialize cache (TTL: 1 hour = 3600 seconds)
const cache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });

// Security Middleware - Helmet with enhanced configuration
app.use(helmet({
  contentSecurityPolicy: NODE_ENV === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: [],
    }
  } : false,
  crossOriginEmbedderPolicy: NODE_ENV === 'production' ? true : false,
  crossOriginOpenerPolicy: { policy: "same-origin" },
  crossOriginResourcePolicy: { policy: "same-origin" },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: { permittedPolicies: "none" },
  referrerPolicy: { policy: "no-referrer" },
  xssFilter: true
}));

// Compression middleware for performance
app.use(compression());

// Request logging (only in development or if LOG_REQUESTS=true)
if (NODE_ENV === 'development' || process.env.LOG_REQUESTS === 'true') {
  app.use(morgan('combined'));
}

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
  credentials: true,
  maxAge: 600 // Cache preflight request for 10 minutes
}));

app.use(express.json({ limit: '100kb' })); // Limit body size
app.use(express.urlencoded({ extended: true, limit: '100kb' })); // URL-encoded body parsing with limit

// Security middleware to remove sensitive headers from responses
app.use((req, res, next) => {
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');
  next();
});

// Rate limiting: max 100 requests per 15 minutes with informative headers
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
});

app.use('/api/', limiter);

// Stricter rate limiting for POST endpoints
const postLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Too many POST requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

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
    
    // If NewsAPI returned no articles (key absent or empty), attempt RSS fallback
    if (!newsData || !Array.isArray(newsData.articles) || newsData.articles.length === 0) {
      try {
        // Find latest RSS file in data/
        const dataDir = path.join(process.cwd(), 'data');
        const files = await fs.readdir(dataDir).catch(() => []);
        const rssFiles = files.filter(f => f.startsWith('latest_rss_')).sort();
        if (rssFiles.length > 0) {
          const latest = rssFiles[rssFiles.length - 1];
          const raw = await fs.readFile(path.join(dataDir, latest), 'utf8');
          const parsed = JSON.parse(raw);
          // Flatten articles and tag source
          const articles = [];
          for (const src of parsed.sources || []) {
            for (const it of src.items || []) {
              articles.push({
                title: it.title,
                description: it.description,
                url: it.url,
                source: src.source,
                publishedAt: it.publishedAt
              });
            }
          }

          // Cache and return RSS articles
          cache.set(cacheKey, { articles, totalResults: articles.length }, 1800);
          return res.json({ articles, totalResults: articles.length, cached: false, timestamp: new Date().toISOString() });
        }
      } catch (err) {
        console.warn('RSS fallback failed:', err.message || err);
      }
    }

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
app.get('/api/news/headlines', [
  query('category').optional().isIn(['business', 'entertainment', 'general', 'health', 'science', 'sports', 'technology', 'politics']),
  query('country').optional().isAlpha().isLength({ min: 2, max: 2 }),
  query('pageSize').optional().isInt({ min: 1, max: 100 }).toInt()
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
    const cacheKey = `headlines_${req.query.category || 'politics'}_${req.query.country || 'us'}`;
    
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
 * GET /api/official
 * Returns structured official notices parsed from saved snapshots in /data
 * If snapshots are not available, returns an empty array for each source.
 */
app.get('/api/official', async (req, res) => {
  try {
    const dataDir = path.join(process.cwd(), 'data');

    const sourcesToLoad = [
      { name: 'WhiteHouse', prefix: 'whitehouse_search_', domain: 'whitehouse.gov' },
      { name: 'Congress', prefix: 'congress_search_', domain: 'congress.gov' },
      { name: 'GovInfo', prefix: 'govinfo_search_', domain: 'govinfo.gov' },
      { name: 'CBO', prefix: 'cbo_search_', domain: 'cbo.gov' }
    ];

    const files = await fs.readdir(dataDir).catch(() => []);

    const results = [];

    for (const src of sourcesToLoad) {
      // Find latest file matching prefix
      const matched = files.filter(f => f.startsWith(src.prefix)).sort();
      if (matched.length === 0) {
        results.push({ source: src.name, items: [], file: null });
        continue;
      }

      const latest = matched[matched.length - 1];
      const raw = await fs.readFile(path.join(dataDir, latest), 'utf8').catch(() => '');
      const $ = cheerio.load(raw || '');

      const items = [];

      // Generic extraction: look for links that contain the source domain and capture context
      $('a').each((i, el) => {
        try {
          const href = $(el).attr('href') || '';
          const text = $(el).text().trim();
          if (!href || !text) return;

          // Only consider links that reference the expected domain or are absolute paths
          if (href.includes(src.domain) || href.startsWith('/')) {
            // Build absolute URL when necessary
            let url = href;
            if (href.startsWith('/')) url = `https://${src.domain}${href}`;
            if (!url.startsWith('http')) url = `https://${src.domain}/${href}`;

            // Try to extract a nearby excerpt: nearest article or paragraph
            const article = $(el).closest('article');
            let excerpt = '';
            if (article && article.length) {
              excerpt = article.text().replace(/\s+/g, ' ').trim();
            } else {
              const parentText = $(el).parent().text() || '';
              excerpt = parentText.replace(/\s+/g, ' ').trim();
            }

            items.push({ title: text, url, excerpt: excerpt.substring(0, 500) });
          }
        } catch (e) {
          // ignore parsing errors for individual nodes
        }
      });

      // Deduplicate by URL and limit
      const deduped = [];
      const seen = new Set();
      for (const it of items) {
        if (!seen.has(it.url)) {
          seen.add(it.url);
          deduped.push(it);
        }
        if (deduped.length >= 25) break;
      }

      results.push({ source: src.name, file: latest, items: deduped });
    }

    res.json({ results, timestamp: new Date().toISOString() });
  } catch (error) {
    logger.error({ error: error.message, stack: error.stack }, 'Error in /api/official');
    res.status(500).json({ error: 'Failed to fetch official notices', message: error.message, results: [] });
  }
});

/**
 * GET /api/official/canonical
 * Returns the latest canonical official feed (normalized)
 */
app.get('/api/official/canonical', async (req, res) => {
  try {
    const dataDir = path.join(process.cwd(), 'data');
    const files = await fs.readdir(dataDir).catch(() => []);
    const canonicalFiles = files.filter(f => f.startsWith('official_canonical_')).sort();
    if (canonicalFiles.length === 0) {
      return res.json({ items: [], timestamp: new Date().toISOString() });
    }
    const latest = canonicalFiles[canonicalFiles.length - 1];
    const raw = await fs.readFile(path.join(dataDir, latest), 'utf8');
    const parsed = JSON.parse(raw);
    res.json({ items: parsed.items || [], parsed_at: parsed.parsed_at, file: latest, timestamp: new Date().toISOString() });
  } catch (err) {
    logger.error({ error: err.message, stack: err.stack }, 'Error in /api/official/canonical');
    res.status(500).json({ error: 'Failed to load canonical feed', message: err.message, items: [] });
  }
});

/**
 * GET /api/govinfo/:type
 * Proxy endpoint for GovInfo.gov
 * This is a placeholder - actual implementation would require GovInfo API integration
 */
app.get('/api/govinfo/:type', [
  query('type').optional().isAlphanumeric().isLength({ max: 50 })
], (req, res) => {
  const { type } = req.params;
  
  // Validate type parameter
  if (!type || !/^[a-zA-Z0-9-_]+$/.test(type) || type.length > 50) {
    return res.status(400).json({
      error: 'Invalid type parameter',
      message: 'Type must be alphanumeric and less than 50 characters'
    });
  }
  
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
app.post('/api/impact/calc', postLimiter, [
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
    // Add extended authoritative sources for accurate, traceable reporting
    const extendedSources = [
      {
        name: 'WhiteHouse.gov',
        url: 'https://www.whitehouse.gov/',
        description: 'Presidential statements, press releases, and official guidance',
        license: 'Public Domain',
        type: 'government'
      },
      {
        name: 'Congress.gov',
        url: 'https://www.congress.gov/',
        description: 'Legislative text, bill status, committee reports (appropriations and continuing resolutions)',
        license: 'Public Domain',
        type: 'government'
      },
      {
        name: 'Congressional Budget Office (CBO)',
        url: 'https://www.cbo.gov/',
        description: 'Budgetary and economic analysis relevant to shutdown impacts',
        license: 'Public Domain',
        type: 'government'
      },
      {
        name: 'Office of Management and Budget (OMB)',
        url: 'https://www.whitehouse.gov/omb/',
        description: 'Guidance for federal agencies during appropriations gaps and contingency operations',
        license: 'Public Domain',
        type: 'government'
      },
      {
        name: 'U.S. Department of Homeland Security (DHS)',
        url: 'https://www.dhs.gov/',
        description: 'Operational notices and guidance for DHS components',
        license: 'Public Domain',
        type: 'government'
      },
      {
        name: 'U.S. Treasury',
        url: 'https://home.treasury.gov/',
        description: 'Financial guidance, payments, and debt-related notices',
        license: 'Public Domain',
        type: 'government'
      },
      {
        name: 'Social Security Administration (SSA)',
        url: 'https://www.ssa.gov/',
        description: 'Service impact notices and guidance for beneficiaries',
        license: 'Public Domain',
        type: 'government'
      },
      {
        name: 'U.S. Postal Service (USPS)',
        url: 'https://about.usps.com/',
        description: 'Operational guidance and notices affecting postal services',
        license: 'Public Domain',
        type: 'government'
      },
      {
        name: 'National Park Service (NPS)',
        url: 'https://www.nps.gov/',
        description: 'Operational notices and park closure information',
        license: 'Public Domain',
        type: 'government'
      }
    ];

    // Merge unique sources into the returned list (avoid duplicates)
    const merged = [...sources];
    extendedSources.forEach(ext => {
      if (!merged.some(s => s.url === ext.url)) merged.push(ext);
    });

    res.json({ sources: merged, timestamp: new Date().toISOString() });
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
if (process.env.NODE_ENV !== 'test') {
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
}

export default app;
