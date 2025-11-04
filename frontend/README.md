# Frontend Application

React + TypeScript frontend for the US Government Shutdown Dashboard with custom dark theme.

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Fast build tool and dev server
- **D3.js** - Data visualizations (Timeline, Sankey)
- **Chart.js** - Interactive charts
- **Axios** - HTTP client

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── Dashboard.tsx         # Main dashboard container
│   │   ├── Timeline.tsx          # Historical timeline visualization
│   │   ├── SankeyDiagram.tsx     # Flow analysis diagram
│   │   ├── ImpactCalculator.tsx  # Economic impact calculator
│   │   └── SourceCitations.tsx   # Data source attributions
│   ├── theme/
│   │   └── dark.css              # Custom dark theme styles
│   ├── App.tsx                   # Root application component
│   └── main.tsx                  # Application entry point
├── index.html                    # HTML template
├── vite.config.ts                # Vite configuration
├── tsconfig.json                 # TypeScript configuration
└── package.json                  # Dependencies and scripts
```

## Components

### Dashboard
Main container component that fetches data and orchestrates all sub-components. Displays:
- Statistics cards (total shutdowns, longest shutdown, news count)
- Tabbed interface for Timeline, Sankey, and Calculator
- News feed integration
- Source citations

### Timeline
Interactive D3 visualization showing historical shutdowns on a timeline. Features:
- Scatter plot of shutdowns by year and duration
- Hover tooltips with detailed information
- Animated entrance effects
- Detailed list view below the chart

### SankeyDiagram
Flow diagram using D3-Sankey showing relationships between:
- Shutdown causes (budget disputes, policy disagreements)
- Affected federal agencies
- Resolution methods

### ImpactCalculator
Interactive calculator for estimating economic impacts:
- Adjustable duration (days) via slider
- Configurable affected workers count
- Real-time calculation via API
- Displays direct impact, total economic impact, lost productivity, and GDP impact

### SourceCitations
Displays all data sources with proper attribution:
- Links to original sources
- License information
- API configuration status
- Michael Hoch attribution

## Dark Theme

The custom dark theme (`dark.css`) provides:
- Professional color palette optimized for data visualization
- Consistent spacing and typography system
- Custom component styles (cards, buttons, badges, alerts)
- Responsive design
- Smooth transitions and hover effects

### Theme Variables

```css
--color-bg-primary: #0a0e17
--color-bg-secondary: #151922
--color-accent-blue: #4a9eff
--color-accent-purple: #8b5cf6
--color-accent-green: #10b981
```

## Development

```bash
# Install dependencies
npm install

# Start dev server (http://localhost:5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## API Integration

The frontend connects to the backend API (default: http://localhost:3001) via Vite proxy configuration.

Endpoints used:
- `GET /api/shutdowns` - Historical shutdown data
- `GET /api/news` - Latest news articles
- `GET /api/sources` - Data source information
- `POST /api/impact/calc` - Economic impact calculations

## Environment

The frontend automatically proxies API requests to the backend during development. In production, ensure the backend is running on the configured port.

## Attribution

**Dashboard Design & Development:** Michael Hoch

**Libraries:**
- React (Meta)
- D3.js (Mike Bostock)
- Chart.js
- TypeScript (Microsoft)
- Vite (Evan You)
