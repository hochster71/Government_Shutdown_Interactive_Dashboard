# Government Shutdown Research Scripts

This directory contains utility scripts for researching and analyzing government shutdown data from multiple independent sources.

## Available Scripts

### `researchShutdownData.js`

Fetches, analyzes, and reports on the latest government shutdown information from:
- **Wikipedia**: Historical shutdown data
- **NewsAPI**: Current news coverage (requires API key)
- **Political Headlines**: Top political news

#### Usage

```bash
# Run basic research
npm run research

# Save results to JSON file
npm run research:save

# Enable verbose output
npm run research:verbose

# Or run directly
node scripts/researchShutdownData.js [--save] [--verbose]
```

#### Features

- ✅ Fetches historical shutdown data from Wikipedia
- ✅ Analyzes news trends and sentiment
- ✅ Detects potential ongoing shutdowns
- ✅ Provides insights on shutdown frequency by year
- ✅ Identifies crisis-related coverage
- ✅ Optional JSON output for integration

#### Output

The script provides:
- Total number of historical shutdowns
- Recent shutdown details
- Year-by-year shutdown counts
- News article metrics (last 24h, last 7 days)
- Media sentiment analysis
- Data source status

#### Example Output

```
🔍 Starting Government Shutdown Data Research...
================================================================================
Fetching historical shutdown data from Wikipedia...
✅ Retrieved 8 historical shutdowns

Shutdown Insights:
  • Most shutdowns occurred in 1995 (2 shutdowns)
  • Total historical shutdowns: 8

Fetching recent news articles about government shutdowns...
✅ Retrieved 20 news articles

News Insights:
  • 📰 5 articles published in the last 24 hours
  • 📰 15 articles published in the last 7 days
  • ⚠️ Significant shutdown-related coverage

================================================================================
📊 RESEARCH SUMMARY
================================================================================
  ✓ Total historical shutdowns tracked: 8
  ✓ Current news coverage: 20 articles
  ✓ Media sentiment: concerning
  ✓ Articles in last 24h: 5
  ✓ Data sources accessed: 3/3
================================================================================
🎯 Research completed at 11/11/2025, 2:30:00 PM
================================================================================
```

#### Configuration

The script uses environment variables from `.env`:
- `NEWSAPI_KEY`: API key for news coverage (optional but recommended)

Without NewsAPI key, the script will skip news analysis but still provide Wikipedia data.

#### Saved Output

When using `--save` flag, results are saved to `backend/research-results.json` with:
- Timestamp
- Source status for each data provider
- Detailed analysis results
- Summary of key findings

## Integration

These scripts are designed to work independently or as part of the automated update system. They use the same data adapters as the main application to ensure consistency.
