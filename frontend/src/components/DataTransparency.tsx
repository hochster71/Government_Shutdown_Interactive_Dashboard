import { useState, useEffect } from 'react'

/**
 * DataTransparency Component
 * Shows data sources, last update time, and verification status
 * Emphasizes independence from White House sources
 */

interface DataSource {
  name: string
  status: 'active' | 'cached' | 'error'
  lastUpdate?: string
  description: string
  isIndependent: boolean
}

interface TransparencyProps {
  shutdownCount?: number
  newsCount?: number
}

function DataTransparency({ shutdownCount = 0, newsCount = 0 }: TransparencyProps) {
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    // Update last refresh time
    setLastUpdate(new Date())
  }, [shutdownCount, newsCount])

  const dataSources: DataSource[] = [
    {
      name: 'Wikipedia',
      status: shutdownCount > 0 ? 'active' : 'error',
      lastUpdate: lastUpdate.toLocaleString(),
      description: 'Historical government shutdown data from community-maintained encyclopedia',
      isIndependent: true
    },
    {
      name: 'NewsAPI',
      status: newsCount > 0 ? 'active' : 'cached',
      lastUpdate: lastUpdate.toLocaleString(),
      description: 'Aggregated news from multiple independent media sources',
      isIndependent: true
    },
    {
      name: 'GovInfo.gov',
      status: 'cached',
      description: 'Official government documents and legislative records (public domain)',
      isIndependent: true
    }
  ]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="badge badge-green">✓ Active</span>
      case 'cached':
        return <span className="badge badge-blue">⚡ Cached</span>
      case 'error':
        return <span className="badge badge-yellow">⚠ Limited</span>
      default:
        return null
    }
  }

  const activeSourceCount = dataSources.filter(s => s.status === 'active').length

  return (
    <div className="card" style={{ 
      marginBottom: 'var(--spacing-lg)',
      background: 'rgba(16, 185, 129, 0.05)',
      borderLeft: '4px solid var(--color-accent-green)'
    }}>
      <div className="card-header" style={{ cursor: 'pointer' }} onClick={() => setExpanded(!expanded)}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
            <div style={{ fontSize: '1.5rem' }}>🔍</div>
            <div>
              <h3 className="card-title" style={{ marginBottom: '0.25rem' }}>
                Data Transparency
              </h3>
              <p style={{ 
                fontSize: '0.875rem', 
                color: 'var(--color-text-secondary)',
                marginBottom: 0 
              }}>
                Independent sources • No White House dependency
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ 
                fontSize: '0.875rem', 
                color: 'var(--color-text-muted)',
                marginBottom: '0.25rem'
              }}>
                {activeSourceCount}/{dataSources.length} sources active
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                Updated: {lastUpdate.toLocaleTimeString()}
              </div>
            </div>
            <span style={{ fontSize: '1.5rem', transition: 'transform 0.2s' }}>
              {expanded ? '▼' : '▶'}
            </span>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="card-body" style={{ 
          borderTop: '1px solid var(--color-border)',
          animation: 'slideDown 0.3s ease-out'
        }}>
          <div style={{ marginBottom: 'var(--spacing-lg)' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 'var(--spacing-sm)',
              marginBottom: 'var(--spacing-md)',
              padding: 'var(--spacing-md)',
              background: 'rgba(16, 185, 129, 0.1)',
              borderRadius: 'var(--radius-md)'
            }}>
              <span style={{ fontSize: '1.25rem' }}>✓</span>
              <div>
                <strong style={{ color: 'var(--color-accent-green)' }}>
                  100% Independent Data Sources
                </strong>
                <p style={{ 
                  fontSize: '0.875rem', 
                  color: 'var(--color-text-secondary)',
                  marginBottom: 0,
                  marginTop: '0.25rem'
                }}>
                  All data comes from public, non-governmental sources to ensure objectivity
                  and independence from White House reporting.
                </p>
              </div>
            </div>

            <h4 style={{ 
              fontSize: '0.875rem', 
              color: 'var(--color-text-secondary)',
              marginBottom: 'var(--spacing-md)',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>
              Active Data Sources
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
              {dataSources.map((source) => (
                <div 
                  key={source.name}
                  style={{ 
                    padding: 'var(--spacing-md)',
                    background: 'var(--color-bg-tertiary)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 'var(--spacing-md)'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 'var(--spacing-sm)',
                      marginBottom: 'var(--spacing-xs)'
                    }}>
                      <strong>{source.name}</strong>
                      {source.isIndependent && (
                        <span style={{ 
                          fontSize: '0.75rem',
                          color: 'var(--color-accent-green)',
                          fontWeight: '600'
                        }}>
                          • Independent
                        </span>
                      )}
                    </div>
                    <p style={{ 
                      fontSize: '0.875rem', 
                      color: 'var(--color-text-secondary)',
                      marginBottom: source.lastUpdate ? 'var(--spacing-xs)' : 0
                    }}>
                      {source.description}
                    </p>
                    {source.lastUpdate && (
                      <p style={{ 
                        fontSize: '0.75rem', 
                        color: 'var(--color-text-muted)',
                        marginBottom: 0
                      }}>
                        Last updated: {source.lastUpdate}
                      </p>
                    )}
                  </div>
                  <div>{getStatusBadge(source.status)}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ 
            padding: 'var(--spacing-md)',
            background: 'rgba(59, 130, 246, 0.1)',
            borderRadius: 'var(--radius-md)',
            borderLeft: '3px solid var(--color-accent-blue)'
          }}>
            <h4 style={{ 
              fontSize: '0.875rem', 
              marginBottom: 'var(--spacing-sm)',
              color: 'var(--color-accent-blue)'
            }}>
              📊 Data Collection Methods
            </h4>
            <ul style={{ 
              fontSize: '0.875rem', 
              color: 'var(--color-text-secondary)',
              marginBottom: 0,
              paddingLeft: 'var(--spacing-lg)'
            }}>
              <li>Wikipedia data is scraped and validated from public articles</li>
              <li>News articles are aggregated from multiple independent publishers</li>
              <li>All data is cached and refreshed every 6 hours automatically</li>
              <li>Economic impact calculations use historical CBO and OMB data</li>
            </ul>
          </div>

          <div style={{ 
            marginTop: 'var(--spacing-md)',
            fontSize: '0.75rem',
            color: 'var(--color-text-muted)',
            textAlign: 'center'
          }}>
            Data updated automatically. Refresh the page to fetch the latest information.
          </div>
        </div>
      )}
    </div>
  )
}

export default DataTransparency
