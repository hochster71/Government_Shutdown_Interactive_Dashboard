/**
 * NewsAPI Adapter - Proxies requests to NewsAPI using native fetch
 * Documentation: https://newsapi.org/docs
 */

const NEWS_API_BASE_URL = 'https://newsapi.org/v2';
const DEFAULT_QUERY = 'government shutdown OR federal shutdown';
const REQUEST_TIMEOUT = 10000; // 10 seconds

/**
 * Make request with timeout using AbortController
 */
async function fetchWithTimeout(url, params, timeout = REQUEST_TIMEOUT) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await axios.get(url, {
      params,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
      throw new Error('Request timeout');
    }
    throw error;
  }
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
    const query = options.query || DEFAULT_QUERY;
    const pageSize = Math.min(options.pageSize || 20, MAX_ARTICLES);
    const language = options.language || 'en';
    const sortBy = options.sortBy || 'publishedAt';

    const response = await fetchWithTimeout(`${NEWS_API_BASE_URL}/everything`, {
      q: query,
      pageSize,
      language,
      sortBy,
      apiKey
    });

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
      message: error.response?.data?.message || error.message || 'Unable to fetch news. Please try again later.',
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
    const category = options.category || 'politics';
    const country = options.country || 'us';
    const pageSize = Math.min(options.pageSize || 10, MAX_ARTICLES);

    const response = await fetchWithTimeout(`${NEWS_API_BASE_URL}/top-headlines`, {
      category,
      country,
      pageSize,
      apiKey
    });

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
      message: error.response?.data?.message || error.message || 'Unable to fetch headlines.',
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
