import Dashboard from './components/Dashboard'

/**
 * Main App Component
 * US Government Shutdown Interactive Dashboard
 * Created by Michael Hoch
 */
function App() {
  return (
    <div className="app fade-in" style={{ minHeight: '100vh' }}>
      <header className="glass" style={{
        background: 'rgba(21, 25, 34, 0.9)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--color-border)',
        padding: 'var(--spacing-xl) var(--spacing-lg)',
        marginBottom: 'var(--spacing-xl)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)'
      }}>
        <div className="container">
          <h1 className="shine" style={{ 
            marginBottom: 'var(--spacing-sm)',
            background: 'linear-gradient(135deg, var(--color-accent-blue) 0%, var(--color-accent-purple) 50%, var(--color-accent-green) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            fontSize: '2.75rem',
            fontWeight: '800',
            letterSpacing: '-0.5px'
          }}>
            🏛️ US Government Shutdown Dashboard
          </h1>
          <p style={{ 
            color: 'var(--color-text-secondary)', 
            marginBottom: 0,
            fontSize: '1rem',
            fontWeight: '500'
          }}>
            Interactive visualization of historical shutdowns, economic impacts, and current news
            <span className="badge badge-purple" style={{ 
              marginLeft: 'var(--spacing-md)'
            }}>
              by Michael Hoch
            </span>
          </p>
        </div>
      </header>

      <main className="container">
        <Dashboard />
      </main>

      <footer className="glass" style={{
        background: 'rgba(21, 25, 34, 0.9)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid var(--color-border)',
        padding: 'var(--spacing-xl)',
        marginTop: 'var(--spacing-2xl)',
        textAlign: 'center'
      }}>
        <div className="container">
          <p style={{ 
            fontSize: '0.9rem', 
            color: 'var(--color-text-secondary)',
            marginBottom: 'var(--spacing-sm)',
            fontWeight: '500'
          }}>
            📊 Data sources: 
            <span className="badge badge-blue" style={{ marginLeft: 'var(--spacing-sm)' }}>Wikipedia</span>
            <span className="badge badge-green" style={{ marginLeft: 'var(--spacing-xs)' }}>NewsAPI</span>
            <span className="badge badge-yellow" style={{ marginLeft: 'var(--spacing-xs)' }}>GovInfo.gov</span>
          </p>
          <p style={{ 
            fontSize: '0.85rem', 
            color: 'var(--color-text-muted)',
            marginBottom: 0
          }}>
            © 2024 Michael Hoch. Released under MIT License. 
            <a 
              href="https://github.com/hochster71/Government_Shutdown_Interactive_Dashboard" 
              target="_blank" 
              rel="noopener noreferrer"
              className="glow-on-hover"
              style={{ 
                marginLeft: 'var(--spacing-sm)',
                fontWeight: '600'
              }}
            >
              ⭐ View on GitHub
            </a>
          </p>
        </div>
      </footer>
    </div>
  )
}

export default App
