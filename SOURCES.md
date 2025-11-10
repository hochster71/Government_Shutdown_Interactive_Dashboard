# Data Sources and Citations

This project aggregates data from multiple public sources to provide comprehensive information about US Government shutdowns.

## Primary Data Sources

### 1. Wikipedia - Government Shutdowns in the United States
- **URL**: https://en.wikipedia.org/wiki/Government_shutdowns_in_the_United_States
- **Usage**: Historical shutdown data, dates, durations, and affected agencies
- **License**: Creative Commons Attribution-ShareAlike 3.0 Unported License (CC BY-SA 3.0)
- **Last Accessed**: 2024

### 2. NewsAPI
- **URL**: https://newsapi.org/
- **Usage**: Current news articles related to government shutdowns
- **License**: Proprietary - Requires API key
- **Attribution**: Article sources and authors are displayed with each news item

### 3. GovInfo.gov
- **URL**: https://www.govinfo.gov/
- **Usage**: Official government documents, appropriations bills, and legislative records
- **License**: Public Domain - US Government Works
- **Attribution**: Official US Government source

## Data Processing

All data is retrieved, processed, and displayed in accordance with each source's terms of service and licensing requirements. This application:

- Caches data to minimize API requests
- Implements rate limiting to respect API quotas
- Displays proper attribution for all sources
- Provides direct links to original sources

## Economic Impact Calculations

Economic impact estimates are derived from:
- Congressional Budget Office (CBO) reports
- Office of Management and Budget (OMB) data
- Historical economic analyses
- Academic research papers

## Attribution

This dashboard was created by **Michael Hoch** as an educational tool for understanding the historical and economic impacts of US Government shutdowns.

## Updates and Corrections

Data sources are automatically updated every 6 hours using a secure scheduling system. The dashboard is currently tracking the ongoing 2025 government shutdown (started October 1, 2025). If you notice any inaccuracies, please open an issue in the GitHub repository.

## Third-Party Libraries

This project uses several open-source libraries. See `package.json` files for complete dependency lists and their respective licenses.
