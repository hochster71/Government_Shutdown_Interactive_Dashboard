import axios from 'axios';

/**
 * NewsAPI Adapter - Proxies requests to NewsAPI
 * Documentation: https://newsapi.org/docs
 */

const NEWS_API_BASE_URL = 'https://newsapi.org/v2';
const DEFAULT_QUERY = 'government shutdown OR federal shutdown';

/**
 * Fetch news articles about government shutdowns
 * @param {string} apiKey - NewsAPI key
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of news articles
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
    const pageSize = options.pageSize || 20;
    const language = options.language || 'en';
    const sortBy = options.sortBy || 'publishedAt';

    const response = await axios.get(`${NEWS_API_BASE_URL}/everything`, {
      params: {
        q: query,
        pageSize,
        language,
        sortBy,
        apiKey
      },
      timeout: 10000
    });

    if (response.data.status === 'ok') {
      // Transform articles to compact format
      const articles = response.data.articles.map((article, index) => ({
        id: index + 1,
        title: article.title,
        description: article.description,
        url: article.url,
        source: article.source.name,
        author: article.author,
        publishedAt: article.publishedAt,
        urlToImage: article.urlToImage
      }));

      return {
        articles,
        totalResults: response.data.totalResults,
        message: null
      };
    } else {
      throw new Error(response.data.message || 'NewsAPI returned error status');
    }
  } catch (error) {
    console.error('Error fetching news:', error.message);
    
    // Return graceful fallback
    return {
      articles: [],
      message: error.response?.data?.message || 'Unable to fetch news. Please try again later.',
      error: error.message,
      totalResults: 0
    };
  }
}

/**
 * Fetch top headlines about government/politics
 * @param {string} apiKey - NewsAPI key
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of news articles
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
    const pageSize = options.pageSize || 10;

    const response = await axios.get(`${NEWS_API_BASE_URL}/top-headlines`, {
      params: {
        category,
        country,
        pageSize,
        apiKey
      },
      timeout: 10000
    });

    if (response.data.status === 'ok') {
      const articles = response.data.articles.map((article, index) => ({
        id: index + 1,
        title: article.title,
        description: article.description,
        url: article.url,
        source: article.source.name,
        author: article.author,
        publishedAt: article.publishedAt,
        urlToImage: article.urlToImage
      }));

      return {
        articles,
        totalResults: response.data.totalResults,
        message: null
      };
    } else {
      throw new Error(response.data.message || 'NewsAPI returned error status');
    }
  } catch (error) {
    console.error('Error fetching top headlines:', error.message);
    
    return {
      articles: [],
      message: error.response?.data?.message || 'Unable to fetch headlines.',
      error: error.message,
      totalResults: 0
    };
  }
}

export default {
  fetchNews,
  fetchTopHeadlines
};
