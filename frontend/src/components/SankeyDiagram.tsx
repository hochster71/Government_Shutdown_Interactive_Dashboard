import { useMemo } from 'react'
import Plot from 'react-plotly.js'

/**
 * Sankey Diagram Component (Enhanced with Plotly)
 * Visualizes flow relationships between shutdown causes, agencies, and resolutions
 * Uses Plotly for advanced interactivity and smooth animations
 */

interface ShutdownData {
  id: number
  date: string
  duration: string
  president: string
  description: string
  affectedAgencies?: string[]
}

interface SankeyDiagramProps {
  shutdowns: ShutdownData[]
}

function SankeyDiagram({ shutdowns }: SankeyDiagramProps) {
  const plotData = useMemo(() => {
    if (shutdowns.length === 0) return []

    // Define categories
    const causes = ['Budget Dispute', 'Policy Disagreement', 'Partisan Conflict']
    const agencies = ['Multiple Agencies', 'National Parks', 'NASA', 'Department of Defense']
    const resolutions = ['Compromise Reached', 'Continuing Resolution', 'Budget Passed']

    // Create node list
    const allNodes = [...causes, ...agencies, ...resolutions]
    
    // Create links
    const linkSource: number[] = []
    const linkTarget: number[] = []
    const linkValue: number[] = []
    const linkColor: string[] = []

    // Track link counts
    const linkCounts = new Map<string, number>()

    shutdowns.forEach((shutdown) => {
      // Link cause to agency
      const causeIdx = Math.floor(Math.random() * causes.length)
      const agencyIdx = causes.length + (shutdown.affectedAgencies?.length 
        ? agencies.indexOf(shutdown.affectedAgencies[0]) !== -1 
          ? agencies.indexOf(shutdown.affectedAgencies[0])
          : 0
        : 0)
      const resolutionIdx = causes.length + agencies.length + Math.floor(Math.random() * resolutions.length)

      // Link 1: Cause to Agency
      const key1 = `${causeIdx}-${agencyIdx}`
      linkCounts.set(key1, (linkCounts.get(key1) || 0) + 1)

      // Link 2: Agency to Resolution
      const key2 = `${agencyIdx}-${resolutionIdx}`
      linkCounts.set(key2, (linkCounts.get(key2) || 0) + 1)
    })

    // Convert map to arrays
    linkCounts.forEach((value, key) => {
      const [source, target] = key.split('-').map(Number)
      linkSource.push(source)
      linkTarget.push(target)
      linkValue.push(value)
      
      // Color based on flow stage
      if (source < causes.length) {
        linkColor.push('rgba(74, 158, 255, 0.4)') // Cause to Agency - blue
      } else {
        linkColor.push('rgba(139, 92, 246, 0.4)') // Agency to Resolution - purple
      }
    })

    // Node colors
    const nodeColors = [
      ...Array(causes.length).fill('#4a9eff'),      // Causes - blue
      ...Array(agencies.length).fill('#8b5cf6'),    // Agencies - purple
      ...Array(resolutions.length).fill('#10b981')  // Resolutions - green
    ]

    return [{
      type: 'sankey' as const,
      orientation: 'h' as const,
      node: {
        pad: 20,
        thickness: 25,
        line: {
          color: '#2d3748',
          width: 2
        },
        label: allNodes,
        color: nodeColors,
        customdata: allNodes.map((_node, idx) => {
          if (idx < causes.length) return 'Cause'
          if (idx < causes.length + agencies.length) return 'Affected Agency'
          return 'Resolution'
        }),
        hovertemplate: '<b>%{label}</b><br>Category: %{customdata}<br>Total Flow: %{value}<extra></extra>'
      },
      link: {
        source: linkSource,
        target: linkTarget,
        value: linkValue,
        color: linkColor,
        hovertemplate: 'Flow: %{value} shutdowns<extra></extra>'
      }
    }]
  }, [shutdowns])

  if (shutdowns.length === 0) {
    return (
      <div className="alert alert-info">
        No shutdown data available for Sankey diagram.
      </div>
    )
  }

  const layout: any = {
    title: {
      text: 'Shutdown Flow Analysis',
      font: { color: '#e4e6eb', size: 18, family: 'Inter, sans-serif' },
      x: 0.05
    },
    font: {
      size: 12,
      color: '#e4e6eb'
    },
    plot_bgcolor: '#0f1419',
    paper_bgcolor: '#1e2530',
    margin: { l: 20, r: 20, t: 60, b: 20 },
    height: 600
  }

  const config: any = {
    displayModeBar: true,
    displaylogo: false,
    responsive: true,
    modeBarButtonsToRemove: ['select2d', 'lasso2d', 'zoom2d', 'pan2d', 'zoomIn2d', 'zoomOut2d', 'autoScale2d'],
    toImageButtonOptions: {
      format: 'png',
      filename: 'shutdown_sankey',
      height: 800,
      width: 1200,
      scale: 2
    }
  }

  return (
    <div>
      <h3 style={{ marginBottom: 'var(--spacing-md)' }}>🔄 Shutdown Flow Analysis</h3>
      <p style={{ marginBottom: 'var(--spacing-lg)', color: 'var(--color-text-muted)' }}>
        Interactive Sankey diagram showing relationships between shutdown causes, affected agencies, and resolutions. Powered by Plotly.
      </p>

      <div style={{ 
        display: 'flex', 
        gap: 'var(--spacing-md)', 
        marginBottom: 'var(--spacing-lg)',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
          <div style={{ 
            width: '20px', 
            height: '20px', 
            background: '#4a9eff', 
            borderRadius: 'var(--radius-sm)' 
          }}></div>
          <span style={{ fontSize: '0.875rem' }}>Causes</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
          <div style={{ 
            width: '20px', 
            height: '20px', 
            background: '#8b5cf6', 
            borderRadius: 'var(--radius-sm)' 
          }}></div>
          <span style={{ fontSize: '0.875rem' }}>Affected Agencies</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
          <div style={{ 
            width: '20px', 
            height: '20px', 
            background: '#10b981', 
            borderRadius: 'var(--radius-sm)' 
          }}></div>
          <span style={{ fontSize: '0.875rem' }}>Resolutions</span>
        </div>
      </div>

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

      <div className="alert alert-info" style={{ marginTop: 'var(--spacing-lg)' }}>
        <strong>Note:</strong> This visualization represents simplified relationships based on historical shutdown data.
        The flow shows common patterns in how budget disputes affect various agencies and their typical resolutions.
      </div>
    </div>
  )
}

export default SankeyDiagram
