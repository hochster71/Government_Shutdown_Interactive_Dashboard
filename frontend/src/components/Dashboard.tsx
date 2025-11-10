import { useState, useEffect } from 'react'
import { apiGet } from '../utils/api'
import Timeline from './Timeline'
import SankeyDiagram from './SankeyDiagram'
import ImpactCalculator from './ImpactCalculator'
import SourceCitations from './SourceCitations'
import { fetchShutdowns, fetchNews, sanitizeString } from '../utils/api'
import { logger } from '../utils/logger'

/**
 * Dashboard Component
 * Main container for all dashboard widgets and visualizations
 */

interface ShutdownData {
  id: number
  date: string
  duration: string
  president: string
  description: string
  affectedAgencies?: string[]
  economicImpact?: string
}

interface NewsArticle {
  id: number
  title: string
  description: string
  url: string
  source: string
  publishedAt: string
}

function Dashboard() {
  const [shutdowns, setShutdowns] = useState<ShutdownData[]>([])
  const [news, setNews] = useState<NewsArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'timeline' | 'sankey' | 'calculator'>('timeline')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch shutdown data using API utility with timeout
      const shutdownData = await apiGet<{ data: ShutdownData[] }>('/api/shutdowns')
      setShutdowns(shutdownData.data || [])

      // Fetch news (optional) using API utility
      try {
        const newsData = await apiGet<{ articles: NewsArticle[] }>('/api/news', { pageSize: '10' })
        setNews(newsData.articles || [])
      } catch (newsError: any) {
        logger.warn('News fetch failed (optional):', newsError)
      }

      logger.info('Dashboard data loaded successfully')
      setLoading(false)
    } catch (err: any) {
      logger.error('Error fetching data:', err)
      setError(sanitizeString(err.message || 'Failed to load dashboard data. Please try again.'))
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p style={{ color: 'var(--color-text-muted)' }}>Loading dashboard data...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="alert alert-error">
        <strong>Error:</strong> {error}
        <button 
          className="btn btn-primary" 
          style={{ marginLeft: 'var(--spacing-md)' }}
          onClick={fetchData}
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="dashboard fade-in">
      {/* Statistics Cards - Enhanced */}
      <div className="grid grid-cols-3" style={{ marginBottom: 'var(--spacing-xl)' }}>
        <div className="card stat-card glow-on-hover">
          <div className="card-body text-center">
            <div style={{ fontSize: '3rem', marginBottom: 'var(--spacing-xs)' }}>📊</div>
            <h3 className="gradient-text" style={{ 
              fontSize: '3rem', 
              marginBottom: 'var(--spacing-sm)',
              fontWeight: '800'
            }}>
              {shutdowns.length}
            </h3>
            <p style={{ 
              fontSize: '0.9rem', 
              color: 'var(--color-text-secondary)',
              marginBottom: 0,
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>
              Total Shutdowns
            </p>
          </div>
        </div>

        <div className="card stat-card glow-on-hover">
          <div className="card-body text-center">
            <div style={{ fontSize: '3rem', marginBottom: 'var(--spacing-xs)' }}>⏱️</div>
            <h3 style={{ 
              fontSize: '3rem', 
              color: 'var(--color-accent-purple)',
              marginBottom: 'var(--spacing-sm)',
              fontWeight: '800',
              textShadow: '0 0 20px rgba(139, 92, 246, 0.5)'
            }}>
              34
            </h3>
            <p style={{ 
              fontSize: '0.9rem', 
              color: 'var(--color-text-secondary)',
              marginBottom: 0,
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>
              Longest Shutdown (Days)
            </p>
          </div>
        </div>

        <div className="card stat-card glow-on-hover">
          <div className="card-body text-center">
            <div style={{ fontSize: '3rem', marginBottom: 'var(--spacing-xs)' }}>📰</div>
            <h3 style={{ 
              fontSize: '3rem', 
              color: 'var(--color-accent-green)',
              marginBottom: 'var(--spacing-sm)',
              fontWeight: '800',
              textShadow: '0 0 20px rgba(16, 185, 129, 0.5)'
            }}>
              {news.length}
            </h3>
            <p style={{ 
              fontSize: '0.9rem', 
              color: 'var(--color-text-secondary)',
              marginBottom: 0,
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>
              Recent News
            </p>
          </div>
        </div>
      </div>

      {/* Tab Navigation - Enhanced */}
      <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
        <div style={{ 
          display: 'flex', 
          gap: 'var(--spacing-sm)',
          borderBottom: '1px solid var(--color-border)',
          padding: 'var(--spacing-md)',
          paddingBottom: '0'
        }}>
          <button
            className={`btn tab-button ${activeTab === 'timeline' ? 'btn-primary active' : 'btn-secondary'}`}
            onClick={() => setActiveTab('timeline')}
            style={{ borderRadius: 'var(--radius-md) var(--radius-md) 0 0' }}
          >
            📊 Timeline
          </button>
          <button
            className={`btn tab-button ${activeTab === 'sankey' ? 'btn-primary active' : 'btn-secondary'}`}
            onClick={() => setActiveTab('sankey')}
            style={{ borderRadius: 'var(--radius-md) var(--radius-md) 0 0' }}
          >
            🔄 Sankey Diagram
          </button>
          <button
            className={`btn tab-button ${activeTab === 'calculator' ? 'btn-primary active' : 'btn-secondary'}`}
            onClick={() => setActiveTab('calculator')}
            style={{ borderRadius: 'var(--radius-md) var(--radius-md) 0 0' }}
          >
            💰 Impact Calculator
          </button>
        </div>

        <div style={{ padding: 'var(--spacing-lg)' }}>
          {activeTab === 'timeline' && <Timeline shutdowns={shutdowns} />}
          {activeTab === 'sankey' && <SankeyDiagram shutdowns={shutdowns} />}
          {activeTab === 'calculator' && <ImpactCalculator />}
        </div>
      </div>

      {/* News Feed */}
      {news.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">📰 Latest News</h2>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
              {news.slice(0, 5).map((article) => (
                <div 
                  key={article.id} 
                  style={{ 
                    padding: 'var(--spacing-md)',
                    background: 'var(--color-bg-tertiary)',
                    borderRadius: 'var(--radius-md)',
                    borderLeft: '3px solid var(--color-accent-blue)'
                  }}
                >
                  <h4 style={{ marginBottom: 'var(--spacing-xs)' }}>
                    <a href={article.url} target="_blank" rel="noopener noreferrer">
                      {article.title}
                    </a>
                  </h4>
                  <p style={{ 
                    fontSize: '0.875rem', 
                    marginBottom: 'var(--spacing-xs)',
                    color: 'var(--color-text-secondary)'
                  }}>
                    {article.description}
                  </p>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    fontSize: '0.75rem',
                    color: 'var(--color-text-muted)'
                  }}>
                    <span>{article.source}</span>
                    <span>{new Date(article.publishedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Source Citations */}
      <SourceCitations />
    </div>
  )
}

export default Dashboard
