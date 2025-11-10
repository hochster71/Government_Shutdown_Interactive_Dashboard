import { useEffect, useState } from 'react'
import { apiGet } from '../utils/api'
import { logger } from '../utils/logger'

interface NoticeItem {
  title: string
  url: string
  excerpt?: string
}

interface SourceResult {
  source: string
  file?: string | null
  items: NoticeItem[]
}

function OfficialNotices() {
  const [results, setResults] = useState<SourceResult[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadOfficial()
  }, [])

  const loadOfficial = async () => {
    try {
      setLoading(true)
      const data = await apiGet<{ results: SourceResult[] }>('/api/official')
      setResults(data.results || [])
      setLoading(false)
    } catch (error: any) {
      logger.error('Failed to load official notices', error)
      setResults([])
      setLoading(false)
    }
  }

  if (loading) return (
    <div className="card">
      <div className="card-body">
        <div className="spinner"></div>
        <p style={{ color: 'var(--color-text-muted)' }}>Loading official notices...</p>
      </div>
    </div>
  )

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">🏛️ Official Notices</h2>
      </div>
      <div className="card-body">
        {results.map((r) => (
          <div key={r.source} style={{ marginBottom: 'var(--spacing-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ marginBottom: 'var(--spacing-sm)' }}>{r.source}</h4>
              <span className="badge badge-yellow" style={{ fontSize: '0.8rem' }}>{r.file ? r.file.replace(/\.html$/, '') : 'no-snapshot'}</span>
            </div>
            {r.items.length === 0 && (
              <p style={{ color: 'var(--color-text-secondary)' }}>No recent official notices found for {r.source}.</p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
              {r.items.slice(0,5).map((it, idx) => (
                <div key={idx} style={{ padding: 'var(--spacing-sm)', background: 'var(--color-bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                  <a href={it.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-accent-blue)', fontWeight: 700 }}>{it.title}</a>
                  {it.excerpt && <p style={{ marginTop: 'var(--spacing-xs)', color: 'var(--color-text-secondary)' }}>{it.excerpt.substring(0,200)}{it.excerpt.length>200?'…':''}</p>}
                  <div style={{ marginTop: 'var(--spacing-xs)', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    <span className="badge badge-small">{r.source}</span>
                    <a href={it.url} target="_blank" rel="noopener noreferrer" style={{ marginLeft: '8px', color: 'var(--color-accent-blue)' }}>View original →</a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default OfficialNotices
