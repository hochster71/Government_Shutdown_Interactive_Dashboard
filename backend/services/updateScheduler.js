import cron from 'node-cron';
import { fetchShutdowns } from '../adapters/wiki.js';
import { fetchNews, fetchTopHeadlines } from '../adapters/newsapi.js';

/**
 * Update Scheduler Service
 * Automatically updates government shutdown data every 6 hours
 * Implements security best practices and error handling
 */

/**
 * Initialize the automated update scheduler
 * @param {object} cache - NodeCache instance for caching data
 * @param {object} logger - Pino logger instance
 * @param {string} newsApiKey - NewsAPI key (optional)
 */
export function initUpdateScheduler(cache, logger, newsApiKey) {
  // Validate inputs
  if (!cache || typeof cache.set !== 'function') {
    logger.error('Invalid cache object provided to scheduler');
    throw new Error('Cache object is required for update scheduler');
  }

  if (!logger || typeof logger.info !== 'function') {
    throw new Error('Logger object is required for update scheduler');
  }

  logger.info('Initializing automated update scheduler (every 6 hours)');

  /**
   * Update shutdown data from Wikipedia
   */
  async function updateShutdownData() {
    logger.info('Starting scheduled update: Shutdown data');
    try {
      const shutdowns = await fetchShutdowns();
      cache.set('shutdowns', shutdowns);
      logger.info({ 
        count: shutdowns.length,
        timestamp: new Date().toISOString() 
      }, 'Shutdown data updated successfully');
      return { success: true, count: shutdowns.length };
    } catch (error) {
      logger.error({ 
        error: error.message,
        timestamp: new Date().toISOString()
      }, 'Failed to update shutdown data');
      return { success: false, error: error.message };
    }
  }

  /**
   * Update news data from NewsAPI
   */
  async function updateNewsData() {
    logger.info('Starting scheduled update: News data');
    
    if (!newsApiKey || newsApiKey === 'your_newsapi_key_here') {
      logger.warn('NewsAPI key not configured, skipping news update');
      return { success: true, skipped: true };
    }

    try {
      // Update general news
      const newsOptions = {
        query: 'government shutdown',
        pageSize: 20,
        sortBy: 'publishedAt'
      };
      const newsData = await fetchNews(newsApiKey, newsOptions);
      cache.set('news_default', newsData, 1800); // 30 minutes TTL
      
      // Update headlines
      const headlinesOptions = {
        category: 'politics',
        country: 'us',
        pageSize: 10
      };
      const headlinesData = await fetchTopHeadlines(newsApiKey, headlinesOptions);
      cache.set('headlines', headlinesData, 1800); // 30 minutes TTL
      
      logger.info({ 
        newsCount: newsData.articles?.length || 0,
        headlinesCount: headlinesData.articles?.length || 0,
        timestamp: new Date().toISOString()
      }, 'News data updated successfully');
      
      return { 
        success: true, 
        newsCount: newsData.articles?.length || 0,
        headlinesCount: headlinesData.articles?.length || 0
      };
    } catch (error) {
      logger.error({ 
        error: error.message,
        timestamp: new Date().toISOString()
      }, 'Failed to update news data');
      return { success: false, error: error.message };
    }
  }

  /**
   * Perform all scheduled updates
   */
  async function performScheduledUpdate() {
    const updateStart = Date.now();
    logger.info('=== Starting scheduled data update cycle ===');
    
    try {
      // Run updates in parallel for efficiency
      const [shutdownResult, newsResult] = await Promise.allSettled([
        updateShutdownData(),
        updateNewsData()
      ]);

      const duration = Date.now() - updateStart;
      logger.info({ 
        shutdownUpdate: shutdownResult.status === 'fulfilled' ? shutdownResult.value : { success: false },
        newsUpdate: newsResult.status === 'fulfilled' ? newsResult.value : { success: false },
        durationMs: duration,
        timestamp: new Date().toISOString()
      }, '=== Scheduled data update cycle completed ===');
      
    } catch (error) {
      logger.error({ 
        error: error.message,
        timestamp: new Date().toISOString()
      }, 'Error during scheduled update cycle');
    }
  }

  // Schedule updates every 6 hours (at :00, :06, :12, :18)
  // Using a cron expression: "0 */6 * * *" means at minute 0 of every 6th hour
  const task = cron.schedule('0 */6 * * *', performScheduledUpdate, {
    scheduled: true,
    timezone: 'America/New_York' // Eastern Time (where DC is located)
  });

  logger.info({
    schedule: 'Every 6 hours (0:00, 6:00, 12:00, 18:00 ET)',
    timezone: 'America/New_York',
    nextRun: 'Check logs for next scheduled run'
  }, 'Update scheduler initialized successfully');

  // Perform initial update on startup (after a short delay to allow server to fully start)
  // Store timeout reference for cleanup
  let initialUpdateTimeout = null;
  
  // Only schedule initial update in non-test environments
  if (process.env.NODE_ENV !== 'test') {
    initialUpdateTimeout = setTimeout(() => {
      logger.info('Performing initial data update on startup');
      performScheduledUpdate().catch(err => {
        logger.error({ error: err.message }, 'Initial update failed');
      });
    }, 5000); // 5 second delay
  }

  // Return task object for testing/management
  return {
    task,
    performScheduledUpdate, // Expose for manual triggering if needed
    stop: () => {
      task.stop();
      // Clear the initial update timeout if it exists
      if (initialUpdateTimeout) {
        clearTimeout(initialUpdateTimeout);
        initialUpdateTimeout = null;
      }
      logger.info('Update scheduler stopped');
    }
  };
}
