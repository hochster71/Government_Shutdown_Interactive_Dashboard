#!/usr/bin/env node

/**
 * Government Shutdown Data Research Script
 * 
 * This script fetches, analyzes, and reports on the latest government shutdown information
 * from multiple independent sources (Wikipedia, NewsAPI, GovInfo.gov).
 * 
 * Usage: node backend/scripts/researchShutdownData.js [--save]
 * 
 * Options:
 *   --save    Save research results to a JSON file
 *   --verbose Enable detailed logging
 */

import dotenv from 'dotenv';
import { fetchShutdowns } from '../adapters/wiki.js';
import { fetchNews, fetchTopHeadlines } from '../adapters/newsapi.js';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Parse command line arguments
const args = process.argv.slice(2);
const shouldSave = args.includes('--save');
const verbose = args.includes('--verbose');

/**
 * Log message with optional verbosity
 */
function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : level === 'success' ? '✅' : 'ℹ️';
  console.log(`${prefix} [${timestamp}] ${message}`);
}

/**
 * Analyze shutdown data for insights
 */
function analyzeShutdowns(shutdowns) {
  if (!Array.isArray(shutdowns) || shutdowns.length === 0) {
    return {
      total: 0,
      recent: [],
      insights: ['No shutdown data available']
    };
  }

  const total = shutdowns.length;
  const recent = shutdowns.slice(0, 5);
  
  // Extract insights
  const insights = [];
  
  // Check for ongoing shutdown (mentions "ongoing" or recent dates)
  const ongoingShutdowns = shutdowns.filter(s => 
    s.duration?.toLowerCase().includes('ongoing') ||
    s.description?.toLowerCase().includes('ongoing') ||
    s.description?.toLowerCase().includes('current')
  );
  
  if (ongoingShutdowns.length > 0) {
    insights.push(`⚠️ ${ongoingShutdowns.length} potential ongoing shutdown(s) detected`);
  }
  
  // Count shutdowns by year (if dates are available)
  const yearCounts = {};
  shutdowns.forEach(s => {
    if (s.date) {
      const year = s.date.match(/\d{4}/)?.[0];
      if (year) {
        yearCounts[year] = (yearCounts[year] || 0) + 1;
      }
    }
  });
  
  const mostShutdownsYear = Object.entries(yearCounts)
    .sort((a, b) => b[1] - a[1])[0];
  
  if (mostShutdownsYear) {
    insights.push(`Most shutdowns occurred in ${mostShutdownsYear[0]} (${mostShutdownsYear[1]} shutdowns)`);
  }
  
  insights.push(`Total historical shutdowns: ${total}`);
  
  return {
    total,
    recent,
    yearCounts,
    insights
  };
}

/**
 * Analyze news data for current trends
 */
function analyzeNews(newsData) {
  if (!newsData.articles || newsData.articles.length === 0) {
    return {
      totalArticles: 0,
      recentArticles: [],
      insights: ['No recent news articles found'],
      sentiment: 'neutral'
    };
  }

  const articles = newsData.articles;
  const recentArticles = articles.slice(0, 5);
  
  const insights = [];
  
  // Analyze article freshness
  const today = new Date();
  const oneDayAgo = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  const recentCount = articles.filter(a => {
    const publishDate = new Date(a.publishedAt);
    return publishDate > oneDayAgo;
  }).length;
  
  const weekCount = articles.filter(a => {
    const publishDate = new Date(a.publishedAt);
    return publishDate > oneWeekAgo;
  }).length;
  
  if (recentCount > 0) {
    insights.push(`📰 ${recentCount} articles published in the last 24 hours`);
  }
  
  if (weekCount > 0) {
    insights.push(`📰 ${weekCount} articles published in the last 7 days`);
  }
  
  // Simple sentiment analysis based on keywords
  const shutdownKeywords = articles.filter(a => 
    a.title?.toLowerCase().includes('shutdown') ||
    a.description?.toLowerCase().includes('shutdown')
  ).length;
  
  const crisisKeywords = articles.filter(a =>
    a.title?.toLowerCase().match(/crisis|emergency|urgent|critical/) ||
    a.description?.toLowerCase().match(/crisis|emergency|urgent|critical/)
  ).length;
  
  let sentiment = 'neutral';
  if (crisisKeywords > articles.length * 0.3) {
    sentiment = 'negative';
    insights.push('⚠️ High volume of crisis-related coverage');
  } else if (shutdownKeywords > articles.length * 0.5) {
    sentiment = 'concerning';
    insights.push('⚠️ Significant shutdown-related coverage');
  }
  
  return {
    totalArticles: articles.length,
    recentArticles,
    insights,
    sentiment,
    metrics: {
      last24h: recentCount,
      last7days: weekCount,
      shutdownMentions: shutdownKeywords,
      crisisMentions: crisisKeywords
    }
  };
}

/**
 * Main research function
 */
