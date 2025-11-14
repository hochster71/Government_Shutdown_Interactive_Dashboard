import { useMemo } from 'react'
import Plot from 'react-plotly.js'

/**
 * Timeline Component (Enhanced with Plotly)
 * Displays historical government shutdowns on an interactive timeline
 * Uses Plotly for advanced interactivity, zoom, and animations
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

interface TimelineProps {
  shutdowns: ShutdownData[]
}

function Timeline({ shutdowns }: TimelineProps) {
  const plotData = useMemo(() => {
    if (shutdowns.length === 0) return []

    // Parse dates and prepare data
    const parseYear = (dateStr: string) => {
      const match = dateStr.match(/\d{4}/)
      return match ? parseInt(match[0]) : 2000
    }

    const parseDuration = (durationStr: string) => {
      const match = durationStr.match(/(\d+)/)
      return match ? parseInt(match[1]) : 1
    }

    const timelineData = shutdowns.map(s => ({
      ...s,
      year: parseYear(s.date),
      durationDays: parseDuration(s.duration)
    }))

    // Create scatter plot trace
    const scatterTrace: any = {
      x: timelineData.map(d => d.year),
      y: timelineData.map(d => d.durationDays),
      mode: 'markers',
      type: 'scatter',
      name: 'Shutdowns',
      marker: {
        size: timelineData.map(d => Math.max(8, d.durationDays / 2)),
        color: timelineData.map(d => d.durationDays),
        colorscale: [
          [0, '#4a9eff'],
          [0.5, '#8b5cf6'],
          [1, '#ec4899']
        ],
        showscale: true,
        colorbar: {
          title: 'Duration<br>(Days)',
          titlefont: { color: '#e4e6eb' },
          tickfont: { color: '#b8bcc8' },
          bgcolor: '#1e2530',
          bordercolor: '#2d3748',
          borderwidth: 1
        },
        line: {
          color: '#8b5cf6',
          width: 2
        },
        opacity: 0.85
      },
      text: timelineData.map(d => 
        `<b>${d.date}</b><br>` +
        `Duration: ${d.duration}<br>` +
        `President: ${d.president}<br>` +
        `${d.economicImpact ? `Impact: ${d.economicImpact}<br>` : ''}` +
        `${d.description.substring(0, 150)}...`
      ),
      hovertemplate: '%{text}<extra></extra>',
    }

    // Add trend line
    const years = timelineData.map(d => d.year)
    const durations = timelineData.map(d => d.durationDays)
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length
    
    const trendTrace: any = {
      x: [Math.min(...years), Math.max(...years)],
      y: [avgDuration, avgDuration],
      mode: 'lines',
      type: 'scatter',
      name: 'Average Duration',
      line: {
        color: '#10b981',
        width: 2,
        dash: 'dash'
      },
      hovertemplate: 'Average: %{y:.1f} days<extra></extra>'
    }

    return [scatterTrace, trendTrace]
  }, [shutdowns])

  if (shutdowns.length === 0) {
    return (
      <div className="alert alert-info">
        No shutdown data available to display.
      </div>
    )
  }

  const layout: any = {
    title: {
      text: 'Historical Shutdowns Timeline',
      font: { color: '#e4e6eb', size: 18, family: 'Inter, sans-serif' },
      x: 0.05
    },
    xaxis: {
      title: { text: 'Year', font: { color: '#e4e6eb', size: 14 } },
      gridcolor: '#2d3748',
      color: '#b8bcc8',
      zeroline: false
    },
    yaxis: {
      title: { text: 'Duration (Days)', font: { color: '#e4e6eb', size: 14 } },
      gridcolor: '#2d3748',
      color: '#b8bcc8',
      zeroline: false
    },
    plot_bgcolor: '#0f1419',
    paper_bgcolor: '#1e2530',
    hovermode: 'closest',
    showlegend: true,
    legend: {
      font: { color: '#e4e6eb' },
      bgcolor: '#1e2530',
      bordercolor: '#2d3748',
      borderwidth: 1,
      x: 0.02,
      y: 0.98
    },
    margin: { l: 60, r: 60, t: 60, b: 60 },
    height: 500,
    dragmode: 'zoom'
  }

  const config: any = {
    displayModeBar: true,
    displaylogo: false,
    responsive: true,
    modeBarButtonsToRemove: ['select2d', 'lasso2d'],
    modeBarButtonsToAdd: ['hoverclosest', 'hovercompare'],
    toImageButtonOptions: {
      format: 'png',
      filename: 'shutdown_timeline',
      height: 800,
      width: 1200,
      scale: 2
    }
  }

  return (
    <div>
      <h3 style={{ marginBottom: 'var(--spacing-md)' }}>📊 Historical Shutdowns Timeline</h3>
      <p style={{ marginBottom: 'var(--spacing-lg)', color: 'var(--color-text-muted)' }}>
        Interactive timeline with advanced controls. Zoom, pan, and hover for detailed information. Powered by Plotly.
      </p>
      
      <div style={{ 
        background: 'var(--color-bg-tertiary)', 
        borderRadius: 'var(--radius-md)',
        padding: 'var(--spacing-sm)',
        marginBottom: 'var(--spacing-lg)'
      }}>
        <Plot
          data={plotData}
          layout={layout}
          config={config}
          style={{ width: '100%', height: '100%' }}
          useResizeHandler={true}
        />
      </div>
      
      {/* Shutdown List */}
      <div style={{ marginTop: 'var(--spacing-xl)' }}>
        <h4 style={{ marginBottom: 'var(--spacing-md)' }}>Shutdown Details</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          {shutdowns.map((shutdown) => (
            <div
              key={shutdown.id}
              style={{
                padding: 'var(--spacing-md)',
                background: 'var(--color-bg-tertiary)',
                borderRadius: 'var(--radius-md)',
                borderLeft: '3px solid var(--color-accent-purple)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-sm)' }}>
                <strong>{shutdown.date}</strong>
                <span className="badge badge-blue">{shutdown.duration}</span>
              </div>
              <p style={{ marginBottom: 'var(--spacing-xs)', color: 'var(--color-text-muted)' }}>
                President: {shutdown.president}
              </p>
              <p style={{ marginBottom: 0, fontSize: '0.875rem' }}>
                {shutdown.description}
              </p>
              {shutdown.economicImpact && (
                <p style={{ 
                  marginTop: 'var(--spacing-sm)', 
                  marginBottom: 0,
                  fontSize: '0.875rem',
                  color: 'var(--color-accent-yellow)'
                }}>
                  Economic Impact: {shutdown.economicImpact}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Timeline
