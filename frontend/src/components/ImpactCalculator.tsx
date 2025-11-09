import { useState } from 'react'
import API_ENDPOINTS from '../config/api'

/**
 * Impact Calculator Component
 * Calculate economic impact of government shutdowns
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

  const calculateImpact = async () => {
    // Validate inputs
    if (duration < 1 || duration > 365) {
      setError('Duration must be between 1 and 365 days');
      return;
    }

    if (affectedWorkers < 1000 || affectedWorkers > 5000000) {
      setError('Affected workers must be between 1,000 and 5,000,000');
      return;
    }

    try {
      setLoading(true)
      setError(null)

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(API_ENDPOINTS.IMPACT_CALC, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          duration,
          affectedWorkers,
          year,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to calculate impact')
      }

      const data = await response.json()
      setResult(data)
      setLoading(false)
    } catch (err) {
      console.error('Error calculating impact:', err)
      let errorMessage = 'Unknown error';
      if (err instanceof Error) {
        errorMessage = err.name === 'AbortError'
          ? 'Request timed out. Please try again.'
          : err.message;
      }
      setError(`Failed to calculate economic impact: ${errorMessage}`)
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
            onChange={(e) => setDuration(parseInt(e.target.value) || 1)}
          />
          <input
            type="range"
            min="1"
            max="90"
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value))}
            style={{ width: '100%', marginTop: 'var(--spacing-sm)' }}
          />
        </div>

        <div>
          <label htmlFor="workers">Affected Federal Workers</label>
          <input
            id="workers"
            type="number"
            min="1000"
            max="2000000"
            step="10000"
            value={affectedWorkers}
            onChange={(e) => setAffectedWorkers(parseInt(e.target.value) || 800000)}
          />
          <input
            type="range"
            min="100000"
            max="2000000"
            step="50000"
            value={affectedWorkers}
            onChange={(e) => setAffectedWorkers(parseInt(e.target.value))}
            style={{ width: '100%', marginTop: 'var(--spacing-sm)' }}
          />
        </div>
      </div>

      <button
        className="btn btn-primary"
        onClick={calculateImpact}
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
          <h4 style={{ marginBottom: 'var(--spacing-md)' }}>Impact Analysis Results</h4>

          <div className="grid grid-cols-2" style={{ marginBottom: 'var(--spacing-lg)' }}>
            <div className="card">
              <div className="card-body text-center">
                <h3 style={{
                  fontSize: '2rem',
                  color: 'var(--color-accent-blue)',
                  marginBottom: 'var(--spacing-sm)'
                }}>
                  {result.formatted.directImpact}
                </h3>
                <p style={{
                  fontSize: '0.875rem',
                  color: 'var(--color-text-muted)',
                  marginBottom: 0
                }}>
                  Direct Impact
                </p>
              </div>
            </div>

            <div className="card">
              <div className="card-body text-center">
                <h3 style={{
                  fontSize: '2rem',
                  color: 'var(--color-accent-red)',
                  marginBottom: 'var(--spacing-sm)'
                }}>
                  {result.formatted.totalEconomicImpact}
                </h3>
                <p style={{
                  fontSize: '0.875rem',
                  color: 'var(--color-text-muted)',
                  marginBottom: 0
                }}>
                  Total Economic Impact
                </p>
              </div>
            </div>

            <div className="card">
              <div className="card-body text-center">
                <h3 style={{
                  fontSize: '2rem',
                  color: 'var(--color-accent-yellow)',
                  marginBottom: 'var(--spacing-sm)'
                }}>
                  {result.formatted.lostProductivity}
                </h3>
                <p style={{
                  fontSize: '0.875rem',
                  color: 'var(--color-text-muted)',
                  marginBottom: 0
                }}>
                  Lost Productivity
                </p>
              </div>
            </div>

            <div className="card">
              <div className="card-body text-center">
                <h3 style={{
                  fontSize: '2rem',
                  color: 'var(--color-accent-purple)',
                  marginBottom: 'var(--spacing-sm)'
                }}>
                  {result.formatted.gdpImpact}
                </h3>
                <p style={{
                  fontSize: '0.875rem',
                  color: 'var(--color-text-muted)',
                  marginBottom: 0
                }}>
                  GDP Impact
                </p>
              </div>
            </div>
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
