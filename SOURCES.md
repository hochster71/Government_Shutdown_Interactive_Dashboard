# Data Sources and Citations

This project aggregates data from multiple public sources to provide comprehensive information about US Government shutdowns.

## Primary Data Sources

### 1. Wikipedia - Government Shutdowns in the United States
- **URL**: https://en.wikipedia.org/wiki/Government_shutdowns_in_the_United_States
- **Usage**: Historical shutdown data, dates, durations, and affected agencies
- **License**: Creative Commons Attribution-ShareAlike 3.0 Unported License (CC BY-SA 3.0)
- **Last Accessed**: November 2025
- **Security**: All content is sanitized to remove script tags and event handlers before use

### 2. NewsAPI
- **URL**: https://newsapi.org/
- **Usage**: Current news articles related to government shutdowns
- **License**: Proprietary - Requires API key
- **Attribution**: Article sources and authors are displayed with each news item
- **Security**: API key stored in environment variables (NEWSAPI_KEY), never committed to version control

### 3. GovInfo.gov
- **URL**: https://www.govinfo.gov/
- **Usage**: Official government documents, appropriations bills, and legislative records
- **License**: Public Domain - US Government Works
- **Attribution**: Official US Government source

## Data Processing

All data is retrieved, processed, and displayed in accordance with each source's terms of service and licensing requirements. This application:

- **Caches data** to minimize API requests and improve performance
- **Implements rate limiting** to respect API quotas and prevent abuse
- **Sanitizes all content** to prevent XSS attacks and ensure safe rendering
- **Validates input** on both client and server to prevent injection attacks
- **Displays proper attribution** for all sources
- **Provides direct links** to original sources
- **Protects API keys** using environment variables that are never committed to version control

## Security Measures

This application implements comprehensive security hardening:

1. **Content Sanitization**: All scraped content is sanitized to remove script tags, event handlers, and potentially malicious code
2. **Input Validation**: All user inputs are validated using express-validator with strict rules
3. **Output Encoding**: All dynamic content is properly escaped before rendering to prevent XSS
4. **API Key Protection**: Sensitive credentials (NEWSAPI_KEY) are stored in environment variables only
5. **Content-Type Validation**: HTTP responses are validated to ensure expected content types
6. **Request Timeouts**: All external HTTP requests have timeouts to prevent hanging
7. **Rate Limiting**: API endpoints are protected with rate limiting to prevent abuse
8. **CORS Hardening**: Cross-origin requests are restricted to whitelisted origins in production

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
