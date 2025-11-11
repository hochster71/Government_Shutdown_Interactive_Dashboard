import { useEffect, useState } from 'react'
import { apiGet } from '../utils/api'

/**
 * Source Citations Component
 * Displays data sources and proper attribution
 */

interface Source {
  name: string
  url: string
  description: string
  license: string
  type: string
  enabled?: boolean
}

function SourceCitations() {
  const [sources, setSources] = useState<Source[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSources()
  }, [])

  const loadSources = async () => {
    try {
      const data = await apiGet<{ sources: Source[] }>('/api/sources')
      setSources(data.sources || [])
      setLoading(false)
    } catch (error: any) {
      logger.error('Error fetching sources:', error)
      // Use fallback data
      setSources([
        {
          name: 'Wikipedia',
          url: 'https://en.wikipedia.org/wiki/Government_shutdowns_in_the_United_States',
          description: 'Historical shutdown data, dates, and durations',
          license: 'CC BY-SA 3.0',
          type: 'primary',
          enabled: true
        },
        {
          name: 'NewsAPI',
          url: 'https://newsapi.org/',
          description: 'Real-time news articles about government shutdowns',
          license: 'Proprietary',
          type: 'news',
          enabled: !!process.env.NEWSAPI_KEY && process.env.NEWSAPI_KEY !== 'your_newsapi_key_here'
        },
        {
          name: 'WhiteHouse.gov',
          url: 'https://www.whitehouse.gov/',
          description: 'Official presidential statements and press releases',
          license: 'Public Domain',
          type: 'government',
          enabled: true
        },
        {
          name: 'Congress.gov',
          url: 'https://www.congress.gov/',
          description: 'Legislative text, bill status, and appropriations information',
          license: 'Public Domain',
          type: 'government',
          enabled: true
        },
        {
          name: 'CBO',
          url: 'https://www.cbo.gov/',
          description: 'Budget and economic analysis related to shutdown impacts',
          license: 'Public Domain',
          type: 'government',
          enabled: true
        },
        {
          name: 'OMB',
          url: 'https://www.whitehouse.gov/omb/',
          description: 'Guidance for federal agencies about appropriations and contingencies',
          license: 'Public Domain',
          type: 'government',
          enabled: true
        }
      ])
      setLoading(false)
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'primary':
        return '📚'
      case 'news':
        return '📰'
      case 'government':
        return '🏛️'
      default:
        return '📊'
    }
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'primary':
        return 'badge-blue'
      case 'news':
        return 'badge-green'
      case 'government':
        return 'badge-yellow'
      default:
        return 'badge-blue'
    }
  }

  if (loading) {
    return (
      <div className="card">
        <div className="card-body">
          <div className="loading-container" style={{ minHeight: '100px' }}>
            <div className="spinner"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">📖 Data Sources & Citations</h2>
      </div>
      <div className="card-body">
        <p style={{ marginBottom: 'var(--spacing-lg)', color: 'var(--color-text-secondary)' }}>
          This dashboard aggregates data from multiple public sources. All sources are properly attributed
          and used in accordance with their respective licenses.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
          {sources.map((source, index) => (
            <div
              key={index}
              style={{
                padding: 'var(--spacing-md)',
                background: 'var(--color-bg-tertiary)',
                borderRadius: 'var(--radius-md)',
                borderLeft: '3px solid var(--color-accent-blue)',
                opacity: source.enabled === false ? 0.6 : 1
              }}
            >
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: 'var(--spacing-sm)'
              }}>
                <h4 style={{ marginBottom: 0 }}>
                  {getTypeIcon(source.type)} {source.name}
                </h4>
                <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                  <span className={`badge ${getTypeBadge(source.type)}`}>
                    {source.type}
                  </span>
                  {source.enabled === false && (
                    <span className="badge badge-yellow">Not Configured</span>
                  )}
                </div>
              </div>

              <p style={{ 
                marginBottom: 'var(--spacing-sm)', 
                color: 'var(--color-text-secondary)',
                fontSize: '0.875rem'
              }}>
                {source.description}
              </p>

              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                fontSize: '0.8rem',
                color: 'var(--color-text-muted)'
              }}>
                <span>License: {source.license}</span>
                <a 
                  href={source.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ color: 'var(--color-accent-blue)' }}
                >
                  Visit Source →
                </a>
              </div>

              {source.enabled === false && (
                <div className="alert alert-info" style={{ marginTop: 'var(--spacing-sm)', marginBottom: 0 }}>
                  To enable {source.name}, add the required API key to your .env file.
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{
          marginTop: 'var(--spacing-xl)',
          padding: 'var(--spacing-md)',
          background: 'var(--color-bg-tertiary)',
          borderRadius: 'var(--radius-md)',
          borderLeft: '3px solid var(--color-accent-purple)'
        }}>
          <h5 style={{ marginBottom: 'var(--spacing-sm)' }}>Attribution</h5>
          <p style={{ fontSize: '0.875rem', marginBottom: 'var(--spacing-sm)' }}>
            <strong>Dashboard Design & Development:</strong> Michael Hoch
          </p>
          <p style={{ fontSize: '0.875rem', marginBottom: 'var(--spacing-sm)' }}>
            <strong>Visualization Libraries:</strong> D3.js, Chart.js
          </p>
          <p style={{ fontSize: '0.875rem', marginBottom: 0 }}>
            <strong>License:</strong> This dashboard is released under the MIT License. See{' '}
            <a 
              href="https://github.com/hochster71/Government_Shutdown_Interactive_Dashboard/blob/main/LICENSE" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              LICENSE
            </a>
            {' '}for details.
          </p>
        </div>

        <div className="alert alert-warning" style={{ marginTop: 'var(--spacing-lg)', marginBottom: 0 }}>
          <strong>Data Accuracy:</strong> While we strive for accuracy, data is aggregated from multiple sources
          and may contain discrepancies. Always verify critical information with official government sources.
        </div>
      </div>
    </div>
  )
}

export default SourceCitations
