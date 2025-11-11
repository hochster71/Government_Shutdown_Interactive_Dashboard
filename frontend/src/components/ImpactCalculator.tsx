import { useState } from 'react'
import { apiPost } from '../utils/api'

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

// Validation constants
const VALIDATION_RULES = {
  duration: { min: 1, max: 365 },
  affectedWorkers: { min: 1000, max: 3000000 }
};

function ImpactCalculator() {
  const [duration, setDuration] = useState<number>(30)
  const [affectedWorkers, setAffectedWorkers] = useState<number>(800000)
  const [year] = useState<number>(new Date().getFullYear())
  const [result, setResult] = useState<ImpactResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<{
    duration?: string;
    affectedWorkers?: string;
  }>({})

  // Validate inputs
  const validateInputs = (): boolean => {
    const errors: { duration?: string; affectedWorkers?: string } = {};

    if (duration < VALIDATION_RULES.duration.min || duration > VALIDATION_RULES.duration.max) {
      errors.duration = `Duration must be between ${VALIDATION_RULES.duration.min} and ${VALIDATION_RULES.duration.max} days`;
    }

    if (affectedWorkers < VALIDATION_RULES.affectedWorkers.min || affectedWorkers > VALIDATION_RULES.affectedWorkers.max) {
      errors.affectedWorkers = `Affected workers must be between ${VALIDATION_RULES.affectedWorkers.min.toLocaleString()} and ${VALIDATION_RULES.affectedWorkers.max.toLocaleString()}`;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleDurationChange = (value: number) => {
    const clampedValue = Math.max(VALIDATION_RULES.duration.min, Math.min(VALIDATION_RULES.duration.max, value));
    setDuration(clampedValue);
    setValidationErrors({ ...validationErrors, duration: undefined });
  };

  const handleWorkersChange = (value: number) => {
    const clampedValue = Math.max(VALIDATION_RULES.affectedWorkers.min, Math.min(VALIDATION_RULES.affectedWorkers.max, value));
    setAffectedWorkers(clampedValue);
    setValidationErrors({ ...validationErrors, affectedWorkers: undefined });
  };

  const calculateImpact = async () => {
    // Validate before submitting
    if (!validateInputs()) {
      setError('Please fix the validation errors before calculating');
      return;
    }

    try {
      setLoading(true)
      setError(null)

      const data = await apiPost<ImpactResult>('/api/impact/calc', {
        duration,
        affectedWorkers,
        year,
      });

      setResult(data)
      setLoading(false)
    } catch (err) {
      console.error('Error calculating impact:', err)
      setError(err instanceof Error ? err.message : 'Failed to calculate economic impact. Please try again.')
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
          />
          {validationErrors.duration && (
            <div style={{ color: 'var(--color-accent-red)', fontSize: '0.875rem', marginTop: 'var(--spacing-xs)' }}>
              {validationErrors.duration}
            </div>
          )}
          <input
            type="range"
            min="1"
            max="90"
            value={duration}
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
          />
          {validationErrors.affectedWorkers && (
            <div style={{ color: 'var(--color-accent-red)', fontSize: '0.875rem', marginTop: 'var(--spacing-xs)' }}>
              {validationErrors.affectedWorkers}
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
              <strong>GDP Impact:</strong> The shutdown&apos;s effect on the nation&apos;s Gross Domestic Product as a percentage.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default ImpactCalculator
