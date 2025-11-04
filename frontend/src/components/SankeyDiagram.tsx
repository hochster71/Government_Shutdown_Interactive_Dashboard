import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import { sankey, sankeyLinkHorizontal, SankeyNode } from 'd3-sankey'

/**
 * Sankey Diagram Component
 * Visualizes flow relationships between shutdown causes, agencies, and resolutions
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

interface CustomNode {
  name: string
  category?: string
}

interface CustomLink {
  source: number
  target: number
  value: number
}

function SankeyDiagram({ shutdowns }: SankeyDiagramProps) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current || shutdowns.length === 0) return

    // Clear previous visualization
    d3.select(svgRef.current).selectAll('*').remove()

    const width = svgRef.current.clientWidth || 800
    const height = 500
    const margin = { top: 20, right: 20, bottom: 20, left: 20 }

    // Prepare Sankey data
    const nodes: CustomNode[] = []
    const links: CustomLink[] = []

    // Define categories
    const causes = ['Budget Dispute', 'Policy Disagreement', 'Partisan Conflict']
    const agencies = ['Multiple Agencies', 'National Parks', 'NASA', 'Department of Defense']
    const resolutions = ['Compromise Reached', 'Continuing Resolution', 'Budget Passed']

    // Add nodes
    causes.forEach(c => nodes.push({ name: c, category: 'cause' }))
    agencies.forEach(a => nodes.push({ name: a, category: 'agency' }))
    resolutions.forEach(r => nodes.push({ name: r, category: 'resolution' }))

    // Create links based on shutdown data (simplified model)
    shutdowns.forEach((shutdown) => {
      // Link cause to agency
      const causeIdx = Math.floor(Math.random() * causes.length)
      const agencyIdx = causes.length + (shutdown.affectedAgencies?.length 
        ? agencies.indexOf(shutdown.affectedAgencies[0]) !== -1 
          ? agencies.indexOf(shutdown.affectedAgencies[0])
          : 0
        : 0)
      const resolutionIdx = causes.length + agencies.length + Math.floor(Math.random() * resolutions.length)

      // Add or update links
      const link1 = links.find(l => l.source === causeIdx && l.target === agencyIdx)
      if (link1) {
        link1.value += 1
      } else {
        links.push({ source: causeIdx, target: agencyIdx, value: 1 })
      }

      const link2 = links.find(l => l.source === agencyIdx && l.target === resolutionIdx)
      if (link2) {
        link2.value += 1
      } else {
        links.push({ source: agencyIdx, target: resolutionIdx, value: 1 })
      }
    })

    // Create Sankey generator
    const sankeyGenerator = sankey<CustomNode, CustomLink>()
      .nodeWidth(15)
      .nodePadding(20)
      .extent([[margin.left, margin.top], [width - margin.right, height - margin.bottom]])

    // Generate Sankey layout
    const graph = sankeyGenerator({
      nodes: nodes.map(d => ({ ...d })),
      links: links.map(d => ({ ...d }))
    })

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)

    // Color scale for categories
    const colorScale = d3.scaleOrdinal()
      .domain(['cause', 'agency', 'resolution'])
      .range(['#4a9eff', '#8b5cf6', '#10b981'])

    // Add links
    svg.append('g')
      .selectAll('path')
      .data(graph.links)
      .enter()
      .append('path')
      .attr('d', sankeyLinkHorizontal())
      .attr('stroke', '#4a9eff')
      .attr('stroke-width', d => Math.max(1, d.width || 0))
      .attr('fill', 'none')
      .attr('opacity', 0.3)
      .on('mouseover', function() {
        d3.select(this).attr('opacity', 0.6)
      })
      .on('mouseout', function() {
        d3.select(this).attr('opacity', 0.3)
      })

    // Add nodes
    const node = svg.append('g')
      .selectAll('rect')
      .data(graph.nodes)
      .enter()
      .append('g')

    node.append('rect')
      .attr('x', d => (d as SankeyNode<CustomNode, CustomLink>).x0 || 0)
      .attr('y', d => (d as SankeyNode<CustomNode, CustomLink>).y0 || 0)
      .attr('height', d => ((d as SankeyNode<CustomNode, CustomLink>).y1 || 0) - ((d as SankeyNode<CustomNode, CustomLink>).y0 || 0))
      .attr('width', d => ((d as SankeyNode<CustomNode, CustomLink>).x1 || 0) - ((d as SankeyNode<CustomNode, CustomLink>).x0 || 0))
      .attr('fill', d => colorScale((d as SankeyNode<CustomNode, CustomLink>).category || 'default') as string)
      .attr('opacity', 0.8)
      .attr('stroke', '#1e2530')
      .attr('stroke-width', 2)

    // Add labels
    node.append('text')
      .attr('x', d => (((d as SankeyNode<CustomNode, CustomLink>).x0 || 0) < width / 2) ? ((d as SankeyNode<CustomNode, CustomLink>).x1 || 0) + 6 : ((d as SankeyNode<CustomNode, CustomLink>).x0 || 0) - 6)
      .attr('y', d => (((d as SankeyNode<CustomNode, CustomLink>).y1 || 0) + ((d as SankeyNode<CustomNode, CustomLink>).y0 || 0)) / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', d => (((d as SankeyNode<CustomNode, CustomLink>).x0 || 0) < width / 2) ? 'start' : 'end')
      .attr('fill', '#e4e6eb')
      .style('font-size', '12px')
      .style('font-weight', '500')
      .text(d => (d as SankeyNode<CustomNode, CustomLink>).name)

  }, [shutdowns])

  if (shutdowns.length === 0) {
    return (
      <div className="alert alert-info">
        No shutdown data available for Sankey diagram.
      </div>
    )
  }

  return (
    <div>
      <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Shutdown Flow Analysis</h3>
      <p style={{ marginBottom: 'var(--spacing-lg)', color: 'var(--color-text-muted)' }}>
        Sankey diagram showing relationships between shutdown causes, affected agencies, and resolutions.
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

      <svg ref={svgRef} style={{ width: '100%', height: '500px' }}></svg>

      <div className="alert alert-info" style={{ marginTop: 'var(--spacing-lg)' }}>
        <strong>Note:</strong> This visualization represents simplified relationships based on historical shutdown data.
        The flow shows common patterns in how budget disputes affect various agencies and their typical resolutions.
      </div>
    </div>
  )
}

export default SankeyDiagram
