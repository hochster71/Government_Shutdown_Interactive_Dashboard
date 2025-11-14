import { useState } from 'react'
import Plot from 'react-plotly.js'
import { calculateImpact, sanitizeString } from '../utils/api'
import { logger } from '../utils/logger'

/**
 * Impact Calculator Component (Enhanced with Plotly)
 * Calculate economic impact of government shutdowns with advanced visualizations
 * Features gauge charts, bar charts, and interactive metrics
 */

interface ImpactResult {
  inputs: {
    duration: number
    affectedWorkers: number
    year: number
  }
  impacts: {
    directImpact: number
    totalEconomicImpact: number
    lostProductivity: number
    gdpImpactPercent: string
  }
  formatted: {
    directImpact: string
    totalEconomicImpact: string
    lostProductivity: string
    gdpImpact: string
  }
  note: string
}

function ImpactCalculator() {
  const [duration, setDuration] = useState<number>(30)
  const [affectedWorkers, setAffectedWorkers] = useState<number>(800000)
  const [year] = useState<number>(new Date().getFullYear())
  const [result, setResult] = useState<ImpactResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<{
    duration?: string
    workers?: string
  }>({})

  const validateInputs = (): boolean => {
    const errors: { duration?: string; workers?: string } = {}

    if (duration < 1 || duration > 365) {
      errors.duration = 'Duration must be between 1 and 365 days'
    }

    if (affectedWorkers < 1000 || affectedWorkers > 3000000) {
      errors.workers = 'Affected workers must be between 1,000 and 3,000,000'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleDurationChange = (value: number) => {
    const sanitized = Math.max(1, Math.min(365, Math.floor(value)))
    setDuration(sanitized)
    setValidationErrors(prev => ({ ...prev, duration: undefined }))
  }

  const handleWorkersChange = (value: number) => {
    const sanitized = Math.max(1000, Math.min(3000000, Math.floor(value)))
    setAffectedWorkers(sanitized)
    setValidationErrors(prev => ({ ...prev, workers: undefined }))
  }

  const handleCalculate = async () => {
    if (!validateInputs()) {
      return
    }

    try {
      setLoading(true)
      setError(null)

      logger.info('Calculating impact', { duration, affectedWorkers, year })

      const data = await calculateImpact(duration, affectedWorkers, year)
      setResult(data)
      logger.info('Impact calculated successfully')
    } catch (err: any) {
      logger.error('Error calculating impact:', err)
      setError(sanitizeString(err.message || 'Failed to calculate economic impact. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Economic Impact Calculator</h3>
      <p style={{ marginBottom: 'var(--spacing-lg)', color: 'var(--color-text-muted)' }}>
        Calculate the estimated economic impact of a government shutdown based on duration and affected workers.
      </p>

      <div className="grid grid-cols-2" style={{ marginBottom: 'var(--spacing-lg)' }}>
        <div>
          <label htmlFor="duration">Shutdown Duration (Days)</label>
          <input
            id="duration"
            type="number"
            min="1"
            max="365"
            value={duration}
            onChange={(e) => handleDurationChange(parseInt(e.target.value) || 1)}
            aria-invalid={!!validationErrors.duration}
            aria-describedby={validationErrors.duration ? 'duration-error' : undefined}
          />
          {validationErrors.duration && (
            <div id="duration-error" style={{ color: 'var(--color-accent-red)', fontSize: '0.875rem', marginTop: 'var(--spacing-xs)' }}>
              {validationErrors.duration}
            </div>
          )}
          <input
            type="range"
            min="1"
            max="90"
            value={Math.min(duration, 90)}
            onChange={(e) => handleDurationChange(parseInt(e.target.value))}
            style={{ width: '100%', marginTop: 'var(--spacing-sm)' }}
          />
        </div>

        <div>
          <label htmlFor="workers">Affected Federal Workers</label>
          <input
            id="workers"
            type="number"
            min="1000"
            max="3000000"
            step="10000"
            value={affectedWorkers}
            onChange={(e) => handleWorkersChange(parseInt(e.target.value) || 800000)}
            aria-invalid={!!validationErrors.workers}
            aria-describedby={validationErrors.workers ? 'workers-error' : undefined}
          />
          {validationErrors.workers && (
            <div id="workers-error" style={{ color: 'var(--color-accent-red)', fontSize: '0.875rem', marginTop: 'var(--spacing-xs)' }}>
              {validationErrors.workers}
            </div>
          )}
          <input
            type="range"
            min="100000"
            max="2000000"
            step="50000"
            value={affectedWorkers}
            onChange={(e) => handleWorkersChange(parseInt(e.target.value))}
            style={{ width: '100%', marginTop: 'var(--spacing-sm)' }}
          />
        </div>
      </div>

      <button
        className="btn btn-primary"
        onClick={handleCalculate}
        disabled={loading}
        style={{ width: '100%', padding: 'var(--spacing-md)' }}
      >
        {loading ? 'Calculating...' : '🧮 Calculate Economic Impact'}
      </button>

      {error && (
        <div className="alert alert-error" style={{ marginTop: 'var(--spacing-lg)' }}>
          {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: 'var(--spacing-xl)' }}>
          <h4 style={{ marginBottom: 'var(--spacing-md)' }}>💰 Impact Analysis Results</h4>

          {/* Gauge Charts */}
          <div className="grid grid-cols-2" style={{ marginBottom: 'var(--spacing-lg)' }}>
            <div style={{ 
              background: 'var(--color-bg-tertiary)', 
              borderRadius: 'var(--radius-md)',
              padding: 'var(--spacing-sm)'
            }}>
              <Plot
                data={[{
                  type: 'indicator' as const,
                  mode: 'gauge+number+delta' as const,
                  value: result.impacts.directImpact / 1e9,
                  title: { text: 'Direct Impact', font: { size: 16, color: '#e4e6eb' } },
                  delta: { reference: 5 },
                  number: { prefix: '$', suffix: 'B', font: { size: 24 } },
                  gauge: {
                    axis: { range: [null, 50], tickcolor: '#b8bcc8' },
                    bar: { color: '#4a9eff' },
                    bgcolor: '#0f1419',
                    borderwidth: 2,
                    bordercolor: '#2d3748',
                    steps: [
                      { range: [0, 10], color: 'rgba(74, 158, 255, 0.2)' },
                      { range: [10, 30], color: 'rgba(74, 158, 255, 0.3)' },
                      { range: [30, 50], color: 'rgba(74, 158, 255, 0.4)' }
                    ],
                    threshold: {
                      line: { color: '#ec4899', width: 4 },
                      thickness: 0.75,
                      value: 40
                    }
                  }
                }]}
                layout={{
                  paper_bgcolor: '#1e2530',
                  plot_bgcolor: '#1e2530',
                  font: { color: '#e4e6eb' },
                  height: 250,
                  margin: { t: 50, b: 20, l: 20, r: 20 }
                }}
                config={{ displayModeBar: false, responsive: true }}
                style={{ width: '100%', height: '100%' }}
              />
            </div>

            <div style={{ 
              background: 'var(--color-bg-tertiary)', 
              borderRadius: 'var(--radius-md)',
              padding: 'var(--spacing-sm)'
            }}>
              <Plot
                data={[{
                  type: 'indicator' as const,
                  mode: 'gauge+number+delta' as const,
                  value: result.impacts.totalEconomicImpact / 1e9,
                  title: { text: 'Total Economic Impact', font: { size: 16, color: '#e4e6eb' } },
                  delta: { reference: 10 },
                  number: { prefix: '$', suffix: 'B', font: { size: 24 } },
                  gauge: {
                    axis: { range: [null, 100], tickcolor: '#b8bcc8' },
                    bar: { color: '#ec4899' },
                    bgcolor: '#0f1419',
                    borderwidth: 2,
                    bordercolor: '#2d3748',
                    steps: [
                      { range: [0, 30], color: 'rgba(236, 72, 153, 0.2)' },
                      { range: [30, 60], color: 'rgba(236, 72, 153, 0.3)' },
                      { range: [60, 100], color: 'rgba(236, 72, 153, 0.4)' }
                    ],
                    threshold: {
                      line: { color: '#fbbf24', width: 4 },
                      thickness: 0.75,
                      value: 80
                    }
                  }
                }]}
                layout={{
                  paper_bgcolor: '#1e2530',
                  plot_bgcolor: '#1e2530',
                  font: { color: '#e4e6eb' },
                  height: 250,
                  margin: { t: 50, b: 20, l: 20, r: 20 }
                }}
                config={{ displayModeBar: false, responsive: true }}
                style={{ width: '100%', height: '100%' }}
              />
            </div>
          </div>

          {/* Bar Chart Breakdown */}
          <div style={{ 
            background: 'var(--color-bg-tertiary)', 
            borderRadius: 'var(--radius-md)',
            padding: 'var(--spacing-sm)',
            marginBottom: 'var(--spacing-lg)'
          }}>
            <Plot
              data={[{
                type: 'bar',
                x: ['Direct Impact', 'Lost Productivity', 'Total Economic Impact'],
                y: [
                  result.impacts.directImpact / 1e9,
                  result.impacts.lostProductivity / 1e9,
                  result.impacts.totalEconomicImpact / 1e9
                ],
                marker: {
                  color: ['#4a9eff', '#fbbf24', '#ec4899'],
                  line: { color: '#2d3748', width: 2 }
                },
                text: [
                  result.formatted.directImpact,
                  result.formatted.lostProductivity,
                  result.formatted.totalEconomicImpact
                ],
                textposition: 'auto',
                hovertemplate: '<b>%{x}</b><br>Amount: %{text}<extra></extra>'
              }]}
              layout={{
                title: {
                  text: 'Economic Impact Breakdown',
                  font: { color: '#e4e6eb', size: 16 }
                },
                paper_bgcolor: '#1e2530',
                plot_bgcolor: '#0f1419',
                font: { color: '#e4e6eb' },
                height: 350,
                margin: { t: 60, b: 60, l: 80, r: 40 },
                xaxis: {
                  gridcolor: '#2d3748',
                  color: '#b8bcc8'
                },
                yaxis: {
                  title: { text: 'Billions ($)', font: { color: '#e4e6eb' } },
                  gridcolor: '#2d3748',
                  color: '#b8bcc8'
                },
                showlegend: false
              }}
              config={{
                displayModeBar: true,
                displaylogo: false,
                responsive: true,
                toImageButtonOptions: {
                  format: 'png',
                  filename: 'impact_breakdown',
                  height: 600,
                  width: 1000,
                  scale: 2
                }
              }}
              style={{ width: '100%', height: '100%' }}
            />
          </div>

          {/* GDP Impact Indicator */}
          <div style={{ 
            background: 'var(--color-bg-tertiary)', 
            borderRadius: 'var(--radius-md)',
            padding: 'var(--spacing-sm)',
            marginBottom: 'var(--spacing-lg)'
          }}>
            <Plot
              data={[{
                type: 'indicator' as const,
                mode: 'gauge+number' as const,
                value: parseFloat(result.impacts.gdpImpactPercent),
                title: { text: 'GDP Impact (%)', font: { size: 18, color: '#e4e6eb' } },
                number: { suffix: '%', font: { size: 32, color: '#8b5cf6' } },
                gauge: {
                  shape: 'bullet',
                  axis: { range: [null, 0.5], tickcolor: '#b8bcc8' },
                  bar: { color: '#8b5cf6' },
                  bgcolor: '#0f1419',
                  borderwidth: 2,
                  bordercolor: '#2d3748',
                  steps: [
                    { range: [0, 0.1], color: 'rgba(139, 92, 246, 0.2)' },
                    { range: [0.1, 0.3], color: 'rgba(139, 92, 246, 0.3)' },
                    { range: [0.3, 0.5], color: 'rgba(139, 92, 246, 0.4)' }
                  ],
                  threshold: {
                    line: { color: '#ec4899', width: 4 },
                    thickness: 0.75,
                    value: 0.4
                  }
                }
              }]}
              layout={{
                paper_bgcolor: '#1e2530',
                plot_bgcolor: '#1e2530',
                font: { color: '#e4e6eb' },
                height: 200,
                margin: { t: 50, b: 20, l: 100, r: 100 }
              }}
              config={{ displayModeBar: false, responsive: true }}
              style={{ width: '100%', height: '100%' }}
            />
          </div>

          <div style={{
            padding: 'var(--spacing-md)',
            background: 'var(--color-bg-tertiary)',
            borderRadius: 'var(--radius-md)',
            borderLeft: '3px solid var(--color-accent-purple)'
          }}>
            <h5 style={{ marginBottom: 'var(--spacing-sm)' }}>Calculation Details</h5>
            <ul style={{ 
              marginLeft: 'var(--spacing-lg)', 
              color: 'var(--color-text-secondary)',
              fontSize: '0.875rem'
            }}>
              <li>Duration: {result.inputs.duration} days</li>
              <li>Affected Workers: {result.inputs.affectedWorkers.toLocaleString()}</li>
              <li>Analysis Year: {result.inputs.year}</li>
            </ul>
          </div>

          <div className="alert alert-warning" style={{ marginTop: 'var(--spacing-lg)' }}>
            <strong>Disclaimer:</strong> {result.note}
          </div>

          <div style={{ 
            marginTop: 'var(--spacing-lg)',
            padding: 'var(--spacing-md)',
            background: 'var(--color-bg-tertiary)',
            borderRadius: 'var(--radius-md)'
          }}>
            <h5 style={{ marginBottom: 'var(--spacing-sm)' }}>Understanding the Numbers</h5>
            <p style={{ fontSize: '0.875rem', marginBottom: 'var(--spacing-sm)' }}>
              <strong>Direct Impact:</strong> The immediate cost to federal workers and operations during the shutdown period.
            </p>
            <p style={{ fontSize: '0.875rem', marginBottom: 'var(--spacing-sm)' }}>
              <strong>Total Economic Impact:</strong> Includes direct costs plus multiplier effects on the broader economy (contractors, businesses, etc.).
            </p>
            <p style={{ fontSize: '0.875rem', marginBottom: 'var(--spacing-sm)' }}>
              <strong>Lost Productivity:</strong> Permanent economic losses that cannot be recovered even after the shutdown ends.
            </p>
            <p style={{ fontSize: '0.875rem', marginBottom: 0 }}>
              <strong>GDP Impact:</strong> The shutdown's effect on the nation's Gross Domestic Product as a percentage.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default ImpactCalculator