async function conductResearch() {
  log('🔍 Starting Government Shutdown Data Research...');
  log('================================================================================');
  
  const results = {
    timestamp: new Date().toISOString(),
    sources: {
      wikipedia: { status: 'pending' },
      newsapi: { status: 'pending' },
      topHeadlines: { status: 'pending' }
    },
    analysis: {},
    summary: []
  };

  // 1. Fetch Wikipedia shutdown data
  try {
    log('Fetching historical shutdown data from Wikipedia...', 'info');
    const shutdownData = await fetchShutdowns();
    
    if (shutdownData && Array.isArray(shutdownData)) {
      results.sources.wikipedia = {
        status: 'success',
        dataPoints: shutdownData.length,
        lastUpdated: new Date().toISOString()
      };
      
      const analysis = analyzeShutdowns(shutdownData);
      results.analysis.shutdowns = analysis;
      
      log(`✅ Retrieved ${shutdownData.length} historical shutdowns`, 'success');
      
      if (verbose) {
        log('\nRecent Shutdowns:', 'info');
        analysis.recent.forEach((s, i) => {
          log(`  ${i + 1}. ${s.date || 'Unknown date'} - ${s.description || 'No description'}`, 'info');
        });
      }
      
      log('\nShutdown Insights:', 'info');
      analysis.insights.forEach(insight => log(`  • ${insight}`, 'info'));
      
    } else {
      throw new Error('Invalid data format received');
    }
  } catch (error) {
    log(`Error fetching Wikipedia data: ${error.message}`, 'error');
    results.sources.wikipedia = {
      status: 'error',
      error: error.message
    };
  }

  // 2. Fetch news about shutdowns
  try {
    const apiKey = process.env.NEWSAPI_KEY;
    
    if (!apiKey || apiKey === 'your_newsapi_key_here') {
      log('\n⚠️  NewsAPI key not configured. Skipping news analysis.', 'warn');
      log('   Add NEWSAPI_KEY to .env to enable this feature.', 'warn');
      results.sources.newsapi.status = 'skipped';
      results.sources.topHeadlines.status = 'skipped';
    } else {
      log('\nFetching recent news articles about government shutdowns...', 'info');
      const newsData = await fetchNews(apiKey, { pageSize: 20 });
      
      if (newsData.articles) {
        results.sources.newsapi = {
          status: 'success',
          articleCount: newsData.articles.length,
          totalResults: newsData.totalResults
        };
        
        const newsAnalysis = analyzeNews(newsData);
        results.analysis.news = newsAnalysis;
        
        log(`✅ Retrieved ${newsData.articles.length} news articles`, 'success');
        
        if (verbose) {
          log('\nRecent Articles:', 'info');
          newsAnalysis.recentArticles.forEach((a, i) => {
            log(`  ${i + 1}. ${a.title} (${a.source})`, 'info');
          });
        }
        
        log('\nNews Insights:', 'info');
        newsAnalysis.insights.forEach(insight => log(`  • ${insight}`, 'info'));
      }

      // 3. Fetch top political headlines
      log('\nFetching top political headlines...', 'info');
      const headlinesData = await fetchTopHeadlines(apiKey, { pageSize: 10 });
      
      if (headlinesData.articles) {
        results.sources.topHeadlines = {
          status: 'success',
          articleCount: headlinesData.articles.length
        };
        
        log(`✅ Retrieved ${headlinesData.articles.length} top headlines`, 'success');
        
        if (verbose) {
          log('\nTop Headlines:', 'info');
          headlinesData.articles.slice(0, 5).forEach((a, i) => {
            log(`  ${i + 1}. ${a.title}`, 'info');
          });
        }
      }
    }
  } catch (error) {
    log(`Error fetching news data: ${error.message}`, 'error');
    results.sources.newsapi = {
      status: 'error',
      error: error.message
    };
  }

  // Generate summary
  log('\n================================================================================');
  log('📊 RESEARCH SUMMARY', 'success');
  log('================================================================================');
  
  const summary = [];
  
  if (results.analysis.shutdowns) {
    summary.push(`Total historical shutdowns tracked: ${results.analysis.shutdowns.total}`);
    if (results.analysis.shutdowns.insights.length > 0) {
      results.analysis.shutdowns.insights.forEach(i => summary.push(i));
    }
  }
  
  if (results.analysis.news) {
    summary.push(`Current news coverage: ${results.analysis.news.totalArticles} articles`);
    summary.push(`Media sentiment: ${results.analysis.news.sentiment}`);
    if (results.analysis.news.metrics) {
      summary.push(`Articles in last 24h: ${results.analysis.news.metrics.last24h}`);
    }
  }
  
  const successCount = Object.values(results.sources).filter(s => s.status === 'success').length;
  const totalSources = Object.keys(results.sources).length;
  summary.push(`Data sources accessed: ${successCount}/${totalSources}`);
  
  results.summary = summary;
  
  summary.forEach(s => log(`  ✓ ${s}`, 'success'));
  
  log('\n================================================================================');
  log(`🎯 Research completed at ${new Date().toLocaleString()}`, 'success');
  log('================================================================================\n');

  // Save results if requested
  if (shouldSave) {
    const outputPath = path.join(__dirname, '../research-results.json');
    try {
      await fs.writeFile(outputPath, JSON.stringify(results, null, 2));
      log(`💾 Results saved to: ${outputPath}`, 'success');
    } catch (error) {
      log(`Error saving results: ${error.message}`, 'error');
    }
  }

  return results;
}

// Run the research
if (import.meta.url === `file://${process.argv[1]}`) {
  conductResearch()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      log(`Fatal error: ${error.message}`, 'error');
      if (verbose) {
        console.error(error);
      }
      process.exit(1);
    });
}

export { conductResearch, analyzeShutdowns, analyzeNews };
