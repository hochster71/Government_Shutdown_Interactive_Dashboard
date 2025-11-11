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

### 4. WhiteHouse.gov (Official)
- **URL**: https://www.whitehouse.gov/
- **Usage**: Presidential statements, press releases, and official communications about federal operations
- **License**: Public domain for official texts
- **Last Accessed**: 2025-11-10

### 5. Congress.gov
- **URL**: https://www.congress.gov/
- **Usage**: Legislative text, appropriations bills, committee reports, and status of bills/resolutions
- **License**: Public domain - US Government Works
- **Last Accessed**: 2025-11-10

### 6. Congressional Budget Office (CBO)
- **URL**: https://www.cbo.gov/
- **Usage**: Budgetary and economic impact analyses related to government shutdowns
- **Last Accessed**: 2025-11-10

### 7. Office of Management and Budget (OMB)
- **URL**: https://www.whitehouse.gov/omb/
- **Usage**: Guidance on agency funding, appropriations interpretation, and shutdown contingency plans
- **Last Accessed**: 2025-11-10

### 8. Department / Agency Official Sites (examples)
- **Department of Homeland Security (DHS)**: https://www.dhs.gov/ - agency operational notices and guidance
- **U.S. Treasury**: https://home.treasury.gov/ - financial and payment guidance
- **Social Security Administration (SSA)**: https://www.ssa.gov/ - service impact notices
- **U.S. Postal Service (USPS)**: https://about.usps.com/ - operational guidance and notices
- **National Park Service (NPS)**: https://www.nps.gov/ - park closures and visitor information
- **Last Accessed**: varies (2025-11-10 recommended for checks)

### 9. Major U.S. News Organizations (examples)
- Associated Press (AP): https://apnews.com/
- Reuters (U.S. desk): https://www.reuters.com/
- National Public Radio (NPR): https://www.npr.org/
- The New York Times: https://www.nytimes.com/
- The Washington Post: https://www.washingtonpost.com/
- CNN: https://www.cnn.com/
- Fox News: https://www.foxnews.com/
- Bloomberg: https://www.bloomberg.com/
- Wall Street Journal: https://www.wsj.com/
- USA Today: https://www.usatoday.com/
- Politico: https://www.politico.com/
- The Hill: https://thehill.com/
- Local and regional papers are used where relevant for agency/region-specific impacts.

## Verification & Attribution Guidance

1. Prefer official government sources (WhiteHouse.gov, Congress.gov, agency pages, GovInfo.gov) for statements about funding status, contingency plans, and legal/legislative status. These are primary, authoritative sources.
2. Use major established news organizations (AP, Reuters, NPR, NYT, WaPo, Bloomberg, WSJ, CNN, Fox, Politico, The Hill) for reporting and context; attribute articles to the original outlet and link to the article.
3. For any Wikipedia-derived historical facts, include the Wikipedia URL and, when possible, link to the referenced sources on the Wikipedia page (often GovInfo, CBO, or news articles).
4. Record "Last Accessed" dates for external sources when data is fetched; the automated scheduler updates every 6 hours, and the dashboard caches results to minimize repeated requests.

## How to Contribute Source Updates

If you add or update a source, include:
- URL
- Short description of usage
- License / attribution notes
- Date last accessed (YYYY-MM-DD)

This file will be updated continuously while the shutdown is active to reflect the most current, authoritative sources.

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
