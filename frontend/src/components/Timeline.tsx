import { useEffect, useRef } from 'react'
import * as d3 from 'd3'

/**
 * Timeline Component
 * Displays historical government shutdowns on an interactive timeline
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
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current || shutdowns.length === 0) return

    // Clear previous visualization
    d3.select(svgRef.current).selectAll('*').remove()

    const width = svgRef.current.clientWidth || 800
    const height = 400
    const margin = { top: 40, right: 40, bottom: 60, left: 60 }
    const innerWidth = width - margin.left - margin.right
    const innerHeight = height - margin.top - margin.bottom

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`)

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

    // Create scales
    const xScale = d3.scaleLinear()
      .domain([d3.min(timelineData, d => d.year) || 1980, d3.max(timelineData, d => d.year) || 2024])
      .range([0, innerWidth])

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(timelineData, d => d.durationDays) || 40])
      .range([innerHeight, 0])

    // Add axes
    const xAxis = d3.axisBottom(xScale)
      .tickFormat(d => d.toString())
      .ticks(10)

    const yAxis = d3.axisLeft(yScale)
      .ticks(5)

    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis)
      .attr('color', '#b8bcc8')
      .selectAll('text')
      .style('font-size', '12px')

    g.append('g')
      .call(yAxis)
      .attr('color', '#b8bcc8')
      .selectAll('text')
      .style('font-size', '12px')

    // Add axis labels
    g.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + 45)
      .attr('text-anchor', 'middle')
      .attr('fill', '#e4e6eb')
      .style('font-size', '14px')
      .text('Year')

    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerHeight / 2)
      .attr('y', -45)
      .attr('text-anchor', 'middle')
      .attr('fill', '#e4e6eb')
      .style('font-size', '14px')
      .text('Duration (Days)')

    // Create tooltip
    const tooltip = d3.select('body')
      .append('div')
      .style('position', 'absolute')
      .style('background', '#1e2530')
      .style('padding', '12px')
      .style('border-radius', '8px')
      .style('border', '1px solid #2d3748')
      .style('color', '#e4e6eb')
      .style('font-size', '13px')
      .style('pointer-events', 'none')
      .style('opacity', 0)
      .style('z-index', '1000')

    // Add circles for each shutdown
    g.selectAll('circle')
      .data(timelineData)
      .enter()
      .append('circle')
      .attr('cx', d => xScale(d.year))
      .attr('cy', d => yScale(d.durationDays))
      .attr('r', 0)
      .attr('fill', '#4a9eff')
      .attr('stroke', '#8b5cf6')
      .attr('stroke-width', 2)
      .attr('opacity', 0.8)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('r', 10)
          .attr('opacity', 1)

        tooltip.transition()
          .duration(200)
          .style('opacity', 1)

        tooltip.html(`
          <strong>${d.date}</strong><br/>
          Duration: ${d.duration}<br/>
          President: ${d.president}<br/>
          ${d.economicImpact ? `Impact: ${d.economicImpact}<br/>` : ''}
          ${d.description.substring(0, 100)}...
        `)
          .style('left', (event.pageX + 15) + 'px')
          .style('top', (event.pageY - 15) + 'px')
      })
      .on('mouseout', function() {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('r', 6)
          .attr('opacity', 0.8)

        tooltip.transition()
          .duration(200)
          .style('opacity', 0)
      })
      .transition()
      .duration(800)
      .delay((d, i) => i * 50)
      .attr('r', 6)

    // Cleanup tooltip on unmount
    return () => {
      tooltip.remove()
    }
  }, [shutdowns])

  if (shutdowns.length === 0) {
    return (
      <div className="alert alert-info">
        No shutdown data available to display.
      </div>
    )
  }

  return (
    <div>
      <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Historical Shutdowns Timeline</h3>
      <p style={{ marginBottom: 'var(--spacing-lg)', color: 'var(--color-text-muted)' }}>
        Interactive timeline showing duration and timing of US government shutdowns. Hover over points for details.
      </p>
      <svg ref={svgRef} style={{ width: '100%', height: '400px' }}></svg>
      
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
