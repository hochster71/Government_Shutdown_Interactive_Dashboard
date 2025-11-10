/**
 * NewsAPI Adapter - Proxies requests to NewsAPI using native fetch
 * Documentation: https://newsapi.org/docs
 */

const NEWS_API_BASE_URL = 'https://newsapi.org/v2';
const DEFAULT_QUERY = 'government shutdown OR federal shutdown';
const MAX_ARTICLES = 100; // Limit articles for safety

/**
 * Fetch with timeout using AbortController
 * @param {string} url - URL to fetch
 * @param {number} timeout - Timeout in milliseconds
 * @param {object} options - Fetch options
 * @returns {Promise<Response>}
 */
async function fetchWithTimeout(url, timeout = 10000, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Sanitize text to prevent script injection
 * Uses a more robust approach than regex to avoid incomplete sanitization
 * @param {string} text - Text to sanitize
 * @returns {string} Sanitized text
 */
function sanitizeText(text) {
  if (!text || typeof text !== 'string') return '';
  
  // Trim and limit length first
  let sanitized = text.trim().substring(0, 5000);
  
  // Remove all script and iframe tags with a comprehensive approach
  // Keep removing until none are left (handles nested tags)
  let prevLength = 0;
  while (sanitized.length !== prevLength) {
    prevLength = sanitized.length;
    sanitized = sanitized
      .replace(/<script[^>]*>.*?<\/script>/gis, '')
      .replace(/<iframe[^>]*>.*?<\/iframe>/gis, '')
      .replace(/<script[^>]*>/gi, '')
      .replace(/<\/script>/gi, '')
      .replace(/<iframe[^>]*>/gi, '')
      .replace(/<\/iframe>/gi, '');
  }
  
  // Remove all event handlers (comprehensive list)
  const eventHandlers = [
    'onclick', 'onload', 'onerror', 'onmouseover', 'onmouseout',
    'onmousedown', 'onmouseup', 'onmousemove', 'onfocus', 'onblur',
    'onchange', 'onsubmit', 'onkeydown', 'onkeyup', 'onkeypress',
    'ondblclick', 'oncontextmenu', 'oninput', 'oninvalid', 'onreset',
    'onsearch', 'onselect', 'ondrag', 'ondrop', 'oncopy', 'oncut', 'onpaste'
  ];
  
  eventHandlers.forEach(handler => {
    const pattern = new RegExp(`\\s*${handler}\\s*=\\s*["'][^"']*["']`, 'gi');
    sanitized = sanitized.replace(pattern, '');
    const pattern2 = new RegExp(`\\s*${handler}\\s*=\\s*[^\\s>]*`, 'gi');
    sanitized = sanitized.replace(pattern2, '');
  });
  
  return sanitized;
}

/**
 * Sanitize article fields
 * @param {object} article - Article object
 * @returns {object} Sanitized article
 */
function sanitizeArticle(article) {
  return {
    title: sanitizeText(article.title),
    description: sanitizeText(article.description),
    url: article.url && typeof article.url === 'string' ? article.url.substring(0, 2000) : '',
    source: article.source?.name ? sanitizeText(article.source.name) : 'Unknown',
    author: sanitizeText(article.author),
    publishedAt: article.publishedAt || '',
    urlToImage: article.urlToImage && typeof article.urlToImage === 'string' ? article.urlToImage.substring(0, 2000) : ''
  };
}

/**
 * Validate NewsAPI response
 * @param {object} data - Response data
 * @returns {boolean} True if valid
 */
function validateResponse(data) {
  if (!data || typeof data !== 'object') return false;
  if (data.status !== 'ok') return false;
  if (!Array.isArray(data.articles)) return false;
  return true;
}

/**
 * Fetch news articles about government shutdowns
 * @param {string} apiKey - NewsAPI key
 * @param {Object} options - Query options
 * @returns {Promise<Object>} News data with articles
 */
export async function fetchNews(apiKey, options = {}) {
  if (!apiKey || apiKey === 'your_newsapi_key_here') {
    return {
      articles: [],
      message: 'NewsAPI key not configured. Add NEWSAPI_KEY to your .env file to enable news features.',
      totalResults: 0
    };
  }

  try {
    // Sanitize and validate options
    const query = (options.query || DEFAULT_QUERY).substring(0, 500); // Limit query length
    const pageSizeInt = Number.parseInt(options.pageSize, 10);
    const pageSize = Number.isNaN(pageSizeInt) ? 20 : Math.min(Math.max(pageSizeInt, 1), 100); // Clamp between 1-100
    const language = (options.language || 'en').substring(0, 2); // Limit to 2 chars
    const sortBy = ['publishedAt', 'relevancy', 'popularity'].includes(options.sortBy) 
      ? options.sortBy 
      : 'publishedAt';

    const url = new URL(`${NEWS_API_BASE_URL}/everything`);
    url.searchParams.append('q', query);
    url.searchParams.append('pageSize', pageSize.toString());
    url.searchParams.append('language', language);
    url.searchParams.append('sortBy', sortBy);
    url.searchParams.append('apiKey', apiKey);

    const response = await fetchWithTimeout(url.toString(), 10000);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (!validateResponse(data)) {
      throw new Error(data.message || 'Invalid response from NewsAPI');
    }

    // Transform and sanitize articles to compact format
    const articles = data.articles
      .slice(0, MAX_ARTICLES)
      .map((article, index) => ({
        id: index + 1,
        ...sanitizeArticle(article)
      }));

    return {
      articles,
      totalResults: Math.min(data.totalResults, MAX_ARTICLES),
      message: null
    };
  } catch (error) {
    console.error('Error fetching news:', error.message);
    
    // Return graceful fallback
    return {
      articles: [],
      message: error.message.includes('HTTP') 
        ? 'NewsAPI service unavailable. Please try again later.'
        : 'Unable to fetch news. Please try again later.',
      error: error.message,
      totalResults: 0
    };
  }
}

/**
 * Fetch top headlines about government/politics
 * @param {string} apiKey - NewsAPI key
 * @param {Object} options - Query options
 * @returns {Promise<Object>} News data with articles
 */
export async function fetchTopHeadlines(apiKey, options = {}) {
  if (!apiKey || apiKey === 'your_newsapi_key_here') {
    return {
      articles: [],
      message: 'NewsAPI key not configured.',
      totalResults: 0
    };
  }

  try {
    // Sanitize and validate options
    const validCategories = ['politics', 'business', 'general'];
    const category = validCategories.includes(options.category) ? options.category : 'politics';
    const country = (options.country || 'us').substring(0, 2).toLowerCase();
    const pageSizeInt = Number.parseInt(options.pageSize, 10);
    const pageSize = Number.isNaN(pageSizeInt) ? 10 : Math.min(Math.max(pageSizeInt, 1), 100);

    const url = new URL(`${NEWS_API_BASE_URL}/top-headlines`);
    url.searchParams.append('category', category);
    url.searchParams.append('country', country);
    url.searchParams.append('pageSize', pageSize.toString());
    url.searchParams.append('apiKey', apiKey);

    const response = await fetchWithTimeout(url.toString(), 10000);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (!validateResponse(data)) {
      throw new Error(data.message || 'Invalid response from NewsAPI');
    }

    // Transform and sanitize articles
    const articles = data.articles
      .slice(0, MAX_ARTICLES)
      .map((article, index) => ({
        id: index + 1,
        ...sanitizeArticle(article)
      }));

    return {
      articles,
      totalResults: Math.min(data.totalResults, MAX_ARTICLES),
      message: null
    };
  } catch (error) {
    console.error('Error fetching top headlines:', error.message);
    
    return {
      articles: [],
      message: error.message.includes('HTTP')
        ? 'NewsAPI service unavailable. Please try again later.'
        : 'Unable to fetch headlines.',
      error: error.message,
      totalResults: 0
    };
  }
}

export default {
  fetchNews,
  fetchTopHeadlines,
  fetchWithTimeout
};
