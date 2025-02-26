import React, { useState } from 'react'
import { Shell } from './components/layout/Shell'

function App() {
  // Simple state to test useState initialization
  const [count, setCount] = useState(0)

  return (
    <Shell>
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-4">CIVETTA CRM</h1>
        <p className="mb-4">Bienvenido al sistema CRM para mercados hispanohablantes</p>

        {/* Simple counter to verify useState is working */}
        <div className="p-4 bg-muted rounded-md mt-6">
          <p className="mb-2">Contador para verificar que useState funciona correctamente:</p>
          <div className="flex items-center gap-4">
            <button 
              className="px-4 py-2 bg-primary text-white rounded"
              onClick={() => setCount(count - 1)}
            >
              -
            </button>
            <span className="text-xl font-medium">{count}</span>
            <button 
              className="px-4 py-2 bg-primary text-white rounded"
              onClick={() => setCount(count + 1)}
            >
              +
            </button>
          </div>
        </div>
      </div>
    </Shell>
  )
}

export default App