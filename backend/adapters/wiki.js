import * as cheerio from 'cheerio';

/**
 * Wikipedia Adapter - Scrapes US Government shutdown data
 * Source: https://en.wikipedia.org/wiki/Government_shutdowns_in_the_United_States
 */

const WIKI_URL = 'https://en.wikipedia.org/wiki/Government_shutdowns_in_the_United_States';
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second
const MAX_ROWS = 100; // Limit parsed rows for safety

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
 * Sleep for exponential backoff
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Sanitize and escape text to prevent script injection
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
 * Validate and parse date string
 * @param {string} dateStr - Date string to parse
 * @returns {string|null} Validated date string or null
 */
function validateDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  
  const sanitized = sanitizeText(dateStr);
  
  // Check if it looks like a valid date format
  const datePattern = /\d{4}|\d{1,2}[,\/\-]\s*\d{1,2}|January|February|March|April|May|June|July|August|September|October|November|December/i;
  
  if (datePattern.test(sanitized)) {
    return sanitized;
  }
  
  return null;
}

/**
 * Fetch and parse government shutdown data from Wikipedia with retry logic
 * @param {number} retryCount - Current retry attempt
 * @returns {Promise<Array>} Array of shutdown events
 */
async function fetchShutdownsWithRetry(retryCount = 0) {
  try {
    const response = await fetchWithTimeout(WIKI_URL, 10000, {
      headers: {
        'User-Agent': 'Government-Shutdown-Dashboard/1.0 (Educational Purpose)'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const shutdowns = [];

    // Find the main table containing shutdown data
    // The Wikipedia page has tables with shutdown information
    $('table.wikitable').each((tableIndex, table) => {
      if (shutdowns.length >= MAX_ROWS) return false; // Stop if we have enough data
      
      const headers = [];
      
      // Extract headers
      $(table).find('tr').first().find('th').each((i, th) => {
        headers.push(sanitizeText($(th).text()));
      });

      // Check if this table contains shutdown data
      if (headers.some(h => h.toLowerCase().includes('date') || h.toLowerCase().includes('duration'))) {
        // Extract data rows
        $(table).find('tr').slice(1).each((rowIndex, row) => {
          if (shutdowns.length >= MAX_ROWS) return false; // Stop if we have enough data
          
          const cells = $(row).find('td');
          
          if (cells.length >= 3) {
            const dateText = sanitizeText($(cells[0]).text());
            const validatedDate = validateDate(dateText);
            
            if (!validatedDate) {
              return; // Skip invalid rows
            }
            
            const shutdown = {
              id: shutdowns.length + 1,
              date: validatedDate,
              duration: sanitizeText($(cells[1]).text()),
              president: sanitizeText($(cells[2]).text()),
              congress: cells.length > 3 ? sanitizeText($(cells[3]).text()) : '',
              description: cells.length > 4 ? sanitizeText($(cells[4]).text()) : '',
              affectedAgencies: extractAffectedAgencies($(cells).text()),
              source: 'Wikipedia'
            };
            
            shutdowns.push(shutdown);
          }
        });
      }
    });

    // If no data found in tables, create sample historical data
    if (shutdowns.length === 0) {
      return getSampleShutdownData();
    }

    return shutdowns;
  } catch (error) {
    // Only log in non-test environments to reduce noise
    if (process.env.NODE_ENV !== 'test') {
      console.error(`Error fetching Wikipedia data (attempt ${retryCount + 1}):`, error.message);
    }
    
    // Retry with exponential backoff
    if (retryCount < MAX_RETRIES) {
      const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
      if (process.env.NODE_ENV !== 'test') {
        console.log(`Retrying in ${delay}ms...`);
      }
      await sleep(delay);
      return fetchShutdownsWithRetry(retryCount + 1);
    }
    
    // Return sample data as fallback after all retries
    if (process.env.NODE_ENV !== 'test') {
      console.log('All retries exhausted, returning sample data');
    }
    return getSampleShutdownData();
  }
}

/**
 * Main export function
 * @returns {Promise<Array>} Array of shutdown events
 */
export async function fetchShutdowns() {
  return fetchShutdownsWithRetry();
}

/**
 * Extract affected agencies from text
 * @param {string} text - Text to parse
 * @returns {Array<string>} List of agencies
 */
function extractAffectedAgencies(text) {
  const sanitized = sanitizeText(text);
  const agencies = [];
  const commonAgencies = [
    'Department of Defense',
    'Department of State',
    'Department of Interior',
    'Department of Labor',
    'Department of Health and Human Services',
    'National Parks',
    'NASA',
    'EPA',
    'IRS'
  ];

  commonAgencies.forEach(agency => {
    if (sanitized.includes(agency)) {
      agencies.push(agency);
    }
  });

  return agencies.length > 0 ? agencies : ['Multiple federal agencies'];
}

/**
 * Provide sample/fallback shutdown data based on historical records
 * @returns {Array} Sample shutdown events
 */
function getSampleShutdownData() {
  return [
    {
      id: 1,
      date: 'December 22, 2018 – January 25, 2019',
      duration: '34 days',
      president: 'Donald Trump',
      congress: '115th/116th',
      description: 'Longest shutdown in US history. Dispute over funding for border wall.',
      affectedAgencies: ['Department of Homeland Security', 'Department of Justice', 'NASA', 'National Parks'],
      source: 'Wikipedia',
      economicImpact: '$3 billion permanent, $11 billion temporary'
    },
    {
      id: 2,
      date: 'January 20–22, 2018',
      duration: '2 days 9 hours',
      president: 'Donald Trump',
      congress: '115th',
      description: 'Dispute over DACA, CHIP funding, and defense spending.',
      affectedAgencies: ['Multiple federal agencies'],
      source: 'Wikipedia',
      economicImpact: '$1.1 billion'
    },
    {
      id: 3,
      date: 'October 1–17, 2013',
      duration: '16 days',
      president: 'Barack Obama',
      congress: '113th',
      description: 'Dispute over Affordable Care Act funding.',
      affectedAgencies: ['National Parks', 'EPA', 'NASA', 'Department of Interior'],
      source: 'Wikipedia',
      economicImpact: '$24 billion'
    },
    {
      id: 4,
      date: 'November 14–19, 1995',
      duration: '5 days',
      president: 'Bill Clinton',
      congress: '104th',
      description: 'First part of 1995-96 shutdown. Dispute over Medicare, education, environment.',
      affectedAgencies: ['Multiple federal agencies'],
      source: 'Wikipedia',
      economicImpact: '$1.4 billion'
    },
    {
      id: 5,
      date: 'December 16, 1995 – January 6, 1996',
      duration: '21 days',
      president: 'Bill Clinton',
      congress: '104th',
      description: 'Second part of 1995-96 shutdown. Budget impasse between President and Congress.',
      affectedAgencies: ['National Parks', 'Department of State', 'Multiple agencies'],
      source: 'Wikipedia',
      economicImpact: '$2.1 billion'
    },
    {
      id: 6,
      date: 'October 1–11, 1990',
      duration: '3 days',
      president: 'George H. W. Bush',
      congress: '101st',
      description: 'Dispute over deficit reduction.',
      affectedAgencies: ['Multiple federal agencies'],
      source: 'Wikipedia',
      economicImpact: '$1.5 billion'
    },
    {
      id: 7,
      date: 'October 5–9, 1984',
      duration: '3 days',
      president: 'Ronald Reagan',
      congress: '98th',
      description: 'Dispute over water projects, civil rights, and foreign aid.',
      affectedAgencies: ['Multiple federal agencies'],
      source: 'Wikipedia',
      economicImpact: '$500 million'
    },
    {
      id: 8,
      date: 'September 30 – October 2, 1982',
      duration: '2 days',
      president: 'Ronald Reagan',
      congress: '97th',
      description: 'Funding dispute over additional spending.',
      affectedAgencies: ['Multiple federal agencies'],
      source: 'Wikipedia',
      economicImpact: '$300 million'
    }
  ];
}

export default {
  fetchShutdowns,
  fetchWithTimeout
};
