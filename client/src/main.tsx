import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import { TestComponent } from './TestComponent'

// Super simple component with no hooks or dependencies
function App() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Basic React Test</h1>
      <p>This is a minimal React component with no hooks.</p>
      <TestComponent />
    </div>
  )
}

// Log information for debugging
console.log('React version:', React.version)
console.log('ReactDOM version:', ReactDOM.version || 'Not available')
console.log('Root element found:', document.getElementById('root'))

// Basic React initialization
try {
  const rootElement = document.getElementById('root')
  if (!rootElement) {
    throw new Error('Root element not found')
  }

  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
} catch (error) {
  console.error('Error initializing React:', error)
  document.body.innerHTML = `
    <div style="padding: 20px; color: red;">
      <h1>React Initialization Error</h1>
      <pre>${error instanceof Error ? error.message : String(error)}</pre>
    </div>
  `
}