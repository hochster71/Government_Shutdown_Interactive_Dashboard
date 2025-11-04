import { useState } from 'react'
import Dashboard from './components/Dashboard'

/**
 * Main App Component
 * US Government Shutdown Interactive Dashboard
 * Created by Michael Hoch
 */
function App() {
  const [darkMode] = useState(true) // Always use dark mode for this theme

  return (
    <div className="app" style={{ minHeight: '100vh' }}>
      <header style={{
        background: 'var(--color-bg-secondary)',
        borderBottom: '1px solid var(--color-border)',
        padding: 'var(--spacing-lg)',
        marginBottom: 'var(--spacing-xl)'
      }}>
        <div className="container">
          <h1 style={{ 
            marginBottom: 'var(--spacing-xs)',
            background: 'linear-gradient(135deg, var(--color-accent-blue) 0%, var(--color-accent-purple) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            🏛️ US Government Shutdown Dashboard
          </h1>
          <p style={{ 
            color: 'var(--color-text-muted)', 
            marginBottom: 0,
            fontSize: '0.9rem'
          }}>
            Interactive visualization of historical shutdowns, economic impacts, and current news
            <span style={{ 
              marginLeft: 'var(--spacing-md)', 
              color: 'var(--color-text-muted)',
              fontSize: '0.85rem'
            }}>
              by Michael Hoch
            </span>
          </p>
        </div>
      </header>

      <main className="container">
        <Dashboard />
      </main>

      <footer style={{
        background: 'var(--color-bg-secondary)',
        borderTop: '1px solid var(--color-border)',
        padding: 'var(--spacing-lg)',
        marginTop: 'var(--spacing-2xl)',
        textAlign: 'center'
      }}>
        <div className="container">
          <p style={{ 
            fontSize: '0.875rem', 
            color: 'var(--color-text-muted)',
            marginBottom: 'var(--spacing-sm)'
          }}>
            Data sources: Wikipedia, NewsAPI, GovInfo.gov
          </p>
          <p style={{ 
            fontSize: '0.8rem', 
            color: 'var(--color-text-muted)',
            marginBottom: 0
          }}>
            © 2024 Michael Hoch. Released under MIT License. 
            <a 
              href="https://github.com/hochster71/Government_Shutdown_Interactive_Dashboard" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ marginLeft: 'var(--spacing-sm)' }}
            >
              View on GitHub
            </a>
          </p>
        </div>
      </footer>
    </div>
  )
}

export default App
